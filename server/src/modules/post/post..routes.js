const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const optionalAuthMiddleware = require('../../middleware/optionalAuthMiddleware');
const postController = require('./post.controller');
const { validate } = require('../../middlewares/validate');
const {
    createPostSchema,
    updatePostSchema,
    postIdSchema,
    userIdSchema,
    paginationSchema,
    searchSchema,
    hashtagSchema,
    trendingSchema,
    likeSchema,
    commentSchema,
    updateCommentSchema,
    commentIdSchema,
    commentSortSchema
} = require('./post.validation');

// --- Public Routes (No Auth Required) ---

// Explore/Public feed
router.get(
    '/explore',
    optionalAuthMiddleware,
    validate(paginationSchema, 'query'),
    postController.getExploreFeed
);

// Trending posts
router.get(
    '/trending',
    validate(trendingSchema, 'query'),
    postController.getTrending
);

// Search posts
router.get(
    '/search',
    validate(searchSchema, 'query'),
    postController.searchPosts
);

// Get posts by hashtag
router.get(
    '/hashtag/:hashtag',
    validate(hashtagSchema, 'params'),
    validate(paginationSchema, 'query'),
    postController.getHashtagPosts
);

// Get specific post (public)
router.get(
    '/:id',
    optionalAuthMiddleware,
    validate(postIdSchema, 'params'),
    postController.getPost
);

// Get user's posts (public profile)
router.get(
    '/user/:userId',
    optionalAuthMiddleware,
    validate(userIdSchema, 'params'),
    validate(paginationSchema, 'query'),
    postController.getUserPosts
);

// --- Protected Routes (Auth Required) ---
router.use(authMiddleware);

// Create post
router.post(
    '/',
    validate(createPostSchema),
    postController.createPost
);

// Get personalized feed
router.get(
    '/feed',
    validate(paginationSchema, 'query'),
    postController.getFeed
);

// Get liked posts
router.get(
    '/liked',
    validate(paginationSchema, 'query'),
    postController.getLikedPosts
);

// Update post
router.put(
    '/:id',
    validate(postIdSchema, 'params'),
    validate(updatePostSchema),
    postController.updatePost
);

// Delete post
router.delete(
    '/:id',
    validate(postIdSchema, 'params'),
    postController.deletePost
);

// --- Like/Unlike Post ---
router.post(
    '/:id/like',
    validate(postIdSchema, 'params'),
    validate(likeSchema),
    postController.likePost
);

router.delete(
    '/:id/like',
    validate(postIdSchema, 'params'),
    postController.unlikePost
);

// Get post likes
router.get(
    '/:id/likes',
    validate(postIdSchema, 'params'),
    validate(paginationSchema, 'query'),
    postController.getPostLikes
);

// --- Comments ---

// Add comment to post
router.post(
    '/:id/comments',
    validate(postIdSchema, 'params'),
    validate(commentSchema),
    postController.addComment
);

// Get post comments
router.get(
    '/:id/comments',
    validate(postIdSchema, 'params'),
    validate(commentSortSchema, 'query'),
    postController.getComments
);

// Update comment
router.put(
    '/comments/:commentId',
    validate(commentIdSchema, 'params'),
    validate(updateCommentSchema),
    postController.updateComment
);

// Delete comment
router.delete(
    '/comments/:commentId',
    validate(commentIdSchema, 'params'),
    postController.deleteComment
);

// Get comment replies
router.get(
    '/comments/:commentId/replies',
    validate(commentIdSchema, 'params'),
    validate(paginationSchema, 'query'),
    postController.getCommentReplies
);

// Like/Unlike comment
router.post(
    '/comments/:commentId/like',
    validate(commentIdSchema, 'params'),
    postController.likeComment
);

router.delete(
    '/comments/:commentId/like',
    validate(commentIdSchema, 'params'),
    postController.unlikeComment
);

module.exports = router;