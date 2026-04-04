const mongoose = require('mongoose');
const { Schema } = mongoose;
const { getRichTextLength, stripRichTextToPlainText } = require('../modules/utils/richText');

const postSchema = new Schema({
    // --- Core Fields ---
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Author is required'],
        index: true
    },

    // --- Content ---
    content: {
        type: String,
        required: [true, 'Post content is required'],
        trim: true,
        maxLength: [20000, 'Post content cannot exceed 20,000 characters'],
        validate: [
            {
                validator: function (value) {
                    return getRichTextLength(value) > 0;
                },
                message: 'Post content is required'
            },
            {
                validator: function (value) {
                    return getRichTextLength(value) <= 5000;
                },
                message: 'Post content cannot exceed 5000 characters'
            }
        ]
    },

    // --- Media Attachments ---
    media: [{
        type: {
            type: String,
            enum: ['image', 'video', 'gif', 'document'],
            required: true
        },
        url: {
            type: String,
            required: true,
            validate: {
                validator: function (v) {
                    return /^https?:\/\/.+/.test(v);
                },
                message: 'Media URL must be a valid URL'
            }
        },
        thumbnail: String, // For videos
        width: Number,
        height: Number,
        size: Number, // File size in bytes
        duration: Number, // For videos (in seconds)
        altText: String // Accessibility
    }],

    // --- Post Type & Features ---
    postType: {
        type: String,
        enum: ['text', 'image', 'video', 'poll', 'repost', 'quote'],
        default: 'text',
        index: true
    },

    // --- Poll Data (if postType === 'poll') ---
    poll: {
        question: String,
        options: [{
            text: String,
            votes: { type: Number, default: 0 }
        }],
        votedBy: [{
            user: { type: Schema.Types.ObjectId, ref: 'User' },
            optionIndex: Number,
            votedAt: { type: Date, default: Date.now }
        }],
        endsAt: Date,
        allowMultiple: { type: Boolean, default: false }
    },

    // --- Repost/Quote Data ---
    originalPost: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        index: true
    },

    // --- Engagement Metrics (Denormalized for Performance) ---
    likesCount: {
        type: Number,
        default: 0,
        min: 0,
        index: true
    },
    commentsCount: {
        type: Number,
        default: 0,
        min: 0
    },
    repostsCount: {
        type: Number,
        default: 0,
        min: 0
    },
    viewsCount: {
        type: Number,
        default: 0,
        min: 0
    },
    sharesCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // --- Privacy & Visibility ---
    visibility: {
        type: String,
        enum: ['public', 'followers', 'private', 'unlisted'],
        default: 'public',
        index: true
    },

    // --- Mentions & Tags ---
    mentions: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],
    hashtags: [{
        type: String,
        lowercase: true,
        trim: true,
        index: true
    }],

    // --- Location ---
    location: {
        name: {
            type: String,
            trim: true,
            maxLength: [120, 'Location name cannot exceed 120 characters']
        },
        coordinates: {
            type: {
                type: String,
                enum: ['Point']
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                validate: {
                    validator: function (value) {
                        if (value == null) return true;
                        if (!Array.isArray(value) || value.length !== 2) return false;

                        const [lng, lat] = value;
                        return Number.isFinite(lng) &&
                            Number.isFinite(lat) &&
                            lng >= -180 &&
                            lng <= 180 &&
                            lat >= -90 &&
                            lat <= 90;
                    },
                    message: 'Location coordinates must be [longitude, latitude]'
                }
            }
        }
    },

    // --- Status & Moderation ---
    status: {
        type: String,
        enum: ['active', 'scheduled', 'deleted', 'hidden', 'flagged', 'archived'],
        default: 'active',
        index: true
    },
    scheduledFor: {
        type: Date,
        index: true
    },
    publishedAt: {
        type: Date,
        index: true
    },

    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: Date,

    isPinned: {
        type: Boolean,
        default: false,
        index: true
    },

    // --- Content Moderation ---
    flags: {
        count: { type: Number, default: 0 },
        reasons: [String],
        flaggedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    },

    isVerifiedContent: {
        type: Boolean,
        default: false
    },

    // --- Engagement Settings ---
    settings: {
        commentsDisabled: { type: Boolean, default: false },
        hideLikesCount: { type: Boolean, default: false },
        allowDownloads: { type: Boolean, default: true }
    },

    // --- SEO & Discovery ---
    slug: {
        type: String,
        sparse: true,
        index: true
    },

    // --- Metadata ---
    metadata: {
        deviceType: String, // mobile, web, desktop
        appVersion: String,
        ipAddress: { type: String, select: false }
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// --- Indexes for Performance ---
postSchema.index({ author: 1, createdAt: -1 }); // User's posts timeline
postSchema.index({ createdAt: -1 }); // Global feed
postSchema.index({ status: 1, visibility: 1, createdAt: -1 }); // Public posts feed
postSchema.index({ status: 1, scheduledFor: 1 }); // Scheduled post publishing
postSchema.index({ hashtags: 1, createdAt: -1 }); // Hashtag search
postSchema.index({ mentions: 1, createdAt: -1 }); // User mentions
postSchema.index({ likesCount: -1, createdAt: -1 }); // Trending posts
postSchema.index({ 'location.coordinates': '2dsphere' }); // Geolocation queries
postSchema.index({ content: 'text' }); // Full-text search

// Compound index for feed queries
postSchema.index({
    status: 1,
    visibility: 1,
    author: 1,
    createdAt: -1
});

// --- Virtuals ---
postSchema.virtual('engagementRate').get(function () {
    if (this.viewsCount === 0) return 0;
    const totalEngagement = this.likesCount + this.commentsCount + this.repostsCount + this.sharesCount;
    return ((totalEngagement / this.viewsCount) * 100).toFixed(2);
});

postSchema.virtual('isRepost').get(function () {
    return this.postType === 'repost' && !!this.originalPost;
});

postSchema.virtual('isQuote').get(function () {
    return this.postType === 'quote' && !!this.originalPost;
});

postSchema.virtual('hasMedia').get(function () {
    return this.media && this.media.length > 0;
});

postSchema.virtual('isPollActive').get(function () {
    if (this.postType !== 'poll' || !this.poll || !this.poll.endsAt) return false;
    return new Date() < this.poll.endsAt;
});

// --- Instance Methods ---

postSchema.methods.toPublicJSON = function () {
    const obj = this.toObject();

    // Remove sensitive fields
    delete obj.metadata;
    delete obj.flags;
    delete obj.__v;

    // Hide likes count if setting is enabled
    if (this.settings.hideLikesCount) {
        delete obj.likesCount;
    }

    return obj;
};

postSchema.methods.canBeViewedBy = function (userId) {
    // Scheduled posts are only visible to their author.
    if (this.status === 'scheduled') {
        return Boolean(userId) && this.author.toString() === userId.toString();
    }

    // Post is deleted or hidden.
    if (this.status !== 'active') return false;

    // Public posts can be viewed by anyone
    if (this.visibility === 'public') return true;

    // Author can always view their own posts
    if (userId && this.author.toString() === userId.toString()) return true;

    // Private posts only for author
    if (this.visibility === 'private') return false;

    // Followers-only posts require follow check (handled in service layer)
    if (this.visibility === 'followers') return 'CHECK_FOLLOW';

    // Unlisted posts can be viewed if you have the link
    if (this.visibility === 'unlisted') return true;

    return false;
};

postSchema.methods.incrementView = async function () {
    this.viewsCount += 1;
    return this.save();
};

postSchema.methods.extractHashtags = function () {
    const hashtagRegex = /#(\w+)/g;
    const matches = stripRichTextToPlainText(this.content).match(hashtagRegex) || [];
    return matches.map(tag => tag.substring(1).toLowerCase());
};

postSchema.methods.extractMentions = function () {
    const mentionRegex = /@(\w+)/g;
    const matches = stripRichTextToPlainText(this.content).match(mentionRegex) || [];
    return matches.map(mention => mention.substring(1).toLowerCase());
};

// --- Static Methods ---

postSchema.statics.getFeedQuery = function (userId, feedType = 'public') {
    const baseQuery = {
        status: 'active'
    };

    switch (feedType) {
        case 'public':
            baseQuery.visibility = 'public';
            break;
        case 'following':
            // Will be extended with author: { $in: followingIds } in service
            baseQuery.visibility = { $in: ['public', 'followers'] };
            break;
        case 'user':
            // Will be extended with author: userId in service
            break;
        default:
            baseQuery.visibility = 'public';
    }

    return baseQuery;
};

postSchema.statics.getTrendingPosts = async function (limit = 10, timeframe = 24) {
    const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);

    return this.find({
        status: 'active',
        visibility: 'public',
        createdAt: { $gte: since }
    })
        .sort({ likesCount: -1, viewsCount: -1 })
        .limit(limit)
        .populate('author', 'username name avatar isVerified')
        .lean();
};

