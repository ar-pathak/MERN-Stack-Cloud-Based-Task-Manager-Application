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


  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team"
  }],


  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: {
      type: String,
      enum: ["admin", "editor", "viewer"],
      default: "viewer"
    }
  }],

  status: {
    type: String,
    enum: ["active", "archived", "completed"],
    default: "active"
  }

}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
