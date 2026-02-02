const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: [true, 'Post is required'],
        index: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Author is required'],
        index: true
    },
    content: {
        type: String,
        required: [true, 'Comment content is required'],
        trim: true,
        maxLength: [2000, 'Comment cannot exceed 2000 characters']
    },

    // --- Nested Comments (Replies) ---
    parentComment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        index: true
    },

    // --- Media Support ---
    media: {
        type: String, // Single image/gif URL
        validate: {
            validator: function (v) {
                if (!v) return true;
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Media must be a valid URL'
        }
    },

    // --- Engagement ---
    likesCount: {
        type: Number,
        default: 0,
        min: 0
    },
    repliesCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // --- Mentions ---
    mentions: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],

    // --- Status ---
    status: {
        type: String,
        enum: ['active', 'deleted', 'hidden', 'flagged'],
        default: 'active',
        index: true
    },

    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: Date,

    // --- Moderation ---
    flags: {
        count: { type: Number, default: 0 },
        reasons: [String]
    }

}, {
    timestamps: true
});

// --- Indexes ---
commentSchema.index({ post: 1, createdAt: -1 }); // Get comments for a post
commentSchema.index({ author: 1, createdAt: -1 }); // User's comments
commentSchema.index({ parentComment: 1, createdAt: 1 }); // Replies to a comment
commentSchema.index({ post: 1, parentComment: 1, createdAt: -1 }); // Top-level comments

// --- Instance Methods ---

commentSchema.methods.extractMentions = function () {
    const mentionRegex = /@(\w+)/g;
    const matches = this.content.match(mentionRegex) || [];
    return matches.map(mention => mention.substring(1).toLowerCase());
};

commentSchema.methods.isReply = function () {
    return !!this.parentComment;
};

// --- Static Methods ---

commentSchema.statics.getTopLevelComments = function (postId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    return this.find({
        post: postId,
        parentComment: null,
        status: 'active'
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username name avatar isVerified')
        .lean();
};

commentSchema.statics.getReplies = function (commentId, limit = 10) {
    return this.find({
        parentComment: commentId,
        status: 'active'
    })
        .sort({ createdAt: 1 }) // Oldest first for replies
        .limit(limit)
        .populate('author', 'username name avatar isVerified')
        .lean();
};

// --- Pre-save Hooks ---

commentSchema.pre('save', function (next) {
    if (!this.isNew && this.isModified('content')) {
        this.isEdited = true;
        this.editedAt = new Date();
    }
    next();
});

// --- Post-save Hooks ---

// Update post's comment count
commentSchema.post('save', async function (doc) {
    if (doc.wasNew) {
        await mongoose.model('Post').findByIdAndUpdate(
            doc.post,
            { $inc: { commentsCount: 1 } }
        );

        // If it's a reply, update parent comment's reply count
        if (doc.parentComment) {
            await this.constructor.findByIdAndUpdate(
                doc.parentComment,
                { $inc: { repliesCount: 1 } }
            );
        }
    }
});

// --- Post-remove Hook ---

commentSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        // Decrement post's comment count
        await mongoose.model('Post').findByIdAndUpdate(
            doc.post,
            { $inc: { commentsCount: -1 } }
        );

        // If it's a reply, decrement parent's reply count
        if (doc.parentComment) {
            await mongoose.model('Comment').findByIdAndUpdate(
                doc.parentComment,
                { $inc: { repliesCount: -1 } }
            );
        }

        // Delete all replies to this comment
        await mongoose.model('Comment').deleteMany({ parentComment: doc._id });

        // Delete all likes on this comment
        await mongoose.model('Like').deleteMany({ comment: doc._id });
    }
});

module.exports = mongoose.model('Comment', commentSchema);