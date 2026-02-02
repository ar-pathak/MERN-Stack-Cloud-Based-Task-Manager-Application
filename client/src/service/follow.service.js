// services/follow.service.js
import api from "../config/axios";

// NOTE: This assumes your follow routes are mounted at /api/follow
// If they are mounted at /api/users, change this to "/api/users"
const BASE_URL = "/api/follow";

/**
 * Follow Service
 * Handles user relationships: following, followers, and requests.
 */

// =============================================================================
//  RELATIONSHIP ACTIONS
// =============================================================================

/**
 * Follow a user
 * POST /:id/follow
 * @param {String} userId - The ID of the user to follow
 * @returns {Promise<Object>} { success, isPending, message }
 */
export const followUser = async (userId) => {
    try {
        const response = await api.post(`${BASE_URL}/${userId}/follow`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to follow user",
            status: error.response?.status,
        };
    }
};

/**
 * Unfollow a user
 * DELETE /:id/follow
 * @param {String} userId - The ID of the user to unfollow
 */
export const unfollowUser = async (userId) => {
    try {
        const response = await api.delete(`${BASE_URL}/${userId}/follow`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to unfollow user",
            status: error.response?.status,
        };
    }
};

/**
 * Remove a follower (Force them to stop following you)
 * DELETE /:id/followers
 * @param {String} followerId - The ID of the follower to remove
 */
export const removeFollower = async (followerId) => {
    try {
        const response = await api.delete(`${BASE_URL}/${followerId}/followers`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove follower",
            status: error.response?.status,
        };
    }
};

/**
 * Check if following a specific user
 * GET /:id/following/status
 * @param {String} userId - The ID of the user to check
 * @returns {Promise<Object>} { isFollowing, isApproved }
 */
export const checkFollowStatus = async (userId) => {
    try {
        const response = await api.get(`${BASE_URL}/${userId}/following/status`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to check follow status",
            status: error.response?.status,
        };
    }
};

// =============================================================================
//  LISTS (Followers, Following, Mutual)
// =============================================================================

/**
 * Get a user's followers list
 * GET /:id/followers
 * @param {String} userId - The user ID whose followers we want
 * @param {Object} params - { page, limit }
 */
export const getFollowers = async (userId, params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/${userId}/followers`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load followers",
            status: error.response?.status,
        };
    }
};

/**
 * Get a user's following list
 * GET /:id/following
 * @param {String} userId - The user ID whose following list we want
 * @param {Object} params - { page, limit }
 */
export const getFollowing = async (userId, params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/${userId}/following`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load following list",
            status: error.response?.status,
        };
    }
};

/**
 * Get mutual followers
 * GET /:id/followers/mutual
 * @param {String} userId - The user ID to check mutuals against
 */
export const getMutualFollowers = async (userId) => {
    try {
        const response = await api.get(`${BASE_URL}/${userId}/followers/mutual`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load mutual followers",
            status: error.response?.status,
        };
    }
};

/**
 * Get follow suggestions
 * GET /suggestions
 * @param {Number} limit - Number of suggestions (default 10)
 */
export const getFollowSuggestions = async (limit = 10) => {
    try {
        const response = await api.get(`${BASE_URL}/suggestions`, {
            params: { limit }
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load suggestions",
            status: error.response?.status,
        };
    }
};

// =============================================================================
//  FOLLOW REQUESTS (Private Accounts)
// =============================================================================

/**
 * Get pending follow requests
 * GET /requests/pending
 * @param {Object} params - { page, limit }
 */
export const getPendingRequests = async (params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/requests/pending`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load pending requests",
            status: error.response?.status,
        };
    }
};

/**
 * Approve a follow request
 * POST /requests/:requestId/approve
 * @param {String} requestId 
 */
export const approveFollowRequest = async (requestId) => {
    try {
        const response = await api.post(`${BASE_URL}/requests/${requestId}/approve`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to approve request",
            status: error.response?.status,
        };
    }
};

/**
 * Reject a follow request
 * DELETE /requests/:requestId
 * @param {String} requestId 
 */
export const rejectFollowRequest = async (requestId) => {
    try {
        const response = await api.delete(`${BASE_URL}/requests/${requestId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to reject request",
            status: error.response?.status,
        };
    }
};