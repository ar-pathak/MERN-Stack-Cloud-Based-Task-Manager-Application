const Call = require("../../models/call");
const Chat = require("../../models/chat");

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loadAndAuthorize(socket, chatId, userId) {
    const chat = await Chat.findById(chatId).populate("members", "name avatar isOnline");

    if (!chat) {
        socket.emit("call:error", { reason: "Chat not found" });
        return null;
    }

    if (!chat.members.some(m => String(m._id) === String(userId))) {
        socket.emit("call:error", { reason: "Not authorized" });
        return null;
    }

    return chat;
}

function getDeviceInfo(socket) {
    const userAgent = socket.handshake.headers['user-agent'] || '';
    let deviceType = 'desktop';
    if (/mobile/i.test(userAgent)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';
    return { deviceType, userAgent };
}

function emitToMembers(io, chat, excludeUserId, event, payload) {
    chat.members.forEach(member => {
        if (String(member._id) !== String(excludeUserId)) {
            io.to(`user:${member._id}`).emit(event, payload);
        }
    });
}

function emitToAllMembers(io, chat, event, payload) {
    chat.members.forEach(member => {
        io.to(`user:${member._id}`).emit(event, payload);
    });
}

async function emitCallEnded(io, call, reason) {
    const payload = {
        callId: call._id,
        chatId: call.chatId,
        reason
    };

    io.to(`call:${call._id}`).emit("call:ended", payload);

    const chat = await Chat.findById(call.chatId).populate("members", "_id");
    if (chat) {
        emitToAllMembers(io, chat, "call:ended", payload);
    }
}

// ============================================================================
// MAIN SOCKET HANDLER
// ============================================================================

module.exports = (io, socket) => {
    const userId = socket.userId;

    if (!userId) {
        console.warn("[call-socket] userId missing on socket");
        return;
    }

    // ========================================================================
    // 1. INITIATE CALL
    // ========================================================================
    socket.on("call:start", async ({ chatId, type = "video" }) => {
        try {
            const chat = await loadAndAuthorize(socket, chatId, userId);
            if (!chat) return;
            socket.join(String(chat._id));

            const mode = chat.type === "private" ? "one-to-one" : "group";

            // Check existing call
            const existingCall = await Call.findOne({
                chatId,
                status: { $in: ["initiating", "ringing", "ongoing"] }
            });

            if (existingCall) {
                socket.emit("call:error", { reason: "Call already in progress" });
                return;
            }

            // Create Call
            const newCall = await Call.create({
                callerId: userId,
                chatId,
                type,
                mode,
                status: "ringing",
                participants: [{
                    userId,
                    deviceInfo: getDeviceInfo(socket),
                    mediaState: { video: type === "video", audio: true, screenShare: false }
                }]
            });

            socket.join(`call:${newCall._id}`);
            await newCall.populate("callerId", "name avatar");

            // ── CHANGE START ────────────────────────────────────────────────
            // IMPORTANT: Broadcast 'call:initiated' to the WHOLE ROOM.
            // This allows everyone in the chat to see the "Call Started" bar immediately.
            io.to(String(chat._id)).emit("call:initiated", {
                callId: newCall._id,
                call: newCall,
                callerId: userId, // Send caller ID to identify host
                chatId: chat._id
            });
            // ── CHANGE END ──────────────────────────────────────────────────

            // Also Notify Members individually (for ringing/push notifications if needed)
            emitToMembers(io, chat, userId, "call:incoming", {
                callId: newCall._id,
                callerId: userId,
                callerName: chat.members.find(m => String(m._id) === String(userId))?.name,
                chatId,
                chatName: chat.name,
                type,
                mode
            });

            // Timeout Logic
            setTimeout(async () => {
                const call = await Call.findById(newCall._id);
                if (call && call.status === "ringing") {
                    // Only expire if no one else joined
                    if (call.participants.length <= 1) {
                         call.status = "missed";
                         call.endedAt = new Date();
                         await call.save();
                         await emitCallEnded(io, call, "timeout");
                    }
                }
            }, 60000);

        } catch (error) {
            console.error("call:start error", error);
            socket.emit("call:error", { reason: "Failed to start call" });
        }
    });

    // ========================================================================
    // 2. JOIN CALL
    // ========================================================================
    socket.on("call:join", async ({ callId, mediaState = {} }) => {
        try {
            const call = await Call.findById(callId).populate("chatId");
            if (!call || !["ringing", "ongoing"].includes(call.status)) {
                socket.emit("call:error", { reason: "Call ended or invalid" });
                return;
            }

            const chat = await loadAndAuthorize(socket, call.chatId?._id || call.chatId, userId);
            if (!chat) return;
            socket.join(String(chat._id));

            // Add Participant
            await call.addParticipant(userId, getDeviceInfo(socket));
            if (Object.keys(mediaState).length > 0) {
                await call.updateParticipantMedia(userId, mediaState);
            }

            socket.join(`call:${callId}`);

            // Fetch Updated Call
            const updatedCall = await Call.findById(callId)
                .populate("callerId", "name avatar")
                .populate("participants.userId", "name avatar")
                .lean();

            // 1. Send Full State to Joiner
            socket.emit("call:joined", {
                callId,
                call: updatedCall,
                participants: updatedCall.participants.filter(p => !p.leftAt)
            });

            // 2. Notify Others
            const joiningParticipant = updatedCall.participants.find(p => String(p.userId._id) === String(userId));

            socket.to(`call:${callId}`).emit("call:participant-joined", {
                callId,
                participant: joiningParticipant
            });

        } catch (error) {
            console.error("call:join error", error);
            socket.emit("call:error", { reason: "Failed to join call" });
        }
    });

    // ========================================================================
    // 3. WebRTC SIGNALING
    // ========================================================================
    socket.on("call:offer", ({ callId, offer, targetUserId }) => {
        if (targetUserId) {
            io.to(`user:${targetUserId}`).emit("call:offer", { callId, offer, fromUserId: userId });
        }
    });

    socket.on("call:answer", ({ callId, answer, targetUserId }) => {
        if (targetUserId) {
            io.to(`user:${targetUserId}`).emit("call:answer", { callId, answer, fromUserId: userId });
        }
    });

    socket.on("call:ice-candidate", ({ callId, candidate, targetUserId }) => {
        if (targetUserId) {
            io.to(`user:${targetUserId}`).emit("call:ice-candidate", { callId, candidate, fromUserId: userId });
        }
    });

    // ========================================================================
    // 4. MEDIA & EVENTS
    // ========================================================================
    socket.on("call:media-state", async ({ callId, mediaState }) => {
        const call = await Call.findById(callId);
        if (call) {
            await call.updateParticipantMedia(userId, mediaState);
            socket.to(`call:${callId}`).emit("call:participant-media-update", { callId, userId, mediaState });
        }
    });

    socket.on("call:leave", async ({ callId }) => {
        const call = await Call.findById(callId);
        if (call) {
            await call.removeParticipant(userId);
            socket.leave(`call:${callId}`);
            socket.to(`call:${callId}`).emit("call:participant-left", { callId, userId });

            // End call if empty
            const active = call.participants.filter(p => !p.leftAt);
            if (active.length === 0) {
                call.status = "ended";
                call.endedAt = new Date();
                await call.save();
                await emitCallEnded(io, call, "all_left");
            }
        }
    });

    socket.on("call:end", async ({ callId }) => {
        const call = await Call.findById(callId);
        if (call && String(call.callerId) === String(userId)) {
            call.status = "ended";
            call.endedAt = new Date();
            await call.save();
            await emitCallEnded(io, call, "host_ended");
        }
    });

    socket.on("disconnect", async () => {
        const activeCalls = await Call.find({ "participants.userId": userId, status: { $in: ["ringing", "ongoing"] } });
        for (const call of activeCalls) {
            await call.removeParticipant(userId);
            io.to(`call:${call._id}`).emit("call:participant-left", { callId: call._id, userId });

            const active = call.participants.filter(p => !p.leftAt);
            if (active.length === 0) {
                call.status = "ended";
                call.endedAt = new Date();
                await call.save();
                await emitCallEnded(io, call, "all_left");
            }
        }
    });
};
