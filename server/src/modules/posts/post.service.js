const mongoose = require('mongoose');
const Post = require('../../models/post');
const Like = require('../../models/like');
const Comment = require('../../models/comment');
const PostSave = require('../../models/postSave');
const Follow = require('../../models/follow');
const User = require('../../models/user');
const { resolveMentionUsersFromText, notifyMentionedUsers, getMentionSnippet } = require('../utils/mentionService');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const toIdString = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (value?._id && value._id !== value) return toIdString(value._id);
    if (typeof value?.toHexString === "function") return value.toHexString();
    if (typeof value?.toString === "function") {
        const normalized = value.toString();
        return normalized && normalized !== "[object Object]" ? normalized : "";
    }
    return "";
};

const hasBlockedUser = (userDoc, targetId) => {
    const targetIdString = toIdString(targetId);
    if (!targetIdString) return false;
    return (userDoc?.blockedUsers || []).some((entry) => toIdString(entry) === targetIdString);
};

class PostService {
    isViewAction(action = "") {
        return String(action || "").toLowerCase().startsWith("view");
    }

    async publishDueScheduledPosts(referenceDate = new Date()) {
        const publishAt = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
        if (!Number.isFinite(publishAt.getTime())) {
            return 0;
        }

        const result = await Post.updateMany(
            {
                status: "scheduled",
                scheduledFor: { $lte: publishAt }
            },
            {
                $set: {
                    status: "active",
                    publishedAt: publishAt
                },
                $unset: {
                    scheduledFor: 1
                }
            }
        );

        return Number(result?.modifiedCount || result?.nModified || 0);
    }

    async resolveAuthorAccess(authorId, currentUserId = null) {
        const author = await User.findById(authorId)
            .select("accountStatus isPrivate blockedUsers")
            .lean();

        if (!author || author.accountStatus !== "active") {
            throw createError("User not found", 404);
        }

        const authorIdString = toIdString(authorId);
        const currentUserIdString = toIdString(currentUserId);
        const isOwner = Boolean(currentUserIdString) && currentUserIdString === authorIdString;

        if (isOwner) {
            return {
                isOwner: true,
                isPrivate: Boolean(author.isPrivate),
                isApprovedFollower: false,
                isBlockedContext: false
            };
        }

        if (!currentUserIdString) {
            return {
                isOwner: false,
                isPrivate: Boolean(author.isPrivate),
                isApprovedFollower: false,
                isBlockedContext: false
            };
        }

        const viewer = await User.findById(currentUserId)
            .select("accountStatus blockedUsers")
            .lean();

        if (!viewer || viewer.accountStatus !== "active") {
            throw createError("User not found", 404);
        }

        const isBlockedContext = hasBlockedUser(author, currentUserId) || hasBlockedUser(viewer, authorId);
        if (isBlockedContext) {
            return {
                isOwner: false,
                isPrivate: Boolean(author.isPrivate),
                isApprovedFollower: false,
                isBlockedContext: true
            };
        }

        const followStatus = await Follow.checkRelationship(currentUserId, authorId);
        const isApprovedFollower = Boolean(followStatus?.isFollowing && followStatus?.isApproved);

        return {
            isOwner: false,
            isPrivate: Boolean(author.isPrivate),
            isApprovedFollower,
            isBlockedContext: false
        };
    }

    canViewPostWithAccess(post, authorAccess = {}) {
        if (!post) {
            return false;
        }

        if (post.status === "scheduled") {
            return Boolean(authorAccess.isOwner);
        }

        if (post.status !== "active") {
            return false;
        }

        if (authorAccess.isBlockedContext) {
            return false;
        }

        if (authorAccess.isPrivate && !authorAccess.isOwner && !authorAccess.isApprovedFollower) {
            return false;
        }

        if (authorAccess.isOwner) {
            return true;
        }

        if (post.visibility === "followers") {
            return Boolean(authorAccess.isApprovedFollower);
        }

        if (post.visibility === "private") {
            return false;
        }

        return post.visibility === "public" || post.visibility === "unlisted";
    }

