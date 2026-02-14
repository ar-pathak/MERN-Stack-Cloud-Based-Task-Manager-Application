const mongoose = require('mongoose');
const { Schema } = mongoose;

const likeSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true
    },
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        index: true,
        default: undefined
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        index: true,
        default: undefined
    },
    // Like reaction type (for future: heart, laugh, etc.)
    reactionType: {
        type: String,
        enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
        default: 'like'
    }
}, {
    timestamps: true
});

// A like must target exactly one entity: either a post or a comment.
likeSchema.pre('validate', function () {
    const hasPost = this.post != null;
    const hasComment = this.comment != null;

    // Ensure the non-target field is absent so unique indexes never see `{ field: null }`.
    if (hasPost) {
        this.comment = undefined;
    }

    if (hasComment) {
        this.post = undefined;
    }

    if (hasPost === hasComment) {
        const message = 'Like must target either a post or a comment';
        this.invalidate('post', message);
        this.invalidate('comment', message);
    }
});

// --- Indexes ---
// Compound unique index: User can only like a post once
likeSchema.index(
    { user: 1, post: 1 },
    {
        unique: true,
        partialFilterExpression: { post: { $type: "objectId" } }
    }
);
likeSchema.index(
    { user: 1, comment: 1 },
    {
        unique: true,
        partialFilterExpression: { comment: { $type: "objectId" } }
    }
);

// Sorted by recent for activity feeds
likeSchema.index({ post: 1, createdAt: -1 });
likeSchema.index({ user: 1, createdAt: -1 });

// --- Static Methods ---

likeSchema.statics.checkUserLiked = async function (userId, postId) {
    const like = await this.exists({ user: userId, post: postId });
    return !!like;
};

likeSchema.statics.checkMultipleLikes = async function (userId, postIds) {
    const likes = await this.find({
        user: userId,
        post: { $in: postIds }
    }).distinct('post');

    const likedMap = {};
    postIds.forEach(id => {
        likedMap[id.toString()] = false;
    });

    likes.forEach(postId => {
        likedMap[postId.toString()] = true;
    });

    return likedMap;
};

module.exports = mongoose.model('Like', likeSchema);
