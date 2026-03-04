const { EventEmitter } = require("events");

const ORIGINAL_ENV = process.env;

const ROUTE_MODULE_PATHS = [
    "../../src/modules/auth/auth.routes",
    "../../src/modules/workspace/workspace.routes",
    "../../src/modules/team/teams.routes",
    "../../src/modules/projects/project.routes",
    "../../src/modules/tasks/tasks.routes",
    "../../src/modules/overview/overview.routes",
    "../../src/modules/activity/activity.routes",
    "../../src/modules/subtask/subtask.routes",
    "../../src/modules/posts/post.routes",
    "../../src/modules/stories/story.routes",
    "../../src/modules/follow/follow.routes",
    "../../src/modules/user/user.routes",
    "../../src/modules/chat/chat.routes",
    "../../src/modules/upload/upload.routes",
    "../../src/modules/call/call.routes",
    "../../src/modules/notification/notification.routes",
    "../../src/modules/support/support.routes",
    "../../src/modules/admin/adminAuth.routes",
    "../../src/modules/admin/adminSupport.routes"
];

const loadAppModule = ({
    env = {},
    listenError = null,
    publishReject = false
} = {}) => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ...env };

    const appMock = {
        set: jest.fn(),
        use: jest.fn(),
        get: jest.fn()
    };

    const expressMock = jest.fn(() => appMock);
    expressMock.json = jest.fn(() => "json-middleware");
    expressMock.urlencoded = jest.fn(() => "urlencoded-middleware");

    const helmetMock = jest.fn(() => "helmet-middleware");
    const corsMock = jest.fn((options) => ({ __cors: true, options }));
    const cookieParserMock = jest.fn(() => "cookie-parser-middleware");
    const rateLimitMock = jest.fn((options) => ({ __rateLimit: true, options }));

    const connectDBMock = jest.fn().mockResolvedValue(undefined);
    const mongoRateLimitStoreMock = jest.fn().mockImplementation((options) => ({
        type: "mongo-store",
        options
    }));

    const postServiceMock = {
        publishDueScheduledPosts: publishReject
            ? jest.fn().mockRejectedValue(new Error("publish failed"))
            : jest.fn().mockResolvedValue(undefined)
    };

    const chatSocketHandlerMock = jest.fn();
    const callSocketHandlerMock = jest.fn();
    const socketAuthMiddlewareMock = jest.fn((socket, next) => next());
    const setIOMock = jest.fn();

    const serverEmitter = new EventEmitter();
    const httpServerMock = {
        listening: false,
        once: jest.fn((event, handler) => {
            serverEmitter.once(event, handler);
            return httpServerMock;
        }),
        off: jest.fn((event, handler) => {
            serverEmitter.off(event, handler);
            return httpServerMock;
        }),
        listen: jest.fn(() => {
            if (listenError) {
                setImmediate(() => serverEmitter.emit("error", listenError));
                return;
            }

            httpServerMock.listening = true;
            setImmediate(() => serverEmitter.emit("listening"));
        }),
        close: jest.fn((callback) => {
            httpServerMock.listening = false;
            if (typeof callback === "function") callback();
        })
    };

    const httpMock = {
        createServer: jest.fn(() => httpServerMock)
    };

    const ioMock = {
        use: jest.fn(),
        on: jest.fn(),
        to: jest.fn(() => ({ emit: jest.fn() }))
    };
    const serverCtorMock = jest.fn(() => ioMock);

    jest.doMock("express", () => expressMock);
    jest.doMock("http", () => httpMock);
    jest.doMock("socket.io", () => ({ Server: serverCtorMock }));
    jest.doMock("cookie-parser", () => cookieParserMock);
    jest.doMock("cors", () => corsMock);
    jest.doMock("helmet", () => helmetMock);
    jest.doMock("express-rate-limit", () => rateLimitMock);
    jest.doMock("../../src/config/database", () => connectDBMock);
    jest.doMock("../../src/helpers/mongoRateLimitStore", () => mongoRateLimitStoreMock);
    jest.doMock("../../src/modules/posts/post.service", () => postServiceMock);
    jest.doMock("../../src/modules/chat/chat.socket", () => chatSocketHandlerMock);
    jest.doMock("../../src/modules/call/Call.socket", () => callSocketHandlerMock);
    jest.doMock("../../src/middleware/socketAuthMiddleware", () => socketAuthMiddlewareMock);
    jest.doMock("../../src/modules/utils/socketStore", () => ({ setIO: setIOMock }));

    ROUTE_MODULE_PATHS.forEach((routePath) => {
        jest.doMock(routePath, () => ({ __route: routePath }));
    });

    const appModule = require("../../src/app");

    return {
        appModule,
        appMock,
        expressMock,
        helmetMock,
        corsMock,
        cookieParserMock,
        rateLimitMock,
        connectDBMock,
        mongoRateLimitStoreMock,
        postServiceMock,
        chatSocketHandlerMock,
        callSocketHandlerMock,
        socketAuthMiddlewareMock,
        setIOMock,
        httpServerMock,
        httpMock,
        ioMock,
        serverCtorMock
    };
};

