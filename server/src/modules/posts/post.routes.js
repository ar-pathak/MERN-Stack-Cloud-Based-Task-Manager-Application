const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const postController = require('./post.controller');
const { validate } = require('../../middleware/validate');
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
    sharePostSchema,
    repostPostSchema,
    commentSchema,
    updateCommentSchema,
    commentIdSchema,
    commentSortSchema
} = require('./post.validation');

// --- Public Routes (No Auth Required) ---


// Explore/Public feed
router.get(
    '/explore',
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

// Get user's posts (public profile)
router.get(
    '/user/:userId',
    validate(userIdSchema, 'params'),
    validate(paginationSchema, 'query'),
    postController.getUserPosts
);

// --- Protected Routes (Auth Required) ---

// Create post
router.post(
    '/',
    authMiddleware,
    validate(createPostSchema),
    postController.createPost
);

// Get personalized feed
router.get(
    '/feed',
    authMiddleware,
    validate(paginationSchema, 'query'),
    postController.getFeed
);

// Get bookmarked posts
router.get(
    '/bookmarks',
    authMiddleware,
    validate(paginationSchema, 'query'),
    postController.getBookmarkedPosts
);

// Get liked posts
router.get(
    '/liked',
    authMiddleware,
    validate(paginationSchema, 'query'),
    postController.getLikedPosts
);

// Get specific post (public)
// Placed after static paths so /feed, /liked, /bookmarks resolve correctly.
router.get(
    '/:id',
    validate(postIdSchema, 'params'),
    postController.getPost
);

// Share post
router.post(
    '/:id/share',
    authMiddleware,
    validate(postIdSchema, 'params'),
    validate(sharePostSchema),
    postController.sharePost
);

// Repost / quote repost
router.post(
    '/:id/repost',
    authMiddleware,
    validate(postIdSchema, 'params'),
    validate(repostPostSchema),
    postController.repostPost
);

// Save / unsave post
router.post(
    '/:id/save',
    authMiddleware,
    validate(postIdSchema, 'params'),
    postController.savePost
);

router.delete(
    '/:id/save',
    authMiddleware,
    validate(postIdSchema, 'params'),
    postController.unsavePost
);

// Update post
router.put(
    '/:id',
    authMiddleware,
    validate(postIdSchema, 'params'),
    validate(updatePostSchema),
    postController.updatePost
);

// Delete post
router.delete(
    '/:id',
    authMiddleware,
    validate(postIdSchema, 'params'),
    postController.deletePost
);

// --- Like/Unlike Post ---
router.post(
    '/:id/like',
    authMiddleware,
    validate(postIdSchema, 'params'),
    validate(likeSchema),
    postController.likePost
);

router.delete(
    '/:id/like',
    authMiddleware,
    validate(postIdSchema, 'params'),
    postController.unlikePost
);

// Get post likes
router.get(
    '/:id/likes',
    authMiddleware,
    validate(postIdSchema, 'params'),
    validate(paginationSchema, 'query'),
    postController.getPostLikes
);

// --- Comments ---

// Add comment to post
router.post(
    '/:id/comments',
    authMiddleware,
    validate(postIdSchema, 'params'),
    validate(commentSchema),
    postController.addComment
);

// Get post comments
router.get(
    '/:id/comments',
    authMiddleware,
    validate(postIdSchema, 'params'),
    validate(commentSortSchema, 'query'),
    postController.getComments
);

// Update comment
router.put(
    '/comments/:commentId',
    authMiddleware,
    validate(commentIdSchema, 'params'),
    validate(updateCommentSchema),
    postController.updateComment
);

// Delete comment
router.delete(
    '/comments/:commentId',
    authMiddleware,
    validate(commentIdSchema, 'params'),
    postController.deleteComment
);

// Get comment replies
router.get(
    '/comments/:commentId/replies',
    authMiddleware,
    validate(commentIdSchema, 'params'),
    validate(paginationSchema, 'query'),
    postController.getCommentReplies
);

// Like/Unlike comment
router.post(
    '/comments/:commentId/like',
    authMiddleware,
    validate(commentIdSchema, 'params'),
    postController.likeComment
);

router.delete(
    '/comments/:commentId/like',
    authMiddleware,
    validate(commentIdSchema, 'params'),
    postController.unlikeComment
);

module.exports = router;
