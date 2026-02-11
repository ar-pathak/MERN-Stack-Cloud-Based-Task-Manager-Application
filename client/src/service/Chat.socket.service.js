import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

let socket = null;

export const getSocket = () => socket;

export const connectSocket = (token) => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
        auth: { token },
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

// ---------------- CALL LISTENERS ----------------

export const onCallIncoming = (callback) =>
    attachListener("call:incoming", callback);

export const onCallInitiated = (callback) =>
    attachListener("call:initiated", callback);

export const onCallEnded = (callback) =>
    attachListener("call:ended", callback);

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
