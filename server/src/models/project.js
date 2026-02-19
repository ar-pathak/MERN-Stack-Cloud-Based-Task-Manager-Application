const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String
  },

  color: {
    type: String,
    default: "#4f46e5"
  },

  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    required: true
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },

  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team"
  }],


  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: {
      type: String,
      enum: ["admin", "member", "viewer"],
      default: "viewer"
    }
  }],

  status: {
    type: String,
    enum: ["active", "archived", "completed", "deleted"],
    default: "active"
  },
  isHighPriority: {
    type: Boolean,
    default: false,
  },
  dueDate: Date,
  settings: {
    statusChangeAdminApprovalEnabled: {
      type: Boolean,
      default: false
    }
  }

}, { timestamps: true });

projectSchema.index({ workspace: 1, status: 1, updatedAt: -1 });
projectSchema.index({ owner: 1, status: 1, updatedAt: -1 });
projectSchema.index({ "members.user": 1, status: 1, updatedAt: -1 });
projectSchema.index({ teams: 1, status: 1, updatedAt: -1 });
projectSchema.index({ workspace: 1, name: 1 });
projectSchema.index({ workspace: 1, dueDate: 1, status: 1 });
projectSchema.index({ chatId: 1 });

module.exports = mongoose.model("Project", projectSchema);
