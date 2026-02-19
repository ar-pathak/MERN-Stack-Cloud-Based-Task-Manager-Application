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
    invitedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    inviteType: {
        type: String,
        enum: ["email", "direct_request"],
        default: "email"
    },
    token: {
        type: String,
        unique: true,
        sparse: true,
        default: null
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "expired", "rejected"],
        default: "pending"
    },
    expiresAt: {
        type: Date,
        required: true
    },
    respondedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

workspaceInviteSchema.index({ workspace: 1, invitedUser: 1, status: 1, expiresAt: -1 });
workspaceInviteSchema.index({ workspace: 1, email: 1, inviteType: 1, status: 1, expiresAt: -1 });
workspaceInviteSchema.index({ invitedBy: 1, status: 1, createdAt: -1 });
workspaceInviteSchema.index({ invitedUser: 1, status: 1, createdAt: -1 });
workspaceInviteSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("WorkspaceInvite", workspaceInviteSchema);