    async assertCanAccessPost(post, currentUserId, action = "view this post") {
        if (!post) {
            throw createError("Post not found", 404);
        }

        const authorId = post?.author?._id || post?.author;
        const authorAccess = await this.resolveAuthorAccess(authorId, currentUserId);

        if (post.status === "scheduled") {
            if (authorAccess.isOwner && this.isViewAction(action)) {
                return { authorAccess };
            }
            throw createError("Post not found", 404);
        }

        if (post.status !== "active") {
            throw createError("Post not found", 404);
        }

        if (authorAccess.isBlockedContext) {
            const blockedMessage = this.isViewAction(action)
                ? "You cannot view this profile"
                : "You cannot interact with this profile";
            throw createError(blockedMessage, 403);
        }

        if (!this.canViewPostWithAccess(post, authorAccess)) {
            if (authorAccess.isPrivate && !authorAccess.isOwner && !authorAccess.isApprovedFollower) {
                throw createError("This profile is private", 403);
            }
            throw createError(`You do not have permission to ${action}`, 403);
        }

        return { authorAccess };
    }

    async assertCanAccessPostById(postId, currentUserId, action = "view this post", session = null) {
        await this.publishDueScheduledPosts();

        let query = Post.findById(postId).select("_id author status visibility postType originalPost scheduledFor");
        if (session) {
            query = query.session(session);
        }

        const post = await query;
        await this.assertCanAccessPost(post, currentUserId, action);
        return post;
    }

    async filterAccessiblePosts(posts, currentUserId) {
        if (!Array.isArray(posts) || posts.length === 0) {
            return [];
        }

        const checked = await Promise.all(
            posts.map(async (post) => {
                try {
                    await this.assertCanAccessPost(post, currentUserId, "view this post");
                    return post;
                } catch (error) {
                    if (error?.statusCode === 403 || error?.statusCode === 404) {
                        return null;
                    }
                    throw error;
                }
            })
        );

        return checked.filter(Boolean);
    }

    async getAccessibleAuthorIds(currentUserId = null) {
        if (!currentUserId) {
            return User.find({
                accountStatus: "active",
                isPrivate: false
            }).distinct("_id");
        }

        const [viewer, publicAuthorIds, approvedFollowingIds, blockedMeIds] = await Promise.all([
            User.findById(currentUserId)
                .select("accountStatus blockedUsers")
                .lean(),
            User.find({
                accountStatus: "active",
                isPrivate: false
            }).distinct("_id"),
            Follow.find({
                follower: currentUserId,
                status: "active",
                isApproved: true
            }).distinct("following"),
            User.find({
                accountStatus: "active",
                blockedUsers: currentUserId
            }).distinct("_id")
        ]);

        if (!viewer || viewer.accountStatus !== "active") {
            throw createError("User not found", 404);
        }

        const activeFollowingIds = approvedFollowingIds.length
            ? await User.find({
                _id: { $in: approvedFollowingIds },
                accountStatus: "active"
            }).distinct("_id")
            : [];

        const blockedByMeIds = Array.isArray(viewer.blockedUsers)
            ? viewer.blockedUsers.map((entry) => toIdString(entry)).filter(Boolean)
            : [];

        const blockedIds = new Set([
            ...blockedByMeIds,
            ...blockedMeIds.map((entry) => toIdString(entry)).filter(Boolean)
        ]);

        const allowedIds = new Set(
            [...publicAuthorIds, ...activeFollowingIds, currentUserId]
                .map((entry) => toIdString(entry))
                .filter(Boolean)
        );

        blockedIds.forEach((entry) => allowedIds.delete(entry));
        return Array.from(allowedIds);
    }

