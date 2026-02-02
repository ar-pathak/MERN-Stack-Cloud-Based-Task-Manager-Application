const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const userController = require('./user.controller');
const { validate } = require('../../middleware/validate');
const {
    updateProfileSchema,
    searchSchema,
    userIdSchema,
    usernameParamSchema,
    preferencesSchema,
    activitySchema,
    popularUsersSchema
} = require('./user.validation');

// --- Public Routes (No Auth Required) ---

// Get popular/trending users
router.get(
    '/popular',
    validate(popularUsersSchema, 'query'),
    userController.getPopularUsers
);

// Check username availability
router.get(
    '/check-username/:username',
    validate(usernameParamSchema, 'params'),
    userController.checkUsername
);

// --- Protected Routes (Auth Required) ---
router.use(authMiddleware);

// Get current user's profile
router.get('/me', userController.getMyProfile);

// Update current user's profile
router.put(
    '/me',
    validate(updateProfileSchema),
    userController.updateProfile
);

// Update user preferences
router.patch(
    '/me/preferences',
    validate(preferencesSchema),
    userController.updatePreferences
);

// Update activity status
router.post(
    '/me/activity',
    validate(activitySchema),
    userController.updateActivity
);

// Deactivate account
router.post('/me/deactivate', userController.deactivateAccount);

// Search users
router.get(
    '/search',
    validate(searchSchema, 'query'),
    userController.searchUsers
);

// Get user statistics
router.get(
    '/:id/stats',
    validate(userIdSchema, 'params'),
    userController.getUserStats
);

// Get specific user profile (public)
// Using optionalAuthMiddleware would allow unauthenticated access too
router.get(
    '/:id',
    validate(userIdSchema, 'params'),
    userController.getUserById
);

module.exports = router;