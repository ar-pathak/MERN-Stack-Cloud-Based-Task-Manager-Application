const { after, before, test } = require("node:test");

require("./helpers/loadEnv");

process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-jwt-secret";
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "integration-refresh-secret";
process.env.GLOBAL_RATE_LIMIT_MAX = process.env.GLOBAL_RATE_LIMIT_MAX || "1000";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || "1000";

const { startHttpServer, stopHttpServer, requestJson } = require("./helpers/httpHarness");
const { expectAdminAuthRequired } = require("./helpers/authAssertions");

let baseUrl = "";

before(async () => {
    baseUrl = await startHttpServer();
});

after(async () => {
    await stopHttpServer();
});

test("admin auth protected profile route requires admin auth", async () => {
    const result = await requestJson(baseUrl, "/api/admin/auth/me");
    expectAdminAuthRequired(result);
});

test("admin support routes require admin auth", async () => {
    const result = await requestJson(baseUrl, "/api/admin/support/agents");
    expectAdminAuthRequired(result);
});
