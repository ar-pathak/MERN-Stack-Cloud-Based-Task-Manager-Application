
require("./helpers/loadEnv");

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
