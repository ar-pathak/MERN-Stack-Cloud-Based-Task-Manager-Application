const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const path = require("node:path");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-jwt-secret";
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "integration-refresh-secret";
process.env.RATE_LIMIT_STORE = "memory";

const connectDB = require("../../src/config/database");
const User = require("../../src/models/user");
const RefreshToken = require("../../src/models/RefreshToken");
const { httpServer, io } = require("../../src/app");

const hasMongoUrl = Boolean(String(process.env.MONGO_URL || "").trim());
const testWithDb = hasMongoUrl ? test : test.skip;

let baseUrl = "";
const createdEmails = new Set();
const createdUserIds = new Set();

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

const sha256 = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");

const requestJson = async (route, options = {}) => {
    const response = await fetch(`${baseUrl}${route}`, options);
    const body = await response.json();
    return { response, body };
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
        throw new Error("Failed to start HTTP server for DB integration tests");
    }

    baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
    if (!hasMongoUrl) return;

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

testWithDb("signup -> login -> refresh -> logout rotates and clears refresh tokens", async () => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomInt(100000, 999999)}`;
    const email = `integration.${uniqueSuffix}@example.com`;
    const password = "Str0ng@Pass1";
    const name = "Integration User";

    createdEmails.add(email.toLowerCase());

    const signup = await requestJson("/api/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
    });

    assert.equal(signup.response.status, 201);
    assert.equal(signup.body.success, true);
    assert.equal(signup.body.data?.user?.email, email.toLowerCase());

    const createdUserId = signup.body.data?.user?.id;
    assert.ok(createdUserId, "signup should return created user id");
    createdUserIds.add(createdUserId);

    const signupCookies = parseCookieJar(getSetCookieHeaders(signup.response));
    assert.ok(signupCookies.accessToken, "signup should set accessToken cookie");
    assert.ok(signupCookies.refreshToken, "signup should set refreshToken cookie");

    let tokensAfterSignup = await RefreshToken.find({ user: createdUserId }).lean();
    assert.equal(tokensAfterSignup.length, 1);
    assert.equal(tokensAfterSignup[0].token, sha256(signupCookies.refreshToken));
    const signupTokenRecordId = String(tokensAfterSignup[0]._id);

    const login = await requestJson("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email.toUpperCase(),
            password
        })
    });

    assert.equal(login.response.status, 200);
    assert.equal(login.body.success, true);
    assert.equal(login.body.data?.user?.email, email.toLowerCase());

    const loginCookies = parseCookieJar(getSetCookieHeaders(login.response));
    assert.ok(loginCookies.accessToken, "login should set accessToken cookie");
    assert.ok(loginCookies.refreshToken, "login should set refreshToken cookie");

    let tokensAfterLogin = await RefreshToken.find({ user: createdUserId }).lean();
    assert.equal(tokensAfterLogin.length, 1);
    assert.equal(tokensAfterLogin[0].token, sha256(loginCookies.refreshToken));
    const loginTokenRecordId = String(tokensAfterLogin[0]._id);
    assert.notEqual(loginTokenRecordId, signupTokenRecordId);

    const refresh = await requestJson("/api/auth/refresh", {
        method: "POST",
        headers: {
            Cookie: toCookieHeader(loginCookies)
        }
    });

    assert.equal(refresh.response.status, 200);
    assert.equal(refresh.body.success, true);

    const refreshCookies = parseCookieJar(getSetCookieHeaders(refresh.response));
    assert.ok(refreshCookies.accessToken, "refresh should set accessToken cookie");
    assert.ok(refreshCookies.refreshToken, "refresh should set refreshToken cookie");

    let tokensAfterRefresh = await RefreshToken.find({ user: createdUserId }).lean();
    assert.equal(tokensAfterRefresh.length, 1);
    assert.equal(tokensAfterRefresh[0].token, sha256(refreshCookies.refreshToken));
    const refreshTokenRecordId = String(tokensAfterRefresh[0]._id);
    assert.notEqual(refreshTokenRecordId, loginTokenRecordId);

    const logout = await requestJson("/api/auth/logout", {
        method: "POST",
        headers: {
            Cookie: toCookieHeader(refreshCookies)
        }
    });

    assert.equal(logout.response.status, 200);
    assert.equal(logout.body.success, true);

    const logoutCookiesRaw = getSetCookieHeaders(logout.response).join("; ");
    assert.match(logoutCookiesRaw, /accessToken=/);
    assert.match(logoutCookiesRaw, /refreshToken=/);

    const tokenCountAfterLogout = await RefreshToken.countDocuments({ user: createdUserId });
    assert.equal(tokenCountAfterLogout, 0);
});
