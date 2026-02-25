const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

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

const buildUniqueAuthPayload = () => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomInt(100000, 999999)}`;
    return {
        name: "Integration User",
        email: `integration.${uniqueSuffix}@example.com`,
        password: "Str0ng@Pass1"
    };
};

const signupUser = async (payload) => {
    const signup = await requestJson("/api/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    assert.equal(signup.response.status, 201);
    assert.equal(signup.body.success, true);

    const createdUserId = signup.body.data?.user?.id;
    assert.ok(createdUserId, "signup should return created user id");

    createdEmails.add(String(payload.email || "").toLowerCase());
    createdUserIds.add(createdUserId);

    return {
        response: signup.response,
        body: signup.body,
        userId: createdUserId
    };
};

const createSocialOnlyUser = async () => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomInt(100000, 999999)}`;
    const email = `oauth.${uniqueSuffix}@example.com`;
    const username = `oauth${crypto.randomInt(100000, 999999)}`;

    const user = await User.create({
        name: "OAuth User",
        email,
        username,
        googleId: `google-${uniqueSuffix}`,
        accountStatus: "active"
    });

    createdEmails.add(email.toLowerCase());
    createdUserIds.add(String(user._id));

    return {
        userId: String(user._id),
        email
    };
};

beforeAll(async () => {
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

afterAll(async () => {
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
    const payload = buildUniqueAuthPayload();
    const email = payload.email;
    const password = payload.password;

    const signup = await signupUser(payload);
    assert.equal(signup.body.data?.user?.email, email.toLowerCase());
    const createdUserId = signup.userId;

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

testWithDb("signup rejects duplicate email with 409", async () => {
    const payload = buildUniqueAuthPayload();
    await signupUser(payload);

    const duplicateAttempt = await requestJson("/api/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: payload.name,
            email: payload.email.toUpperCase(),
            password: payload.password
        })
    });

    assert.equal(duplicateAttempt.response.status, 409);
    assert.equal(duplicateAttempt.body.success, false);
    assert.equal(duplicateAttempt.body.message, "Email already registered");
});

testWithDb("login fails with wrong password and increments login attempts", async () => {
    const payload = buildUniqueAuthPayload();
    const signup = await signupUser(payload);

    const loginAttempt = await requestJson("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: payload.email,
            password: "Wrong@Pass1"
        })
    });

    assert.equal(loginAttempt.response.status, 401);
    assert.equal(loginAttempt.body.success, false);
    assert.equal(loginAttempt.body.message, "Invalid email or password");

    const user = await User.findById(signup.userId).select("+loginAttempts +lockUntil").lean();
    assert.equal(user?.loginAttempts, 1);
    assert.equal(user?.lockUntil, undefined);
});

testWithDb("login fails for suspended account", async () => {
    const payload = buildUniqueAuthPayload();
    const signup = await signupUser(payload);

    await User.updateOne(
        { _id: signup.userId },
        { $set: { accountStatus: "suspended" } }
    );

    const loginAttempt = await requestJson("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: payload.email,
            password: payload.password
        })
    });

    assert.equal(loginAttempt.response.status, 403);
    assert.equal(loginAttempt.body.success, false);
    assert.equal(loginAttempt.body.message, "Account is not active");
});

testWithDb("refresh rejects valid JWT that is missing in DB", async () => {
    const orphanRefreshToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString() },
        process.env.REFRESH_SECRET,
        { expiresIn: "7d" }
    );

    const refresh = await requestJson("/api/auth/refresh", {
        method: "POST",
        headers: {
            Cookie: `refreshToken=${orphanRefreshToken}`
        }
    });

    assert.equal(refresh.response.status, 403);
    assert.equal(refresh.body.success, false);
    assert.equal(refresh.body.message, "Refresh token not found or already used");

    const rawSetCookie = getSetCookieHeaders(refresh.response).join("; ");
    assert.match(rawSetCookie, /accessToken=/);
    assert.match(rawSetCookie, /refreshToken=/);
});

testWithDb("refresh rejects malformed JWT", async () => {
    const refresh = await requestJson("/api/auth/refresh", {
        method: "POST",
        headers: {
            Cookie: "refreshToken=not-a-valid-jwt"
        }
    });

    assert.equal(refresh.response.status, 403);
    assert.equal(refresh.body.success, false);
    assert.equal(refresh.body.message, "Invalid refresh token");
});

