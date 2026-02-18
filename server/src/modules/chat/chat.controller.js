// modules/chat/chat.controller.js (ENHANCED VERSION)
const chatService = require("./chat.service");
const Chat = require("../../models/chat");
const { getIO } = require("../utils/socketStore");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");

const toIdString = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (value?._id && value._id !== value) return toIdString(value._id);
    if (typeof value?.toHexString === "function") return value.toHexString();
    if (typeof value?.toString === "function") return value.toString();
    return "";
};

const emitToChatMembers = async ({
    chatId,
    actorId,
    eventName,
    payload
}) => {
    const io = getIO();
    if (!io || !chatId || !eventName) return;

    const chat = await Chat.findById(chatId).select("members").lean();
    if (!chat?.members?.length) return;

    const actorIdString = toIdString(actorId);
    chat.members.forEach((memberId) => {
        const memberIdString = toIdString(memberId);
        if (!memberIdString || memberIdString === actorIdString) return;
        io.to(`user:${memberIdString}`).emit(eventName, payload);
    });
};

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
    toggleMute: async (req, res) => {
        try {
            const result = await chatService.toggleMute(
                req.params.chatId,
                req.user._id
            );
            sendSuccess(res, result);
        } catch (e) {
            handleError(e, res);
        }
    },

    toggleArchive: async (req, res) => {
        try {
            const result = await chatService.toggleArchive(
                req.params.chatId,
                req.user._id
            );
            sendSuccess(res, result);
        } catch (e) {
            handleError(e, res);
        }
    },

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

    getUnreadCallInviteSummary: async (req, res) => {
        try {
            const result = await chatService.getUnreadCallInviteSummary(
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
                req.body.replyTo,
                req.body.postId
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

            await emitToChatMembers({
                chatId: req.body.chatId,
                actorId: req.user._id,
                eventName: "chat:message_deleted",
                payload: {
                    chatId: req.body.chatId,
                    messageId: req.params.messageId
                }
            });

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

            await emitToChatMembers({
                chatId: req.body.chatId,
                actorId: req.user._id,
                eventName: "chat:message_edited",
                payload: {
                    chatId: req.body.chatId,
                    messageId: req.params.messageId,
                    content: msg?.content || req.body.content,
                    message: msg
                }
            });

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

            await emitToChatMembers({
                chatId: req.body.chatId,
                actorId: req.user._id,
                eventName: "chat:reaction_updated",
                payload: {
                    chatId: req.body.chatId,
                    messageId: req.params.messageId,
                    reactions: msg?.reactions || []
                }
            });

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

            await emitToChatMembers({
                chatId: req.body.chatId,
                actorId: req.user._id,
                eventName: "chat:reaction_updated",
                payload: {
                    chatId: req.body.chatId,
                    messageId: req.params.messageId,
                    reactions: msg?.reactions || []
                }
            });

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