// --- Pre-save Hooks ---

// Track whether this write created a new document so post-save hooks can safely branch.
postSchema.pre('save', function () {
    this.wasNew = this.isNew;
});

// Normalize optional location payload to avoid partial geo objects that break 2dsphere indexing.
postSchema.pre('validate', function () {
    if (!this.location) return;

    const geo = this.location.coordinates;
    const coords = geo?.coordinates;
    const hasValidPair = Array.isArray(coords) &&
        coords.length === 2 &&
        Number.isFinite(coords[0]) &&
        Number.isFinite(coords[1]);

    if (!hasValidPair) {
        if (this.location.name) {
            this.location.coordinates = undefined;
        } else {
            this.location = undefined;
        }
        return;
    }

    geo.type = 'Point';
});

// Auto-extract hashtags and mentions
postSchema.pre('save', function () {
    if (this.isModified('content')) {
        // Extract hashtags
        const extractedHashtags = this.extractHashtags();
        if (extractedHashtags.length > 0) {
            this.hashtags = [...new Set([...this.hashtags, ...extractedHashtags])];
        }

        // Note: Mentions are extracted and validated in service layer
        // to ensure mentioned users exist
    }
});

// Set edited flag
postSchema.pre('save', function () {
    if (!this.isNew && this.isModified('content')) {
        this.isEdited = true;
        this.editedAt = new Date();
    }
});

