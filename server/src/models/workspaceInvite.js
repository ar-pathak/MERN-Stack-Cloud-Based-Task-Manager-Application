const mongoose = require("mongoose");

const workspaceInviteSchema = new mongoose.Schema({
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
        required: true
    },
    email: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["admin", "member", "viewer"],
        default: "member"
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "expired"],
        default: "pending"
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("WorkspaceInvite", workspaceInviteSchema);
