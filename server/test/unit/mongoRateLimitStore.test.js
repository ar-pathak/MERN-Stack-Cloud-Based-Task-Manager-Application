jest.mock("mongoose", () => ({
    connection: {
        db: null
    }
}));

const mongoose = require("mongoose");
const MongoRateLimitStore = require("../../src/helpers/mongoRateLimitStore");

const createCollectionMock = () => ({
    createIndex: jest.fn().mockResolvedValue({}),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({}),
    deleteOne: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({})
});

beforeEach(() => {
    jest.clearAllMocks();
    mongoose.connection.db = null;
});

test("ensureCollection throws when mongo connection is unavailable", async () => {
    const store = new MongoRateLimitStore({ windowMs: 1000 });
    await expect(store.ensureCollection()).rejects.toThrow(
        "MongoDB connection is not ready for rate limiting"
    );
});

test("ensureCollection initializes collection and indexes only once", async () => {
    const collection = createCollectionMock();
    const collectionFactory = jest.fn().mockReturnValue(collection);
    mongoose.connection.db = {
        collection: collectionFactory
    };

    const store = new MongoRateLimitStore({
        windowMs: 1000,
        prefix: "auth_rate",
        collectionName: "custom_limits"
    });

    await store.ensureCollection();
    await store.ensureCollection();

    expect(collectionFactory).toHaveBeenCalledWith("custom_limits");
    expect(collection.createIndex).toHaveBeenCalledTimes(2);
});

test("increment returns active hit count when non-expired document exists", async () => {
    const collection = createCollectionMock();
    collection.findOneAndUpdate.mockResolvedValue({
        value: {
            hits: 3,
            expiresAt: new Date("2026-03-03T12:00:00.000Z")
        }
    });

    mongoose.connection.db = {
        collection: jest.fn().mockReturnValue(collection)
    };

    const store = new MongoRateLimitStore({
        windowMs: 5000,
        prefix: "auth_rate"
    });

    const result = await store.increment("ip:1");

    expect(result).toEqual({
        totalHits: 3,
        resetTime: new Date("2026-03-03T12:00:00.000Z")
    });
    expect(collection.updateOne).not.toHaveBeenCalled();
});

test("increment creates new entry when no active record exists", async () => {
    const collection = createCollectionMock();
    collection.findOneAndUpdate.mockResolvedValue({ value: null });

    mongoose.connection.db = {
        collection: jest.fn().mockReturnValue(collection)
    };

    const store = new MongoRateLimitStore({
        windowMs: 10000,
        prefix: "api_rate"
    });

    const result = await store.increment("ip:2");

    expect(result.totalHits).toBe(1);
    expect(result.resetTime).toBeInstanceOf(Date);
    expect(collection.updateOne).toHaveBeenCalledWith(
        { prefix: "api_rate", key: "ip:2" },
        expect.objectContaining({
            $set: expect.objectContaining({
                hits: 1,
                prefix: "api_rate",
                key: "ip:2"
            }),
            $setOnInsert: expect.objectContaining({
                createdAt: expect.any(Date)
            })
        }),
        { upsert: true }
    );
});

test("decrement updates only active records with positive hits", async () => {
    const collection = createCollectionMock();
    mongoose.connection.db = {
        collection: jest.fn().mockReturnValue(collection)
    };

    const store = new MongoRateLimitStore({ windowMs: 1000, prefix: "auth_rate" });
    await store.decrement("ip:3");

    expect(collection.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
            prefix: "auth_rate",
            key: "ip:3",
            hits: { $gt: 0 },
            expiresAt: { $gt: expect.any(Date) }
        }),
        {
            $inc: { hits: -1 },
            $set: { updatedAt: expect.any(Date) }
        }
    );
});

test("resetKey and resetAll remove scoped records", async () => {
    const collection = createCollectionMock();
    mongoose.connection.db = {
        collection: jest.fn().mockReturnValue(collection)
    };

    const store = new MongoRateLimitStore({ prefix: "auth_rate" });
    await store.resetKey("ip:4");
    await store.resetAll();

    expect(collection.deleteOne).toHaveBeenCalledWith({
        prefix: "auth_rate",
        key: "ip:4"
    });
    expect(collection.deleteMany).toHaveBeenCalledWith({
        prefix: "auth_rate"
    });
});

test("init accepts runtime window override", () => {
    const store = new MongoRateLimitStore({ windowMs: 1000 });
    store.init({ windowMs: "2500" });
    expect(store.windowMs).toBe(2500);
});
