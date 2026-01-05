
const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
    title: String,
    description: String,

    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: {
        type: String,
        enum: ["active", "archived", "completed"],
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

module.exports = mongoose.model("Task", taskSchema);
