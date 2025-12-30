const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    action: String,
    meta: Object
}, { timestamps: true });

module.exports = mongoose.model("Activity", activitySchema);
