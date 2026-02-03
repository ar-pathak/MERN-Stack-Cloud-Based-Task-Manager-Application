// services/chat.service.js
import api from "../config/axios";

// Assumes routes are mounted at /api/chats
const BASE_URL = "/api/chats";

/**
 * Get all conversations for the current user
 * GET /
 */
export const getConversations = async () => {
    try {
        const response = await api.get(`${BASE_URL}/`);
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error("Fetch conversations error:", error);
        return [];
    }
};

/**
 * Get or Create a conversation with a specific user
 * POST /initiate
 * Body: { targetUserId }
 */
export const initiateChat = async (targetUserId) => {
    try {
        const response = await api.post(`${BASE_URL}/initiate`, { targetUserId });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to start chat",
            status: error.response?.status,
        };
    }
};

/**
 * Get messages for a specific conversation
 * GET /:conversationId/messages
 */
export const getMessages = async (conversationId, params = {}) => {
    try {
        const response = await api.get(`${BASE_URL}/${conversationId}/messages`, { params });
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch messages",
            status: error.response?.status,
        };
    }
};

/**
 * Send a message
 * POST /:conversationId/messages
 */
export const sendMessage = async (conversationId, content, media = null) => {
    try {
        const payload = { content, media };
        const response = await api.post(`${BASE_URL}/${conversationId}/messages`, payload);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to send message",
            status: error.response?.status,
        };
    }
};

/**
 * Mark conversation as read
 * PUT /:conversationId/read
 */
export const markAsRead = async (conversationId) => {
    try {
        await api.put(`${BASE_URL}/${conversationId}/read`);
    } catch (error) {
        console.error("Mark read failed", error);
    }
};