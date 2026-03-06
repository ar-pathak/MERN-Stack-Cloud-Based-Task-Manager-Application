const assert = require("node:assert/strict");

const mockHttpServer = {
    listening: false,
    listen: jest.fn(),
    close: jest.fn(),
    address: jest.fn()
};

const mockIo = {
    close: jest.fn()
};

jest.mock("../../src/app", () => ({
    httpServer: mockHttpServer,
    io: mockIo
}));

const {
    startHttpServer,
    stopHttpServer,
    requestJson
} = require("../integration/helpers/httpHarness");
const {
    expectUserAuthRequired,
    expectAdminAuthRequired
} = require("../integration/helpers/authAssertions");

beforeEach(() => {
    jest.clearAllMocks();
    mockHttpServer.listening = false;
    mockHttpServer.listen.mockImplementation((port, host, callback) => callback());
    mockHttpServer.close.mockImplementation((callback) => callback());
    mockHttpServer.address.mockReturnValue({ port: 3899 });
    mockIo.close.mockImplementation((callback) => callback());
    global.fetch = jest.fn();
});

test("startHttpServer starts listener and returns generated base url", async () => {
    const url = await startHttpServer();

    expect(mockHttpServer.listen).toHaveBeenCalledWith(0, "127.0.0.1", expect.any(Function));
    expect(url).toBe("http://127.0.0.1:3899");
});

test("startHttpServer reuses existing listener and throws when port is missing", async () => {
    mockHttpServer.listening = true;
    mockHttpServer.address.mockReturnValue(null);

    await expect(startHttpServer()).rejects.toThrow(
        "Failed to start HTTP server for integration tests"
    );
    expect(mockHttpServer.listen).not.toHaveBeenCalled();
});

test("stopHttpServer closes socket server and http server when listening", async () => {
    mockHttpServer.listening = true;

    await stopHttpServer();

    expect(mockIo.close).toHaveBeenCalledTimes(1);
    expect(mockHttpServer.close).toHaveBeenCalledTimes(1);
});

test("stopHttpServer skips http server close when not listening", async () => {
    mockHttpServer.listening = false;

    await stopHttpServer();

    expect(mockIo.close).toHaveBeenCalledTimes(1);
    expect(mockHttpServer.close).not.toHaveBeenCalled();
});

test("requestJson delegates fetch and parses json body", async () => {
    global.fetch.mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true })
    });

    const result = await requestJson("http://127.0.0.1:3899", "/health", {
        method: "GET"
    });

    expect(global.fetch).toHaveBeenCalledWith("http://127.0.0.1:3899/health", { method: "GET" });
    expect(result).toEqual({
        response: expect.objectContaining({ status: 200 }),
        body: { success: true }
    });
});

test("authAssertions validate user and admin unauthorized responses", () => {
    expect(() => expectUserAuthRequired({
        response: { status: 401 },
        body: { success: false, message: "Authentication required. No token provided." }
    })).not.toThrow();

    expect(() => expectAdminAuthRequired({
        response: { status: 401 },
        body: {
            success: false,
            message: "Admin authentication required",
            code: "ADMIN_AUTH_REQUIRED"
        }
    })).not.toThrow();

    assert.equal(typeof expectUserAuthRequired, "function");
    assert.equal(typeof expectAdminAuthRequired, "function");
});

test("loadEnv always loads default env and conditionally loads test env", () => {
    const runLoadEnvWithExists = (exists) => {
        const config = jest.fn();

        jest.isolateModules(() => {
            jest.doMock("node:fs", () => ({
                existsSync: jest.fn().mockReturnValue(exists)
            }));
            jest.doMock("dotenv", () => ({
                config
            }));

            require("../integration/helpers/loadEnv");
        });

        return config.mock.calls;
    };

    const callsWithoutTestEnv = runLoadEnvWithExists(false);
    expect(callsWithoutTestEnv).toHaveLength(1);
    expect(callsWithoutTestEnv[0][0]).toEqual(expect.objectContaining({
        quiet: true
    }));

    const callsWithTestEnv = runLoadEnvWithExists(true);
    expect(callsWithTestEnv).toHaveLength(2);
    expect(callsWithTestEnv[1][0]).toEqual(expect.objectContaining({
        override: true,
        quiet: true
    }));
});
