const ORIGINAL_ENV = process.env;

const buildCollection = () => ({
    indexes: jest.fn().mockResolvedValue([]),
    dropIndex: jest.fn().mockResolvedValue(undefined),
    updateMany: jest.fn().mockResolvedValue(undefined),
    createIndex: jest.fn().mockResolvedValue(undefined)
});

const loadConnectDb = ({
    env = {},
    readyState = 0,
    connectImplementation = null,
    likeCollection = null,
    inviteCollection = null,
    closeImplementation = null,
    onceImplementation = null
} = {}) => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ...env };

    const likesCollection = likeCollection || buildCollection();
    const workspaceInviteCollection = inviteCollection || buildCollection();

    const connection = {
        readyState,
        db: {
            collection: jest.fn((name) => {
                if (name === "likes") return likesCollection;
                if (name === "workspaceinvites") return workspaceInviteCollection;
                throw new Error(`Unexpected collection: ${name}`);
            })
        },
        on: jest.fn(),
        close: closeImplementation
            ? jest.fn(closeImplementation)
            : jest.fn().mockResolvedValue(undefined)
    };

    const mongooseMock = {
        connection,
        connect: connectImplementation
            ? jest.fn(connectImplementation)
            : jest.fn().mockResolvedValue({
                connection: { host: "localhost" }
            })
    };

    const LikeMock = {
        syncIndexes: jest.fn().mockResolvedValue(undefined)
    };
    const WorkspaceInviteMock = {
        syncIndexes: jest.fn().mockResolvedValue(undefined)
    };

    const processOnceSpy = jest.spyOn(process, "once");
    if (onceImplementation) {
        processOnceSpy.mockImplementation(onceImplementation);
    } else {
        processOnceSpy.mockImplementation(() => process);
    }

    jest.doMock("mongoose", () => mongooseMock);
    jest.doMock("../../src/models/like", () => LikeMock);
    jest.doMock("../../src/models/workspaceInvite", () => WorkspaceInviteMock);

    const connectDB = require("../../src/config/database");

    return {
        connectDB,
        mongooseMock,
        connection,
        likesCollection,
        workspaceInviteCollection,
        LikeMock,
        WorkspaceInviteMock,
        processOnceSpy
    };
};

beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
    process.env = ORIGINAL_ENV;
});

test("connectDB throws when MONGO_URL is missing", async () => {
    delete process.env.MONGO_URL;
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { connectDB, mongooseMock, processOnceSpy } = loadConnectDb({
        env: { MONGO_URL: "" }
    });

    await expect(connectDB()).rejects.toThrow("MONGO_URL environment variable is not set");
    expect(mongooseMock.connect).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    processOnceSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});

test("connectDB returns existing mongoose connection when already connected", async () => {
    const { connectDB, connection, mongooseMock, processOnceSpy } = loadConnectDb({
        env: { MONGO_URL: "mongodb://local/test" },
        readyState: 1
    });

    const result = await connectDB();

    expect(result).toBe(connection);
    expect(mongooseMock.connect).not.toHaveBeenCalled();
    processOnceSpy.mockRestore();
});

test("connectDB performs index migrations, registers listeners and shutdown hooks", async () => {
    const likesCollection = buildCollection();
    likesCollection.indexes.mockResolvedValue([
        { name: "user_1_post_1", sparse: true },
        { name: "user_1_comment_1", sparse: true }
    ]);

    const inviteCollection = buildCollection();
    inviteCollection.indexes.mockResolvedValue([
        { name: "token_1", unique: false, partialFilterExpression: { token: { $type: "objectId" } } }
    ]);

    const processOnceHandlers = {};
    const processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => undefined);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const {
        connectDB,
        connection,
        mongooseMock,
        LikeMock,
        WorkspaceInviteMock,
        processOnceSpy
    } = loadConnectDb({
        env: {
            MONGO_URL: "mongodb://local/test",
            MONGO_CONNECT_MAX_RETRIES: "bad",
            MONGO_MAX_POOL_SIZE: "-1",
            MONGO_MIN_POOL_SIZE: "oops",
            MONGO_SERVER_SELECTION_TIMEOUT_MS: "11000",
            MONGO_CONNECT_TIMEOUT_MS: "12000",
            MONGO_SOCKET_TIMEOUT_MS: "13000"
        },
        likeCollection: likesCollection,
        inviteCollection,
        onceImplementation: (signal, handler) => {
            processOnceHandlers[signal] = handler;
            return process;
        }
    });

    const result = await connectDB();

    expect(result).toEqual({
        connection: { host: "localhost" }
    });
    expect(mongooseMock.connect).toHaveBeenCalledWith(
        "mongodb://local/test",
        expect.objectContaining({
            serverSelectionTimeoutMS: 11000,
            connectTimeoutMS: 12000,
            socketTimeoutMS: 13000,
            maxPoolSize: 10,
            minPoolSize: 1
        })
    );

    expect(likesCollection.dropIndex).toHaveBeenCalledWith("user_1_post_1");
    expect(likesCollection.dropIndex).toHaveBeenCalledWith("user_1_comment_1");
    expect(likesCollection.createIndex).toHaveBeenCalledTimes(2);
    expect(inviteCollection.dropIndex).toHaveBeenCalledWith("token_1");
    expect(inviteCollection.createIndex).toHaveBeenCalledTimes(1);
    expect(LikeMock.syncIndexes).toHaveBeenCalledTimes(1);
    expect(WorkspaceInviteMock.syncIndexes).toHaveBeenCalledTimes(1);
    expect(connection.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(connection.on).toHaveBeenCalledWith("disconnected", expect.any(Function));
    expect(processOnceHandlers.SIGINT).toEqual(expect.any(Function));
    expect(processOnceHandlers.SIGTERM).toEqual(expect.any(Function));

    const errorHandler = connection.on.mock.calls.find(([event]) => event === "error")[1];
    const disconnectedHandler = connection.on.mock.calls.find(([event]) => event === "disconnected")[1];
    errorHandler(new Error("socket drop"));
    disconnectedHandler();

    await processOnceHandlers.SIGINT();
    expect(processExitSpy).toHaveBeenCalledWith(0);

    processOnceSpy.mockRestore();
    processExitSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});