const createRes = () => {
    const res = {
        statusCode: null,
        payload: null
    };
    res.status = jest.fn((statusCode) => {
        res.statusCode = statusCode;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.payload = payload;
        return res;
    });
    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
    process.env = ORIGINAL_ENV;
});

test("applies trust proxy, CORS and rate-limit settings from environment", () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const {
        appMock,
        corsMock,
        rateLimitMock,
        mongoRateLimitStoreMock
    } = loadAppModule({
        env: {
            NODE_ENV: "production",
            TRUST_PROXY: "2",
            RATE_LIMIT_STORE: "mongo",
            FRONTEND_URL: "https://app.example.com, https://admin.example.com/",
            GLOBAL_RATE_LIMIT_MAX: "-1",
            AUTH_RATE_LIMIT_MAX: "40"
        }
    });

    expect(appMock.set).toHaveBeenCalledWith("trust proxy", 2);
    expect(mongoRateLimitStoreMock).toHaveBeenCalledTimes(2);
    expect(rateLimitMock).toHaveBeenCalledWith(expect.objectContaining({
        max: 200
    }));
    expect(rateLimitMock).toHaveBeenCalledWith(expect.objectContaining({
        max: 40
    }));
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    const corsOptions = corsMock.mock.calls[0][0];
    const allowedCallback = jest.fn();
    corsOptions.origin("https://admin.example.com/", allowedCallback);
    expect(allowedCallback).toHaveBeenCalledWith(null, true);

    const deniedCallback = jest.fn();
    corsOptions.origin("https://evil.example.com", deniedCallback);
    const deniedError = deniedCallback.mock.calls[0][0];
    expect(deniedError).toBeInstanceOf(Error);
    expect(deniedError.message).toContain("CORS origin not allowed");

    const noOriginCallback = jest.fn();
    corsOptions.origin(undefined, noOriginCallback);
    expect(noOriginCallback).toHaveBeenCalledWith(null, true);

    consoleWarnSpy.mockRestore();
});

test("resolves trust proxy booleans and raw values", () => {
    const onModule = loadAppModule({
        env: {
            TRUST_PROXY: "on",
            RATE_LIMIT_STORE: "memory"
        }
    });
    expect(onModule.appMock.set).toHaveBeenCalledWith("trust proxy", true);

    const offModule = loadAppModule({
        env: {
            TRUST_PROXY: "off",
            RATE_LIMIT_STORE: "memory"
        }
    });
    expect(offModule.appMock.set).toHaveBeenCalledWith("trust proxy", false);

    const rawModule = loadAppModule({
        env: {
            TRUST_PROXY: "loopback, linklocal",
            RATE_LIMIT_STORE: "memory"
        }
    });
    expect(rawModule.appMock.set).toHaveBeenCalledWith("trust proxy", "loopback, linklocal");
});

test("logs warning when memory rate-limit store is used in production", () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    loadAppModule({
        env: {
            NODE_ENV: "production",
            RATE_LIMIT_STORE: "memory"
        }
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[rate-limit] Using in-memory store in production. Set RATE_LIMIT_STORE=mongo for shared limits."
    );
    consoleWarnSpy.mockRestore();
});

