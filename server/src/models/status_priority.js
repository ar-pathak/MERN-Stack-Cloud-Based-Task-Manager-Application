const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
    name: String,
    color: String,
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace" }
});

module.exports = mongoose.model("Status", statusSchema);

const prioritySchema = new mongoose.Schema({
    name: String,
    color: String,
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace" }
});

module.exports = mongoose.model("Priority", prioritySchema);
