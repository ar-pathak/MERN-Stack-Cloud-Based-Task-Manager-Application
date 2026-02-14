const mongoose = require('mongoose');
const Comment = require('../../models/comment');
const Post = require('../../models/post');
const Like = require('../../models/like');
const User = require('../../models/user');
const notificationService = require('../notification/notification.service');
const { resolveMentionUsersFromText, notifyMentionedUsers, getMentionSnippet } = require('../utils/mentionService');
const postService = require('./post.service');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

class CommentService {
    async buildCommentLikeSet(commentIds = [], currentUserId) {
        const normalizedIds = Array.from(
            new Set(
                (Array.isArray(commentIds) ? commentIds : [])
                    .filter(Boolean)
                    .map((id) => String(id))
            )
        );

        if (!currentUserId || normalizedIds.length === 0) {
            return new Set();
        }

        const likedCommentIds = await Like.find({
            user: currentUserId,
            comment: { $in: normalizedIds }
        }).distinct("comment");

        return new Set((likedCommentIds || []).map((id) => String(id)));
    }

    attachCommentEngagement(comment, likedCommentIds = new Set()) {
        const replies = Array.isArray(comment?.replies) ? comment.replies : [];

        return {
            ...comment,
            replies: replies.map((reply) => ({
                ...reply,
                userEngagement: {
                    ...(reply?.userEngagement || {}),
                    hasLiked: likedCommentIds.has(String(reply?._id || ""))
                }
            })),
            userEngagement: {
                ...(comment?.userEngagement || {}),
                hasLiked: likedCommentIds.has(String(comment?._id || ""))
            }
        };
    }

