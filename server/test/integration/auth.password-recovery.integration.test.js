const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

require("./helpers/loadEnv");
jest.setTimeout(180000);

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-jwt-secret";
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "integration-refresh-secret";
process.env.RATE_LIMIT_STORE = "memory";
process.env.GLOBAL_RATE_LIMIT_MAX = process.env.GLOBAL_RATE_LIMIT_MAX || "1000";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || "1000";

const sendEmailModulePath = require.resolve("../../src/helpers/sendEmail");
const originalSendEmail = require(sendEmailModulePath);

const emailMockState = {
    calls: [],
    failNext: false
};

const mockedSendEmail = async (payload) => {
    emailMockState.calls.push(payload);

    if (emailMockState.failNext) {
        emailMockState.failNext = false;
        throw new Error("mock email provider failure");
    }

    return {
        accepted: [payload?.to]
    };
};

require.cache[sendEmailModulePath].exports = mockedSendEmail;

const connectDB = require("../../src/config/database");
const User = require("../../src/models/user");
const RefreshToken = require("../../src/models/RefreshToken");
const { httpServer, io } = require("../../src/app");

const { isDbIntegrationEnabled, testWithDb } = require("./helpers/dbTestGate");

let baseUrl = "";
const createdEmails = new Set();
const createdUserIds = new Set();

const resetEmailMock = () => {
    emailMockState.calls.length = 0;
    emailMockState.failNext = false;
};

const sha256 = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");

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

const buildUniqueAuthPayload = () => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomInt(100000, 999999)}`;
    return {
        name: "Recovery User",
        email: `recovery.${uniqueSuffix}@example.com`,
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
        throw new Error("Failed to start HTTP server for password recovery integration tests");
    }

    baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
    if (!isDbIntegrationEnabled) return;

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

    require.cache[sendEmailModulePath].exports = originalSendEmail;
});

testWithDb("forgot-password sends reset email and stores hashed reset token", async () => {
    resetEmailMock();
    const payload = buildUniqueAuthPayload();
    await signupUser(payload);

    const forgotPassword = await requestJson("/api/auth/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: payload.email.toUpperCase()
        })
    });

    assert.equal(forgotPassword.response.status, 200);
    assert.equal(forgotPassword.body.success, true);
    assert.equal(forgotPassword.body.message, "If that email exists, we've sent a password reset link.");

    assert.equal(emailMockState.calls.length, 1);
    const sentMail = emailMockState.calls[0];
    assert.equal(sentMail.to, payload.email.toLowerCase());
    assert.equal(sentMail.type, "reset-password");
    assert.match(String(sentMail.token || ""), /^[a-f0-9]{64}$/i);

    const user = await User.findOne({ email: payload.email.toLowerCase() })
        .select("+resetPasswordToken +resetPasswordExpires")
        .lean();

    assert.ok(user?.resetPasswordToken);
    assert.ok(user?.resetPasswordExpires);
    assert.equal(user.resetPasswordToken, sha256(sentMail.token));
    assert.ok(new Date(user.resetPasswordExpires).getTime() > Date.now());
});

testWithDb("forgot-password keeps generic success and does not send email for unknown user", async () => {
    resetEmailMock();

    const forgotPassword = await requestJson("/api/auth/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: `missing.${Date.now()}@example.com`
        })
    });

    assert.equal(forgotPassword.response.status, 200);
    assert.equal(forgotPassword.body.success, true);
    assert.equal(forgotPassword.body.message, "If that email exists, we've sent a password reset link.");
    assert.equal(emailMockState.calls.length, 0);
});

testWithDb("forgot-password returns 500 and clears reset fields when email send fails", async () => {
    resetEmailMock();
    const payload = buildUniqueAuthPayload();
    await signupUser(payload);

    emailMockState.failNext = true;

    const forgotPassword = await requestJson("/api/auth/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: payload.email
        })
    });

    assert.equal(forgotPassword.response.status, 500);
    assert.equal(forgotPassword.body.success, false);
    assert.equal(forgotPassword.body.message, "Email could not be sent. Please try again later.");
    assert.equal(emailMockState.calls.length, 1);

    const user = await User.findOne({ email: payload.email.toLowerCase() })
        .select("+resetPasswordToken +resetPasswordExpires")
        .lean();

    assert.equal(user?.resetPasswordToken, undefined);
    assert.equal(user?.resetPasswordExpires, undefined);
});

testWithDb("reset-password with valid token updates password and invalidates refresh tokens", async () => {
    resetEmailMock();
    const payload = buildUniqueAuthPayload();
    const signup = await signupUser(payload);

    const forgotPassword = await requestJson("/api/auth/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: payload.email
        })
    });

    assert.equal(forgotPassword.response.status, 200);
    assert.equal(emailMockState.calls.length, 1);
    const resetToken = emailMockState.calls[0].token;
    assert.match(String(resetToken || ""), /^[a-f0-9]{64}$/i);

    const refreshTokenCountBeforeReset = await RefreshToken.countDocuments({ user: signup.userId });
    assert.equal(refreshTokenCountBeforeReset, 1);

    const newPassword = "N3wStrong@Pass1";
    const resetPassword = await requestJson(`/api/auth/reset-password/${resetToken}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            password: newPassword
        })
    });

    assert.equal(resetPassword.response.status, 200);
    assert.equal(resetPassword.body.success, true);
    assert.equal(resetPassword.body.message, "Password has been reset successfully");

    const refreshTokenCountAfterReset = await RefreshToken.countDocuments({ user: signup.userId });
    assert.equal(refreshTokenCountAfterReset, 0);

    const loginWithOldPassword = await requestJson("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: payload.email,
            password: payload.password
        })
    });

    assert.equal(loginWithOldPassword.response.status, 401);
    assert.equal(loginWithOldPassword.body.success, false);
    assert.equal(loginWithOldPassword.body.message, "Invalid email or password");

    const loginWithNewPassword = await requestJson("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: payload.email,
            password: newPassword
        })
    });

    assert.equal(loginWithNewPassword.response.status, 200);
    assert.equal(loginWithNewPassword.body.success, true);
});

