const mongoose = require('mongoose')


const projectSchema = new mongoose.Schema({
    name: String,
    description: String,
    color: String,

    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: String
    }]

}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
