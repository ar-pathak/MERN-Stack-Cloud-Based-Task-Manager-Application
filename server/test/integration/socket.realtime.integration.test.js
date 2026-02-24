const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { after, afterEach, before, test } = require("node:test");
const path = require("node:path");
const mongoose = require("mongoose");

require("./helpers/loadEnv");

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-jwt-secret";
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "integration-refresh-secret";
process.env.RATE_LIMIT_STORE = "memory";
process.env.GLOBAL_RATE_LIMIT_MAX = process.env.GLOBAL_RATE_LIMIT_MAX || "1000";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || "1000";

const socketClientModule = (() => {
    try {
        return require("socket.io-client");
    } catch (_error) {
        return require(path.resolve(__dirname, "../../../client/node_modules/socket.io-client"));
    }
})();

const { io: createSocketClient } = socketClientModule;

const connectDB = require("../../src/config/database");
const User = require("../../src/models/user");
const RefreshToken = require("../../src/models/RefreshToken");
const Chat = require("../../src/models/chat");
const Message = require("../../src/models/message");
const Call = require("../../src/models/call");
const Notification = require("../../src/models/notification");
const { httpServer, io } = require("../../src/app");

const hasMongoUrl = Boolean(String(process.env.MONGO_URL || "").trim());
const testWithDb = hasMongoUrl ? test : test.skip;

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }
    return fallback;
};

const SOCKET_EVENT_TIMEOUT_MS = parsePositiveInt(process.env.SOCKET_EVENT_TIMEOUT_MS, 10000);
const SOCKET_CONNECT_TIMEOUT_MS = parsePositiveInt(process.env.SOCKET_CONNECT_TIMEOUT_MS, 10000);
const SOCKET_DB_POLL_INTERVAL_MS = parsePositiveInt(process.env.SOCKET_DB_POLL_INTERVAL_MS, 200);

let baseUrl = "";
const createdEmails = new Set();
const createdUserIds = new Set();
const createdChatIds = new Set();
const activeSockets = new Set();

