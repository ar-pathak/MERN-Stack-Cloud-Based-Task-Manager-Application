const mongoose = require('mongoose');

const workspaceMemberSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  role: {
    type: String,
    enum: ["owner", "admin", "member", "viewer"],
    default: "member"
  },

  isStarred: {
    type: Boolean,
    default: false
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active"
  },

  joinedAt: {
    type: Date,
    default: Date.now
  }
});

workspaceMemberSchema.index({ workspace: 1, user: 1 }, { unique: true });
workspaceMemberSchema.index({ user: 1, status: 1, joinedAt: -1 });
workspaceMemberSchema.index({ workspace: 1, role: 1, status: 1, joinedAt: 1 });

module.exports = mongoose.model("WorkspaceMember", workspaceMemberSchema);