testWithDb("send-verification rejects unauthenticated request", async () => {
    const sendVerification = await requestJson("/api/auth/send-verification", {
        method: "POST"
    });

    assert.equal(sendVerification.response.status, 401);
    assert.equal(sendVerification.body.success, false);
    assert.equal(sendVerification.body.message, "Authentication required. No token provided.");
});

testWithDb("verify-email rejects malformed token payload", async () => {
    const verify = await requestJson("/api/auth/verify-email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            token: "bad-token"
        })
    });

    assert.equal(verify.response.status, 400);
    assert.equal(verify.body.success, false);
    assert.equal(verify.body.message, "Validation error");
});

testWithDb("login locks account after repeated failed attempts", async () => {
    const payload = buildUniqueAuthPayload();
    const signup = await signupUser(payload);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
        const failure = await requestJson("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: payload.email,
                password: "Wrong@Pass1"
            })
        });

        assert.equal(failure.response.status, 401);
        assert.equal(failure.body.success, false);
        assert.equal(failure.body.message, "Invalid email or password");
    }

    const lockoutAttempt = await requestJson("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: payload.email,
            password: "Wrong@Pass1"
        })
    });

    assert.equal(lockoutAttempt.response.status, 423);
    assert.equal(lockoutAttempt.body.success, false);
    assert.match(lockoutAttempt.body.message, /^Account is temporarily locked\./);

    const lockedUser = await User.findById(signup.userId).select("+loginAttempts +lockUntil").lean();
    assert.ok(lockedUser?.lockUntil, "lockUntil should be set after repeated failed logins");
    assert.ok(Number(lockedUser?.loginAttempts) >= 5);
});

testWithDb("login rejects social-login-only accounts for password auth", async () => {
    const socialUser = await createSocialOnlyUser();

    const loginAttempt = await requestJson("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: socialUser.email,
            password: "Any@Pass1"
        })
    });

    assert.equal(loginAttempt.response.status, 400);
    assert.equal(loginAttempt.body.success, false);
    assert.equal(loginAttempt.body.message, "This account uses social login. Continue with Google or GitHub.");
});

testWithDb("refresh rejects expired refresh JWT", async () => {
    const expiredRefreshToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString() },
        process.env.REFRESH_SECRET,
        { expiresIn: -1 }
    );

    const refresh = await requestJson("/api/auth/refresh", {
        method: "POST",
        headers: {
            Cookie: `refreshToken=${expiredRefreshToken}`
        }
    });

    assert.equal(refresh.response.status, 403);
    assert.equal(refresh.body.success, false);
    assert.equal(refresh.body.message, "Refresh token expired. Please login again.");
});

testWithDb("send-verification rejects malformed access token", async () => {
    const response = await requestJson("/api/auth/send-verification", {
        method: "POST",
        headers: {
            Cookie: "accessToken=malformed.jwt.token"
        }
    });

    assert.equal(response.response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Invalid token");
    assert.equal(response.body.code, "TOKEN_INVALID");
});

testWithDb("send-verification rejects expired access token", async () => {
    const expiredAccessToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString() },
        process.env.JWT_SECRET,
        { expiresIn: -1 }
    );

    const response = await requestJson("/api/auth/send-verification", {
        method: "POST",
        headers: {
            Cookie: `accessToken=${expiredAccessToken}`
        }
    });

    assert.equal(response.response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Token expired. Please refresh your session.");
    assert.equal(response.body.code, "TOKEN_EXPIRED");
});

testWithDb("reset-password rejects unknown but well-formed token", async () => {
    const reset = await requestJson(`/api/auth/reset-password/${"a".repeat(64)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            password: "Str0ng@Pass1"
        })
    });

    assert.equal(reset.response.status, 400);
    assert.equal(reset.body.success, false);
    assert.equal(reset.body.message, "Invalid or expired reset token");
});

testWithDb("verify-email rejects unknown but well-formed token", async () => {
    const verify = await requestJson("/api/auth/verify-email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            token: "b".repeat(64)
        })
    });

    assert.equal(verify.response.status, 400);
    assert.equal(verify.body.success, false);
    assert.equal(verify.body.message, "Invalid or expired verification token");
});
