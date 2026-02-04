// services/chat.socket.service.js
import { io } from "socket.io-client";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
// Set this to your backend origin.  In most setups it comes from an env var
// that the bundler (Vite / CRA / Next) replaces at build time.
const SOCKET_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

// ---------------------------------------------------------------------------
// Singleton socket instance
// ---------------------------------------------------------------------------
// We hold one reference so the rest of the app can call connect() /
// disconnect() without worrying about duplicates.
let socket = null;

/**
 * Returns the live socket (or null if not yet connected).
 * Useful for guards: if (!getSocket()) return;
 */
export const getSocket = () => socket;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Open the connection.  Call once after the user logs in.
 *
 * @param {string} token  – JWT (or whatever your backend expects in
 *                          handshake.auth.token).
 * @returns {import("socket.io-client").Socket}
 */
export const connectSocket = (token) => {
    if (socket) {
        // Already connected – just return the existing instance
        return socket;
    }

    socket = io(SOCKET_URL, {
        // Send the token so the server-side socketAuthMiddleware can verify it
        auth: { token },
        // Reconnect automatically but with a cap so we don't hammer the server
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        // Prefer websockets; fall back to polling only if needed
        transports: ["websocket", "polling"],
    });

    // ---------------------------------------------------------------------------
    // Built-in lifecycle events  –  log only; consumers attach their own
    // callbacks via the on* helpers below.
    // ---------------------------------------------------------------------------
    socket.on("connect", () => {
        console.log("[socket] connected –", socket.id);
    });

    socket.on("connect_error", (err) => {
        console.warn("[socket] connection error –", err.message);
    });

    socket.on("disconnect", (reason) => {
        console.log("[socket] disconnected –", reason);
    });

    // Surface server-side errors (emitted by chat.socket.js on bad payloads)
    socket.on("error", (payload) => {
        console.error("[socket] server error –", payload);
    });

    return socket;
};

/**
 * Tear down the connection.  Call once when the user logs out.
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.off();           // remove every listener we attached
        socket.disconnect();
        socket = null;
    }
};

// ---------------------------------------------------------------------------
// Emitters  –  "client → server"
// ---------------------------------------------------------------------------

/**
 * Broadcast a new message to a chat room.
 * The backend validates membership before relaying to other members.
 *
 * @param {string} chatId   – the chat the message belongs to
 * @param {object} message  – the full message object (as returned by the
 *                            POST /message response) so peers get the same
 *                            shape the sender already has locally.
 */
export const emitSendMessage = (chatId, message) => {
    if (!socket) return;
    socket.emit("send-message", { chatId, message });
};

/**
 * Tell the room "I am typing in this chat".
 * Debounce this on the caller side – the server does NOT debounce.
 *
 * @param {string} chatId
 */
export const emitTyping = (chatId) => {
    if (!socket) return;
    socket.emit("typing", { chatId });
};

/**
 * Tell the room "I stopped typing".
 *
 * @param {string} chatId
 */
export const emitStopTyping = (chatId) => {
    if (!socket) return;
    socket.emit("stop-typing", { chatId });
};

/**
 * Persist + broadcast a read-receipt.
 * The backend calls Message.markReadUpTo() and then relays the event.
 *
 * @param {string} chatId             – which chat
 * @param {string} lastReadMessageId  – the newest message the user has seen
 */
export const emitMessageRead = (chatId, lastReadMessageId) => {
    if (!socket) return;
    socket.emit("message-read", { chatId, lastReadMessageId });
};

// ---------------------------------------------------------------------------
// Listeners  –  "server → client"
// Each returns an unsubscribe function so React effects can clean up cleanly.
// ---------------------------------------------------------------------------

/**
 * @param {(payload: { chatId: string, message: object }) => void} callback
 * @returns {() => void} unsubscribe
 */
export const onReceiveMessage = (callback) => {
    if (!socket) return () => { };
    socket.on("receive-message", callback);
    return () => socket?.off("receive-message", callback);
};

/**
 * @param {(payload: { chatId: string, userId: string }) => void} callback
 * @returns {() => void} unsubscribe
 */
export const onTyping = (callback) => {
    if (!socket) return () => { };
    socket.on("typing", callback);
    return () => socket?.off("typing", callback);
};

/**
 * @param {(payload: { chatId: string, userId: string }) => void} callback
 * @returns {() => void} unsubscribe
 */
export const onStopTyping = (callback) => {
    if (!socket) return () => { };
    socket.on("stop-typing", callback);
    return () => socket?.off("stop-typing", callback);
};

/**
 * @param {(payload: { chatId: string, readBy: string, lastReadMessageId: string }) => void} callback
 * @returns {() => void} unsubscribe
 */
export const onMessageRead = (callback) => {
    if (!socket) return () => { };
    socket.on("message-read", callback);
    return () => socket?.off("message-read", callback);
};