    /**
     * Create a new post
     * @param {ObjectId} userId - Author user ID
     * @param {Object} postData - Post data
     * @returns {Promise<Object>} Created post
     */
    async createPost(userId, postData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        let mentionUsers = [];
        const scheduledDate = postData?.scheduledFor ? new Date(postData.scheduledFor) : null;
        const shouldSchedulePost = Boolean(
            scheduledDate &&
            Number.isFinite(scheduledDate.getTime()) &&
            scheduledDate > new Date()
        );

        try {
            // Validate user exists and is active
            const user = await User.findById(userId)
                .select("accountStatus name username")
                .session(session);

            if (!user || user.accountStatus !== "active") {
                throw new Error("User not found or inactive");
            }

            const usersMentionedByText = await resolveMentionUsersFromText([postData.content], {
                excludeUserIds: [userId],
                session
            });

            const explicitMentionIds = Array.isArray(postData.mentions) ? postData.mentions : [];
            let usersMentionedByIds = [];
            if (explicitMentionIds.length > 0) {
                usersMentionedByIds = await User.find({
                    _id: { $in: explicitMentionIds },
                    accountStatus: "active",
                    "preferences.privacy.allowTagging": { $ne: false }
                })
                    .select("_id username name avatar")
                    .session(session)
                    .lean();
            }

            const mentionMap = new Map();
            [...usersMentionedByText, ...usersMentionedByIds].forEach((userDoc) => {
                if (!userDoc?._id) return;
                mentionMap.set(String(userDoc._id), userDoc);
            });

            mentionUsers = Array.from(mentionMap.values());

            const normalizedPostData = { ...postData };
            delete normalizedPostData.scheduledFor;

            // Create post
            const [post] = await Post.create([{
                ...normalizedPostData,
                status: shouldSchedulePost ? "scheduled" : "active",
                scheduledFor: shouldSchedulePost ? scheduledDate : undefined,
                publishedAt: shouldSchedulePost ? undefined : new Date(),
                mentions: mentionUsers.map((item) => item._id),
                author: userId
            }], { session });

            await session.commitTransaction();

            // Populate author + mentions info
            await post.populate("author", "username name avatar isVerified");
            await post.populate("mentions", "username name avatar");

            if (!shouldSchedulePost && mentionUsers.length > 0) {
                const actorLabel = user.name || user.username || "Someone";
                await notifyMentionedUsers({
                    actorId: userId,
                    mentionUsers,
                    title: "You were mentioned in a post",
                    message: `${actorLabel} mentioned you in a post: "${getMentionSnippet(postData.content)}"`,
                    type: "activity",
                    category: "social",
                    priority: "normal",
                    entityType: "none",
                    entityId: post._id,
                    link: `/post/${String(post._id)}`,
                    metadata: {
                        source: "post.create",
                        postId: String(post._id)
                    },
                    dedupeKey: `mention:post:${String(post._id)}`
                });
            }

            return post.toPublicJSON();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get a single post by ID
     * @param {ObjectId} postId - Post ID
     * @param {ObjectId} currentUserId - Current user ID (optional)
     * @returns {Promise<Object>} Post with engagement data
     */
    async getPostById(postId, currentUserId = null) {
        await this.publishDueScheduledPosts();

        const post = await Post.findById(postId)
            .populate('author', 'username name avatar isVerified followersCount')
            .populate('originalPost')
            .lean();

        const { authorAccess } = await this.assertCanAccessPost(post, currentUserId, "view this post");

        // Add user engagement data if logged in
        if (currentUserId) {
            const [hasLiked, hasSaved, hasReposted, isFollowingAuthor] = await Promise.all([
                Like.checkUserLiked(currentUserId, postId),
                PostSave.exists({ user: currentUserId, post: postId }),
                Post.exists({
                    author: currentUserId,
                    originalPost: postId,
                    postType: { $in: ["repost", "quote"] },
                    status: "active"
                }),
                currentUserId.toString() !== post.author._id.toString()
                    ? Follow.checkRelationship(currentUserId, post.author._id)
                    : { isFollowing: false }
            ]);

            post.userEngagement = {
                hasLiked,
                hasSaved: Boolean(hasSaved),
                hasReposted: Boolean(hasReposted),
                isFollowingAuthor: isFollowingAuthor.isFollowing
            };
        }

        // Increment view count (async, don't wait) for published posts only.
        if (post.status === "active") {
            Post.findByIdAndUpdate(postId, { $inc: { viewsCount: 1 } }).exec();
        }

        return post;
    }

    /**
     * Update a post
     * @param {ObjectId} postId - Post ID
     * @param {ObjectId} userId - User ID (must be author)
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated post
     */
    async updatePost(postId, userId, updateData) {
        const post = await Post.findById(postId);

        if (!post) {
            throw new Error("Post not found");
        }

        if (post.author.toString() !== userId.toString()) {
            throw new Error("You do not have permission to edit this post");
        }

        if (!["active", "scheduled"].includes(post.status)) {
            throw new Error("Cannot edit a deleted or hidden post");
        }

        // Only allow updating certain fields
        const allowedUpdates = ["content", "media", "visibility", "settings"];
        const updates = {};

        Object.keys(updateData).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                updates[key] = updateData[key];
            }
        });

