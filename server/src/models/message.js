const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
            index: true
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        // FIX 1: Allow empty content for attachment-only messages
        content: {
            type: String,
            trim: true,
            default: "", // Default to empty string
            maxlength: 5000
        },
        // Message type (overall)
        type: {
            type: String,
            enum: ["text", "image", "file", "video", "audio"],
            default: "text"
        },
        // System / activity messages rendered differently in UI
        isSystem: {
            type: Boolean,
            default: false,
            index: true
        },
        // Metadata for system/activity payloads (call invites, workspace logs, etc.).
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        // Mentioned users in the message content (@username)
        mentions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        }],
        // FIX 2: Correctly define attachments array structure
        attachments: [
            {
                url: { type: String, required: true },
                name: { type: String },
                // "type" is a reserved keyword in Mongoose. 
                // It must be defined like this to work as a field name:
                type: { type: String },
                size: { type: Number }
            }
        ],
        // Reply reference
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message"
        },
        // Reactions
        reactions: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            emoji: String,
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
        // Read receipts
        readBy: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            readAt: {
                type: Date,
                default: Date.now
            }
        }],
        // Pinned status
        pinned: {
            type: Boolean,
            default: false
        },
        // Soft delete
        status: {
            type: String,
            enum: ["active", "deleted", "edited"],
            default: "active",
            index: true
        },
        // Edit tracking
        edited: {
            type: Boolean,
            default: false
        },
        editedAt: Date
    },
    {
        timestamps: true
    }
);

// Compound indexes for efficient queries
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, status: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, pinned: 1 });
messageSchema.index({ chatId: 1, mentions: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, isSystem: 1, "meta.activityType": 1, createdAt: -1 });

// Static method: Mark all messages up to a specific message as read by a user
messageSchema.statics.markReadUpTo = async function (chatId, userId, lastReadMessageId) {
    const lastMessage = await this.findById(lastReadMessageId);

    if (!lastMessage) {
        throw new Error("Message not found");
    }

    return this.updateMany(
        {
            chatId,
            createdAt: { $lte: lastMessage.createdAt },
            "readBy.userId": { $ne: userId }
        },
        {
            $push: {
                readBy: {
                    userId,
                    readAt: new Date()
                }
            }
        }
    );
};

// Instance method: Add a reaction
messageSchema.methods.addReaction = async function (userId, emoji) {
    const existingReaction = this.reactions.find(
        r => String(r.userId) === String(userId) && r.emoji === emoji
    );

    if (existingReaction) {
        return this;
    }

    this.reactions.push({ userId, emoji });
    return this.save();
};

// Instance method: Remove a reaction
messageSchema.methods.removeReaction = async function (userId, emoji) {
    this.reactions = this.reactions.filter(
        r => !(String(r.userId) === String(userId) && r.emoji === emoji)
    );
    return this.save();
};

module.exports = mongoose.model("Message", messageSchema);


