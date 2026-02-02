const followService = require('./follow.service');
const { sendSuccess, handleError } = require('../../helpers/responseHelper');

const followController = {
    /**
     * Follow a user
     * POST /:id/follow
     */
    follow: async (req, res) => {
        try {
            const result = await followService.followUser(
                req.user._id,
                req.params.id
            );

            const message = result.isPending
                ? 'Follow request sent successfully'
                : 'User followed successfully';

            return sendSuccess(res, result, message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Unfollow a user
     * DELETE /:id/follow
     */
    unfollow: async (req, res) => {
        try {
            await followService.unfollowUser(req.user._id, req.params.id);
            return sendSuccess(res, null, 'User unfollowed successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get followers list
     * GET /:id/followers
     */
    getFollowers: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await followService.getFollowers(
                req.params.id,
                req.user?._id, // Include current user if authenticated
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'Followers list retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get following list
     * GET /:id/following
     */
    getFollowing: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await followService.getFollowing(
                req.params.id,
                req.user?._id,
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'Following list retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Check if following a user
     * GET /:id/following/status
     */
    checkFollowStatus: async (req, res) => {
        try {
            const status = await followService.checkIsFollowing(
                req.user._id,
                req.params.id
            );
            return sendSuccess(res, status, 'Follow status retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get mutual followers
     * GET /:id/followers/mutual
     */
    getMutualFollowers: async (req, res) => {
        try {
            const mutualFollowers = await followService.getMutualFollowers(
                req.user._id,
                req.params.id
            );
            return sendSuccess(
                res,
                { mutualFollowers, count: mutualFollowers.length },
                'Mutual followers retrieved'
            );
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get follow suggestions
     * GET /suggestions
     */
    getFollowSuggestions: async (req, res) => {
        try {
            const { limit = 10 } = req.query;
            const suggestions = await followService.getFollowSuggestions(
                req.user._id,
                parseInt(limit)
            );
            return sendSuccess(
                res,
                { suggestions },
                'Follow suggestions retrieved'
            );
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Remove a follower
     * DELETE /:id/followers
     */
    removeFollower: async (req, res) => {
        try {
            await followService.removeFollower(req.user._id, req.params.id);
            return sendSuccess(res, null, 'Follower removed successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Get pending follow requests
     * GET /requests/pending
     */
    getPendingRequests: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await followService.getPendingRequests(
                req.user._id,
                parseInt(page),
                parseInt(limit)
            );
            return sendSuccess(res, result, 'Pending requests retrieved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Approve a follow request
     * POST /requests/:requestId/approve
     */
    approveFollowRequest: async (req, res) => {
        try {
            await followService.approveFollowRequest(
                req.user._id,
                req.params.requestId
            );
            return sendSuccess(res, null, 'Follow request approved');
        } catch (error) {
            return handleError(error, res);
        }
    },

    /**
     * Reject a follow request
     * DELETE /requests/:requestId
     */
    rejectFollowRequest: async (req, res) => {
        try {
            await followService.rejectFollowRequest(
                req.user._id,
                req.params.requestId
            );
            return sendSuccess(res, null, 'Follow request rejected');
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = followController;