        const previousMentionIds = new Set((post.mentions || []).map((id) => String(id)));

        if (typeof updates.content === "string") {
            const mentionUsers = await resolveMentionUsersFromText([updates.content], {
                excludeUserIds: [userId]
            });

            updates.mentions = mentionUsers.map((item) => item._id);

            const newlyMentioned = mentionUsers.filter(
                (item) => !previousMentionIds.has(String(item._id))
            );

            if (newlyMentioned.length > 0) {
                const actor = await User.findById(userId).select("name username").lean();
                const actorLabel = actor?.name || actor?.username || "Someone";

                await notifyMentionedUsers({
                    actorId: userId,
                    mentionUsers: newlyMentioned,
                    title: "You were mentioned in an updated post",
                    message: `${actorLabel} mentioned you in an updated post: "${getMentionSnippet(updates.content)}"`,
                    type: "activity",
                    category: "social",
                    priority: "normal",
                    entityType: "none",
                    entityId: postId,
                    link: `/post/${String(postId)}`,
                    metadata: {
                        source: "post.update",
                        postId: String(postId)
                    },
                    dedupeKey: `mention:post:update:${String(postId)}`
                });
            }
        }

        // Update the post
        Object.assign(post, updates);
        await post.save();

        await post.populate("author", "username name avatar isVerified");
        await post.populate("mentions", "username name avatar");

