// services/post.service.js
import api from "../config/axios";

// Base path based on your route structure
const BASE_URL = "/api/posts";

/**
 * Post Service
 * Handles all social feed, post, like, and comment interactions.
 */

// =============================================================================
//  PUBLIC / FEED ROUTES
// =============================================================================

/**
 * Get Public/Explore Feed
 * @param {Object} params - { page, limit }
 */
export const getExploreFeed = async (params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/explore`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load explore feed",
            status: error.response?.status,
        };
    }
};

/**
 * Get Trending Posts
 * @param {Object} params - { page, limit, timeframe: 'day'|'week'|'month' }
 */
export const getTrendingPosts = async (params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/trending`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load trending posts",
            status: error.response?.status,
        };
    }
};

/**
 * Search Posts
 * @param {String} query - Search text
 * @param {Object} params - { page, limit }
 * @param {Object} requestConfig - optional axios config (signal, headers, etc.)
 */
export const searchPosts = async (query, params = {}, requestConfig = {}) => {
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
 * Get Posts by Hashtag
 * @param {String} hashtag - Without the '#' symbol
 * @param {Object} params - { page, limit }
 */
export const getHashtagPosts = async (hashtag, params = {}) => {
    try {
        // Strip # if user accidentally included it
        const cleanTag = hashtag.replace('#', '');
        const response = await api.get(`${BASE_URL}/hashtag/${cleanTag}`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load hashtag posts",
            status: error.response?.status,
        };
    }
};

/**
 * Get Single Post by ID
 * @param {String} postId 
 */
export const getPostById = async (postId) => {
    try {
        const response = await api.get(`${BASE_URL}/${postId}`);
        return response.data?.data?.post || response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load post",
            status: error.response?.status,
        };
    }
};

/**
 * Get Specific User's Posts (Public Profile)
 * @param {String} userId 
 * @param {Object} params - { page, limit }
 */
export const getUserPosts = async (userId, params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/user/${userId}`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load user posts",
            status: error.response?.status,
        };
    }
};

// =============================================================================
//  PROTECTED / USER ACTIONS
// =============================================================================

/**
 * Create a New Post
 * @param {Object} postData - { content, media, visibility, mentions, etc. }
 */
export const createPost = async (postData) => {
    try {
        const response = await api.post(`${BASE_URL}/`, postData);
        return response.data?.data?.post || response.data?.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create post",
            status: error.response?.status,
        };
    }
};

/**
 * Get Personalized User Feed (Following)
 * @param {Object} params - { page, limit }
 */
export const getUserFeed = async (params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/feed`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load feed",
            status: error.response?.status,
        };
    }
};

/**
 * Get Posts Liked by Current User
 * @param {Object} params - { page, limit }
 */
export const getLikedPosts = async (params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/liked`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load liked posts",
            status: error.response?.status,
        };
    }
};

/**
 * Get bookmarked posts for current user
 * @param {Object} params - { page, limit }
 */
export const getBookmarkedPosts = async (params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/bookmarks`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load bookmarked posts",
            status: error.response?.status,
        };
    }
};

/**
 * Save a post to bookmarks
 * @param {String} postId
 */
export const savePost = async (postId) => {
    try {
        const response = await api.post(`${BASE_URL}/${postId}/save`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to save post",
            status: error.response?.status,
        };
    }
};

/**
 * Remove a post from bookmarks
 * @param {String} postId
 */
export const unsavePost = async (postId) => {
    try {
        const response = await api.delete(`${BASE_URL}/${postId}/save`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove saved post",
            status: error.response?.status,
        };
    }
};

/**
 * Track share action for a post
 * @param {String} postId
 * @param {String} channel
 */
export const sharePost = async (postId, channel = "copy_link") => {
    try {
        const response = await api.post(`${BASE_URL}/${postId}/share`, { channel });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to share post",
            status: error.response?.status,
        };
    }
};

/**
 * Repost or quote-repost a post
 * @param {String} postId
 * @param {Object} data - { mode: "repost"|"quote", content?, visibility? }
 */
export const repostPost = async (postId, data = {}) => {
    try {
        const response = await api.post(`${BASE_URL}/${postId}/repost`, data);
        return response.data?.data?.post || response.data?.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to repost",
            status: error.response?.status,
        };
    }
};