const users = {
    owner: null,
    peer: null,
    outsider: null
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForActiveCallId = async (chatId, timeoutMs = SOCKET_EVENT_TIMEOUT_MS) => {
    const expiresAt = Date.now() + timeoutMs;

    while (Date.now() < expiresAt) {
        const call = await Call.findOne({
            chatId,
            status: { $in: ["initiating", "ringing", "ongoing"] }
        })
            .sort({ createdAt: -1 })
            .select("_id")
            .lean();

        if (call?._id) {
            return String(call._id);
        }

        // eslint-disable-next-line no-await-in-loop
        await delay(SOCKET_DB_POLL_INTERVAL_MS);
    }

    throw new Error(`Timed out waiting for active call in chat "${String(chatId)}"`);
};

const getSetCookieHeaders = (response) => {
    if (typeof response.headers.getSetCookie === "function") {
        return response.headers.getSetCookie();
    }

    const setCookieHeader = response.headers.get("set-cookie");
    return setCookieHeader ? [setCookieHeader] : [];
};

const parseCookieJar = (setCookieHeaders) => {
    const jar = {};

    for (const cookieLine of setCookieHeaders) {
        const firstSegment = String(cookieLine || "").split(";")[0].trim();
        if (!firstSegment) continue;

        const separatorIndex = firstSegment.indexOf("=");
        if (separatorIndex === -1) continue;

        const name = firstSegment.slice(0, separatorIndex).trim();
        const value = firstSegment.slice(separatorIndex + 1).trim();
        if (name) {
            jar[name] = value;
        }
    }

    return jar;
};

const toCookieHeader = (jar) => Object.entries(jar || {})
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

const requestJson = async (route, options = {}) => {
    const response = await fetch(`${baseUrl}${route}`, options);
    const body = await response.json();
    return { response, body };
};

const buildUserPayload = (prefix) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomInt(100000, 999999)}`;
    return {
        name: `${prefix} Socket User`,
        email: `${String(prefix).toLowerCase()}.${uniqueSuffix}@example.com`,
        password: "Str0ng@Pass1"
    };
};

const signupUser = async (prefix) => {
    const payload = buildUserPayload(prefix);
    const signup = await requestJson("/api/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    assert.equal(signup.response.status, 201);
    assert.equal(signup.body.success, true);

    const userId = signup.body.data?.user?.id;
    assert.ok(userId, "signup should return created user id");

    const cookieJar = parseCookieJar(getSetCookieHeaders(signup.response));
    assert.ok(cookieJar.accessToken, "signup should return access token cookie");

    createdEmails.add(payload.email.toLowerCase());
    createdUserIds.add(userId);

    return {
        userId,
        email: payload.email.toLowerCase(),
        cookieJar
    };
};

const createGroupChat = async (memberIds) => {
    const chat = await Chat.create({
        type: "group",
        name: `Socket Group ${Date.now()}-${crypto.randomInt(1000, 9999)}`,
        members: memberIds,
        admin: memberIds[0]
    });

    createdChatIds.add(String(chat._id));
    return chat;
};

const waitForSocketEvent = (socket, eventName, filter = () => true, timeoutMs = SOCKET_EVENT_TIMEOUT_MS) => (
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(eventName, handleEvent);
            reject(new Error(`Timed out waiting for socket event "${eventName}"`));
        }, timeoutMs);

        const handleEvent = (...args) => {
            const payload = args[0];
            if (!filter(payload, args)) return;
            clearTimeout(timer);
            socket.off(eventName, handleEvent);
            resolve(payload);
        };

        socket.on(eventName, handleEvent);
    })
);

const connectSocket = async (user) => (
    new Promise((resolve, reject) => {
        const cookieHeader = toCookieHeader(user?.cookieJar);
        const socket = createSocketClient(baseUrl, {
            transports: ["websocket"],
            forceNew: true,
            reconnection: false,
            extraHeaders: {
                Cookie: cookieHeader
            }
        });

        const timer = setTimeout(() => {
            socket.close();
            reject(new Error("Socket connection timed out"));
        }, SOCKET_CONNECT_TIMEOUT_MS);

        socket.once("connect", () => {
            clearTimeout(timer);
            activeSockets.add(socket);
            resolve(socket);
        });

        socket.once("connect_error", (error) => {
            clearTimeout(timer);
            socket.close();
            reject(error);
        });
    })
);

const disconnectSocket = async (socket) => {
    if (!socket) return;
    if (socket.disconnected) return;

    await new Promise((resolve) => {
        const timer = setTimeout(resolve, 500);
        socket.once("disconnect", () => {
            clearTimeout(timer);
            resolve();
        });
        socket.disconnect();
    });
};

before(async () => {
    if (!hasMongoUrl) return;

    await connectDB();

    if (!httpServer.listening) {
        await new Promise((resolve) => {
            httpServer.listen(0, "127.0.0.1", resolve);
        });
    }

    const address = httpServer.address();
    const port = typeof address === "object" && address ? address.port : null;
    if (!port) {
        throw new Error("Failed to start HTTP server for socket integration tests");
    }

    baseUrl = `http://127.0.0.1:${port}`;

    users.owner = await signupUser("Owner");
    users.peer = await signupUser("Peer");
    users.outsider = await signupUser("Outsider");
});

afterEach(async () => {
    if (!hasMongoUrl) return;

    if (createdChatIds.size > 0) {
        const chatIds = [...createdChatIds];
        await Call.updateMany(
            {
                chatId: { $in: chatIds },
                status: { $in: ["ringing", "ongoing"] }
            },
            {
                $set: {
                    status: "ended",
                    endedAt: new Date()
                }
            }
        );
    }

    for (const socket of activeSockets) {
        // eslint-disable-next-line no-await-in-loop
        await disconnectSocket(socket);
    }
    activeSockets.clear();
    await delay(75);

    if (createdChatIds.size > 0) {
        const chatIds = [...createdChatIds];
        await Notification.deleteMany({ chatId: { $in: chatIds } });
        await Call.deleteMany({ chatId: { $in: chatIds } });
        await Message.deleteMany({ chatId: { $in: chatIds } });
        await Chat.deleteMany({ _id: { $in: chatIds } });
        createdChatIds.clear();
    }
});

