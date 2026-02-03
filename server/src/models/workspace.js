const mongoose = require('mongoose')

const workspaceSchema = new mongoose.Schema({
  name: String,
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
}, { timestamps: true });

module.exports = mongoose.model("Workspace", workspaceSchema);
