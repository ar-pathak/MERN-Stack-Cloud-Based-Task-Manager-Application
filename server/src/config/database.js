const mongoose = require("mongoose");
const Like = require("../models/like");
const WorkspaceInvite = require("../models/workspaceInvite");

let shutdownHooksRegistered = false;

const registerShutdownHooks = () => {
    if (shutdownHooksRegistered) return;
    shutdownHooksRegistered = true;

    const closeConnection = async (signal) => {
        try {
            await mongoose.connection.close();
            console.log(`MongoDB connection closed after ${signal}`);
            process.exit(0);
        } catch (error) {
            console.error(`Error closing MongoDB connection after ${signal}:`, error);
            process.exit(1);
        }
    };

    process.once("SIGINT", () => closeConnection("SIGINT"));
    process.once("SIGTERM", () => closeConnection("SIGTERM"));
};

const migrateLikeIndexes = async () => {
    const collection = mongoose.connection.db.collection("likes");
    const indexes = await collection.indexes();
    const indexByName = new Map(indexes.map((index) => [index.name, index]));

    const postLikeIndex = indexByName.get("user_1_post_1");
    const commentLikeIndex = indexByName.get("user_1_comment_1");
    const needsPostMigration = Boolean(postLikeIndex?.sparse);
    const needsCommentMigration = Boolean(commentLikeIndex?.sparse);

    if (!needsPostMigration && !needsCommentMigration) {
        return;
    }

    if (needsPostMigration) {
        await collection.dropIndex("user_1_post_1");
    }

    if (needsCommentMigration) {
        await collection.dropIndex("user_1_comment_1");
    }

    // Remove legacy null fields so partial indexes work as expected.
    await collection.updateMany({ post: null }, { $unset: { post: "" } });
    await collection.updateMany({ comment: null }, { $unset: { comment: "" } });

    await collection.createIndex(
        { user: 1, post: 1 },
        {
            name: "user_1_post_1",
            unique: true,
            partialFilterExpression: { post: { $type: "objectId" } }
        }
    );

    await collection.createIndex(
        { user: 1, comment: 1 },
        {
            name: "user_1_comment_1",
            unique: true,
            partialFilterExpression: { comment: { $type: "objectId" } }
        }
    );

    console.log("Migrated likes indexes from sparse to partial unique indexes");
};

const hasStringTokenPartialFilter = (index) => {
    const typeCondition = index?.partialFilterExpression?.token?.$type;
    if (Array.isArray(typeCondition)) {
        return typeCondition.includes("string");
    }
    return typeCondition === "string";
};

const migrateWorkspaceInviteTokenIndex = async () => {
    const collection = mongoose.connection.db.collection("workspaceinvites");
    const tokenIndexOptions = {
        name: "token_1",
        unique: true,
        partialFilterExpression: { token: { $type: "string" } }
    };

    let indexes = [];
    try {
        indexes = await collection.indexes();
    } catch (error) {
        const namespaceMissing = error?.code === 26 || error?.codeName === "NamespaceNotFound";
        if (!namespaceMissing) {
            throw error;
        }

        await collection.createIndex({ token: 1 }, tokenIndexOptions);
        console.log("Created workspace invite token partial unique index");
        return;
    }

    const tokenIndex = indexes.find((index) => index.name === "token_1");

    const hasExpectedIndex =
        Boolean(tokenIndex) &&
        tokenIndex.unique === true &&
        hasStringTokenPartialFilter(tokenIndex);

    if (!hasExpectedIndex && tokenIndex) {
        await collection.dropIndex("token_1");
    }

    // Legacy records may still store token as null; remove it so they are ignored by the partial index.
    await collection.updateMany({ token: null }, { $unset: { token: "" } });

    if (!hasExpectedIndex) {
        await collection.createIndex(
            { token: 1 },
            tokenIndexOptions
        );

        console.log("Migrated workspace invite token index to partial unique index");
    }
};

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URL) {
            throw new Error("MONGO_URL environment variable is not set");
        }

        const conn = await mongoose.connect(process.env.MONGO_URL);

        console.log(`MongoDB connected: ${conn.connection.host}`);

        mongoose.connection.on("error", (err) => {
            console.error("MongoDB connection error:", err);
        });

        mongoose.connection.on("disconnected", () => {
            console.warn("MongoDB disconnected");
        });

        await migrateLikeIndexes();
        await migrateWorkspaceInviteTokenIndex();
        await Like.syncIndexes();
        await WorkspaceInvite.syncIndexes();

        registerShutdownHooks();
        return conn;
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        throw error;
    }
};

module.exports = connectDB;
