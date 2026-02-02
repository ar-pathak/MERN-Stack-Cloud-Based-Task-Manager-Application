const mongoose = require('mongoose');
const Comment = require('../../models/comment');
const Post = require('../../models/post');
const User = require('../../models/user');

class CommentService {

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

        try {
            // Verify post exists and comments are enabled
            const post = await Post.findById(postId).session(session);

            if (!post || post.status !== 'active') {
                throw new Error('Post not found');
            }

            if (post.settings?.commentsDisabled) {
                throw new Error('Comments are disabled on this post');
            }

            // If replying to a comment, verify it exists
            if (parentCommentId) {
                const parentComment = await Comment.findById(parentCommentId).session(session);

                if (!parentComment || parentComment.status !== 'active') {
                    throw new Error('Parent comment not found');
                }

                if (parentComment.post.toString() !== postId.toString()) {
                    throw new Error('Parent comment does not belong to this post');
                }
            }

            // Extract mentions from content
            const mentionRegex = /@(\w+)/g;
            const mentionMatches = content.match(mentionRegex) || [];
            const mentionUsernames = mentionMatches.map(m => m.substring(1).toLowerCase());

            let mentions = [];
            if (mentionUsernames.length > 0) {
                const mentionedUsers = await User.find({
                    username: { $in: mentionUsernames },
                    accountStatus: 'active'
                }).select('_id').session(session);

                mentions = mentionedUsers.map(u => u._id);
            }

            // Create comment
            const [comment] = await Comment.create([{
                post: postId,
                author: userId,
                content,
                parentComment: parentCommentId,
                media,
                mentions
            }], { session });

            await session.commitTransaction();

            // Populate author info
            await comment.populate('author', 'username name avatar isVerified');

            // TODO: Send notifications to post author and mentioned users

            return comment;
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
            throw new Error('Comment not found');
        }

        if (comment.author.toString() !== userId.toString()) {
            throw new Error('You do not have permission to edit this comment');
        }

        if (comment.status !== 'active') {
            throw new Error('Cannot edit a deleted or hidden comment');
        }

        comment.content = content;
        await comment.save();

        await comment.populate('author', 'username name avatar isVerified');
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
                .populate('post')
                .session(session);

            if (!comment) {
                throw new Error('Comment not found');
            }

            // Check if user is comment author or post author
            const isAuthor = comment.author.toString() === userId.toString();
            const isPostAuthor = comment.post.author.toString() === userId.toString();

            if (!isAuthor && !isPostAuthor) {
                throw new Error('You do not have permission to delete this comment');
            }

            // Soft delete
            comment.status = 'deleted';
            await comment.save({ session });

            // Or hard delete (uncomment if preferred)
            // await Comment.findByIdAndDelete(commentId).session(session);

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
    async getPostComments(postId, page = 1, limit = 20, sortBy = 'recent') {
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
                    .lean();

                return {
                    ...comment,
                    replies: replies,
                    hasMoreReplies: comment.repliesCount > 3
                };
            })
        );

        return {
            comments: commentsWithReplies,
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
    async getCommentReplies(commentId, page = 1, limit = 20) {
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

        return {
            replies,
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