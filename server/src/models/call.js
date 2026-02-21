const mongoose = require("mongoose");

const callParticipantSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    // Track individual connection quality
    connectionQuality: {
        type: String,
        enum: ["excellent", "good", "poor", "disconnected"],
        default: "good"
    },
    // Track media state
    mediaState: {
        video: { type: Boolean, default: true },
        audio: { type: Boolean, default: true },
        screenShare: { type: Boolean, default: false }
    },
    // Track device info
    deviceInfo: {
        browser: String,
        os: String,
        deviceType: { type: String, enum: ["mobile", "tablet", "desktop"] }
    }
});

const callSchema = new mongoose.Schema({
    // Call identification
    callerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    chatId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Chat", 
        required: true,
        index: true
    },
    
    // Call type and mode
    type: { 
        type: String, 
        enum: ["audio", "video"], 
        default: "video" 
    },
    mode: {
        type: String,
        enum: ["one-to-one", "group"],
        required: true
    },
    
    // Participants tracking
    participants: [callParticipantSchema],
    
    // Call status
    status: { 
        type: String, 
        enum: ["initiating", "ringing", "ongoing", "ended", "missed", "rejected", "failed"], 
        default: "initiating",
        index: true
    },
    
    // Per-user soft-hide for call history.
    hiddenFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    
    // Call timeline
    initiatedAt: { type: Date, default: Date.now },
    startedAt: { type: Date }, // When first person joined
    endedAt: { type: Date },
    
    // Call duration (in seconds)
    duration: { type: Number, default: 0 },
    
    // Recording info (for future feature)
    recording: {
        enabled: { type: Boolean, default: false },
        url: String,
        startedAt: Date,
        endedAt: Date
    },
    
    // Call quality metrics
    quality: {
        averageRating: Number,
        networkIssues: { type: Number, default: 0 },
        reconnections: { type: Number, default: 0 }
    },
    
    // For group calls - track layout preference
    layout: {
        type: String,
        enum: ["grid", "speaker", "sidebar"],
        default: "grid"
    },
    
    // Screen sharing state
    screenSharing: {
        active: { type: Boolean, default: false },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },
    
    // End reason
    endReason: {
        type: String,
        enum: ["completed", "missed", "rejected", "timeout", "error", "network_failure"]
    },
    
    // Metadata
    metadata: {
        maxParticipants: Number,
        peakConcurrentUsers: Number,
        totalJoins: Number,
        totalDrops: Number
    }
}, { 
    timestamps: true 
});

// Indexes for performance
callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ chatId: 1, createdAt: -1 });
callSchema.index({ status: 1, createdAt: -1 });
callSchema.index({ "participants.userId": 1 });
callSchema.index({ hiddenFor: 1, createdAt: -1 });

// Virtual for active participants
callSchema.virtual("activeParticipants").get(function() {
    return this.participants.filter(p => !p.leftAt);
});

// Calculate call duration before saving.
// Mongoose 9 executes this as promise middleware, so avoid callback `next`.
callSchema.pre("save", function() {
    if (this.startedAt && this.endedAt) {
        this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    }
});

// Static method: Get call history for a user
callSchema.statics.getUserCallHistory = async function(userId, page = 1, limit = 20) {
    return this.find({
        $or: [
            { callerId: userId },
            { "participants.userId": userId }
        ]
    })
    .populate("callerId", "name avatar")
    .populate("participants.userId", "name avatar")
    .populate("chatId", "name type")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

// Instance method: Add participant
callSchema.methods.addParticipant = async function(userId, deviceInfo = {}) {
    const existingParticipant = this.participants.find(
        p => String(p.userId) === String(userId) && !p.leftAt
    );
    
    if (existingParticipant) {
        return this;
    }
    
    this.participants.push({
        userId,
        deviceInfo,
        joinedAt: new Date()
    });
    
    // Update metadata
    if (!this.metadata) this.metadata = {};
    this.metadata.totalJoins = (this.metadata.totalJoins || 0) + 1;
    this.metadata.peakConcurrentUsers = Math.max(
        this.metadata.peakConcurrentUsers || 0,
        this.participants.filter(p => !p.leftAt).length
    );
    
    // Mark call as started if this is first join
    if (!this.startedAt) {
        this.startedAt = new Date();
        this.status = "ongoing";
    }
    
    return this.save();
};

// Instance method: Remove participant
callSchema.methods.removeParticipant = async function(userId) {
    const participant = this.participants.find(
        p => String(p.userId) === String(userId) && !p.leftAt
    );
    
    if (participant) {
        participant.leftAt = new Date();
        
        if (!this.metadata) this.metadata = {};
        this.metadata.totalDrops = (this.metadata.totalDrops || 0) + 1;
    }
    
    return this.save();
};

// Instance method: Update participant media state
callSchema.methods.updateParticipantMedia = async function(userId, mediaState) {
    const participant = this.participants.find(
        p => String(p.userId) === String(userId) && !p.leftAt
    );
    
    if (participant) {
        participant.mediaState = { ...participant.mediaState, ...mediaState };
    }
    
    return this.save();
};

callSchema.set("toJSON", { virtuals: true });
callSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Call", callSchema);
