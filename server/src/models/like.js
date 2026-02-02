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
        required: [true, 'Post is required'],
        index: true
    },
    // Optional: Support for liking comments too
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        index: true
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

// --- Indexes ---
// Compound unique index: User can only like a post once
likeSchema.index({ user: 1, post: 1 }, { unique: true, sparse: true });
likeSchema.index({ user: 1, comment: 1 }, { unique: true, sparse: true });

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