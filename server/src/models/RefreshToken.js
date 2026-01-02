const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true, // Index for faster queries by user
    },
    token: {
        type: String,
        required: true,
        unique: true, // Ensure token uniqueness
        index: true, // Index for faster token lookups
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }, // TTL index for automatic cleanup
    },
}, { timestamps: true });

// Compound index for user and token lookups
refreshTokenSchema.index({ user: 1, token: 1 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);

