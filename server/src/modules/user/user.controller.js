const userService = require('./user.service');
const { sendSuccess, handleError } = require('../../helpers/responseHelper');

const userController = {
    /**
     * Get current user's profile
     * GET /me
     */
    getMyProfile: async (req, res) => {
        try {
            const user = await userService.getUserInfo(req.user._id);
            return sendSuccess(res, { user }, 'User profile retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Update current user's profile
     * PUT /me
     */
    updateProfile: async (req, res) => {
        try {
            const user = await userService.updateProfile(req.user._id, req.body);
            return sendSuccess(res, { user }, 'Profile updated successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get user by ID (public profile)
     * GET /:id
     */
    getUserById: async (req, res) => {
        try {
            const user = await userService.getPublicProfile(
                req.params.id,
                req.user?._id
            );
            return sendSuccess(res, { user }, 'User profile found');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Search users
     * GET /search
     */
    searchUsers: async (req, res) => {
        try {
            const { query, page = 1, limit = 10 } = req.query;
            const result = await userService.searchUsers(
                query,
                parseInt(page),
                parseInt(limit),
                req.user?._id
            );
            return sendSuccess(res, result, 'Search results retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Search mention candidates
     * GET /mentions
     */
    searchMentions: async (req, res) => {
        try {
            const result = await userService.searchMentionCandidates(
                req.query.query,
                req.user?._id,
                req.query
            );
            return sendSuccess(res, result, 'Mention candidates retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },
    /**
     * Update user preferences
     * PATCH /me/preferences
     */
    updatePreferences: async (req, res) => {
        try {
            const preferences = await userService.updatePreferences(
                req.user._id,
                req.body
            );
            return sendSuccess(res, { preferences }, 'Preferences updated');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Check username availability
     * GET /check-username/:username
     */
    checkUsername: async (req, res) => {
        try {
            const result = await userService.checkUsernameAvailability(
                req.params.username
            );
            return sendSuccess(res, result, 'Username availability checked');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get user statistics
     * GET /:id/stats
     */
    getUserStats: async (req, res) => {
        try {
            const stats = await userService.getUserStats(req.params.id);
            return sendSuccess(res, { stats }, 'User statistics retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Update user activity
     * POST /me/activity
     */
    updateActivity: async (req, res) => {
        try {
            const { isOnline = true } = req.body;
            await userService.updateActivity(req.user._id, isOnline);
            return sendSuccess(res, null, 'Activity updated');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Deactivate account
     * POST /me/deactivate
     */
    deactivateAccount: async (req, res) => {
        try {
            const result = await userService.deactivateAccount(req.user._id);
            return sendSuccess(res, result, 'Account deactivated');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get popular users
     * GET /popular
     */
    getPopularUsers: async (req, res) => {
        try {
            const { limit = 10 } = req.query;
            const users = await userService.getPopularUsers(parseInt(limit));
            return sendSuccess(res, { users }, 'Popular users retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = userController;
