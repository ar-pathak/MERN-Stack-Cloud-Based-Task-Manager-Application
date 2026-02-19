class TtlCache {
    constructor({ maxEntries = 500 } = {}) {
        this.maxEntries = Math.max(1, Number(maxEntries) || 500);
        this.store = new Map();
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            return { hit: false, value: null };
        }

        if (entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return { hit: false, value: null };
        }

        return { hit: true, value: entry.value };
    }

    set(key, value, ttlMs = 15000) {
        const now = Date.now();
        const safeTtlMs = Math.max(1, Number(ttlMs) || 15000);

        if (!this.store.has(key) && this.store.size >= this.maxEntries) {
            this.evictOldest();
        }

        this.store.set(key, {
            value,
            createdAt: now,
            expiresAt: now + safeTtlMs
        });

        return value;
    }

    delete(key) {
        this.store.delete(key);
    }

    deleteByPrefix(prefix = "") {
        if (!prefix) return;
        for (const key of this.store.keys()) {
            if (String(key).startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }

    evictOldest() {
        let oldestKey = null;
        let oldestCreatedAt = Number.POSITIVE_INFINITY;

        for (const [key, entry] of this.store.entries()) {
            if (entry.createdAt < oldestCreatedAt) {
                oldestCreatedAt = entry.createdAt;
                oldestKey = key;
            }
        }

        if (oldestKey !== null) {
            this.store.delete(oldestKey);
        }
    }
}

const appCache = new TtlCache({
    maxEntries: Number(process.env.APP_CACHE_MAX_ENTRIES) || 1000
});

module.exports = {
    TtlCache,
    appCache
};
