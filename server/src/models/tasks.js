
const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
    title: String,
    description: String,

    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: { type: mongoose.Schema.Types.ObjectId, ref: "Status" },
    priority: { type: mongoose.Schema.Types.ObjectId, ref: "Priority" },

    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    dueDate: Date
}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);
