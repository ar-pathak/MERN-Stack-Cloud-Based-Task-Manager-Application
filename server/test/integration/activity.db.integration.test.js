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
const RefreshToken = require("../../src/models/RefreshToken");
const Activity = require("../../src/models/activity");
const { httpServer, io } = require("../../src/app");

const { isDbIntegrationEnabled, testWithDb } = require("./helpers/dbTestGate");

let baseUrl = "";
const createdEmails = new Set();
const createdUserIds = new Set();

const context = {
    user: null
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
        name: `${prefix} User`,
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
    assert.ok(cookieJar.accessToken, "signup should set access token cookie");

    createdEmails.add(payload.email.toLowerCase());
    createdUserIds.add(userId);

    return {
        userId,
        cookieJar
    };
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
        throw new Error("Failed to start HTTP server for activity DB integration tests");
    }

    baseUrl = `http://127.0.0.1:${port}`;
    context.user = await signupUser("ActivityDb");
});

afterAll(async () => {
    if (!isDbIntegrationEnabled) return;

    if (createdUserIds.size > 0) {
        const userIds = [...createdUserIds];
        await Activity.deleteMany({ user: { $in: userIds } });
        await RefreshToken.deleteMany({ user: { $in: userIds } });
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

testWithDb("activity list supports filters and pagination for authenticated user", async () => {
    await Activity.create([
        {
            user: context.user.userId,
            level: "task",
            action: "task.updated",
            message: "Bug fixed in task flow",
            meta: {}
        },
        {
            user: context.user.userId,
            level: "project",
            action: "project.created",
            message: "Initial project scaffold",
            meta: {}
        }
    ]);

    const result = await requestJson("/api/activity/me?level=task&action=task&search=bug&page=1&limit=10", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(context.user.cookieJar)
        }
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.body.success, true);

    const activities = result.body.data?.activities || [];
    assert.equal(activities.length, 1);
    assert.equal(activities[0].action, "task.updated");
    assert.equal(result.body.data?.pagination?.page, 1);
    assert.equal(result.body.data?.pagination?.limit, 10);
});

testWithDb("activity dashboard endpoint returns all expected sections", async () => {
    const result = await requestJson("/api/activity/dashboard?limit=5", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(context.user.cookieJar)
        }
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.body.success, true);
    assert.ok(result.body.data?.likes);
    assert.ok(result.body.data?.comments);
    assert.ok(result.body.data?.reposts);
    assert.ok(result.body.data?.timeSpent);
    assert.ok(result.body.data?.accountHistory);
    assert.ok(result.body.data?.analytics);
});

testWithDb("activity advanced endpoint returns normalized range and analytics sections", async () => {
    const result = await requestJson("/api/activity/advanced?days=7", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(context.user.cookieJar)
        }
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data?.rangeDays, 7);
    assert.ok(result.body.data?.social);
    assert.ok(result.body.data?.productivity);
    assert.ok(result.body.data?.activity);
    assert.ok(result.body.data?.creator);
});

testWithDb("activity advanced endpoint validates range query", async () => {
    const result = await requestJson("/api/activity/advanced?days=2", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(context.user.cookieJar)
        }
    });

    assert.equal(result.response.status, 400);
    assert.equal(result.body.success, false);
    assert.match(String(result.body.message || ""), /validation error/i);
});
