const mongoose = require('mongoose');
const Like = require('../../models/like');
const Post = require('../../models/post');
const Comment = require('../../models/comment');
const User = require('../../models/user');
const notificationService = require('../notification/notification.service');
const postService = require('./post.service');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const isMongoDuplicateKeyError = (error) =>
    error?.name === "MongoServerError" && Number(error?.code) === 11000;

const isDuplicateLikeError = (error, targetKey) =>
    isMongoDuplicateKeyError(error) &&
    Boolean(error?.keyPattern?.user) &&
    Boolean(error?.keyPattern?.[targetKey]);

const abortSessionIfActive = async (session) => {
    if (!session) return;
    try {
        if (typeof session.inTransaction !== "function" || session.inTransaction()) {
            await session.abortTransaction();
        }
    } catch (_error) {
        // Ignore abort errors (e.g., transaction already ended).
    }
};

class LikeService {

    /**
     * Like a post
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} postId - Post ID
     * @param {String} reactionType - Type of reaction (default: 'like')
     * @returns {Promise<Object>} Result
     */
    async likePost(userId, postId, reactionType = 'like') {
        const session = await mongoose.startSession();
        session.startTransaction();

        let notificationPayload = null;

        try {
            const post = await postService.assertCanAccessPostById(
                postId,
                userId,
                "like this post",
                session
            );

            // Check if already liked
            const existingLike = await Like.findOne({
                user: userId,
                post: postId
            }).session(session);

            if (existingLike) {
                // Update reaction type if different
                if (existingLike.reactionType !== reactionType) {
                    existingLike.reactionType = reactionType;
                    await existingLike.save({ session });
                    await session.commitTransaction();
                    return { success: true, message: 'Reaction updated', liked: true };
                }
                await session.commitTransaction();
                return { success: true, message: 'Post already liked', liked: true };
            }

            // Create like
            await Like.create([{
                user: userId,
                post: postId,
                reactionType
            }], { session });

            // Increment post like count
            await Post.findByIdAndUpdate(
                postId,
                { $inc: { likesCount: 1 } },
                { session }
            );

            const postAuthorId = String(post.author || "");
            const actorId = String(userId || "");
            if (postAuthorId && actorId && postAuthorId !== actorId) {
                const [postAuthor, actor] = await Promise.all([
                    User.findById(post.author)
                        .select("preferences.notifications.likes")
                        .session(session)
                        .lean(),
                    User.findById(userId)
                        .select("name username")
                        .session(session)
                        .lean()
                ]);

                if (postAuthor?.preferences?.notifications?.likes !== false) {
                    const actorLabel = actor?.name || actor?.username || "Someone";
                    notificationPayload = {
                        recipientIds: [post.author],
                        actorId: userId,
                        title: "New like on your post",
                        message: `${actorLabel} liked your post`,
                        type: "activity",
                        category: "social",
                        priority: "normal",
                        entityType: "none",
                        entityId: postId,
                        link: `/post/${String(postId)}`,
                        metadata: {
                            kind: "post_like",
                            postId: String(postId),
                            reactionType
                        },
                        dedupeKey: `social:post_like:${String(userId)}:${String(postId)}`
                    };
                }
            }

            await session.commitTransaction();

            if (notificationPayload) {
                try {
                    await notificationService.createNotifications(notificationPayload);
                } catch (notificationError) {
                    console.error("post like notification error", notificationError);
                }
            }

            return { success: true, message: 'Post liked successfully', liked: true };
        } catch (error) {
            if (isDuplicateLikeError(error, "post")) {
                await abortSessionIfActive(session);

                const existingLike = await Like.findOne({
                    user: userId,
                    post: postId
                });

                if (existingLike) {
                    if (existingLike.reactionType !== reactionType) {
                        existingLike.reactionType = reactionType;
                        await existingLike.save();
                        return { success: true, message: 'Reaction updated', liked: true };
                    }

                    return { success: true, message: 'Post already liked', liked: true };
                }
            }

            await abortSessionIfActive(session);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Unlike a post
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} postId - Post ID
     * @returns {Promise<Object>} Result
     */
    async unlikePost(userId, postId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const like = await Like.findOne({
                user: userId,
                post: postId
            }).session(session);

            if (!like) {
                await session.commitTransaction();
                return { success: true, message: 'Post already unliked', liked: false };
            }

            // Delete like
            await Like.findByIdAndDelete(like._id).session(session);

            // Decrement post like count
            await Post.updateOne(
                { _id: postId, likesCount: { $gt: 0 } },
                { $inc: { likesCount: -1 } },
                { session }
            );

            await session.commitTransaction();
            return { success: true, message: 'Post unliked successfully', liked: false };
        } catch (error) {
            await abortSessionIfActive(session);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Like a comment
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} commentId - Comment ID
     * @returns {Promise<Object>} Result
     */
    async likeComment(userId, commentId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        let notificationPayload = null;

        try {
            const comment = await Comment.findById(commentId)
                .select("_id author post status")
                .session(session);
            if (!comment || comment.status !== 'active') {
                throw createError('Comment not found', 404);
            }

            await postService.assertCanAccessPostById(
                comment.post,
                userId,
                "like comments on this post",
                session
            );

            // Check if already liked
            const existingLike = await Like.findOne({
                user: userId,
                comment: commentId
            }).session(session);

            if (existingLike) {
                await session.commitTransaction();
                return { success: true, message: 'Comment already liked', liked: true };
            }

            // Create like
            await Like.create([{
                user: userId,
                comment: commentId
            }], { session });

            // Increment comment like count
            await Comment.findByIdAndUpdate(
                commentId,
                { $inc: { likesCount: 1 } },
                { session }
            );

            const commentAuthorId = String(comment.author || "");
            const actorId = String(userId || "");
            if (commentAuthorId && actorId && commentAuthorId !== actorId) {
                const [commentAuthor, actor] = await Promise.all([
                    User.findById(comment.author)
                        .select("preferences.notifications.likes")
                        .session(session)
                        .lean(),
                    User.findById(userId)
                        .select("name username")
                        .session(session)
                        .lean()
                ]);

                if (commentAuthor?.preferences?.notifications?.likes !== false) {
                    const actorLabel = actor?.name || actor?.username || "Someone";
                    notificationPayload = {
                        recipientIds: [comment.author],
                        actorId: userId,
                        title: "New like on your comment",
                        message: `${actorLabel} liked your comment`,
                        type: "activity",
                        category: "social",
                        priority: "normal",
                        entityType: "none",
                        entityId: commentId,
                        link: `/post/${String(comment.post)}`,
                        metadata: {
                            kind: "comment_like",
                            commentId: String(commentId),
                            postId: String(comment.post)
                        },
                        dedupeKey: `social:comment_like:${String(userId)}:${String(commentId)}`
                    };
                }
            }

            await session.commitTransaction();

            if (notificationPayload) {
                try {
                    await notificationService.createNotifications(notificationPayload);
                } catch (notificationError) {
                    console.error("comment like notification error", notificationError);
                }
            }

            return { success: true, message: 'Comment liked successfully', liked: true };
        } catch (error) {
            if (isDuplicateLikeError(error, "comment")) {
                await abortSessionIfActive(session);

                const existingLike = await Like.findOne({
                    user: userId,
                    comment: commentId
                });

                if (existingLike) {
                    return { success: true, message: 'Comment already liked', liked: true };
                }
            }

            await abortSessionIfActive(session);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Unlike a comment
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} commentId - Comment ID
     * @returns {Promise<Object>} Result
     */
    async unlikeComment(userId, commentId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const like = await Like.findOne({
                user: userId,
                comment: commentId
            }).session(session);

            if (!like) {
                await session.commitTransaction();
                return { success: true, message: 'Comment already unliked', liked: false };
            }

            await Like.findByIdAndDelete(like._id).session(session);

            await Comment.updateOne(
                { _id: commentId, likesCount: { $gt: 0 } },
                { $inc: { likesCount: -1 } },
                { session }
            );

            await session.commitTransaction();
            return { success: true, message: 'Comment unliked successfully', liked: false };
        } catch (error) {
            await abortSessionIfActive(session);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get users who liked a post
     * @param {ObjectId} postId - Post ID
     * @param {Number} page - Page number
     * @param {Number} limit - Results per page
     * @returns {Promise<Object>} Users who liked
     */
    async getPostLikes(postId, currentUserId, page = 1, limit = 20) {
        await postService.assertCanAccessPostById(postId, currentUserId, "view likes on this post");
        const skip = (page - 1) * limit;

        const query = { post: postId };

        const [likes, total] = await Promise.all([
            Like.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'username name avatar isVerified')
                .lean(),
            Like.countDocuments(query)
        ]);

        return {
            likes: likes.map(like => ({
                ...like.user,
                likedAt: like.createdAt,
                reactionType: like.reactionType
            })),
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
     * Get user's liked posts
     * @param {ObjectId} userId - User ID
     * @param {Number} page - Page number
     * @param {Number} limit - Results per page
     * @returns {Promise<Object>} Liked posts
     */
    async getUserLikedPosts(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const query = {
            user: userId,
            post: { $type: "objectId" }
        };

        const [likes, total] = await Promise.all([
            Like.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: 'post',
                    populate: { path: 'author', select: 'username name avatar isVerified' }
                })
                .lean(),
            Like.countDocuments(query)
        ]);

        const likedPosts = likes
            .filter((like) => like?.post && like.post.status === "active")
            .map((like) => ({
                ...like.post,
                likedAt: like.createdAt
            }));

        const accessibleLikedPosts = await postService.filterAccessiblePosts(likedPosts, userId);

        return {
            posts: accessibleLikedPosts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }
}

module.exports = new LikeService();
