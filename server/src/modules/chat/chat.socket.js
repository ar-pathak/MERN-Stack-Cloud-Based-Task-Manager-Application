const Chat = require("../../models/chat");
const Message = require("../../models/message");
const User = require("../../models/user");

// ... (loadAndAuthorise aur broadcastToMembers helper functions same rahenge) ...
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

function broadcastToMembers(io, chat, senderId, eventName, payload) {
    for (const memberId of chat.members) {
        if (String(memberId) !== String(senderId)) {
            io.to(`user:${memberId}`).emit(eventName, payload);
        }
    }
}

// ---------------------------------------------------------------------------
// Main export 
// ---------------------------------------------------------------------------
module.exports = (io, socket, onlineUsers) => {
    const senderId = socket.userId;

    // -----------------------------------------------------------------------
    // 1. ONLINE STATUS (Updated Code)
    // -----------------------------------------------------------------------
    // Hum { new: true } use karenge taaki updated user mile.
    // .select() use karenge taaki password/email leak na ho, sirf public info jaye.
    User.findByIdAndUpdate(senderId, { isOnline: true }, { new: true })
        .select("name username avatar isOnline")
        .then((user) => {
            if (user) {
                // Ab ye "user" object bhejega, sirf ID nahi
                socket.broadcast.emit("user-status", user);
            }
        })
        .catch(err => console.error("Error setting online:", err));

    socket.join(`user:${senderId}`);

    // -----------------------------------------------------------------------
    // 2. OFFLINE STATUS
    // -----------------------------------------------------------------------
    socket.on("disconnect", async () => {
        // Offline hone par hum usually sirf ID bhejte hain taaki frontend usse grey kar de.
        // Lekin agar aapko wahan bhi user details chahiye, toh logic same rahega.
        await User.findByIdAndUpdate(senderId, { isOnline: false, lastSeen: new Date() });

        // Offline ke liye sirf ID kaafi hoti hai, par consistency ke liye object structure same rakhein
        socket.broadcast.emit("user-status", {
            _id: senderId,
            isOnline: false,
            status: "offline"
        });
    });

    // -----------------------------------------------------------------------
    // send-message (Same as before)
    // -----------------------------------------------------------------------
    socket.on("send-message", async ({ chatId, message }) => {
        try {
            const chat = await loadAndAuthorise(socket, chatId, senderId);
            if (!chat) return;

            User.findByIdAndUpdate(senderId, { lastActive: new Date() }).exec();

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
    // typing (Same as before)
    // -----------------------------------------------------------------------
    socket.on("typing", async ({ chatId }) => {
        try {
            const chat = await loadAndAuthorise(socket, chatId, senderId);
            if (!chat) return;

            const user = await User.findById(senderId).select('name');

            broadcastToMembers(io, chat, senderId, "typing", {
                chatId,
                userId: senderId,
                userName: user ? user.name : "Someone"
            });
        } catch (err) {
            console.error("[socket] typing error:", err);
        }
    });

    // -----------------------------------------------------------------------
    // stop-typing (Same as before)
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
    // message-read (Same as before)
    // -----------------------------------------------------------------------
    socket.on("message-read", async ({ chatId, lastReadMessageId }) => {
        try {
            const chat = await loadAndAuthorise(socket, chatId, senderId);
            if (!chat) return;

            User.findByIdAndUpdate(senderId, { lastActive: new Date() }).exec();
            await Message.markReadUpTo(chatId, senderId, lastReadMessageId);

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