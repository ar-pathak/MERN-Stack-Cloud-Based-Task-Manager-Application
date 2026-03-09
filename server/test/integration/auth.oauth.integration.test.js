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
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
process.env.OAUTH_FRONTEND_URL = process.env.OAUTH_FRONTEND_URL || "http://localhost:5173";
process.env.BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "google-client-id-test";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "google-client-secret-test";
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/oauth/google/callback";
process.env.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "github-client-id-test";
process.env.GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "github-client-secret-test";
process.env.GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/api/auth/oauth/github/callback";

const connectDB = require("../../src/config/database");
const User = require("../../src/models/user");
const RefreshToken = require("../../src/models/RefreshToken");
const { httpServer, io } = require("../../src/app");

const { isDbIntegrationEnabled, testWithDb } = require("./helpers/dbTestGate");

const originalFetch = global.fetch;
const fetchMockState = {
    queue: [],
    calls: []
};

const enqueueFetchResponse = ({ ok = true, body = {}, status }) => {
    fetchMockState.queue.push({
        ok,
        body,
        status: status ?? (ok ? 200 : 502)
    });
};

const resetFetchMock = () => {
    fetchMockState.queue.length = 0;
    fetchMockState.calls.length = 0;
};

global.fetch = async (url, options = {}) => {
    const requestUrl = String(url);
    if (
        requestUrl.startsWith("http://127.0.0.1")
        || requestUrl.startsWith("http://localhost")
    ) {
        return originalFetch(url, options);
    }

    fetchMockState.calls.push({
        url: requestUrl,
        options
    });

    if (fetchMockState.queue.length === 0) {
        throw new Error(`Unexpected fetch call: ${url}`);
    }

    const next = fetchMockState.queue.shift();
    return {
        ok: Boolean(next.ok),
        status: next.status,
        json: async () => next.body
    };
};

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

const decodeOAuthStatePayload = (value) => {
    const decoded = Buffer.from(String(value), "base64url").toString("utf8");
    return JSON.parse(decoded);
};

const request = async (route, options = {}) => (
    originalFetch(`${baseUrl}${route}`, options)
);

const beginOAuthFlow = async (provider, redirectPath = "/main") => {
    const response = await request(
        `/api/auth/oauth/${provider}?redirect=${encodeURIComponent(redirectPath)}`,
        { redirect: "manual" }
    );

    assert.equal(response.status, 302);

    const locationHeader = response.headers.get("location");
    assert.ok(locationHeader, "OAuth start should return redirect location");

    const authUrl = new URL(locationHeader);
    const oauthCookies = parseCookieJar(getSetCookieHeaders(response));
    assert.ok(oauthCookies.oauthState, "OAuth start should set oauthState cookie");

    return {
        response,
        authUrl,
        state: authUrl.searchParams.get("state"),
        cookieJar: oauthCookies
    };
};

const assertOAuthCallbackRedirect = (response, expected) => {
    assert.equal(response.status, 302);

    const locationHeader = response.headers.get("location");
    assert.ok(locationHeader, "OAuth callback should redirect to frontend callback page");

    const redirectUrl = new URL(locationHeader);
    const expectedOriginAndPath = `${process.env.OAUTH_FRONTEND_URL}/home/auth/oauth/callback`;
    assert.equal(`${redirectUrl.origin}${redirectUrl.pathname}`, expectedOriginAndPath);

    if (expected.status) {
        assert.equal(redirectUrl.searchParams.get("status"), expected.status);
    }
    if (expected.provider) {
        assert.equal(redirectUrl.searchParams.get("provider"), expected.provider);
    }
    if (expected.redirectPath) {
        assert.equal(redirectUrl.searchParams.get("redirect"), expected.redirectPath);
    }
    if (expected.message) {
        assert.equal(redirectUrl.searchParams.get("message"), expected.message);
    }

    return redirectUrl;
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
        throw new Error("Failed to start HTTP server for OAuth integration tests");
    }

    baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
    resetFetchMock();
    global.fetch = originalFetch;

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
});

testWithDb("google OAuth start sets state cookie and redirects to provider auth URL", async () => {
    resetFetchMock();
    const redirectPath = "/workspace/oauth";
    const start = await beginOAuthFlow("google", redirectPath);

    assert.equal(start.authUrl.origin, "https://accounts.google.com");
    assert.equal(start.authUrl.pathname, "/o/oauth2/v2/auth");
    assert.equal(start.authUrl.searchParams.get("client_id"), process.env.GOOGLE_CLIENT_ID);
    assert.equal(start.authUrl.searchParams.get("redirect_uri"), process.env.GOOGLE_CALLBACK_URL);
    assert.equal(start.authUrl.searchParams.get("response_type"), "code");
    assert.equal(start.authUrl.searchParams.get("scope"), "openid email profile");
    assert.ok(start.state, "OAuth authorization URL should include state");

    const statePayload = decodeOAuthStatePayload(start.cookieJar.oauthState);
    assert.equal(statePayload.provider, "google");
    assert.equal(statePayload.redirectPath, redirectPath);
    assert.equal(statePayload.value, start.state);
});

