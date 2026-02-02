const mongoose = require('mongoose');
const Like = require('../../models/like');
const Post = require('../../models/post');
const Comment = require('../../models/comment');

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

        try {
            // Check if post exists
            const post = await Post.findById(postId).session(session);
            if (!post || post.status !== 'active') {
                throw new Error('Post not found');
            }

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
                    return { success: true, message: 'Reaction updated' };
                }
                throw new Error('You have already liked this post');
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

            // TODO: Send notification to post author

            await session.commitTransaction();
            return { success: true, message: 'Post liked successfully' };
        } catch (error) {
            await session.abortTransaction();
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
                throw new Error('You have not liked this post');
            }

            // Delete like
            await Like.findByIdAndDelete(like._id).session(session);

            // Decrement post like count
            await Post.findByIdAndUpdate(
                postId,
                { $inc: { likesCount: -1 } },
                { session }
            );

            await session.commitTransaction();
            return { success: true, message: 'Post unliked successfully' };
        } catch (error) {
            await session.abortTransaction();
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

        try {
            const comment = await Comment.findById(commentId).session(session);
            if (!comment || comment.status !== 'active') {
                throw new Error('Comment not found');
            }

            // Check if already liked
            const existingLike = await Like.findOne({
                user: userId,
                comment: commentId
            }).session(session);

            if (existingLike) {
                throw new Error('You have already liked this comment');
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

            await session.commitTransaction();
            return { success: true, message: 'Comment liked successfully' };
        } catch (error) {
            await session.abortTransaction();
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
                throw new Error('You have not liked this comment');
            }

            await Like.findByIdAndDelete(like._id).session(session);

            await Comment.findByIdAndUpdate(
                commentId,
                { $inc: { likesCount: -1 } },
                { session }
            );

            await session.commitTransaction();
            return { success: true, message: 'Comment unliked successfully' };
        } catch (error) {
            await session.abortTransaction();
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
    async getPostLikes(postId, page = 1, limit = 20) {
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
            post: { $exists: true }
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

        return {
            posts: likes.map(like => ({
                ...like.post,
                likedAt: like.createdAt
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
}

module.exports = new LikeService();