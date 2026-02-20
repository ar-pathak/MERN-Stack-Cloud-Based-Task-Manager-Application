const mongoose = require("mongoose");

const taskAssigneeRequestSchema = new mongoose.Schema(
    {
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        requestedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "expired"],
            default: "pending",
            index: true
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true
        },
        reviewedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

taskAssigneeRequestSchema.index({ task: 1, requestedUser: 1, status: 1, createdAt: -1 });
taskAssigneeRequestSchema.index({ task: 1, requestedBy: 1, requestedUser: 1, status: 1 });

module.exports = mongoose.model("TaskAssigneeRequest", taskAssigneeRequestSchema);