testWithDb("send-verification and verify-email success path marks account verified", async () => {
    resetEmailMock();
    const payload = buildUniqueAuthPayload();
    const signup = await signupUser(payload);
    const signupCookies = parseCookieJar(getSetCookieHeaders(signup.response));

    assert.ok(signupCookies.accessToken, "signup should set accessToken cookie");

    const sendVerification = await requestJson("/api/auth/send-verification", {
        method: "POST",
        headers: {
            Cookie: toCookieHeader(signupCookies)
        }
    });

    assert.equal(sendVerification.response.status, 200);
    assert.equal(sendVerification.body.success, true);
    assert.equal(sendVerification.body.message, "Verification email sent successfully.");
    assert.equal(emailMockState.calls.length, 1);

    const verificationMail = emailMockState.calls[0];
    assert.equal(verificationMail.to, payload.email.toLowerCase());
    assert.equal(verificationMail.type, "email-verification");
    assert.match(String(verificationMail.token || ""), /^[a-f0-9]{64}$/i);

    const userBeforeVerification = await User.findById(signup.userId)
        .select("+emailVerificationToken +emailVerificationExpires emailVerified")
        .lean();

    assert.equal(userBeforeVerification?.emailVerified, false);
    assert.equal(userBeforeVerification?.emailVerificationToken, sha256(verificationMail.token));
    assert.ok(new Date(userBeforeVerification?.emailVerificationExpires).getTime() > Date.now());

    const verifyEmail = await requestJson("/api/auth/verify-email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            token: verificationMail.token
        })
    });

    assert.equal(verifyEmail.response.status, 200);
    assert.equal(verifyEmail.body.success, true);
    assert.equal(verifyEmail.body.message, "Email verified successfully.");

    const userAfterVerification = await User.findById(signup.userId)
        .select("+emailVerificationToken +emailVerificationExpires emailVerified")
        .lean();

    assert.equal(userAfterVerification?.emailVerified, true);
    assert.equal(userAfterVerification?.emailVerificationToken, undefined);
    assert.equal(userAfterVerification?.emailVerificationExpires, undefined);

    const alreadyVerified = await requestJson("/api/auth/send-verification", {
        method: "POST",
        headers: {
            Cookie: toCookieHeader(signupCookies)
        }
    });

    assert.equal(alreadyVerified.response.status, 200);
    assert.equal(alreadyVerified.body.success, true);
    assert.equal(alreadyVerified.body.message, "Email is already verified.");
    assert.equal(emailMockState.calls.length, 1);
});
