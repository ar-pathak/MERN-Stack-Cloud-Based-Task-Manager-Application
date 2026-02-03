// models/message.js
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
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000
        },
        // Message type
        type: {
            type: String,
            enum: ["text", "image", "file", "video", "audio"],
            default: "text"
        },
        // Attachments
        attachments: [{
            url: String,
            type: String,
            name: String,
            size: Number
        }],
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
        // Read receipts - array of user IDs who have read this message
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

// Static method: Mark all messages up to a specific message as read by a user
messageSchema.statics.markReadUpTo = async function (chatId, userId, lastReadMessageId) {
    const lastMessage = await this.findById(lastReadMessageId);

    if (!lastMessage) {
        throw new Error("Message not found");
    }

    // Update all messages in this chat created before or at the same time as lastMessage
    // that don't already have this user in readBy
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
    // Check if user already reacted with this emoji
    const existingReaction = this.reactions.find(
        r => String(r.userId) === String(userId) && r.emoji === emoji
    );

    if (existingReaction) {
        return this; // Already reacted
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