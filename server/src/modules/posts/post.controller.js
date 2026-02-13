const postService = require('./post.service');
const likeService = require('./like.service');
const commentService = require('./comment.service');
const { sendSuccess, handleError } = require('../../helpers/responseHelper');

const postController = {
    /**
     * Create a new post
     * POST /posts
     */
    createPost: async (req, res) => {
        try {
            const post = await postService.createPost(req.user._id, req.body);
            return sendSuccess(res, { post }, 'Post created successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get a single post
     * GET /posts/:id
     */
    getPost: async (req, res) => {
        try {
            const post = await postService.getPostById(req.params.id, req.user?._id);
            return sendSuccess(res, { post }, 'Post retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Update a post
     * PUT /posts/:id
     */
    updatePost: async (req, res) => {
        try {
            const post = await postService.updatePost(
                req.params.id,
                req.user._id,
                req.body
            );
            return sendSuccess(res, { post }, 'Post updated successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Delete a post
     * DELETE /posts/:id
     */
    deletePost: async (req, res) => {
        try {
            await postService.deletePost(req.params.id, req.user._id);
            return sendSuccess(res, null, 'Post deleted successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get user feed (posts from followed users)
     * GET /posts/feed
     */
    getFeed: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await postService.getUserFeed(
                req.user._id,
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'Feed retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get public/explore feed
     * GET /posts/explore
     */
    getExploreFeed: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await postService.getPublicFeed(
                req.user?._id,
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'Explore feed retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get trending posts
     * GET /posts/trending
     */
    getTrending: async (req, res) => {
        try {
            const { page = 1, limit = 20, timeframe = 'day' } = req.query;
            const result = await postService.getTrendingPosts(
                parseInt(page),
                parseInt(limit),
                timeframe
            );
            return sendSuccess(res, result, 'Trending posts retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get user's posts
     * GET /posts/user/:userId
     */
    getUserPosts: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await postService.getUserPosts(
                req.params.userId,
                req.user?._id,
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'User posts retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Search posts
     * GET /posts/search
     */
    searchPosts: async (req, res) => {
        try {
            const { query, page = 1, limit = 20 } = req.query;
            const result = await postService.searchPosts(
                query,
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'Search results retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get posts by hashtag
     * GET /posts/hashtag/:hashtag
     */
    getHashtagPosts: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await postService.getPostsByHashtag(
                req.params.hashtag,
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'Hashtag posts retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Like a post
     * POST /posts/:id/like
     */
    likePost: async (req, res) => {
        try {
            const { reactionType = 'like' } = req.body;
            await likeService.likePost(req.user._id, req.params.id, reactionType);
            return sendSuccess(res, null, 'Post liked successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Unlike a post
     * DELETE /posts/:id/like
     */
    unlikePost: async (req, res) => {
        try {
            await likeService.unlikePost(req.user._id, req.params.id);
            return sendSuccess(res, null, 'Post unliked successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get post likes
     * GET /posts/:id/likes
     */
    getPostLikes: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await likeService.getPostLikes(
                req.params.id,
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'Post likes retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get user's liked posts
     * GET /posts/liked
     */
    getLikedPosts: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await likeService.getUserLikedPosts(
                req.user._id,
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'Liked posts retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Save a post
     * POST /posts/:id/save
     */
    savePost: async (req, res) => {
        try {
            const result = await postService.savePost(req.user._id, req.params.id);
            return sendSuccess(res, result, 'Post saved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Unsave a post
     * DELETE /posts/:id/save
     */
    unsavePost: async (req, res) => {
        try {
            const result = await postService.unsavePost(req.user._id, req.params.id);
            return sendSuccess(res, result, 'Post removed from saved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get current user's bookmarked posts
     * GET /posts/bookmarks
     */
    getBookmarkedPosts: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await postService.getBookmarkedPosts(
                req.user._id,
                parseInt(page, 10),
                parseInt(limit, 10)
            );
            return sendSuccess(res, result, 'Bookmarked posts retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Track post share
     * POST /posts/:id/share
     */
    sharePost: async (req, res) => {
        try {
            const { channel = 'copy_link' } = req.body;
            const result = await postService.sharePost(req.params.id, channel);
            return sendSuccess(res, result, 'Post shared successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Repost / quote repost
     * POST /posts/:id/repost
     */
    repostPost: async (req, res) => {
        try {
            const post = await postService.repostPost(req.user._id, req.params.id, req.body);
            return sendSuccess(res, { post }, 'Post reposted successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Add a comment to a post
     * POST /posts/:id/comments
     */
    addComment: async (req, res) => {
        try {
            const { content, parentCommentId, media } = req.body;
            const comment = await commentService.createComment(
                req.user._id,
                req.params.id,
                content,
                parentCommentId,
                media
            );
            return sendSuccess(res, { comment }, 'Comment added successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get post comments
     * GET /posts/:id/comments
     */
    getComments: async (req, res) => {
        try {
            const { page = 1, limit = 20, sortBy = 'recent' } = req.query;
            const result = await commentService.getPostComments(
                req.params.id,
                parseInt(page),
                parseInt(limit),
                sortBy
            );
            return sendSuccess(res, result, 'Comments retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Update a comment
     * PUT /posts/comments/:commentId
     */
    updateComment: async (req, res) => {
        try {
            const { content } = req.body;
            const comment = await commentService.updateComment(
                req.params.commentId,
                req.user._id,
                content
            );
            return sendSuccess(res, { comment }, 'Comment updated successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Delete a comment
     * DELETE /posts/comments/:commentId
     */
    deleteComment: async (req, res) => {
        try {
            await commentService.deleteComment(req.params.commentId, req.user._id);
            return sendSuccess(res, null, 'Comment deleted successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get comment replies
     * GET /posts/comments/:commentId/replies
     */
    getCommentReplies: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await commentService.getCommentReplies(
                req.params.commentId,
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'Replies retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Like a comment
     * POST /posts/comments/:commentId/like
     */
    likeComment: async (req, res) => {
        try {
            await likeService.likeComment(req.user._id, req.params.commentId);
            return sendSuccess(res, null, 'Comment liked successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Unlike a comment
     * DELETE /posts/comments/:commentId/like
     */
    unlikeComment: async (req, res) => {
        try {
            await likeService.unlikeComment(req.user._id, req.params.commentId);
            return sendSuccess(res, null, 'Comment unliked successfully');
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = postController;