    /**
     * Create a comment on a post
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} postId - Post ID
     * @param {String} content - Comment content
     * @param {ObjectId} parentCommentId - Parent comment ID (for replies)
     * @param {String} media - Media URL (optional)
     * @returns {Promise<Object>} Created comment
     */
    async createComment(userId, postId, content, parentCommentId = null, media = null) {
        const session = await mongoose.startSession();
        session.startTransaction();

        let mentionUsers = [];
        let parentComment = null;
        const socialNotificationTargets = new Map();

        try {
            // Verify post exists and comments are enabled
            const post = await Post.findById(postId)
                .select("_id author status visibility settings")
                .session(session);

            if (!post || post.status !== "active") {
                throw createError("Post not found", 404);
            }

            await postService.assertCanAccessPost(post, userId, "comment on this post");

            if (post.settings?.commentsDisabled) {
                throw createError("Comments are disabled on this post", 403);
            }

            // If replying to a comment, verify it exists
            if (parentCommentId) {
                parentComment = await Comment.findById(parentCommentId).session(session);

                if (!parentComment || parentComment.status !== "active") {
                    throw createError("Parent comment not found", 404);
                }

                if (parentComment.post.toString() !== postId.toString()) {
                    throw createError("Parent comment does not belong to this post", 400);
                }
            }

            mentionUsers = await resolveMentionUsersFromText([content], {
                excludeUserIds: [userId],
                session
            });

            // Create comment
            const [comment] = await Comment.create([{
                post: postId,
                author: userId,
                content,
                parentComment: parentCommentId,
                media,
                mentions: mentionUsers.map((user) => user._id)
            }], { session });

            const commenterId = String(userId || "");
            const postAuthorId = String(post.author || "");

            if (postAuthorId && commenterId && postAuthorId !== commenterId) {
                const postAuthor = await User.findById(post.author)
                    .select("preferences.notifications.comments")
                    .session(session)
                    .lean();

                if (postAuthor?.preferences?.notifications?.comments !== false) {
                    socialNotificationTargets.set(postAuthorId, {
                        recipientId: post.author,
                        kind: "post_comment"
                    });
                }
            }

            if (parentComment?.author) {
                const parentAuthorId = String(parentComment.author || "");
                if (parentAuthorId && commenterId && parentAuthorId !== commenterId) {
                    const parentAuthor = await User.findById(parentComment.author)
                        .select("preferences.notifications.comments")
                        .session(session)
                        .lean();

                    if (parentAuthor?.preferences?.notifications?.comments !== false) {
                        socialNotificationTargets.set(parentAuthorId, {
                            recipientId: parentComment.author,
                            kind: "comment_reply"
                        });
                    }
                }
            }

            await session.commitTransaction();

            // Populate author + mentions info
            await comment.populate("author", "username name avatar isVerified");
            await comment.populate("mentions", "username name avatar");

            const actorLabel = comment?.author?.name || comment?.author?.username || "Someone";

            if (socialNotificationTargets.size > 0) {
                const socialPayloads = Array.from(socialNotificationTargets.values()).map((entry) => {
                    if (entry.kind === "comment_reply") {
                        return {
                            recipientIds: [entry.recipientId],
                            actorId: userId,
                            title: "New reply to your comment",
                            message: `${actorLabel} replied to your comment`,
                            type: "activity",
                            category: "social",
                            priority: "normal",
                            entityType: "none",
                            entityId: comment._id,
                            link: "/main/feed",
                            metadata: {
                                kind: "comment_reply",
                                postId: String(postId),
                                commentId: String(comment._id),
                                parentCommentId: String(parentComment?._id || "")
                            },
                            dedupeKey: `social:comment_reply:${String(comment._id)}:${String(entry.recipientId)}`
                        };
                    }

                    return {
                        recipientIds: [entry.recipientId],
                        actorId: userId,
                        title: "New comment on your post",
                        message: `${actorLabel} commented on your post`,
                        type: "activity",
                        category: "social",
                        priority: "normal",
                        entityType: "none",
                        entityId: comment._id,
                        link: "/main/feed",
                        metadata: {
                            kind: "post_comment",
                            postId: String(postId),
                            commentId: String(comment._id)
                        },
                        dedupeKey: `social:post_comment:${String(comment._id)}:${String(entry.recipientId)}`
                    };
                });

                await Promise.all(
                    socialPayloads.map(async (payload) => {
                        try {
                            await notificationService.createNotifications(payload);
                        } catch (notificationError) {
                            console.error("comment notification error", notificationError);
                        }
                    })
                );
            }

            if (mentionUsers.length > 0) {
                await notifyMentionedUsers({
                    actorId: userId,
                    mentionUsers,
                    title: "You were mentioned in a comment",
                    message: `${actorLabel} mentioned you in a comment: "${getMentionSnippet(content)}"`,
                    type: "activity",
                    category: "social",
                    priority: "normal",
                    entityType: "none",
                    entityId: comment._id,
                    link: "/main",
                    metadata: {
                        source: "comment.create",
                        commentId: comment._id,
                        postId
                    },
                    dedupeKey: `mention:comment:${String(comment._id)}`
                });
            }

            const serializedComment = comment.toObject();
            serializedComment.userEngagement = { hasLiked: false };
            serializedComment.replies = [];
            serializedComment.hasMoreReplies = false;

            return serializedComment;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Update a comment
     * @param {ObjectId} commentId - Comment ID
     * @param {ObjectId} userId - User ID (must be author)
     * @param {String} content - New content
     * @returns {Promise<Object>} Updated comment
     */
    async updateComment(commentId, userId, content) {
        const comment = await Comment.findById(commentId);

        if (!comment) {
            throw new Error("Comment not found");
        }

        if (comment.author.toString() !== userId.toString()) {
            throw new Error("You do not have permission to edit this comment");
        }

        if (comment.status !== "active") {
            throw new Error("Cannot edit a deleted or hidden comment");
        }

        const mentionUsers = await resolveMentionUsersFromText([content], {
            excludeUserIds: [userId]
        });

        const previousMentionIds = new Set((comment.mentions || []).map((id) => String(id)));

        comment.content = content;
        comment.mentions = mentionUsers.map((user) => user._id);
        await comment.save();

        await comment.populate("author", "username name avatar isVerified");
        await comment.populate("mentions", "username name avatar");

        const newlyMentioned = mentionUsers.filter(
            (user) => !previousMentionIds.has(String(user._id))
        );

        if (newlyMentioned.length > 0) {
            const actor = await User.findById(userId).select("name username").lean();
            const actorLabel = actor?.name || actor?.username || "Someone";

            await notifyMentionedUsers({
                actorId: userId,
                mentionUsers: newlyMentioned,
                title: "You were mentioned in an edited comment",
                message: `${actorLabel} mentioned you in an edited comment: "${getMentionSnippet(content)}"`,
                type: "activity",
                category: "social",
                priority: "normal",
                entityType: "none",
                entityId: comment._id,
                link: "/main",
                metadata: {
                    source: "comment.update",
                    commentId: comment._id,
                    postId: comment.post
                },
                dedupeKey: `mention:comment:update:${String(comment._id)}`
            });
        }

        return comment;
    }

    /**
     * Delete a comment
     * @param {ObjectId} commentId - Comment ID
     * @param {ObjectId} userId - User ID (must be author or post author)
     * @returns {Promise<Object>} Result
     */
    async deleteComment(commentId, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const comment = await Comment.findById(commentId)
                .select("_id post author parentComment status")
                .session(session);

            if (!comment) {
                throw createError('Comment not found', 404);
            }

            const post = await Post.findById(comment.post)
                .select("_id author")
                .session(session);

            if (!post) {
                throw createError("Post not found", 404);
            }

            // Check if user is comment author or post author
            const isAuthor = comment.author.toString() === userId.toString();
            const isPostAuthor = post.author.toString() === userId.toString();

            if (!isAuthor && !isPostAuthor) {
                throw createError('You do not have permission to delete this comment', 403);
            }

            if (comment.status !== "active") {
                await session.commitTransaction();
                return { success: true, message: "Comment already deleted" };
            }

            const queue = [comment._id];
            const visited = new Set([String(comment._id)]);
            const activeComments = [{
                _id: comment._id,
                parentComment: comment.parentComment
            }];

            let cursor = 0;
            while (cursor < queue.length) {
                const batch = queue.slice(cursor, cursor + 100);
                cursor += 100;

                const children = await Comment.find({
                    parentComment: { $in: batch }
                })
                    .select("_id parentComment status")
                    .session(session)
                    .lean();

                children.forEach((child) => {
                    const childId = String(child._id);
                    if (!visited.has(childId)) {
                        visited.add(childId);
                        queue.push(child._id);
                    }

                    if (child.status === "active") {
                        activeComments.push({
                            _id: child._id,
                            parentComment: child.parentComment
                        });
                    }
                });
            }

            const activeCommentIds = activeComments.map((item) => item._id);
            const activeIdSet = new Set(activeCommentIds.map((id) => String(id)));
            const parentReplyDecrements = new Map();

            activeComments.forEach((item) => {
                if (!item.parentComment) return;

                const parentId = String(item.parentComment);
                if (!parentId || activeIdSet.has(parentId)) {
                    return;
                }

                parentReplyDecrements.set(
                    parentId,
                    (parentReplyDecrements.get(parentId) || 0) + 1
                );
            });

            await Comment.updateMany(
                { _id: { $in: activeCommentIds } },
                { $set: { status: "deleted" } },
                { session }
            );

            await Post.updateOne(
                { _id: comment.post, commentsCount: { $gt: 0 } },
                { $inc: { commentsCount: -activeCommentIds.length } },
                { session }
            );

            await Post.updateOne(
                { _id: comment.post, commentsCount: { $lt: 0 } },
                { $set: { commentsCount: 0 } },
                { session }
            );

            if (parentReplyDecrements.size > 0) {
                const parentIds = Array.from(parentReplyDecrements.keys());
                await Comment.bulkWrite(
                    Array.from(parentReplyDecrements.entries()).map(([parentId, decrementBy]) => ({
                        updateOne: {
                            filter: { _id: parentId, repliesCount: { $gt: 0 } },
                            update: { $inc: { repliesCount: -decrementBy } }
                        }
                    })),
                    { session }
                );

                await Comment.updateMany(
                    { _id: { $in: parentIds }, repliesCount: { $lt: 0 } },
                    { $set: { repliesCount: 0 } },
                    { session }
                );
            }

            await Like.deleteMany({ comment: { $in: activeCommentIds } }).session(session);

            await session.commitTransaction();
            return { success: true, message: 'Comment deleted successfully' };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get comments for a post
     * @param {ObjectId} postId - Post ID
     * @param {Number} page - Page number
     * @param {Number} limit - Comments per page
     * @param {String} sortBy - Sort order ('recent' or 'popular')
     * @returns {Promise<Object>} Comments
     */
    async getPostComments(postId, currentUserId, page = 1, limit = 20, sortBy = 'recent') {
        await postService.assertCanAccessPostById(postId, currentUserId, "view comments on this post");
        const skip = (page - 1) * limit;

        const query = {
            post: postId,
            parentComment: null, // Only top-level comments
            status: 'active'
        };

        // Determine sort order
        let sort = { createdAt: -1 }; // Recent by default
        if (sortBy === 'popular') {
            sort = { likesCount: -1, createdAt: -1 };
        }

        const [comments, total] = await Promise.all([
            Comment.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .populate({
                    path: 'mentions',
                    select: 'username'
                })
                .lean(),
            Comment.countDocuments(query)
        ]);

        // Get replies count for each comment (first 3 replies)
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment) => {
                const replies = await Comment.find({
                    parentComment: comment._id,
                    status: 'active'
                })
                    .sort({ createdAt: 1 })
                    .limit(3)
                    .populate('author', 'username name avatar isVerified')
                    .populate({
                        path: 'mentions',
                        select: 'username'
                    })
                    .lean();

                return {
                    ...comment,
                    replies: replies,
                    hasMoreReplies: comment.repliesCount > 3
                };
            })
        );

        const commentIds = commentsWithReplies.flatMap((comment) => ([
            comment?._id,
            ...(Array.isArray(comment?.replies)
                ? comment.replies.map((reply) => reply?._id)
                : [])
        ]));
        const likedCommentIds = await this.buildCommentLikeSet(commentIds, currentUserId);
        const commentsWithEngagement = commentsWithReplies.map((comment) =>
            this.attachCommentEngagement(comment, likedCommentIds)
        );

        return {
            comments: commentsWithEngagement,
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
     * Get replies to a comment
     * @param {ObjectId} commentId - Parent comment ID
     * @param {Number} page - Page number
     * @param {Number} limit - Replies per page
     * @returns {Promise<Object>} Replies
     */
    async getCommentReplies(commentId, currentUserId, page = 1, limit = 20) {
        const parentComment = await Comment.findById(commentId)
            .select("_id post status");

        if (!parentComment || parentComment.status !== "active") {
            throw createError("Comment not found", 404);
        }

        await postService.assertCanAccessPostById(
            parentComment.post,
            currentUserId,
            "view replies on this comment"
        );

        const skip = (page - 1) * limit;

        const query = {
            parentComment: commentId,
            status: 'active'
        };

        const [replies, total] = await Promise.all([
            Comment.find(query)
                .sort({ createdAt: 1 }) // Oldest first for replies
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .populate({
                    path: 'mentions',
                    select: 'username'
                })
                .lean(),
            Comment.countDocuments(query)
        ]);

        const likedCommentIds = await this.buildCommentLikeSet(
            replies.map((reply) => reply?._id),
            currentUserId
        );
        const repliesWithEngagement = replies.map((reply) => ({
            ...reply,
            userEngagement: {
                ...(reply?.userEngagement || {}),
                hasLiked: likedCommentIds.has(String(reply?._id || ""))
            }
        }));

        return {
            replies: repliesWithEngagement,
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
     * Get user's comments
     * @param {ObjectId} userId - User ID
     * @param {Number} page - Page number
     * @param {Number} limit - Comments per page
     * @returns {Promise<Object>} User's comments
     */
    async getUserComments(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const query = {
            author: userId,
            status: 'active'
        };

        const [comments, total] = await Promise.all([
            Comment.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .populate({
                    path: 'post',
                    select: 'content author',
                    populate: { path: 'author', select: 'username name avatar' }
                })
                .lean(),
            Comment.countDocuments(query)
        ]);

        return {
            comments,
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

module.exports = new CommentService();

