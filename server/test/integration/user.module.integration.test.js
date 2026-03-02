
require("./helpers/loadEnv");

const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-jwt-secret";
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "integration-refresh-secret";
process.env.GLOBAL_RATE_LIMIT_MAX = process.env.GLOBAL_RATE_LIMIT_MAX || "1000";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || "1000";

const { startHttpServer, stopHttpServer, requestJson } = require("./helpers/httpHarness");
const { expectUserAuthRequired } = require("./helpers/authAssertions");

let baseUrl = "";

beforeAll(async () => {
    baseUrl = await startHttpServer();
});

afterAll(async () => {
    await stopHttpServer();
});

test("user protected profile route requires user auth", async () => {
    const result = await requestJson(baseUrl, "/api/user/me");
    expectUserAuthRequired(result);
});

test("user me route rejects malformed access token", async () => {
    const result = await requestJson(baseUrl, "/api/user/me", {
        headers: {
            Cookie: "accessToken=malformed.jwt.token"
        }
    });

    assert.equal(result.response.status, 401);
    assert.equal(result.body?.success, false);
    assert.equal(result.body?.message, "Invalid token");
    assert.equal(result.body?.code, "TOKEN_INVALID");
});

test("user me route rejects expired access token", async () => {
    const expiredToken = jwt.sign(
        { id: "507f1f77bcf86cd799439011" },
        process.env.JWT_SECRET,
        { expiresIn: -1 }
    );

    const result = await requestJson(baseUrl, "/api/user/me", {
        headers: {
            Cookie: `accessToken=${expiredToken}`
        }
    });

    assert.equal(result.response.status, 401);
    assert.equal(result.body?.success, false);
    assert.equal(result.body?.message, "Token expired. Please refresh your session.");
    assert.equal(result.body?.code, "TOKEN_EXPIRED");
});