test("connectDB handles namespace missing while creating workspace invite index", async () => {
    const inviteCollection = buildCollection();
    inviteCollection.indexes.mockRejectedValue({
        code: 26,
        codeName: "NamespaceNotFound"
    });
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const {
        connectDB,
        workspaceInviteCollection,
        processOnceSpy
    } = loadConnectDb({
        env: { MONGO_URL: "mongodb://local/test" },
        inviteCollection
    });

    await connectDB();

    expect(workspaceInviteCollection.createIndex).toHaveBeenCalledWith(
        { token: 1 },
        expect.objectContaining({
            name: "token_1",
            unique: true
        })
    );

    processOnceSpy.mockRestore();
    consoleLogSpy.mockRestore();
});

test("connectDB rethrows workspace invite index errors that are not namespace-missing", async () => {
    const inviteCollection = buildCollection();
    const indexError = new Error("listIndexes not authorized");
    inviteCollection.indexes.mockRejectedValue(indexError);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const {
        connectDB,
        processOnceSpy
    } = loadConnectDb({
        env: { MONGO_URL: "mongodb://local/test" },
        inviteCollection
    });

    await expect(connectDB()).rejects.toThrow("listIndexes not authorized");

    processOnceSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});

test("connectDB keeps valid token index when partial filter type includes string array", async () => {
    const inviteCollection = buildCollection();
    inviteCollection.indexes.mockResolvedValue([
        {
            name: "token_1",
            unique: true,
            partialFilterExpression: {
                token: {
                    $type: ["string", "null"]
                }
            }
        }
    ]);

    const {
        connectDB,
        workspaceInviteCollection,
        processOnceSpy
    } = loadConnectDb({
        env: { MONGO_URL: "mongodb://local/test" },
        inviteCollection
    });

    await connectDB();

    expect(workspaceInviteCollection.dropIndex).not.toHaveBeenCalledWith("token_1");
    expect(workspaceInviteCollection.createIndex).not.toHaveBeenCalledWith(
        { token: 1 },
        expect.objectContaining({ name: "token_1" })
    );

    processOnceSpy.mockRestore();
});

test("connectDB retries retryable failures and eventually succeeds", async () => {
    let attempt = 0;
    const connectImplementation = jest.fn(async () => {
        attempt += 1;
        if (attempt === 1) {
            const error = new Error("server selection timed out");
            error.name = "MongooseServerSelectionError";
            throw error;
        }
        return { connection: { host: "retry-host" } };
    });

    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const {
        connectDB,
        connection,
        processOnceSpy
    } = loadConnectDb({
        env: {
            MONGO_URL: "mongodb://local/test",
            MONGO_CONNECT_MAX_RETRIES: "2",
            MONGO_CONNECT_RETRY_DELAY_MS: "1"
        },
        readyState: 2,
        connectImplementation
    });

    const result = await connectDB();

    expect(result).toEqual({ connection: { host: "retry-host" } });
    expect(connection.close).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("MongoDB connect attempt 1/2 failed; retrying in 1ms")
    );

    processOnceSpy.mockRestore();
    consoleWarnSpy.mockRestore();
});

test("connectDB throws non-retryable errors and logs failure", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const {
        connectDB,
        mongooseMock,
        processOnceSpy
    } = loadConnectDb({
        env: {
            MONGO_URL: "mongodb://local/test",
            MONGO_CONNECT_MAX_RETRIES: "2"
        },
        connectImplementation: async () => {
            throw new Error("authentication failed");
        }
    });

    await expect(connectDB()).rejects.toThrow("authentication failed");
    expect(mongooseMock.connect).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
        "MongoDB connection failed:",
        "authentication failed"
    );

    processOnceSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});

test("shutdown hook exits with status 1 when closing connection fails", async () => {
    const processOnceHandlers = {};
    const processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => undefined);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const {
        connectDB,
        processOnceSpy
    } = loadConnectDb({
        env: { MONGO_URL: "mongodb://local/test" },
        closeImplementation: async () => {
            throw new Error("close failed");
        },
        onceImplementation: (signal, handler) => {
            processOnceHandlers[signal] = handler;
            return process;
        }
    });

    await connectDB();
    await processOnceHandlers.SIGTERM();

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error closing MongoDB connection after SIGTERM:",
        expect.any(Error)
    );

    processOnceSpy.mockRestore();
    processExitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});
