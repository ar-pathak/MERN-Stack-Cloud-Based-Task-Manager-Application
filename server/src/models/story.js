const mongoose = require("mongoose");
const { Schema } = mongoose;

const storyViewerSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        viewedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

const storyReactionSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        emoji: {
            type: String,
            required: true,
            trim: true,
            maxlength: 12
        },
        reactedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

const storySchema = new Schema(
    {
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        caption: {
            type: String,
            trim: true,
            maxlength: [500, "Story caption cannot exceed 500 characters"],
            default: ""
        },
        media: {
            type: {
                type: String,
                enum: ["image", "video"],
                required: true
            },
            url: {
                type: String,
                required: true
            },
            thumbnail: String,
            duration: Number
        },
        visibility: {
            type: String,
            enum: ["public", "followers"],
            default: "public",
            index: true
        },
        mentions: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        hashtags: [
            {
                type: String,
                trim: true,
                lowercase: true
            }
        ],
        viewers: [storyViewerSchema],
        reactions: [storyReactionSchema],
        viewsCount: {
            type: Number,
            default: 0,
            min: 0
        },
        status: {
            type: String,
            enum: ["active", "deleted"],
            default: "active",
            index: true
        },
        expiresAt: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ status: 1, expiresAt: 1, createdAt: -1 });

module.exports = mongoose.model("Story", storySchema);
