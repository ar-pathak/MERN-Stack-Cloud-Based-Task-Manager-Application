const Call = require("../../models/call");
const Chat = require("../../models/chat");
const Message = require("../../models/message");
const { createNotifications } = require("../notification/notification.service");

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loadAndAuthorize(socket, chatId, userId) {
    const chat = await Chat.findById(chatId).populate("members", "name username avatar isOnline");

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

function serializeChatMembers(chat) {
    return (chat?.members || []).map((member) => ({
        _id: member._id,
        name: member.name || member.username || "User",
        username: member.username || null,
        avatar: member.avatar || null,
        isOnline: Boolean(member.isOnline)
    }));
}

function formatInviteContent(inviterName, invitedMembers, callType) {
    const inviteeLabels = invitedMembers.map((member) =>
        member?.username ? `@${member.username}` : (member?.name || "a member")
    );

    if (inviteeLabels.length === 1) {
        return `${inviterName} invited ${inviteeLabels[0]} to join the ${callType} call.`;
    }

    if (inviteeLabels.length === 2) {
        return `${inviterName} invited ${inviteeLabels[0]} and ${inviteeLabels[1]} to join the ${callType} call.`;
    }

    const head = inviteeLabels.slice(0, -1).join(", ");
    const tail = inviteeLabels[inviteeLabels.length - 1];
    return `${inviterName} invited ${head}, and ${tail} to join the ${callType} call.`;
}

function emitToAllMembers(io, chat, event, payload) {
    chat.members.forEach(member => {
        io.to(`user:${member._id}`).emit(event, payload);
    });
}

async function emitSystemMessageToChatMembers(io, chat, senderId, messageId) {
    const populatedMessage = await Message.findById(messageId)
        .populate("senderId", "name username avatar")
        .populate("mentions", "name username avatar")
        .lean();

    if (!populatedMessage) {
        return null;
    }

    chat.members.forEach((member) => {
        const memberId = String(member._id);

        io.to(`user:${memberId}`).emit("chat:receive", {
            chatId: chat._id,
            message: populatedMessage
        });

        io.to(`user:${memberId}`).emit("overview:update", {
            entity: "chat",
            chatId: chat._id,
            lastMessage: populatedMessage
        });

        if (memberId !== String(senderId)) {
            io.to(`user:${memberId}`).emit("overview:unread", {
                chatId: chat._id,
                incrementBy: 1
            });
        }
    });

    return populatedMessage;
}

function buildCallEndMessage(reason, endedByName = null) {
    if (endedByName) {
        return `${endedByName} ended the call.`;
    }

    if (reason === "host_ended") {
        return "The host ended the call.";
    }

    if (reason === "timeout") {
        return "Call ended because nobody joined.";
    }

    if (reason === "all_left") {
        return "Call ended because everyone left.";
    }

    return "Call ended.";
}

async function emitCallEnded(io, call, reason, endedByUserId = null, endedByName = null) {
    const payload = {
        callId: call._id,
        chatId: call.chatId,
        reason
    };

    io.to(`call:${call._id}`).emit("call:ended", payload);

    const chat = await Chat.findById(call.chatId).populate("members", "_id name username avatar");
    if (chat) {
        const endedById = endedByUserId ? String(endedByUserId) : null;
        let resolvedEndedByName = endedByName || null;
        let messageSenderId = endedByUserId || call.callerId;

        if (!resolvedEndedByName && endedById) {
            const endedByMember = chat.members.find((member) => String(member._id) === endedById);
            if (endedByMember) {
                resolvedEndedByName = endedByMember.name || endedByMember.username || "A user";
            }
        }

        if (!resolvedEndedByName && reason === "host_ended" && String(call.callerId)) {
            const callerMember = chat.members.find((member) => String(member._id) === String(call.callerId));
            if (callerMember) {
                resolvedEndedByName = callerMember.name || callerMember.username || "A user";
                messageSenderId = callerMember._id;
            }
        }

        try {
            const callEndMessage = await Message.create({
                chatId: chat._id,
                senderId: messageSenderId,
                content: buildCallEndMessage(reason, resolvedEndedByName),
                type: "text",
                isSystem: true,
                meta: {
                    isActivity: true,
                    activityType: "call_ended",
                    callId: call._id,
                    reason,
                    endedBy: endedByUserId || null
                }
            });

            await Chat.findByIdAndUpdate(chat._id, { lastMessage: callEndMessage._id });
            await emitSystemMessageToChatMembers(io, chat, messageSenderId, callEndMessage._id);
        } catch (messageError) {
            console.error("call:end system message error", messageError);
        }

        emitToAllMembers(io, chat, "call:ended", payload);

        const recipientIds = chat.members.map((member) => member._id);
        await createNotifications({
            recipientIds,
            actorId: endedByUserId || call.callerId,
            title: "Call ended",
            message: "An active call has ended.",
            type: "call",
            category: "call",
            priority: "normal",
            entityType: "call",
            entityId: call._id,
            chatId: call.chatId,
            callId: call._id,
            link: "/main",
            metadata: {
                reason
            },
            dedupeKey: `call:end:${String(call._id)}:${reason}`
        });
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
            const callerName = newCall.callerId?.name || "A user";

            try {
                const callStartMessage = await Message.create({
                    chatId: chat._id,
                    senderId: userId,
                    content: `${callerName} started a ${type} call.`,
                    type: "text",
                    isSystem: true,
                    meta: {
                        isActivity: true,
                        activityType: "call_started",
                        callId: newCall._id,
                        callType: type,
                        startedBy: userId
                    }
                });

                await Chat.findByIdAndUpdate(chat._id, { lastMessage: callStartMessage._id });
                await emitSystemMessageToChatMembers(io, chat, userId, callStartMessage._id);
            } catch (messageError) {
                console.error("call:start system message error", messageError);
            }

            // ── CHANGE START ────────────────────────────────────────────────
            // IMPORTANT: Broadcast 'call:initiated' to the WHOLE ROOM.
            // This allows everyone in the chat to see the "Call Started" bar immediately.
            io.to(String(chat._id)).emit("call:initiated", {
                callId: newCall._id,
                call: newCall,
                callerId: userId, // Send caller ID to identify host
                chatId: chat._id,
                chatMembers: serializeChatMembers(chat)
            });
            // ── CHANGE END ──────────────────────────────────────────────────

            // Also Notify Members individually (for ringing/push notifications if needed)
            emitToMembers(io, chat, userId, "call:incoming", {
                callId: newCall._id,
                callerId: userId,
                callerName,
                chatId,
                chatName: chat.name,
                type,
                mode
            });

            await createNotifications({
                recipientIds: chat.members.map((member) => member._id),
                actorId: userId,
                title: `${type === "audio" ? "Audio" : "Video"} call started`,
                message: `${callerName} started a ${type} call${chat.name ? ` in "${chat.name}"` : ""}.`,
                type: "call",
                category: "call",
                priority: "high",
                entityType: "call",
                entityId: newCall._id,
                chatId,
                callId: newCall._id,
                link: "/main",
                metadata: {
                    mode,
                    chatName: chat.name || null
                },
                dedupeKey: `call:start:${String(newCall._id)}`
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
                participants: updatedCall.participants.filter(p => !p.leftAt),
                chatMembers: serializeChatMembers(chat)
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
    // 2B. INVITE USERS TO ACTIVE GROUP CALL
    // ========================================================================
    socket.on("call:invite", async ({ callId, targetUserId, targetUserIds = [] }) => {
        try {
            if (!callId) {
                socket.emit("call:error", { reason: "Invalid call" });
                return;
            }

            const call = await Call.findById(callId)
                .populate("callerId", "name username avatar")
                .populate("participants.userId", "name username avatar");

            if (!call || !["ringing", "ongoing"].includes(call.status)) {
                socket.emit("call:error", { reason: "Call ended or invalid" });
                return;
            }

            if (call.mode !== "group") {
                socket.emit("call:error", { reason: "Invites are only available in group calls" });
                return;
            }

            const chat = await loadAndAuthorize(socket, call.chatId, userId);
            if (!chat) return;

            const activeParticipantIds = new Set(
                (call.participants || [])
                    .filter((participant) => !participant.leftAt)
                    .map((participant) => String(participant.userId?._id || participant.userId))
            );

            if (!activeParticipantIds.has(String(userId))) {
                socket.emit("call:error", { reason: "Join the call before inviting others" });
                return;
            }

            const requestedTargetIds = [...(targetUserIds || []), targetUserId]
                .filter(Boolean)
                .map((id) => String(id));
            const uniqueTargetIds = [...new Set(requestedTargetIds)];

            if (!uniqueTargetIds.length) {
                socket.emit("call:error", { reason: "Select at least one user to invite" });
                return;
            }

            const chatMembersById = new Map(
                (chat.members || []).map((member) => [String(member._id), member])
            );

            const eligibleTargetIds = uniqueTargetIds.filter((targetId) => {
                if (targetId === String(userId)) return false;
                if (!chatMembersById.has(targetId)) return false;
                if (activeParticipantIds.has(targetId)) return false;
                return true;
            });

            if (!eligibleTargetIds.length) {
                socket.emit("call:error", { reason: "Selected users are already in call or not available" });
                return;
            }

            const invitedMembers = eligibleTargetIds
                .map((targetId) => chatMembersById.get(targetId))
                .filter(Boolean);

            const inviter = chatMembersById.get(String(userId));
            const inviterName = inviter?.name || inviter?.username || call.callerId?.name || "A user";
            const inviteMessageText = formatInviteContent(inviterName, invitedMembers, call.type || "video");

            const inviteMessage = await Message.create({
                chatId: chat._id,
                senderId: userId,
                content: inviteMessageText,
                type: "text",
                isSystem: true,
                mentions: invitedMembers.map((member) => member._id),
                meta: {
                    isActivity: true,
                    activityType: "call_invite",
                    callId: call._id,
                    invitedUserIds: invitedMembers.map((member) => member._id)
                }
            });

            await Chat.findByIdAndUpdate(chat._id, { lastMessage: inviteMessage._id });
            const populatedInviteMessage = await emitSystemMessageToChatMembers(
                io,
                chat,
                userId,
                inviteMessage._id
            );

            const refreshedCall = await Call.findById(callId)
                .populate("callerId", "name username avatar")
                .populate("participants.userId", "name username avatar")
                .lean();

            const invitePayloadBase = {
                callId: call._id,
                chatId: chat._id,
                type: call.type,
                mode: call.mode,
                inviterId: userId,
                inviterName,
                chatName: chat.name || null,
                call: refreshedCall,
                chatMembers: serializeChatMembers(chat),
                message: populatedInviteMessage
            };

            eligibleTargetIds.forEach((targetId) => {
                io.to(`user:${targetId}`).emit("call:invited", {
                    ...invitePayloadBase,
                    targetUserId: targetId
                });

                io.to(`user:${targetId}`).emit("call:incoming", {
                    callId: call._id,
                    callerId: userId,
                    callerName: inviterName,
                    chatId: chat._id,
                    chatName: chat.name,
                    type: call.type,
                    mode: call.mode,
                    invitedBy: userId,
                    invitedByName: inviterName
                });
            });

            socket.emit("call:invite:sent", {
                callId: call._id,
                chatId: chat._id,
                invitedUserIds: eligibleTargetIds,
                messageId: inviteMessage._id
            });

            await createNotifications({
                recipientIds: eligibleTargetIds,
                actorId: userId,
                title: "Call invitation",
                message: `${inviterName} invited you to join a ${call.type} call${chat.name ? ` in "${chat.name}"` : ""}.`,
                type: "call",
                category: "call",
                priority: "high",
                entityType: "call",
                entityId: call._id,
                chatId: chat._id,
                callId: call._id,
                link: "/main",
                metadata: {
                    source: "call.invite",
                    invitedUserIds: eligibleTargetIds
                },
                dedupeKey: `call:invite:${String(call._id)}:${String(userId)}:${eligibleTargetIds.join(",")}`
            });
        } catch (error) {
            console.error("call:invite error", error);
            socket.emit("call:error", { reason: "Failed to send call invite" });
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
                await emitCallEnded(io, call, "all_left", userId);
            }
        }
    });

    socket.on("call:end", async ({ callId }) => {
        const call = await Call.findById(callId);
        if (call && String(call.callerId) === String(userId)) {
            call.status = "ended";
            call.endedAt = new Date();
            await call.save();
            await emitCallEnded(io, call, "host_ended", userId);
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
                await emitCallEnded(io, call, "all_left", userId);
            }
        }
    });
};