test("global error handler maps validation/auth/cors/db/default errors", () => {
    const { appMock } = loadAppModule({
        env: {
            RATE_LIMIT_STORE: "memory",
            NODE_ENV: "development"
        }
    });
    const errorHandler = appMock.use.mock.calls
        .map((call) => call[0])
        .find((arg) => typeof arg === "function" && arg.length === 4);

    expect(errorHandler).toEqual(expect.any(Function));

    const zodRes = createRes();
    errorHandler({ name: "ZodError", errors: [{ path: ["email"] }] }, {}, zodRes, jest.fn());
    expect(zodRes.statusCode).toBe(400);
    expect(zodRes.payload.message).toBe("Validation error");

    const jwtRes = createRes();
    errorHandler({ name: "TokenExpiredError" }, {}, jwtRes, jest.fn());
    expect(jwtRes.statusCode).toBe(401);
    expect(jwtRes.payload.message).toBe("Invalid or expired token");

    const corsRes = createRes();
    errorHandler({ message: "CORS origin not allowed: https://evil.example.com" }, {}, corsRes, jest.fn());
    expect(corsRes.statusCode).toBe(403);
    expect(corsRes.payload.message).toContain("CORS origin not allowed");

    const dbRes = createRes();
    errorHandler({ name: "MongoServerError" }, {}, dbRes, jest.fn());
    expect(dbRes.statusCode).toBe(500);
    expect(dbRes.payload.message).toBe("Database error occurred");

    const defaultRes = createRes();
    errorHandler({ status: 418, message: "teapot", stack: "STACK" }, {}, defaultRes, jest.fn());
    expect(defaultRes.statusCode).toBe(418);
    expect(defaultRes.payload).toEqual(expect.objectContaining({
        success: false,
        message: "teapot",
        stack: "STACK"
    }));
});

test("startServer connects DB, starts scheduler, listens and returns app handles", async () => {
    const setIntervalSpy = jest.spyOn(global, "setInterval");
    const unrefMock = jest.fn();
    setIntervalSpy.mockReturnValue({ unref: unrefMock });
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const { appModule, connectDBMock, postServiceMock, httpServerMock } = loadAppModule({
        env: {
            MONGO_URL: "mongodb://local/test",
            JWT_SECRET: "jwt-secret",
            REFRESH_SECRET: "refresh-secret"
        }
    });

    const first = await appModule.startServer();
    const second = await appModule.startServer();

    expect(connectDBMock).toHaveBeenCalledTimes(2);
    expect(httpServerMock.listen).toHaveBeenCalledTimes(2);
    expect(postServiceMock.publishDueScheduledPosts).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(unrefMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(expect.objectContaining({
        app: expect.any(Object),
        httpServer: expect.any(Object),
        io: expect.any(Object)
    }));
    expect(second).toEqual(expect.objectContaining({
        app: expect.any(Object),
        httpServer: expect.any(Object),
        io: expect.any(Object)
    }));

    setIntervalSpy.mockRestore();
    consoleLogSpy.mockRestore();
});

test("startServer rejects when required env variables are missing", async () => {
    const { appModule, connectDBMock } = loadAppModule({
        env: {
            MONGO_URL: "",
            JWT_SECRET: "",
            REFRESH_SECRET: ""
        }
    });

    await expect(appModule.startServer())
        .rejects
        .toThrow("Missing required environment variables");
    expect(connectDBMock).not.toHaveBeenCalled();
});

test("startServer rejects when http server emits listen error", async () => {
    const listenError = new Error("listen failure");
    const setIntervalSpy = jest.spyOn(global, "setInterval").mockReturnValue({ unref: jest.fn() });
    const { appModule } = loadAppModule({
        env: {
            MONGO_URL: "mongodb://local/test",
            JWT_SECRET: "jwt-secret",
            REFRESH_SECRET: "refresh-secret"
        },
        listenError
    });

    await expect(appModule.startServer()).rejects.toThrow("listen failure");
    setIntervalSpy.mockRestore();
});

test("scheduler logs error when scheduled post publisher fails", async () => {
    const setIntervalSpy = jest.spyOn(global, "setInterval").mockReturnValue({ unref: jest.fn() });
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const { appModule } = loadAppModule({
        env: {
            MONGO_URL: "mongodb://local/test",
            JWT_SECRET: "jwt-secret",
            REFRESH_SECRET: "refresh-secret"
        },
        publishReject: true
    });

    await appModule.startServer();
    await Promise.resolve();
    await Promise.resolve();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[post-scheduler] failed to publish due posts",
        expect.any(Error)
    );

    setIntervalSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
});
