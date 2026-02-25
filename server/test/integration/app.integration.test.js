const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-jwt-secret";
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "integration-refresh-secret";
process.env.GLOBAL_RATE_LIMIT_MAX = process.env.GLOBAL_RATE_LIMIT_MAX || "1000";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || "1000";

const { httpServer, io } = require("../../src/app");

let baseUrl = "";

const requestJson = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, options);
    const body = await response.json();
    return { response, body };
};

beforeAll(async () => {
    if (!httpServer.listening) {
        await new Promise((resolve) => {
            httpServer.listen(0, "127.0.0.1", resolve);
        });
    }

    const address = httpServer.address();
    const port = typeof address === "object" && address ? address.port : null;
    if (!port) {
        throw new Error("Failed to start HTTP server for integration tests");
    }

    baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
    await new Promise((resolve) => io.close(resolve));
    if (httpServer.listening) {
        await new Promise((resolve) => httpServer.close(resolve));
    }
});

test("GET /health returns server status payload", async () => {
    const { response, body } = await requestJson("/health");

    assert.equal(response.status, 200);
    assert.equal(body.status, "OK");
    assert.equal(body.message, "Server is running");
});

test("GET unknown route returns structured 404", async () => {
    const missingRoute = "/__integration_missing_route__";
    const { response, body } = await requestJson(missingRoute);

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.message, `Route ${missingRoute} not found`);
});

test("blocked CORS origin returns 403", async () => {
    const { response, body } = await requestJson("/health", {
        headers: {
            Origin: "https://forbidden-origin.invalid"
        }
    });

    assert.equal(response.status, 403);
    assert.equal(body.success, false);
    assert.match(body.message, /CORS origin not allowed/);
});

test("POST /api/auth/refresh rejects requests without refresh cookie", async () => {
    const { response, body } = await requestJson("/api/auth/refresh", {
        method: "POST"
    });

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.message, "No refresh token provided");
});

test("POST /api/auth/signup returns validation errors for invalid payload", async () => {
    const { response, body } = await requestJson("/api/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: "A",
            email: "not-an-email",
            password: "weak"
        })
    });

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.message, "Validation error");
    assert.equal(Array.isArray(body.errors), true);
    assert.ok(body.errors.length >= 1);
});
