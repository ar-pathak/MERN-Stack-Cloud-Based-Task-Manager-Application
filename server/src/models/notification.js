const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },
        type: {
            type: String,
            enum: ["activity", "assignment", "member", "call", "chat", "system"],
            default: "activity",
            index: true
        },
        category: {
            type: String,
            enum: ["workspace", "project", "task", "subtask", "chat", "call", "social", "system"],
            default: "system",
            index: true
        },
        priority: {
            type: String,
            enum: ["low", "normal", "high", "urgent"],
            default: "normal",
            index: true
        },
        entityType: {
            type: String,
            enum: ["workspace", "project", "task", "subtask", "chat", "call", "user", "none"],
            default: "none",
            index: true
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            index: true
        },
        workspace: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            index: true
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            index: true
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            index: true
        },
        subtask: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subtask",
            index: true
        },
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            index: true
        },
        callId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Call",
            index: true
        },
        link: {
            type: String,
            trim: true,
            default: "/main"
        },
        channels: {
            inApp: { type: Boolean, default: true },
            email: { type: Boolean, default: false },
            push: { type: Boolean, default: false }
        },
        read: {
            type: Boolean,
            default: false,
            index: true
        },
        readAt: {
            type: Date,
            default: null
        },
        seenAt: {
            type: Date,
            default: null
        },
        dedupeKey: {
            type: String,
            trim: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        expiresAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, category: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });
notificationSchema.index({ user: 1, dedupeKey: 1, createdAt: -1 });

notificationSchema.pre("save", function() {
    if (!this.isModified("read")) return;
    this.readAt = this.read ? new Date() : null;
});

module.exports = mongoose.model("Notification", notificationSchema);
