const mongoose = require("mongoose");

const FEEDBACK_TYPES = ["feature_request", "bug_report"];
const SUPPORT_CATEGORIES = [
    "account",
    "privacy",
    "posts",
    "analytics",
    "billing",
    "security"
];

const supportFeedbackSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: FEEDBACK_TYPES,
            required: true,
            index: true
        },
        category: {
            type: String,
            enum: SUPPORT_CATEGORIES,
            default: "account",
            index: true
        },
        title: {
            type: String,
            trim: true,
            maxlength: 140,
            default: ""
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 4000
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        }
    },
    { timestamps: true }
);

supportFeedbackSchema.index({ user: 1, createdAt: -1 });
supportFeedbackSchema.index({ user: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model("SupportFeedback", supportFeedbackSchema);