        return post.toPublicJSON();
    }

    /**
     * Delete a post
     * @param {ObjectId} postId - Post ID
     * @param {ObjectId} userId - User ID (must be author)
     * @returns {Promise<Object>} Result
     */
    async deletePost(postId, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const post = await Post.findById(postId).session(session);

            if (!post) {
                throw new Error('Post not found');
            }

            if (post.author.toString() !== userId.toString()) {
                throw new Error('You do not have permission to delete this post');
            }

            if (!["active", "scheduled"].includes(post.status)) {
                await session.commitTransaction();
                return { success: true, message: "Post already deleted" };
            }

            // Soft delete by updating status
            post.status = 'deleted';
            post.scheduledFor = undefined;
            await post.save({ session });

            await User.updateOne(
                { _id: userId, postsCount: { $gt: 0 } },
                { $inc: { postsCount: -1 } },
                { session }
            );

            if (post.originalPost && ["repost", "quote"].includes(post.postType)) {
                await Post.updateOne(
                    { _id: post.originalPost, repostsCount: { $gt: 0 } },
                    { $inc: { repostsCount: -1 } },
                    { session }
                );
            }

            // Or hard delete (uncomment if preferred)
            // await Post.findByIdAndDelete(postId).session(session);

            await session.commitTransaction();
            return { success: true, message: 'Post deleted successfully' };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Save a post to user's bookmarks.
     * @param {ObjectId} userId
     * @param {ObjectId} postId
     * @returns {Promise<Object>}
     */
    async savePost(userId, postId) {
        await this.assertCanAccessPostById(postId, userId, "save this post");

        await PostSave.updateOne(
            { user: userId, post: postId },
            { $setOnInsert: { user: userId, post: postId } },
            { upsert: true }
        );

        return { saved: true };
    }

    /**
     * Remove a post from bookmarks.
     * @param {ObjectId} userId
     * @param {ObjectId} postId
     * @returns {Promise<Object>}
     */
    async unsavePost(userId, postId) {
        await PostSave.deleteOne({ user: userId, post: postId });
        return { saved: false };
    }

    /**
     * Get bookmarked posts for current user.
     * @param {ObjectId} userId
     * @param {Number} page
     * @param {Number} limit
     * @returns {Promise<Object>}
     */
    async getBookmarkedPosts(userId, page = 1, limit = 20) {
        await this.publishDueScheduledPosts();

        const skip = (page - 1) * limit;

        const [bookmarks, total] = await Promise.all([
            PostSave.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "post",
                    populate: [
                        { path: "author", select: "username name avatar isVerified" },
                        {
                            path: "originalPost",
                            populate: { path: "author", select: "username name avatar isVerified" }
                        }
                    ]
                })
                .lean(),
            PostSave.countDocuments({ user: userId })
        ]);

        const posts = bookmarks
            .map((entry) => entry.post)
            .filter((post) => post && post.status === "active");

        const accessiblePosts = await this.filterAccessiblePosts(posts, userId);
        const postsWithEngagement = await this.addUserEngagementData(accessiblePosts, userId);

        return {
            posts: postsWithEngagement,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Track a post share action.
     * @param {ObjectId} postId
     * @param {String} channel
     * @returns {Promise<Object>}
     */
    async sharePost(userId, postId, channel = "copy_link") {
        await this.assertCanAccessPostById(postId, userId, "share this post");

        await Post.findByIdAndUpdate(postId, { $inc: { sharesCount: 1 } });

        return {
            shared: true,
            channel,
            shareUrl: `/post/${postId}`
        };
    }

    /**
     * Repost or quote a post.
     * @param {ObjectId} userId
     * @param {ObjectId} postId
     * @param {Object} payload
     * @returns {Promise<Object>}
     */
    async repostPost(userId, postId, payload = {}) {
        await this.publishDueScheduledPosts();

        const originalPost = await Post.findById(postId)
            .select("_id author status visibility postType originalPost")
            .populate("author", "username")
            .lean();

        await this.assertCanAccessPost(originalPost, userId, "repost this post");

        const mode = payload.mode === "quote" ? "quote" : "repost";
        const visibility = payload.visibility || "public";
        const rawContent = String(payload.content || "").trim();

        if (mode === "repost") {
            const existingRepost = await Post.findOne({
                author: userId,
                originalPost: postId,
                postType: "repost",
                status: "active"
            });

            if (existingRepost) {
                const existingPost = await this.getPostById(existingRepost._id, userId);
                return {
                    ...existingPost,
                    alreadyReposted: true
                };
            }
        }

        if (mode === "quote" && !rawContent) {
            throw createError("Quote repost requires content", 400);
        }

        const fallbackContent = `Reposted from @${originalPost.author?.username || "user"}`;
        const repostPayload = {
            content: rawContent || fallbackContent,
            postType: mode,
            originalPost: postId,
            visibility
        };

        const repost = await this.createPost(userId, repostPayload);
        await Post.findByIdAndUpdate(postId, { $inc: { repostsCount: 1 } });

        return {
            ...repost,
            alreadyReposted: false
        };
    }

    /**
     * Get user's feed (posts from followed users)
     * @param {ObjectId} userId - Current user ID
     * @param {Number} page - Page number
     * @param {Number} limit - Posts per page
     * @returns {Promise<Object>} Feed with posts
     */
    async getUserFeed(userId, page = 1, limit = 20) {
        await this.publishDueScheduledPosts();

        const skip = (page - 1) * limit;

        // Get list of users that current user follows
        const following = await Follow.find({
            follower: userId,
            status: 'active',
            isApproved: true
        }).distinct('following');

        // Include own posts
        following.push(userId);

        // Build query
        const query = {
            author: { $in: following },
            status: 'active',
            visibility: { $in: ['public', 'followers'] }
        };

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .populate({
                    path: 'originalPost',
                    populate: { path: 'author', select: 'username name avatar isVerified' }
                })
                .lean(),
            Post.countDocuments(query)
        ]);

        // Add engagement data
        const postsWithEngagement = await this.addUserEngagementData(posts, userId);

        return {
            posts: postsWithEngagement,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Get public/explore feed
     * @param {ObjectId} currentUserId - Current user ID (optional)
     * @param {Number} page - Page number
     * @param {Number} limit - Posts per page
     * @returns {Promise<Object>} Public feed
     */
    async getPublicFeed(currentUserId = null, page = 1, limit = 20) {
        await this.publishDueScheduledPosts();

        const skip = (page - 1) * limit;
        const accessibleAuthorIds = await this.getAccessibleAuthorIds(currentUserId);

        if (!accessibleAuthorIds.length) {
            return {
                posts: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 1,
                    hasMore: false
                }
            };
        }

        const query = {
            status: 'active',
            visibility: 'public',
            author: { $in: accessibleAuthorIds }
        };

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .populate({
                    path: 'originalPost',
                    populate: { path: 'author', select: 'username name avatar isVerified' }
                })
                .lean(),
            Post.countDocuments(query)
        ]);

        // Add engagement data if user is logged in
        const postsWithData = currentUserId
            ? await this.addUserEngagementData(posts, currentUserId)
            : posts;

        return {
            posts: postsWithData,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Get user's posts
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} currentUserId - Current user ID (optional)
     * @param {Number} page - Page number
     * @param {Number} limit - Posts per page
     * @returns {Promise<Object>} User's posts
     */
    async getUserPosts(userId, currentUserId = null, page = 1, limit = 20) {
        await this.publishDueScheduledPosts();

        const skip = (page - 1) * limit;
        const authorAccess = await this.resolveAuthorAccess(userId, currentUserId);

        // Build query based on permissions
        let query = {
            author: userId,
            status: 'active'
        };

        if (authorAccess.isOwner) {
            query.status = { $in: ['active', 'scheduled'] };
        }

        if (authorAccess.isBlockedContext) {
            throw createError("You cannot view this profile", 403);
        }

        // For private profiles without access, return an empty list instead of throwing.
        if (authorAccess.isPrivate && !authorAccess.isOwner && !authorAccess.isApprovedFollower) {
            return {
                posts: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 1,
                    hasMore: false
                }
            };
        }

        // If viewing own profile, show all posts (including private).
        if (authorAccess.isOwner) {
            // no visibility filter
        } else if (authorAccess.isApprovedFollower) {
            query.visibility = { $in: ['public', 'followers'] };
        } else {
            query.visibility = 'public';
        }

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({ isPinned: -1, createdAt: -1 }) // Pinned posts first
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .populate({
                    path: 'originalPost',
                    populate: { path: 'author', select: 'username name avatar isVerified' }
                })
                .lean(),
            Post.countDocuments(query)
        ]);

        const postsWithData = currentUserId
            ? await this.addUserEngagementData(posts, currentUserId)
            : posts;

        return {
            posts: postsWithData,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Get trending/popular posts
     * @param {Number} page - Page number
     * @param {Number} limit - Posts per page
     * @param {String} timeframe - 'day', 'week', 'month'
     * @returns {Promise<Object>} Trending posts
     */
    async getTrendingPosts(page = 1, limit = 20, timeframe = 'day', currentUserId = null) {
        await this.publishDueScheduledPosts();

        const skip = (page - 1) * limit;
        const accessibleAuthorIds = await this.getAccessibleAuthorIds(currentUserId);

        if (!accessibleAuthorIds.length) {
            return {
                posts: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 1,
                    hasMore: false
                }
            };
        }

        // Calculate time range
        const timeRanges = {
            day: 24,
            week: 24 * 7,
            month: 24 * 30
        };

        const hours = timeRanges[timeframe] || 24;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const query = {
            status: 'active',
            visibility: 'public',
            author: { $in: accessibleAuthorIds },
            createdAt: { $gte: since }
        };

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({
                    likesCount: -1,
                    commentsCount: -1,
                    viewsCount: -1,
                    createdAt: -1
                })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .populate({
                    path: 'originalPost',
                    populate: { path: 'author', select: 'username name avatar isVerified' }
                })
                .lean(),
            Post.countDocuments(query)
        ]);

        return {
            posts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Search posts
     * @param {String} query - Search query
     * @param {Number} page - Page number
     * @param {Number} limit - Results per page
     * @returns {Promise<Object>} Search results
     */
    async searchPosts(query, page = 1, limit = 20, currentUserId = null) {
        await this.publishDueScheduledPosts();

        const skip = (page - 1) * limit;
        const accessibleAuthorIds = await this.getAccessibleAuthorIds(currentUserId);

        if (!accessibleAuthorIds.length) {
            return {
                posts: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 1,
                    hasMore: false
                }
            };
        }

        const searchQuery = {
            status: 'active',
            visibility: 'public',
            author: { $in: accessibleAuthorIds },
            $text: { $search: query }
        };

        const [posts, total] = await Promise.all([
            Post.find(searchQuery)
                .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .populate({
                    path: 'originalPost',
                    populate: { path: 'author', select: 'username name avatar isVerified' }
                })
                .lean(),
            Post.countDocuments(searchQuery)
        ]);

        return {
            posts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Get posts by hashtag
     * @param {String} hashtag - Hashtag (without #)
     * @param {Number} page - Page number
     * @param {Number} limit - Posts per page
     * @returns {Promise<Object>} Posts with hashtag
     */
    async getPostsByHashtag(hashtag, page = 1, limit = 20, currentUserId = null) {
        await this.publishDueScheduledPosts();

        const skip = (page - 1) * limit;
        const accessibleAuthorIds = await this.getAccessibleAuthorIds(currentUserId);

        if (!accessibleAuthorIds.length) {
            return {
                hashtag: `#${hashtag}`,
                posts: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 1,
                    hasMore: false
                }
            };
        }

        const query = {
            status: 'active',
            visibility: 'public',
            author: { $in: accessibleAuthorIds },
            hashtags: hashtag.toLowerCase()
        };

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .populate({
                    path: 'originalPost',
                    populate: { path: 'author', select: 'username name avatar isVerified' }
                })
                .lean(),
            Post.countDocuments(query)
        ]);

        return {
            hashtag: `#${hashtag}`,
            posts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Add user engagement data to posts
     * @param {Array} posts - Array of posts
     * @param {ObjectId} userId - Current user ID
     * @returns {Promise<Array>} Posts with engagement data
     */
    async addUserEngagementData(posts, userId) {
        if (!posts.length || !userId) return posts;

        const postIds = posts
            .map((post) => post?._id)
            .filter(Boolean);

        if (!postIds.length) return posts;

        const authorIds = [
            ...new Set(
                posts
                    .map((post) => post?.author?._id || post?.author)
                    .filter(Boolean)
                    .map((id) => String(id))
            )
        ];

        const [likedMap, savedMap, reposts, followRelationships, followedByRelationships] = await Promise.all([
            Like.checkMultipleLikes(userId, postIds),
            PostSave.checkMultipleSaved(userId, postIds),
            Post.find({
                author: userId,
                originalPost: { $in: postIds },
                postType: { $in: ["repost", "quote"] },
                status: "active"
            })
                .select("originalPost")
                .lean(),
            authorIds.length
                ? Follow.find({
                    follower: userId,
                    following: { $in: authorIds },
                    status: "active"
                })
                    .select("following isApproved")
                    .lean()
                : [],
            authorIds.length
                ? Follow.find({
                    follower: { $in: authorIds },
                    following: userId,
                    status: "active",
                    isApproved: true
                })
                    .select("follower")
                    .lean()
                : []
        ]);

        const repostMap = {};
        postIds.forEach((id) => {
            repostMap[String(id)] = false;
        });
        reposts.forEach((post) => {
            if (!post?.originalPost) return;
            repostMap[String(post.originalPost)] = true;
        });

        const followingMap = {};
        const followRequestMap = {};
        const followedByMap = {};

        authorIds.forEach((authorId) => {
            const key = String(authorId);
            followingMap[key] = false;
            followRequestMap[key] = false;
            followedByMap[key] = false;
        });

        followRelationships.forEach((relationship) => {
            const key = String(relationship?.following || "");
            if (!key) return;
            followingMap[key] = Boolean(relationship?.isApproved);
            followRequestMap[key] = !relationship?.isApproved;
        });

        followedByRelationships.forEach((relationship) => {
            const key = String(relationship?.follower || "");
            if (!key) return;
            followedByMap[key] = true;
        });

        return posts.map((post) => {
            const postId = String(post?._id);
            const authorId = String(post?.author?._id || post?.author || "");

            return {
                ...post,
                userEngagement: {
                    hasLiked: Boolean(likedMap[postId]),
                    hasSaved: Boolean(savedMap[postId]),
                    hasReposted: Boolean(repostMap[postId]),
                    isFollowingAuthor: Boolean(followingMap[authorId]),
                    isFollowRequestPending: Boolean(followRequestMap[authorId]),
                    isFollowedByAuthor: Boolean(followedByMap[authorId])
                }
            };
        });
    }
}

module.exports = new PostService();