/**
 * Update Post
 * @param {String} postId 
 * @param {Object} updateData - { content, visibility, etc. }
 */
export const updatePost = async (postId, updateData) => {
    try {
        const response = await api.put(`${BASE_URL}/${postId}`, updateData);
        return response.data?.data?.post || response.data?.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update post",
            status: error.response?.status,
        };
    }
};

/**
 * Delete Post
 * @param {String} postId 
 */
export const deletePost = async (postId) => {
    try {
        const response = await api.delete(`${BASE_URL}/${postId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete post",
            status: error.response?.status,
        };
    }
};

// =============================================================================
//  LIKES & REACTIONS
// =============================================================================

/**
 * Like a Post
 * @param {String} postId 
 * @param {String} reactionType - 'like', 'love', 'haha', 'wow', 'sad', 'angry' (default: 'like')
 */
export const likePost = async (postId, reactionType = 'like') => {
    try {
        const response = await api.post(`${BASE_URL}/${postId}/like`, { reactionType });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to like post",
            status: error.response?.status,
        };
    }
};

/**
 * Unlike a Post
 * @param {String} postId 
 */
export const unlikePost = async (postId) => {
    try {
        const response = await api.delete(`${BASE_URL}/${postId}/like`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to unlike post",
            status: error.response?.status,
        };
    }
};

/**
 * Get Users Who Liked a Post
 * @param {String} postId 
 * @param {Object} params - { page, limit }
 */
export const getPostLikes = async (postId, params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/${postId}/likes`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load likes",
            status: error.response?.status,
        };
    }
};

// =============================================================================
//  COMMENTS
// =============================================================================

/**
 * Add Comment to Post
 * @param {String} postId 
 * @param {Object} commentData - { content, parentCommentId, media }
 */
export const addComment = async (postId, commentData) => {
    try {
        const response = await api.post(`${BASE_URL}/${postId}/comments`, commentData);
        return response.data?.data?.comment || response.data?.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add comment",
            status: error.response?.status,
        };
    }
};

/**
 * Get Comments for a Post
 * @param {String} postId 
 * @param {Object} params - { page, limit, sortBy: 'recent'|'popular' }
 */
export const getPostComments = async (postId, params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/${postId}/comments`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load comments",
            status: error.response?.status,
        };
    }
};

/**
 * Update Comment
 * @param {String} commentId 
 * @param {String} content 
 */
export const updateComment = async (commentId, content) => {
    try {
        const response = await api.put(`${BASE_URL}/comments/${commentId}`, { content });
        return response.data?.data?.comment || response.data?.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update comment",
            status: error.response?.status,
        };
    }
};

/**
 * Delete Comment
 * @param {String} commentId 
 */
export const deleteComment = async (commentId) => {
    try {
        const response = await api.delete(`${BASE_URL}/comments/${commentId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete comment",
            status: error.response?.status,
        };
    }
};

/**
 * Get Replies for a Comment
 * @param {String} commentId 
 * @param {Object} params - { page, limit }
 */
export const getCommentReplies = async (commentId, params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/comments/${commentId}/replies`, { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load replies",
            status: error.response?.status,
        };
    }
};

/**
 * Like a Comment
 * @param {String} commentId 
 */
export const likeComment = async (commentId) => {
    try {
        const response = await api.post(`${BASE_URL}/comments/${commentId}/like`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to like comment",
            status: error.response?.status,
        };
    }
};

/**
 * Unlike a Comment
 * @param {String} commentId 
 */
export const unlikeComment = async (commentId) => {
    try {
        const response = await api.delete(`${BASE_URL}/comments/${commentId}/like`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to unlike comment",
            status: error.response?.status,
        };
    }
};

/**
 * Get analytics with filtering and sorting (moved from frontend)
 * @param {Object} options - { statusFilter, dateFilter, sortBy, limit }
 */
export const getAnalytics = async (options = {}) => {
    try {
        const params = new URLSearchParams();
        if (options.statusFilter) params.append('statusFilter', options.statusFilter);
        if (options.dateFilter) params.append('dateFilter', options.dateFilter);
        if (options.sortBy) params.append('sortBy', options.sortBy);
        if (options.limit) params.append('limit', options.limit);

        const response = await api.get(`${BASE_URL}/analytics?${params}`);
        return response.data.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to get analytics",
            status: error.response?.status,
        };
    }
};
