// models/chat.js
const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["private", "group"],
            required: true,
            index: true
        },
        name: {
            type: String,
            // Only required for group chats
            required: function () {
                return this.type === "group";
            },
            trim: true,
            maxlength: 100
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }],
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            // Only for group chats
            required: function () {
                return this.type === "group";
            }
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message"
        },
        // Avatar for group chats
        avatar: {
            type: String
        },
        // Chat settings
        muted: {
            type: Boolean,
            default: false
        },
        // Archived status
        archived: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Indexes for performance
chatSchema.index({ members: 1, updatedAt: -1 });
chatSchema.index({ type: 1, members: 1 });

// Virtual for unread count (can be computed on frontend or added as field)
chatSchema.virtual("memberCount").get(function () {
    return this.members?.length || 0;
});

// Ensure virtuals are included in JSON
chatSchema.set("toJSON", { virtuals: true });
chatSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Chat", chatSchema);