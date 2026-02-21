const mongoose = require("mongoose");

class MongoRateLimitStore {
    constructor({ windowMs, prefix = "rate_limit", collectionName = "rate_limits" } = {}) {
        this.windowMs = Number(windowMs) || 15 * 60 * 1000;
        this.prefix = String(prefix || "rate_limit");
        this.collectionName = String(collectionName || "rate_limits");
        this.collection = null;
        this.indexesEnsured = false;
    }

    init(options = {}) {
        if (Number.isFinite(Number(options.windowMs))) {
            this.windowMs = Number(options.windowMs);
        }
    }

    async ensureCollection() {
        if (this.collection) {
            return this.collection;
        }

        const db = mongoose.connection?.db;
        if (!db) {
            throw new Error("MongoDB connection is not ready for rate limiting");
        }

        this.collection = db.collection(this.collectionName);

        if (!this.indexesEnsured) {
            this.indexesEnsured = true;
            await this.collection.createIndex(
                { prefix: 1, key: 1 },
                { unique: true, name: "prefix_key_unique" }
            );
            await this.collection.createIndex(
                { expiresAt: 1 },
                { expireAfterSeconds: 0, name: "expiresAt_ttl" }
            );
        }

        return this.collection;
    }

    async increment(key) {
        const now = new Date();
        const resetTime = new Date(now.getTime() + this.windowMs);
        const collection = await this.ensureCollection();

        const activeUpdate = await collection.findOneAndUpdate(
            {
                prefix: this.prefix,
                key,
                expiresAt: { $gt: now }
            },
            {
                $inc: { hits: 1 },
                $set: { updatedAt: now }
            },
            { returnDocument: "after" }
        );

        const activeDoc = activeUpdate?.value || activeUpdate;
        if (activeDoc && typeof activeDoc.hits === "number") {
            return {
                totalHits: activeDoc.hits,
                resetTime: activeDoc.expiresAt
            };
        }

        await collection.updateOne(
            { prefix: this.prefix, key },
            {
                $set: {
                    prefix: this.prefix,
                    key,
                    hits: 1,
                    expiresAt: resetTime,
                    updatedAt: now
                },
                $setOnInsert: {
                    createdAt: now
                }
            },
            { upsert: true }
        );

        return {
            totalHits: 1,
            resetTime
        };
    }

    async decrement(key) {
        const collection = await this.ensureCollection();
        const now = new Date();

        await collection.updateOne(
            {
                prefix: this.prefix,
                key,
                expiresAt: { $gt: now },
                hits: { $gt: 0 }
            },
            { $inc: { hits: -1 }, $set: { updatedAt: now } }
        );
    }

    async resetKey(key) {
        const collection = await this.ensureCollection();
        await collection.deleteOne({ prefix: this.prefix, key });
    }

    async resetAll() {
        const collection = await this.ensureCollection();
        await collection.deleteMany({ prefix: this.prefix });
    }
}

module.exports = MongoRateLimitStore;