testWithDb("google OAuth callback success creates user and redirects with success payload", async () => {
    resetFetchMock();

    const redirectPath = "/workspace/oauth-success";
    const start = await beginOAuthFlow("google", redirectPath);

    const oauthEmail = `google.oauth.${Date.now()}-${crypto.randomInt(100000, 999999)}@example.com`;
    enqueueFetchResponse({
        ok: true,
        body: {
            access_token: "google-access-token"
        }
    });
    enqueueFetchResponse({
        ok: true,
        body: {
            sub: `google-sub-${Date.now()}`,
            email: oauthEmail.toUpperCase(),
            email_verified: true,
            name: "Google OAuth User",
            picture: "https://example.com/avatar.png"
        }
    });

    const callback = await request(
        `/api/auth/oauth/google/callback?code=google-test-code&state=${encodeURIComponent(start.state)}`,
        {
            headers: {
                Cookie: toCookieHeader({ oauthState: start.cookieJar.oauthState })
            },
            redirect: "manual"
        }
    );

    assertOAuthCallbackRedirect(callback, {
        status: "success",
        provider: "google",
        redirectPath
    });

    const callbackCookies = getSetCookieHeaders(callback).join("; ");
    assert.match(callbackCookies, /accessToken=/);
    assert.match(callbackCookies, /refreshToken=/);
    assert.match(callbackCookies, /oauthState=/);

    assert.equal(fetchMockState.calls.length, 2);
    assert.match(fetchMockState.calls[0].url, /oauth2\.googleapis\.com\/token/);
    assert.match(fetchMockState.calls[1].url, /googleapis\.com\/oauth2\/v3\/userinfo/);

    const user = await User.findOne({ email: oauthEmail.toLowerCase() }).lean();
    assert.ok(user?._id, "OAuth callback should create user");
    assert.ok(user?.googleId, "OAuth callback should persist googleId");
    assert.equal(user?.emailVerified, true);

    createdEmails.add(oauthEmail.toLowerCase());
    createdUserIds.add(String(user._id));

    const refreshTokenCount = await RefreshToken.countDocuments({ user: user._id });
    assert.equal(refreshTokenCount, 1);
});

testWithDb("google OAuth callback rejects state mismatch and redirects with error", async () => {
    resetFetchMock();
    const redirectPath = "/workspace/state-check";
    const start = await beginOAuthFlow("google", redirectPath);

    const callback = await request(
        "/api/auth/oauth/google/callback?code=google-test-code&state=wrong-state",
        {
            headers: {
                Cookie: toCookieHeader({ oauthState: start.cookieJar.oauthState })
            },
            redirect: "manual"
        }
    );

    assertOAuthCallbackRedirect(callback, {
        status: "error",
        provider: "google",
        redirectPath,
        message: "OAuth state validation failed. Please try again."
    });

    assert.equal(fetchMockState.calls.length, 0);
});

testWithDb("github OAuth callback maps provider HTTP failure to frontend error redirect", async () => {
    resetFetchMock();
    const redirectPath = "/workspace/github-error";
    const start = await beginOAuthFlow("github", redirectPath);

    enqueueFetchResponse({
        ok: false,
        body: {
            error_description: "bad code"
        }
    });

    const callback = await request(
        `/api/auth/oauth/github/callback?code=bad-code&state=${encodeURIComponent(start.state)}`,
        {
            headers: {
                Cookie: toCookieHeader({ oauthState: start.cookieJar.oauthState })
            },
            redirect: "manual"
        }
    );

    assertOAuthCallbackRedirect(callback, {
        status: "error",
        provider: "github",
        redirectPath,
        message: "GitHub OAuth request failed: bad code"
    });

    assert.equal(fetchMockState.calls.length, 1);
    assert.match(fetchMockState.calls[0].url, /github\.com\/login\/oauth\/access_token/);
});

testWithDb("github OAuth callback rejects missing usable email from provider responses", async () => {
    resetFetchMock();
    const redirectPath = "/workspace/github-email";
    const start = await beginOAuthFlow("github", redirectPath);

    enqueueFetchResponse({
        ok: true,
        body: {
            access_token: "github-access-token"
        }
    });
    enqueueFetchResponse({
        ok: true,
        body: {
            id: 123456,
            login: "github-user"
        }
    });
    enqueueFetchResponse({
        ok: true,
        body: []
    });

    const callback = await request(
        `/api/auth/oauth/github/callback?code=no-email-code&state=${encodeURIComponent(start.state)}`,
        {
            headers: {
                Cookie: toCookieHeader({ oauthState: start.cookieJar.oauthState })
            },
            redirect: "manual"
        }
    );

    assertOAuthCallbackRedirect(callback, {
        status: "error",
        provider: "github",
        redirectPath,
        message: "GitHub account did not return a usable email address"
    });

    assert.equal(fetchMockState.calls.length, 3);
});
