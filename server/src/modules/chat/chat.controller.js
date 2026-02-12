// modules/chat/chat.controller.js (ENHANCED VERSION)
const chatService = require("./chat.service");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");

module.exports = {

    checkPrivateChat: async (req, res) => {
        try {
            const chatId = await chatService.checkPrivateChatExists(
                req.user._id,
                req.params.targetUserId
            );

            if (chatId) {
                return sendSuccess(res, { exists: true, chatId });
            } else {
                return sendSuccess(res, { exists: false, chatId: null });
            }
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Private chat ──────────────────────────────────────────────────────
    createPrivateChat: async (req, res) => {
        try {
            const chat = await chatService.getOrCreatePrivateChat(
                req.user._id,
                req.body.userId
            );
            sendSuccess(res, chat);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Group chat ────────────────────────────────────────────────────────
    createGroupChat: async (req, res) => {
        try {
            const chat = await chatService.createGroupChat(
                req.user._id,
                req.body.name,
                req.body.members
            );
            sendSuccess(res, chat);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Update group chat ─────────────────────────────────────────────────
    updateGroupChat: async (req, res) => {
        try {
            const chat = await chatService.updateGroupChat(
                req.params.chatId,
                req.user._id,
                req.body
            );
            sendSuccess(res, chat);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Add members to group ──────────────────────────────────────────────
    addMembers: async (req, res) => {
        try {
            const chat = await chatService.addMembers(
                req.params.chatId,
                req.user._id,
                req.body.members
            );
            sendSuccess(res, chat);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Remove member from group ──────────────────────────────────────────
    removeMember: async (req, res) => {
        try {
            const chat = await chatService.removeMember(
                req.params.chatId,
                req.user._id,
                req.body.userId
            );
            sendSuccess(res, chat);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Leave group ───────────────────────────────────────────────────────
    leaveGroup: async (req, res) => {
        try {
            const result = await chatService.leaveGroup(
                req.params.chatId,
                req.user._id
            );
            sendSuccess(res, result);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Chat list (inbox) ─────────────────────────────────────────────────
    getChats: async (req, res) => {
        try {
            const chats = await chatService.getChats(req.user._id);
            sendSuccess(res, chats);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Messages ──────────────────────────────────────────────────────────
    getMessages: async (req, res) => {
        try {
            const result = await chatService.getMessages(
                req.params.chatId,
                req.user._id,
                req.query.page,
                req.query.limit
            );
            sendSuccess(res, result);
        } catch (e) {
            handleError(e, res);
        }
    },

    // â”€â”€ Unread mention summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    getUnreadMentionSummary: async (req, res) => {
        try {
            const result = await chatService.getUnreadMentionSummary(
                req.user._id,
                req.query.limit
            );
            sendSuccess(res, result);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Send message ──────────────────────────────────────────────────────
    sendMessage: async (req, res) => {
        try {
            const msg = await chatService.sendMessage(
                req.user._id,
                req.body.chatId,
                req.body.content,
                req.body.attachments,
                req.body.replyTo
            );
            sendSuccess(res, msg);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Pin/Unpin message ─────────────────────────────────────────────────
    togglePinMessage: async (req, res) => {
        try {
            const msg = await chatService.togglePinMessage(
                req.params.messageId,
                req.user._id,
                req.body.chatId
            );
            sendSuccess(res, msg);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Delete message ────────────────────────────────────────────────────
    deleteMessage: async (req, res) => {
        try {
            const msg = await chatService.deleteMessage(
                req.params.messageId,
                req.user._id,
                req.body.chatId
            );
            sendSuccess(res, msg);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Edit message ──────────────────────────────────────────────────────
    editMessage: async (req, res) => {
        try {
            const msg = await chatService.editMessage(
                req.params.messageId,
                req.user._id,
                req.body.chatId,
                req.body.content
            );
            sendSuccess(res, msg);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Add reaction ──────────────────────────────────────────────────────
    addReaction: async (req, res) => {
        try {
            const msg = await chatService.addReaction(
                req.params.messageId,
                req.user._id,
                req.body.emoji,
                req.body.chatId
            );
            sendSuccess(res, msg);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Remove reaction ───────────────────────────────────────────────────
    removeReaction: async (req, res) => {
        try {
            const msg = await chatService.removeReaction(
                req.params.messageId,
                req.user._id,
                req.body.emoji,
                req.body.chatId
            );
            sendSuccess(res, msg);
        } catch (e) {
            handleError(e, res);
        }
    },

    // ── Search messages ───────────────────────────────────────────────────
    searchMessages: async (req, res) => {
        try {
            const messages = await chatService.searchMessages(
                req.params.chatId,
                req.user._id,
                req.query.q,
                req.query.limit
            );
            sendSuccess(res, messages);
        } catch (e) {
            handleError(e, res);
        }
    }
};
