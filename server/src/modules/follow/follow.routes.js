const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const followController = require('./follow.controller');
const { validate } = require('../../middlewares/validate');
const { 
    idParamSchema, 
    listSchema,
    requestIdSchema 
} = require('./follow.validation');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// --- Follow/Unfollow Actions ---
router.post(
    '/:id/follow',
    validate(idParamSchema, 'params'),
    followController.follow
);

router.delete(
    '/:id/follow',
    validate(idParamSchema, 'params'),
    followController.unfollow
);

// --- Follow Status Check ---
router.get(
    '/:id/following/status',
    validate(idParamSchema, 'params'),
    followController.checkFollowStatus
);

// --- Followers & Following Lists ---
// Note: These could be made public with optionalAuthMiddleware if desired
router.get(
    '/:id/followers',
    validate(idParamSchema, 'params'),
    validate(listSchema, 'query'),
    followController.getFollowers
);

router.get(
    '/:id/following',
    validate(idParamSchema, 'params'),
    validate(listSchema, 'query'),
    followController.getFollowing
);

// --- Mutual Followers ---
router.get(
    '/:id/followers/mutual',
    validate(idParamSchema, 'params'),
    followController.getMutualFollowers
);

// --- Remove Follower ---
router.delete(
    '/:id/followers',
    validate(idParamSchema, 'params'),
    followController.removeFollower
);

// --- Follow Suggestions ---
router.get(
    '/suggestions',
    validate(listSchema, 'query'),
    followController.getFollowSuggestions
);

// --- Follow Requests (for private accounts) ---
router.get(
    '/requests/pending',
    validate(listSchema, 'query'),
    followController.getPendingRequests
);

router.post(
    '/requests/:requestId/approve',
    validate(requestIdSchema, 'params'),
    followController.approveFollowRequest
);

router.delete(
    '/requests/:requestId',
    validate(requestIdSchema, 'params'),
    followController.rejectFollowRequest
);

module.exports = router;