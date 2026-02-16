const mongoose = require("mongoose");

const SUPPORT_CATEGORIES = [
    "account",
    "privacy",
    "posts",
    "analytics",
    "billing",
    "security"
];

const supportArticleSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180
        },
        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true
        },
        summary: {
            type: String,
            required: true,
            trim: true,
            maxlength: 320
        },
        category: {
            type: String,
            enum: SUPPORT_CATEGORIES,
            required: true,
            index: true
        },
        tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
        contentMarkdown: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30000
        },
        featured: {
            type: Boolean,
            default: false
        },
        published: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    { timestamps: true }
);

supportArticleSchema.index({
    title: "text",
    summary: "text",
    contentMarkdown: "text",
    tags: "text"
});
supportArticleSchema.index({ category: 1, featured: -1, updatedAt: -1 });

module.exports = mongoose.model("SupportArticle", supportArticleSchema);
