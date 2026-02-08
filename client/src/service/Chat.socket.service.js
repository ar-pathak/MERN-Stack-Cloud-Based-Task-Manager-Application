import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

let socket = null;

export const getSocket = () => socket;

export const connectSocket = (token) => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transports: ["websocket", "polling"],
    });

    socket.on("connect", () => console.log("[socket] connected –", socket.id));
    socket.on("disconnect", (r) => console.log("[socket] disconnected –", r));
    socket.on("error", (err) => console.error("[socket] error –", err));

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
    if (!socket) return () => { };
    socket.on(eventName, callback);
    return () => socket.off(eventName, callback);
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

// 🔥 NEW – Left Sidebar Realtime
export const onOverviewUpdate = (callback) =>
    attachListener("overview:update", callback);

export const onOverviewUnread = (callback) =>
    attachListener("overview:unread", callback);
