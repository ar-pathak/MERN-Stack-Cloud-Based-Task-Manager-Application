const mongoose = require('mongoose')

const workspaceSchema = new mongoose.Schema({
  name: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: { type: String, enum: ["owner", "admin", "member", "viewer"] }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Workspace", workspaceSchema);
