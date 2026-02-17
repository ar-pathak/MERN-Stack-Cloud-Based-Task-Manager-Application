const mongoose = require("mongoose");

const projectStatusChangeRequestSchema = new mongoose.Schema(
    {
        workspace: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        requestedStatus: {
            type: String,
            enum: ["active", "archived", "completed"],
            required: true
        },
        previousStatus: {
            type: String,
            enum: ["active", "archived", "completed", "deleted"],
            required: true
        },
        note: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

projectStatusChangeRequestSchema.index({ project: 1, status: 1, createdAt: -1 });
projectStatusChangeRequestSchema.index({ project: 1, requestedBy: 1, requestedStatus: 1, status: 1 });

module.exports = mongoose.model("ProjectStatusChangeRequest", projectStatusChangeRequestSchema);
