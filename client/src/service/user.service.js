// services/user.service.js
import api from "../config/axios";

// Assumes the user routes are mounted at /api/users
const BASE_URL = "/api/user";

/**
 * User Service
 * Handles user profile, search, preferences, and account management.
 */

// =============================================================================
//  CURRENT USER (ME)
// =============================================================================

/**
 * Get current user's profile
 * GET /me
 */
export const getMyProfile = async () => {
    try {
        const response = await api.get(`${BASE_URL}/me`);
        return response.data?.data?.user || response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load profile",
            status: error.response?.status,
        };
    }
};

/**
 * Update current user's profile details
 * PUT /me
 * @param {Object} updateData - { name, bio, avatar, coverImage, isPrivate }
 */
export const updateProfile = async (updateData) => {
    try {
        // Note: 'avatar' and 'coverImage' should be URLs. 
        // Upload files separately using a media/upload service first if needed.
        const response = await api.put(`${BASE_URL}/me`, updateData);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update profile",
            status: error.response?.status,
        };
    }
};

/**
 * Update user preferences
 * PATCH /me/preferences
 * @param {Object} preferences - Nested object matching preferences schema
 */
export const updatePreferences = async (preferences) => {
    try {
        const response = await api.patch(`${BASE_URL}/me/preferences`, preferences);
        return response.data?.data?.preferences || response.data?.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update preferences",
            status: error.response?.status,
        };
    }
};

/**
 * Update activity status (Online/Offline)
 * POST /me/activity
 * @param {Boolean} isOnline - default true
 */
export const updateActivity = async (isOnline = true) => {
    try {
        const response = await api.post(`${BASE_URL}/me/activity`, { isOnline });
        return response.data;
    } catch (error) {
        // Silent fail often preferred for background activity updates
        console.error("Activity update failed:", error);
        return null;
    }
};

/**
 * Deactivate Account
 * POST /me/deactivate
 */
export const deactivateAccount = async () => {
    try {
        const response = await api.post(`${BASE_URL}/me/deactivate`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to deactivate account",
            status: error.response?.status,
        };
    }
};

// =============================================================================
//  PUBLIC / GENERAL USER DATA
// =============================================================================

/**
 * Search Users
 * GET /search
 * @param {String} query - Search text (username or name)
 * @param {Object} params - { page, limit }
 * @param {Object} requestConfig - optional axios config (signal, headers, etc.)
 */
export const searchUsers = async (query, params = {}, requestConfig = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/search`, {
            ...requestConfig,
            params: { query, ...params }
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Search failed",
            status: error.response?.status,
        };
    }
};

/**
 * Search mention candidates
 * GET /mentions
 * @param {String} query - mention text after @
 * @param {Object} options - { chatId, workspaceId, projectId, taskId, subtaskId, limit }
 */
export const searchMentionCandidates = async (query = "", options = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/mentions`, {
            params: {
                query,
                ...options
            }
        });
        return response.data?.data?.users || response.data?.data?.results || response.data?.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to search mention candidates",
            status: error.response?.status,
        };
    }
};

/**
 * Get blocked users list for current user
 * GET /me/blocks
 * @param {Object} params - { page, limit }
 */
export const getBlockedUsers = async (params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/me/blocks`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load blocked users",
            status: error.response?.status,
        };
    }
};

/**
 * Block a user
 * POST /blocks/:id
 * @param {String} userId
 */
export const blockUser = async (userId) => {
    try {
        const response = await api.post(`${BASE_URL}/blocks/${userId}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to block user",
            status: error.response?.status,
        };
    }
};

/**
 * Unblock a user
 * DELETE /blocks/:id
 * @param {String} userId
 */
export const unblockUser = async (userId) => {
    try {
        const response = await api.delete(`${BASE_URL}/blocks/${userId}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to unblock user",
            status: error.response?.status,
        };
    }
};
/**
 * Get Popular / Trending Users
 * GET /popular
 * @param {Number} limit - Default 10
 */
export const getPopularUsers = async (limit = 10) => {
    try {
        const response = await api.get(`${BASE_URL}/popular`, {
            params: { limit }
        });
        return response.data?.data?.users || response.data?.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load popular users",
            status: error.response?.status,
        };
    }
};

/**
 * Check if a username is available
 * GET /check-username/:username
 * @param {String} username 
 */
export const checkUsernameAvailability = async (username) => {
    try {
        const response = await api.get(`${BASE_URL}/check-username/${username}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to check username",
            status: error.response?.status,
        };
    }
};

// =============================================================================
//  SPECIFIC USER ACTIONS
// =============================================================================

/**
 * Get Specific User Profile by ID (Public View)
 * GET /:id
 * @param {String} userId 
 */
export const getUserById = async (userId) => {
    try {
        const response = await api.get(`${BASE_URL}/${userId}`);
        return response.data?.data?.user || response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load user",
            status: error.response?.status,
        };
    }
};

/**
 * Get User Statistics
 * GET /:id/stats
 * @param {String} userId 
 */
export const getUserStats = async (userId) => {
    try {
        const response = await api.get(`${BASE_URL}/${userId}/stats`);
        return response.data?.data?.stats || response.data?.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load stats",
            status: error.response?.status,
        };
    }
};
