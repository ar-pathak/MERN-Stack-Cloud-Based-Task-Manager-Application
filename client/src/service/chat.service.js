// services/chat.service.js (ENHANCED VERSION)
import api from "../config/axios";

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------
const BASE = "/api/chat";

// ---------------------------------------------------------------------------
// CHATS
// ---------------------------------------------------------------------------

/**
 * GET /api/chat
 * Fetch all chats for the authenticated user
 */
export const getConversations = async () => {
    try {
        const response = await api.get(BASE);
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch conversations",
            status: error.response?.status,
        };
    }
};

/**
 * POST /api/chat/private
 * Create or get existing private chat
 */
export const initiateChat = async (userId) => {
    try {
        const response = await api.post(`${BASE}/private`, { userId });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to start chat",
            status: error.response?.status,
        };
    }
};

/**
 * POST /api/chat/group
 * Create a new group chat
 */
export const createGroupChat = async (name, members) => {
    try {
        const response = await api.post(`${BASE}/group`, { name, members });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create group chat",
            status: error.response?.status,
        };
    }
};

/**
 * PATCH /api/chat/:chatId
 * Update group chat details
 */
export const updateGroupChat = async (chatId, updates) => {
    try {
        const response = await api.patch(`${BASE}/${chatId}`, updates);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update group",
            status: error.response?.status,
        };
    }
};

/**
 * POST /api/chat/:chatId/members
 * Add members to group chat
 */
export const addMembersToGroup = async (chatId, members) => {
    try {
        const response = await api.post(`${BASE}/${chatId}/members`, { members });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add members",
            status: error.response?.status,
        };
    }
};

/**
 * DELETE /api/chat/:chatId/members
 * Remove a member from group chat
 */
export const removeMemberFromGroup = async (chatId, userId) => {
    try {
        const response = await api.delete(`${BASE}/${chatId}/members`, {
            data: { userId }
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove member",
            status: error.response?.status,
        };
    }
};

/**
 * POST /api/chat/:chatId/leave
 * Leave a group chat
 */
export const leaveGroup = async (chatId) => {
    try {
        const response = await api.post(`${BASE}/${chatId}/leave`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to leave group",
            status: error.response?.status,
        };
    }
};

// ---------------------------------------------------------------------------
// MESSAGES
// ---------------------------------------------------------------------------

/**
 * GET /api/chat/:chatId/messages
 * Get paginated messages for a chat
 */
export const getMessages = async (chatId, params = {}) => {
    try {
        const response = await api.get(`${BASE}/${chatId}/messages`, { params });
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch messages",
            status: error.response?.status,
        };
    }
};

/**
 * GET /api/chat/mentions/unread
 * Get unread mention summary grouped by chat
 */
export const getUnreadMentionSummary = async (params = {}) => {
    try {
        const response = await api.get(`${BASE}/mentions/unread`, { params });
        return response.data?.data || response.data || { mentions: [], byChat: {}, totalUnreadMentions: 0 };
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch unread mention summary",
            status: error.response?.status,
        };
    }
};

/**
 * GET /api/chat/call-invites/unread
 * Get unread call invite summary grouped by chat
 */
export const getUnreadCallInviteSummary = async (params = {}) => {
    try {
        const response = await api.get(`${BASE}/call-invites/unread`, { params });
        return response.data?.data || response.data || { invites: [], byChat: {}, totalUnreadInvites: 0 };
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch unread call invite summary",
            status: error.response?.status,
        };
    }
};

/**
 * POST /api/chat/message
 * Send a new message
 */
export const sendMessage = async (chatId, content, attachments = [], replyTo = null) => {
    try {
        const payload = { chatId, content };
        if (attachments && attachments.length > 0) {
            payload.attachments = attachments;
        }
        if (replyTo) {
            payload.replyTo = replyTo;
        }

        const response = await api.post(`${BASE}/message`, payload);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to send message",
            status: error.response?.status,
        };
    }
};

/**
 * PATCH /api/chat/message/:messageId
 * Edit a message
 */
export const editMessage = async (messageId, chatId, content) => {
    try {
        const response = await api.patch(`${BASE}/message/${messageId}`, {
            chatId,
            content
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to edit message",
            status: error.response?.status,
        };
    }
};

/**
 * DELETE /api/chat/message/:messageId
 * Delete a message
 */
export const deleteMessage = async (messageId, chatId) => {
    try {
        const response = await api.delete(`${BASE}/message/${messageId}`, {
            data: { chatId }
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete message",
            status: error.response?.status,
        };
    }
};

/**
 * PATCH /api/chat/message/:messageId/pin
 * Toggle pin status of a message
 */
export const togglePinMessage = async (messageId, chatId) => {
    try {
        const response = await api.patch(`${BASE}/message/${messageId}/pin`, { chatId });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to pin message",
            status: error.response?.status,
        };
    }
};

/**
 * GET /api/chat/:chatId/messages/search
 * Search messages in a chat
 */
export const searchMessages = async (chatId, query, limit = 20) => {
    try {
        const response = await api.get(`${BASE}/${chatId}/messages/search`, {
            params: { q: query, limit }
        });
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to search messages",
            status: error.response?.status,
        };
    }
};

// ---------------------------------------------------------------------------
// REACTIONS
// ---------------------------------------------------------------------------

/**
 * POST /api/chat/message/:messageId/reaction
 * Add a reaction to a message
 */
export const addReaction = async (messageId, chatId, emoji) => {
    try {
        const response = await api.post(`${BASE}/message/${messageId}/reaction`, {
            chatId,
            emoji
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add reaction",
            status: error.response?.status,
        };
    }
};

/**
 * DELETE /api/chat/message/:messageId/reaction
 * Remove a reaction from a message
 */
export const removeReaction = async (messageId, chatId, emoji) => {
    try {
        const response = await api.delete(`${BASE}/message/${messageId}/reaction`, {
            data: { chatId, emoji }
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove reaction",
            status: error.response?.status,
        };
    }
};

// ---------------------------------------------------------------------------
// FILE UPLOAD (if you add this endpoint)
// ---------------------------------------------------------------------------

/**
 * POST /api/chat/upload
 * Upload a file and get the URL
 */
export const uploadFile = async (file, onProgress) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post(`${BASE}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                onProgress?.(percentCompleted);
            },
        });

        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to upload file",
            status: error.response?.status,
        };
    }
};

/**
 * GET /api/chat/exists/:targetUserId
 * Check if a private chat exists with another user
 * Returns { exists: boolean, chatId: string | null }
 */
export const checkPrivateChatExists = async (targetUserId) => {
    try {
        const response = await api.get(`${BASE}/exists/${targetUserId}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to check chat existence",
            status: error.response?.status,
        };
    }
};
