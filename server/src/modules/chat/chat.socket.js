const Chat = require("../../models/chat");
const Message = require("../../models/message");

// ---------------------------------------------------------------------------
// Internal helper  –  load a chat and verify the caller is a member.
// Returns the chat doc on success, or null (after emitting an error) on failure.
// ---------------------------------------------------------------------------
async function loadAndAuthorise(socket, chatId, senderId) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
        socket.emit("error", { event: "chat", reason: "Chat not found" });
        return null;
    }

    if (!chat.members.some((id) => String(id) === String(senderId))) {
        socket.emit("error", { event: "chat", reason: "Not a member of this chat" });
        return null;
    }

    return chat;
}

// ---------------------------------------------------------------------------
// Broadcast helper  –  emit an event to every member's room except the sender.
// ---------------------------------------------------------------------------
function broadcastToMembers(io, chat, senderId, eventName, payload) {
    for (const memberId of chat.members) {
        if (String(memberId) !== String(senderId)) {
            io.to(`user:${memberId}`).emit(eventName, payload);
        }
    }
}

// ---------------------------------------------------------------------------
// Main export  –  called once per connected socket
// ---------------------------------------------------------------------------
module.exports = (io, socket, onlineUsers) => {
    const senderId = socket.userId;   // stamped by socketAuthMiddleware

    // Join the user-keyed room so messages reach every tab / device
    socket.join(`user:${senderId}`);

    // -----------------------------------------------------------------------
    // send-message
    // -----------------------------------------------------------------------
    socket.on("send-message", async ({ chatId, message }) => {
        try {
            const chat = await loadAndAuthorise(socket, chatId, senderId);
            if (!chat) return;

            broadcastToMembers(io, chat, senderId, "receive-message", {
                chatId,
                message
            });
        } catch (err) {
            console.error("[socket] send-message error:", err);
            socket.emit("error", { event: "send-message", reason: "Internal error" });
        }
    });

    // -----------------------------------------------------------------------
    // typing  –  "user is typing" indicator
    // -----------------------------------------------------------------------
    socket.on("typing", async ({ chatId }) => {
        try {
            const chat = await loadAndAuthorise(socket, chatId, senderId);
            if (!chat) return;

            broadcastToMembers(io, chat, senderId, "typing", {
                chatId,
                userId: senderId
            });
        } catch (err) {
            console.error("[socket] typing error:", err);
        }
    });

    // -----------------------------------------------------------------------
    // stop-typing
    // -----------------------------------------------------------------------
    socket.on("stop-typing", async ({ chatId }) => {
        try {
            const chat = await loadAndAuthorise(socket, chatId, senderId);
            if (!chat) return;

            broadcastToMembers(io, chat, senderId, "stop-typing", {
                chatId,
                userId: senderId
            });
        } catch (err) {
            console.error("[socket] stop-typing error:", err);
        }
    });

    // -----------------------------------------------------------------------
    // message-read
    // Persists the read-receipt in the DB via Message.markReadUpTo(), THEN
    // broadcasts to peers so their UI updates immediately.
    // -----------------------------------------------------------------------
    socket.on("message-read", async ({ chatId, lastReadMessageId }) => {
        try {
            const chat = await loadAndAuthorise(socket, chatId, senderId);
            if (!chat) return;

            // 1. Persist  –  marks all messages up to lastReadMessageId as read
            await Message.markReadUpTo(chatId, senderId, lastReadMessageId);

            // 2. Broadcast  –  let other members know
            broadcastToMembers(io, chat, senderId, "message-read", {
                chatId,
                readBy: senderId,
                lastReadMessageId
            });
        } catch (err) {
            console.error("[socket] message-read error:", err);
        }
    });
};