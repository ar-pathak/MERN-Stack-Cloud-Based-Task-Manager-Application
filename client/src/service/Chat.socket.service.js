import { io } from "socket.io-client";

const normalizeBaseUrl = (value) =>
    String(value || "http://localhost:3000").replace(/\/+$/, "");

const SOCKET_URL = normalizeBaseUrl(import.meta.env?.VITE_API_URL);

let socket = null;

export const getSocket = () => socket;

export const connectSocket = (token = null) => {
    if (socket) return socket;

    const authPayload = token ? { token } : undefined;

    socket = io(SOCKET_URL, {
        auth: authPayload,
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transports: ["websocket", "polling"],
    });

    socket.on("connect", () => console.log("[socket] connected —", socket.id));
    socket.on("disconnect", (r) => console.log("[socket] disconnected —", r));
    socket.on("error", (err) => console.error("[socket] error —", err));

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

// ---------------- EMITTERS ----------------

export const emitSendMessage = (chatId, message) => {
    if (socket) socket.emit("chat:send", { chatId, message });
};

export const emitTyping = (chatId) => {
    if (socket) socket.emit("chat:typing", { chatId });
};

export const emitStopTyping = (chatId) => {
    if (socket) socket.emit("chat:stop_typing", { chatId });
};

export const emitMessageRead = (chatId, lastReadMessageId) => {
    if (socket) socket.emit("chat:read", { chatId, lastReadMessageId });
};

// ---------------- LISTENERS ----------------

const attachListener = (eventName, callback) => {
    if (typeof callback !== "function") return () => {};

    const activeSocket = socket || connectSocket();
    if (!activeSocket) return () => { };

    activeSocket.on(eventName, callback);
    return () => activeSocket.off(eventName, callback);
};

export const onReceiveMessage = (callback) =>
    attachListener("chat:receive", callback);

export const onTyping = (callback) =>
    attachListener("chat:typing", callback);

export const onStopTyping = (callback) =>
    attachListener("chat:stop_typing", callback);

export const onMessageRead = (callback) =>
    attachListener("chat:read_update", callback);

export const onUserStatus = (callback) =>
    attachListener("user:status", callback);

// 🔥 LEFT SIDEBAR REALTIME UPDATES

/**
 * Triggered when a new message is sent in any chat the user is part of
 * Payload: { entity: "chat", chatId, lastMessage }
 */
export const onOverviewUpdate = (callback) =>
    attachListener("overview:update", callback);

/**
 * Triggered when unread count should increment
 * Payload: { chatId, incrementBy }
 */
export const onOverviewUnread = (callback) =>
    attachListener("overview:unread", callback);

/**
 * 🆕 Triggered when user reads messages (reset unread count to 0)
 * Payload: { chatId }
 */
export const onOverviewUnreadReset = (callback) =>
    attachListener("overview:unread_reset", callback);

export const onMessageDeleted = (callback) =>
    attachListener("chat:message_deleted", callback);

export const onMessageEdited = (callback) =>
    attachListener("chat:message_edited", callback);

export const onReactionUpdated = (callback) =>
    attachListener("chat:reaction_updated", callback);

export const onMessagePinUpdated = (callback) =>
    attachListener("chat:message_pin_updated", callback);

export const emitMessageDeleted = (chatId, messageId) => {
    if (socket) socket.emit("chat:message_deleted", { chatId, messageId });
};

export const emitMessageEdited = (chatId, messageId, content) => {
    if (socket) socket.emit("chat:message_edited", { chatId, messageId, content });
};

// ---------------- CALL LISTENERS ----------------

export const onCallIncoming = (callback) =>
    attachListener("call:incoming", callback);

export const onCallInitiated = (callback) =>
    attachListener("call:initiated", callback);

export const onCallEnded = (callback) =>
    attachListener("call:ended", callback);

export const onCallInvited = (callback) =>
    attachListener("call:invited", callback);

export const onCallInviteSent = (callback) =>
    attachListener("call:invite:sent", callback);

export const emitCallInvite = (callId, targetUserIds) => {
    if (!socket) return;
    socket.emit("call:invite", { callId, targetUserIds });
};

// ---------------- NOTIFICATION LISTENERS ----------------

export const onNotificationNew = (callback) =>
    attachListener("notification:new", callback);

export const onNotificationUpdated = (callback) =>
    attachListener("notification:updated", callback);

export const onNotificationDeleted = (callback) =>
    attachListener("notification:deleted", callback);

export const onNotificationBulk = (callback) =>
    attachListener("notification:bulk", callback);

export const onNotificationAllRead = (callback) =>
    attachListener("notification:all_read", callback);

export const onNotificationUnreadCount = (callback) =>
    attachListener("notification:unread_count", callback);
