
const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
    title: String,
    description: String,

    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },

    status: {
        type: String,
        enum: ["active", "archived", "completed", "deleted"],
        default: "active"
    },
    isHighPriority: {
        type: Boolean,
        default: false,
    },
    assigneesTeams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team"
    }],
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    dueDate: Date
}, { timestamps: true });

taskSchema.index({ workspace: 1, status: 1, createdAt: -1 });
taskSchema.index({ project: 1, status: 1, createdAt: -1 });
taskSchema.index({ createdBy: 1, workspace: 1, project: 1, status: 1 });
taskSchema.index({ assignees: 1, status: 1, createdAt: -1 });
taskSchema.index({ assigneesTeams: 1, status: 1, createdAt: -1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ chatId: 1 });

module.exports = mongoose.model("Task", taskSchema);
