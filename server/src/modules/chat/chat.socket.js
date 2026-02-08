const Chat = require("../../models/chat");
const Message = require("../../models/message");
const User = require("../../models/user");

// Helpers
async function loadAndAuthorise(socket, chatId, senderId) {
    const chat = await Chat.findById(chatId).populate("members", "name avatar");
    if (!chat) {
        socket.emit("error", { event: "chat", reason: "Chat not found" });
        return null;
    }
    if (!chat.members.some(m => String(m._id) === String(senderId))) {
        socket.emit("error", { event: "chat", reason: "Not a member" });
        return null;
    }
    return chat;
}

function emitToMembers(io, chat, senderId, event, payload) {
    chat.members.forEach(m => {
        if (String(m._id) !== String(senderId)) {
            io.to(`user:${m._id}`).emit(event, payload);
        }
    });
}

module.exports = (io, socket) => {
    if (!socket.userId) {
        console.warn("[socket] userId missing on socket");
        return;
    }

    const userId = socket.userId;

    socket.join(`user:${userId}`);

    // ---------------- Online Status ----------------
    User.findByIdAndUpdate(userId, { isOnline: true }, { new: true })
        .select("name avatar isOnline")
        .then(user => socket.broadcast.emit("user:status", user));

    socket.on("disconnect", async () => {
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit("user:status", { _id: userId, isOnline: false });
    });

    // ---------------- Send Message ----------------
    socket.on("chat:send", async ({ chatId, message }) => {
        try {
            const chat = await loadAndAuthorise(socket, chatId, userId);
            if (!chat) return;

            // 1️⃣ Emit to open chat window
            emitToMembers(io, chat, userId, "chat:receive", { chatId, message });

            // 2️⃣ Emit overview delta update
            emitToMembers(io, chat, userId, "overview:update", {
                entity: "chat",
                chatId,
                lastMessage: message
            });

            // 3️⃣ Emit unread increment
            emitToMembers(io, chat, userId, "overview:unread", {
                chatId,
                incrementBy: 1
            });

        } catch (e) {
            console.error("chat:send error", e);
            socket.emit("error", { event: "chat:send", reason: "Internal error" });
        }
    });

    // ---------------- Typing ----------------
    socket.on("chat:typing", async ({ chatId }) => {
        const chat = await loadAndAuthorise(socket, chatId, userId);
        if (!chat) return;

        const user = await User.findById(userId).select("name");
        emitToMembers(io, chat, userId, "chat:typing", {
            chatId,
            userId,
            userName: user?.name
        });
    });

    socket.on("chat:stop_typing", async ({ chatId }) => {
        const chat = await loadAndAuthorise(socket, chatId, userId);
        if (!chat) return;

        emitToMembers(io, chat, userId, "chat:stop_typing", {
            chatId,
            userId
        });
    });

    // ---------------- Read Receipts ----------------
    socket.on("chat:read", async ({ chatId, lastReadMessageId }) => {
        const chat = await loadAndAuthorise(socket, chatId, userId);
        if (!chat) return;

        emitToMembers(io, chat, userId, "chat:read_update", {
            chatId,
            readBy: userId,
            lastReadMessageId
        });
    });
};