// Keep publish/schedule metadata consistent with status transitions.
postSchema.pre('save', function () {
    if (this.status === 'scheduled') {
        if (!(this.scheduledFor instanceof Date) || Number.isNaN(this.scheduledFor.getTime())) {
            this.invalidate('scheduledFor', 'Scheduled posts require a valid schedule time');
        }
        this.publishedAt = undefined;
        return;
    }

    this.scheduledFor = undefined;

    if (this.status === 'active' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
});

// --- Post-save Hooks ---

// Update user's post count
postSchema.post('save', async function (doc) {
    if (doc.wasNew) {
        const session = typeof doc.$session === "function" ? doc.$session() : null;
        const options = session ? { session } : {};
        await mongoose.model('User').findByIdAndUpdate(
            doc.author,
            { $inc: { postsCount: 1 } },
            options
        );
    }
});

// --- Post-remove Hook ---

postSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        const session = typeof this.getOptions === "function" ? this.getOptions().session : null;
        const options = session ? { session } : {};

        // Decrement author's post count
        await mongoose.model('User').findByIdAndUpdate(
            doc.author,
            { $inc: { postsCount: -1 } },
            options
        );

        // TODO: Delete associated data (likes, comments, etc.)
        // await Like.deleteMany({ post: doc._id });
        // await Comment.deleteMany({ post: doc._id });
    }
});

module.exports = mongoose.model('Post', postSchema);