after(async () => {
    if (!hasMongoUrl) return;

    if (createdChatIds.size > 0) {
        const chatIds = [...createdChatIds];
        await Call.updateMany(
            {
                chatId: { $in: chatIds },
                status: { $in: ["ringing", "ongoing"] }
            },
            {
                $set: {
                    status: "ended",
                    endedAt: new Date()
                }
            }
        );
    }

    for (const socket of activeSockets) {
        // eslint-disable-next-line no-await-in-loop
        await disconnectSocket(socket);
    }
    activeSockets.clear();

    if (createdUserIds.size > 0) {
        await RefreshToken.deleteMany({ user: { $in: [...createdUserIds] } });
    }

    if (createdEmails.size > 0) {
        await User.deleteMany({ email: { $in: [...createdEmails] } });
    }

    await new Promise((resolve) => io.close(resolve));
    if (httpServer.listening) {
        await new Promise((resolve) => httpServer.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});

testWithDb("chat socket rejects join-chat for non-member", async () => {
    const chat = await createGroupChat([users.owner.userId, users.peer.userId]);
    const outsiderSocket = await connectSocket(users.outsider);

    const errorPromise = waitForSocketEvent(
        outsiderSocket,
        "error",
        (payload) => payload?.event === "chat" && payload?.reason === "Not a member"
    );

    outsiderSocket.emit("join-chat", String(chat._id));
    const errorPayload = await errorPromise;

    assert.equal(errorPayload.event, "chat");
    assert.equal(errorPayload.reason, "Not a member");
});

testWithDb("chat:send emits receive + overview updates to other member", async () => {
    const chat = await createGroupChat([users.owner.userId, users.peer.userId]);
    const ownerSocket = await connectSocket(users.owner);
    const peerSocket = await connectSocket(users.peer);

    const messagePayload = {
        _id: new mongoose.Types.ObjectId().toString(),
        content: "Socket hello",
        senderId: users.owner.userId
    };

    const receivePromise = waitForSocketEvent(
        peerSocket,
        "chat:receive",
        (payload) => String(payload?.chatId) === String(chat._id) && payload?.message?.content === messagePayload.content
    );
    const overviewPromise = waitForSocketEvent(
        peerSocket,
        "overview:update",
        (payload) => String(payload?.chatId) === String(chat._id)
    );
    const unreadPromise = waitForSocketEvent(
        peerSocket,
        "overview:unread",
        (payload) => String(payload?.chatId) === String(chat._id)
    );

    ownerSocket.emit("chat:send", {
        chatId: String(chat._id),
        message: messagePayload
    });

    const [receiveEvent, overviewEvent, unreadEvent] = await Promise.all([
        receivePromise,
        overviewPromise,
        unreadPromise
    ]);

    assert.equal(String(receiveEvent.chatId), String(chat._id));
    assert.equal(receiveEvent.message.content, messagePayload.content);
    assert.equal(String(overviewEvent.chatId), String(chat._id));
    assert.equal(String(unreadEvent.chatId), String(chat._id));
    assert.equal(Number(unreadEvent.incrementBy), 1);
});

testWithDb("chat:read emits read_update to other member and unread reset to self", async () => {
    const chat = await createGroupChat([users.owner.userId, users.peer.userId]);
    const ownerSocket = await connectSocket(users.owner);
    const peerSocket = await connectSocket(users.peer);

    const storedMessage = await Message.create({
        chatId: chat._id,
        senderId: users.owner.userId,
        content: "Persisted message for read test",
        type: "text",
        status: "active"
    });

    const readUpdatePromise = waitForSocketEvent(
        ownerSocket,
        "chat:read_update",
        (payload) =>
            String(payload?.chatId) === String(chat._id)
            && String(payload?.lastReadMessageId) === String(storedMessage._id)
    );
    const unreadResetPromise = waitForSocketEvent(
        peerSocket,
        "overview:unread_reset",
        (payload) => String(payload?.chatId) === String(chat._id)
    );

    peerSocket.emit("chat:read", {
        chatId: String(chat._id),
        lastReadMessageId: String(storedMessage._id)
    });

    const [readUpdate, unreadReset] = await Promise.all([readUpdatePromise, unreadResetPromise]);

    assert.equal(String(readUpdate.chatId), String(chat._id));
    assert.equal(String(readUpdate.lastReadMessageId), String(storedMessage._id));
    assert.equal(String(unreadReset.chatId), String(chat._id));

    const updatedMessage = await Message.findById(storedMessage._id).lean();
    const hasReader = (updatedMessage?.readBy || []).some(
        (entry) => String(entry.userId) === String(users.peer.userId)
    );
    assert.equal(hasReader, true);
});

testWithDb("call:start then call:join emits critical realtime events and updates call state", async () => {
    const chat = await createGroupChat([users.owner.userId, users.peer.userId]);
    const ownerSocket = await connectSocket(users.owner);
    const peerSocket = await connectSocket(users.peer);

    const initiatedPromise = waitForSocketEvent(
        ownerSocket,
        "call:initiated",
        (payload) => String(payload?.chatId) === String(chat._id),
        SOCKET_EVENT_TIMEOUT_MS
    );
    const incomingPromise = waitForSocketEvent(
        peerSocket,
        "call:incoming",
        (payload) => String(payload?.chatId) === String(chat._id),
        SOCKET_EVENT_TIMEOUT_MS
    );

    ownerSocket.emit("call:start", {
        chatId: String(chat._id),
        type: "video"
    });

    const [initiatedEvent, incomingEvent] = await Promise.all([initiatedPromise, incomingPromise]);
    const callId = String(initiatedEvent?.callId || incomingEvent?.callId);
    assert.ok(callId, "call:start should emit call id");

    const callAfterStart = await Call.findById(callId).lean();
    assert.ok(callAfterStart?._id, "call should be persisted after start");
    assert.equal(callAfterStart.status, "ringing");

    const joinedPromise = waitForSocketEvent(
        peerSocket,
        "call:joined",
        (payload) => String(payload?.callId) === callId
    );
    const participantJoinedPromise = waitForSocketEvent(
        ownerSocket,
        "call:participant-joined",
        (payload) => String(payload?.callId) === callId
    );

    peerSocket.emit("call:join", {
        callId,
        mediaState: {
            video: true,
            audio: true
        }
    });

    const [joinedEvent, participantJoinedEvent] = await Promise.all([
        joinedPromise,
        participantJoinedPromise
    ]);

    assert.equal(String(joinedEvent.callId), callId);
    assert.equal(String(participantJoinedEvent.callId), callId);

    const callAfterJoin = await Call.findById(callId).lean();
    assert.equal(callAfterJoin.status, "ongoing");

    const activeParticipants = (callAfterJoin.participants || []).filter((participant) => !participant.leftAt);
    assert.equal(activeParticipants.length, 2);
});

testWithDb("call:offer relays to authorized participant and rejects outsider", async () => {
    const chat = await createGroupChat([users.owner.userId, users.peer.userId]);
    const ownerSocket = await connectSocket(users.owner);
    const peerSocket = await connectSocket(users.peer);
    const outsiderSocket = await connectSocket(users.outsider);

    const initiatedPromise = waitForSocketEvent(
        ownerSocket,
        "call:initiated",
        (payload) => String(payload?.chatId) === String(chat._id),
        SOCKET_EVENT_TIMEOUT_MS
    );
    const incomingPromise = waitForSocketEvent(
        peerSocket,
        "call:incoming",
        (payload) => String(payload?.chatId) === String(chat._id),
        SOCKET_EVENT_TIMEOUT_MS
    );

    ownerSocket.emit("call:start", { chatId: String(chat._id), type: "audio" });

    let callId = "";
    try {
        const startEvent = await Promise.any([initiatedPromise, incomingPromise]);
        callId = String(startEvent?.callId || "");
    } catch (_eventError) {
        // Ignore event race failures and fallback to DB polling below.
    }

    if (!callId) {
        callId = await waitForActiveCallId(chat._id, SOCKET_EVENT_TIMEOUT_MS);
    }

    const joinedPromise = waitForSocketEvent(
        peerSocket,
        "call:joined",
        (payload) => String(payload?.callId) === callId,
        SOCKET_EVENT_TIMEOUT_MS
    );
    peerSocket.emit("call:join", { callId });
    await joinedPromise;

    const offerPayload = {
        type: "offer",
        sdp: "v=0\r\n"
    };

    const peerOfferPromise = waitForSocketEvent(
        peerSocket,
        "call:offer",
        (payload) => String(payload?.callId) === callId && String(payload?.fromUserId) === String(users.owner.userId)
    );
    ownerSocket.emit("call:offer", {
        callId,
        offer: offerPayload,
        targetUserId: users.peer.userId
    });

    const peerOffer = await peerOfferPromise;
    assert.equal(String(peerOffer.callId), callId);
    assert.equal(String(peerOffer.fromUserId), String(users.owner.userId));

    const outsiderErrorPromise = waitForSocketEvent(
        outsiderSocket,
        "call:error",
        (payload) => String(payload?.reason || "").toLowerCase().includes("not authorized")
    );
    outsiderSocket.emit("call:offer", {
        callId,
        offer: offerPayload,
        targetUserId: users.peer.userId
    });

    const outsiderError = await outsiderErrorPromise;
    assert.equal(outsiderError.reason, "Not authorized for this call");
});
