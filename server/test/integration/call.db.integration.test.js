const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

require("./helpers/loadEnv");

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-jwt-secret";
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "integration-refresh-secret";
process.env.RATE_LIMIT_STORE = "memory";
process.env.GLOBAL_RATE_LIMIT_MAX = process.env.GLOBAL_RATE_LIMIT_MAX || "1000";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || "1000";

const connectDB = require("../../src/config/database");
const User = require("../../src/models/user");
const Chat = require("../../src/models/chat");
const Call = require("../../src/models/call");
const RefreshToken = require("../../src/models/RefreshToken");
const { httpServer, io } = require("../../src/app");

const { isDbIntegrationEnabled, testWithDb } = require("./helpers/dbTestGate");

let baseUrl = "";

const createdUserIds = new Set();
const createdUserEmails = new Set();
const createdChatIds = new Set();
const createdCallIds = new Set();

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

const toCookieHeader = (jar) => Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

const requestJson = async (route, options = {}) => {
    const response = await fetch(`${baseUrl}${route}`, options);
    const body = await response.json();
    return { response, body };
};

const buildUniqueAuthPayload = (label) => {
    const uniqueSuffix = `${label}.${Date.now()}-${crypto.randomInt(100000, 999999)}`;
    return {
        name: `Call ${label} User`,
        email: `call.${uniqueSuffix}@example.com`,
        password: "Str0ng@Pass1"
    };
};

