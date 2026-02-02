const mongoose = require('mongoose');
const { Schema } = mongoose;

const followSchema = new Schema({
    follower: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Follower ID is required'],
        index: true
    },
    following: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Following ID is required'],
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'blocked', 'muted'],
        default: 'active',
        index: true
    },
    // For follow request feature (private accounts)
    isApproved: {
        type: Boolean,
        default: true // Auto-approved for public accounts
    },
    notificationsEnabled: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound Index: Ensure Unique Relationship + Fast Lookups
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, createdAt: -1 }); // Optimized for "Get Followers" sorted by recent
followSchema.index({ follower: 1, createdAt: -1 }); // Optimized for "Get Following" sorted by recent
followSchema.index({ follower: 1, status: 1 }); // For filtering active follows
followSchema.index({ following: 1, status: 1, isApproved: 1 }); // For approved followers query

// Pre-save hook for validation
followSchema.pre('save', function(next) {
    if (this.follower.equals(this.following)) {
        next(new Error('Users cannot follow themselves'));
    }
    next();
});

// Static method to check if relationship exists
followSchema.statics.checkRelationship = async function(followerId, followingId) {
    const relationship = await this.findOne({
        follower: followerId,
        following: followingId,
        status: 'active'
    }).lean();
    
    return {
        isFollowing: !!relationship,
        isApproved: relationship?.isApproved || false
    };
};

// Static method for bulk relationship check
followSchema.statics.checkMultipleRelationships = async function(currentUserId, targetUserIds) {
    const relationships = await this.find({
        follower: currentUserId,
        following: { $in: targetUserIds },
        status: 'active'
    }).lean();
    
    const relationshipMap = {};
    targetUserIds.forEach(id => {
        relationshipMap[id.toString()] = false;
    });
    
    relationships.forEach(rel => {
        relationshipMap[rel.following.toString()] = rel.isApproved;
    });
    
    return relationshipMap;
};

module.exports = mongoose.model('Follow', followSchema);