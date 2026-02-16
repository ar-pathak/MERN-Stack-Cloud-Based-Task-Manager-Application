const mongoose = require("mongoose");

const SUPPORT_CATEGORIES = [
    "account",
    "privacy",
    "posts",
    "analytics",
    "billing",
    "security"
];
const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"];
const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];
const TICKET_SOURCES = ["ticket", "contact"];

const attachmentSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
            trim: true
        },
        name: {
            type: String,
            trim: true,
            maxlength: 180
        },
        type: {
            type: String,
            trim: true,
            maxlength: 120
        },
        size: {
            type: Number,
            min: 0,
            default: 0
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

const commentSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        authorName: {
            type: String,
            trim: true,
            maxlength: 120,
            default: ""
        },
        body: {
            type: String,
            required: true,
            trim: true,
            maxlength: 3000
        },
        attachments: {
            type: [attachmentSchema],
            default: []
        },
        parentCommentId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: true }
);

const supportTicketSchema = new mongoose.Schema(
    {
        ticketNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true
        },
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        requesterSnapshot: {
            name: {
                type: String,
                trim: true,
                maxlength: 120,
                default: ""
            },
            email: {
                type: String,
                trim: true,
                maxlength: 180,
                default: ""
            }
        },
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        category: {
            type: String,
            enum: SUPPORT_CATEGORIES,
            required: true,
            index: true
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 6000
        },
        priority: {
            type: String,
            enum: TICKET_PRIORITIES,
            default: "medium",
            index: true
        },
        status: {
            type: String,
            enum: TICKET_STATUSES,
            default: "open",
            index: true
        },
        source: {
            type: String,
            enum: TICKET_SOURCES,
            default: "ticket"
        },
        attachments: {
            type: [attachmentSchema],
            default: []
        },
        comments: {
            type: [commentSchema],
            default: []
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        lastRepliedAt: {
            type: Date,
            default: null
        },
        closedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

supportTicketSchema.index({ requester: 1, status: 1, updatedAt: -1 });
supportTicketSchema.index({ requester: 1, category: 1, updatedAt: -1 });
supportTicketSchema.index({ requester: 1, priority: 1, updatedAt: -1 });
supportTicketSchema.index({ requester: 1, ticketNumber: 1 });

supportTicketSchema.pre("save", function(next) {
    if (this.isModified("status")) {
        if (this.status === "closed") {
            this.closedAt = new Date();
        } else {
            this.closedAt = null;
        }
    }

    if (Array.isArray(this.comments) && this.comments.length > 0) {
        const lastComment = this.comments[this.comments.length - 1];
        this.lastRepliedAt = lastComment.createdAt || new Date();
    }

    next();
});

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