const signupUser = async (label) => {
    const payload = buildUniqueAuthPayload(label);

    const signup = await requestJson("/api/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    assert.equal(signup.response.status, 201);
    assert.equal(signup.body.success, true);

    const userId = String(signup.body.data?.user?.id || "");
    assert.ok(userId, "signup should return user id");

    createdUserIds.add(userId);
    createdUserEmails.add(payload.email.toLowerCase());

    const cookies = parseCookieJar(getSetCookieHeaders(signup.response));
    assert.ok(cookies.accessToken, "signup should set accessToken cookie");

    return {
        userId,
        email: payload.email.toLowerCase(),
        cookies
    };
};

const createChat = async (members, type = "private") => {
    const chat = await Chat.create({
        type,
        members
    });
    createdChatIds.add(String(chat._id));
    return chat;
};

const createCall = async (payload) => {
    const call = await Call.create(payload);
    createdCallIds.add(String(call._id));
    return call;
};

beforeAll(async () => {
    if (!isDbIntegrationEnabled) return;

    await connectDB();

    if (!httpServer.listening) {
        await new Promise((resolve) => {
            httpServer.listen(0, "127.0.0.1", resolve);
        });
    }

    const address = httpServer.address();
    const port = typeof address === "object" && address ? address.port : null;
    if (!port) {
        throw new Error("Failed to start HTTP server for call DB integration tests");
    }

    baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
    if (!isDbIntegrationEnabled) return;

    if (createdCallIds.size > 0) {
        await Call.deleteMany({ _id: { $in: [...createdCallIds] } });
    }

    if (createdChatIds.size > 0) {
        await Chat.deleteMany({ _id: { $in: [...createdChatIds] } });
    }

    if (createdUserIds.size > 0) {
        await RefreshToken.deleteMany({ user: { $in: [...createdUserIds] } });
        await User.deleteMany({ _id: { $in: [...createdUserIds] } });
    } else if (createdUserEmails.size > 0) {
        await User.deleteMany({ email: { $in: [...createdUserEmails] } });
    }

    await new Promise((resolve) => io.close(resolve));
    if (httpServer.listening) {
        await new Promise((resolve) => httpServer.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});

testWithDb("call routes require authentication", async () => {
    const result = await requestJson("/api/calls/history");

    assert.equal(result.response.status, 401);
    assert.equal(result.body.success, false);
    assert.equal(result.body.message, "Authentication required. No token provided.");
});

testWithDb("call history, statistics, and missed count return user-scoped results", async () => {
    const owner = await signupUser("owner");
    const peer = await signupUser("peer");

    const chat = await createChat([owner.userId, peer.userId], "private");

    const endedOutgoing = await createCall({
        callerId: owner.userId,
        chatId: chat._id,
        type: "video",
        mode: "one-to-one",
        status: "ended",
        participants: [
            { userId: owner.userId, joinedAt: new Date(Date.now() - 6 * 60 * 1000), leftAt: new Date() },
            { userId: peer.userId, joinedAt: new Date(Date.now() - 6 * 60 * 1000), leftAt: new Date() }
        ],
        startedAt: new Date(Date.now() - 6 * 60 * 1000),
        endedAt: new Date()
    });

    await createCall({
        callerId: peer.userId,
        chatId: chat._id,
        type: "audio",
        mode: "one-to-one",
        status: "missed",
        participants: [
            { userId: owner.userId, joinedAt: new Date() },
            { userId: peer.userId, joinedAt: new Date() }
        ]
    });

    const history = await requestJson("/api/calls/history?status=ended&type=video&page=1&limit=10", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(history.response.status, 200);
    assert.equal(history.body.success, true);
    assert.ok(Array.isArray(history.body.data?.calls));
    assert.ok(history.body.data.calls.some((entry) => String(entry._id) === String(endedOutgoing._id)));
    assert.equal(history.body.data.calls[0].direction, "outgoing");

    const stats = await requestJson("/api/calls/stats/overview?period=30", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(stats.response.status, 200);
    assert.equal(stats.body.success, true);
    assert.ok(Number(stats.body.data?.stats?.total) >= 2);
    assert.ok(Number(stats.body.data?.stats?.byStatus?.missed) >= 1);

    const missedCount = await requestJson("/api/calls/missed/count", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(missedCount.response.status, 200);
    assert.equal(missedCount.body.success, true);
    assert.ok(Number(missedCount.body.data?.count) >= 1);
});

testWithDb("call active/details/logs/feedback/delete/clear endpoints work end-to-end", async () => {
    const owner = await signupUser("owner-flows");
    const peer = await signupUser("peer-flows");
    const outsider = await signupUser("outsider-flows");

    const chat = await createChat([owner.userId, peer.userId], "private");

    const activeCall = await createCall({
        callerId: owner.userId,
        chatId: chat._id,
        type: "video",
        mode: "one-to-one",
        status: "ongoing",
        participants: [
            { userId: owner.userId, joinedAt: new Date(Date.now() - 2 * 60 * 1000) },
            { userId: peer.userId, joinedAt: new Date(Date.now() - 2 * 60 * 1000) }
        ],
        startedAt: new Date(Date.now() - 2 * 60 * 1000)
    });

    const historicalCall = await createCall({
        callerId: peer.userId,
        chatId: chat._id,
        type: "audio",
        mode: "one-to-one",
        status: "ended",
        participants: [
            { userId: owner.userId, joinedAt: new Date(Date.now() - 20 * 60 * 1000), leftAt: new Date(Date.now() - 15 * 60 * 1000) },
            { userId: peer.userId, joinedAt: new Date(Date.now() - 20 * 60 * 1000), leftAt: new Date(Date.now() - 15 * 60 * 1000) }
        ],
        startedAt: new Date(Date.now() - 20 * 60 * 1000),
        endedAt: new Date(Date.now() - 15 * 60 * 1000)
    });

    const activeByChat = await requestJson(`/api/calls/active?chatId=${chat._id}`, {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(activeByChat.response.status, 200);
    assert.equal(activeByChat.body.success, true);
    assert.equal(String(activeByChat.body.data?.activeCall?._id), String(activeCall._id));

    const activeList = await requestJson("/api/calls/active/list", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(activeList.response.status, 200);
    assert.equal(activeList.body.success, true);
    assert.ok(Array.isArray(activeList.body.data?.activeCalls));
    assert.ok(activeList.body.data.activeCalls.some((entry) => String(entry._id) === String(activeCall._id)));

    const details = await requestJson(`/api/calls/${activeCall._id}`, {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(details.response.status, 200);
    assert.equal(details.body.success, true);
    assert.equal(String(details.body.data?.call?._id), String(activeCall._id));

    const outsiderDetails = await requestJson(`/api/calls/${activeCall._id}`, {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(outsider.cookies)
        }
    });

    assert.equal(outsiderDetails.response.status, 403);
    assert.equal(outsiderDetails.body.error, "Not authorized");

    const chatLogs = await requestJson(`/api/calls/chat/${chat._id}/logs?page=1&limit=10`, {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(chatLogs.response.status, 200);
    assert.equal(chatLogs.body.success, true);
    assert.ok(Array.isArray(chatLogs.body.data?.calls));
    assert.ok(chatLogs.body.data.calls.some((entry) => String(entry._id) === String(historicalCall._id)));

    const feedback = await requestJson(`/api/calls/${activeCall._id}/feedback`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(owner.cookies)
        },
        body: JSON.stringify({
            rating: 5,
            issues: ["network", "reconnection"]
        })
    });

    assert.equal(feedback.response.status, 200);
    assert.equal(feedback.body.success, true);
    assert.equal(feedback.body.data?.message, "Feedback submitted");

    const reloadedCall = await Call.findById(activeCall._id).lean();
    assert.equal(reloadedCall?.quality?.averageRating, 5);
    assert.equal(reloadedCall?.quality?.networkIssues, 1);
    assert.equal(reloadedCall?.quality?.reconnections, 1);

    const deleteHistory = await requestJson(`/api/calls/${historicalCall._id}`, {
        method: "DELETE",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(deleteHistory.response.status, 200);
    assert.equal(deleteHistory.body.success, true);
    assert.equal(deleteHistory.body.data?.message, "Call removed from your history");

    const deletedCall = await Call.findById(historicalCall._id).lean();
    assert.ok((deletedCall?.hiddenFor || []).some((entry) => String(entry) === String(owner.userId)));

    const clearHistory = await requestJson("/api/calls/history/clear", {
        method: "DELETE",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(clearHistory.response.status, 200);
    assert.equal(clearHistory.body.success, true);
    assert.ok(Number(clearHistory.body.data?.updatedCount) >= 0);

    const markViewed = await requestJson("/api/calls/missed/mark-viewed", {
        method: "POST",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(markViewed.response.status, 200);
    assert.equal(markViewed.body.success, true);
    assert.equal(markViewed.body.data?.message, "Missed calls marked as viewed");
});

testWithDb("call route validation and not-found paths are enforced", async () => {
    const owner = await signupUser("owner-validation");
    const validButMissingChatId = new mongoose.Types.ObjectId().toString();

    const invalidCallId = await requestJson("/api/calls/not-a-valid-id", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(invalidCallId.response.status, 400);
    assert.equal(invalidCallId.body.success, false);
    assert.match(String(invalidCallId.body.message || ""), /^Validation Error$/i);

    const missingChatLogs = await requestJson(`/api/calls/chat/${validButMissingChatId}/logs`, {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(owner.cookies)
        }
    });

    assert.equal(missingChatLogs.response.status, 404);
    assert.equal(missingChatLogs.body.error, "Chat not found");
});
