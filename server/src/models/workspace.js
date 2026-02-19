const mongoose = require('mongoose')

const workspaceSchema = new mongoose.Schema({
  name: String,
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
}, { timestamps: true });

workspaceSchema.index({ createdBy: 1, createdAt: -1 });
workspaceSchema.index({ updatedAt: -1 });
workspaceSchema.index({ chatId: 1 });

module.exports = mongoose.model("Workspace", workspaceSchema);
