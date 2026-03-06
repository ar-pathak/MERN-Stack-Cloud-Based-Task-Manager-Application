const { TtlCache, appCache } = require("../../src/helpers/cacheHelper");

afterEach(() => {
    jest.restoreAllMocks();
});

test("constructor enforces minimum maxEntries", () => {
    const cache = new TtlCache({ maxEntries: -5 });
    expect(cache.maxEntries).toBe(1);
});

test("constructor falls back to default maxEntries when value is zero-ish", () => {
    const cache = new TtlCache({ maxEntries: 0 });
    expect(cache.maxEntries).toBe(500);
});

test("get returns miss for unknown key", () => {
    const cache = new TtlCache({ maxEntries: 2 });
    expect(cache.get("missing")).toEqual({
        hit: false,
        value: null
    });
});

test("set/get returns cache hit for active entries", () => {
    const cache = new TtlCache({ maxEntries: 2 });
    cache.set("key", { value: 1 }, 1000);

    expect(cache.get("key")).toEqual({
        hit: true,
        value: { value: 1 }
    });
});

test("get removes expired entries and returns miss", () => {
    const nowSpy = jest.spyOn(Date, "now")
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2500);

    const cache = new TtlCache({ maxEntries: 2 });
    cache.set("key", "value", 1000);
    const result = cache.get("key");

    expect(result).toEqual({ hit: false, value: null });
    expect(cache.store.has("key")).toBe(false);
    nowSpy.mockRestore();
});

test("set evicts oldest entry when max size is reached", () => {
    const nowSpy = jest.spyOn(Date, "now")
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(3000);

    const cache = new TtlCache({ maxEntries: 2 });
    cache.set("a", "first", 5000);
    cache.set("b", "second", 5000);
    cache.set("c", "third", 5000);

    expect(cache.store.has("a")).toBe(false);
    expect(cache.store.has("b")).toBe(true);
    expect(cache.store.has("c")).toBe(true);
    nowSpy.mockRestore();
});

test("set uses safe default ttl for invalid ttl input", () => {
    const nowSpy = jest.spyOn(Date, "now")
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000);

    const cache = new TtlCache({ maxEntries: 2 });
    cache.set("safe", "value", "invalid-ttl");

    expect(cache.get("safe")).toEqual({
        hit: true,
        value: "value"
    });
    nowSpy.mockRestore();
});

test("delete and deleteByPrefix remove matching entries", () => {
    const cache = new TtlCache({ maxEntries: 5 });
    cache.set("project:1", "a", 1000);
    cache.set("project:2", "b", 1000);
    cache.set("user:1", "c", 1000);

    cache.delete("user:1");
    cache.deleteByPrefix("project:");

    expect(cache.store.size).toBe(0);
});

test("deleteByPrefix ignores empty prefix and evictOldest handles empty store", () => {
    const cache = new TtlCache({ maxEntries: 2 });
    cache.deleteByPrefix("");
    cache.evictOldest();

    expect(cache.store.size).toBe(0);
});

test("appCache export is an instance of TtlCache", () => {
    expect(appCache).toBeInstanceOf(TtlCache);
});
