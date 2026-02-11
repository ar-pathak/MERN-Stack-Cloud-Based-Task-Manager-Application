const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
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
    level: {
        type: String,
        enum: ["workspace", "project", "task", "subtask", "system"],
        default: "system",
        index: true
    },
    action: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true });

activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ task: 1, createdAt: -1 });
activitySchema.index({ subtask: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", activitySchema);
