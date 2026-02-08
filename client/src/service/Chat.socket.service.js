// services/Chat.socket.service.js
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

// --- EMITTERS ---

export const emitSendMessage = (chatId, message) => {
    if (socket) socket.emit("send-message", { chatId, message });
};

export const emitTyping = (chatId) => {
    if (socket) socket.emit("typing", { chatId });
};

export const emitStopTyping = (chatId) => {
    if (socket) socket.emit("stop-typing", { chatId });
};

export const emitMessageRead = (chatId, lastReadMessageId) => {
    if (socket) socket.emit("message-read", { chatId, lastReadMessageId });
};

// --- LISTENERS ---

// Helper to safely attach listeners
const attachListener = (eventName, callback) => {
    if (!socket) {
        // console.warn(`[socket] Attempted to listen to '${eventName}' before connection established.`);
        return () => { };
    }
    socket.on(eventName, callback);
    return () => socket.off(eventName, callback);
};

export const onReceiveMessage = (callback) => attachListener("receive-message", callback);
export const onTyping = (callback) => attachListener("typing", callback);
export const onStopTyping = (callback) => attachListener("stop-typing", callback);
export const onMessageRead = (callback) => attachListener("message-read", callback);

// ✅ NEW: Listener for Online/Offline updates
export const onUserStatus = (callback) => attachListener("user-status", callback);