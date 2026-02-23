const mongoose = require("mongoose");

const ADMIN_ROLES = ["owner", "support_manager", "support_agent", "viewer"];

const adminAccountSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Invalid email address"]
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
            minlength: 60
        },
        role: {
            type: String,
            enum: ADMIN_ROLES,
            default: "support_agent",
            index: true
        },
        accountStatus: {
            type: String,
            enum: ["active", "suspended"],
            default: "active",
            index: true
        },
        emailVerified: {
            type: Boolean,
            default: false,
            index: true
        },
        emailVerificationToken: {
            type: String,
            select: false
        },
        emailVerificationExpires: {
            type: Date,
            select: false
        },
        resetPasswordToken: {
            type: String,
            select: false,
            sparse: true,
            index: true
        },
        resetPasswordExpires: {
            type: Date,
            select: false
        },
        loginOtpHash: {
            type: String,
            select: false
        },
        loginOtpExpires: {
            type: Date,
            select: false
        },
        loginOtpAttempts: {
            type: Number,
            default: 0,
            select: false
        },
        lastLoginAt: {
            type: Date,
            default: null
        },
        lastSeenAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

adminAccountSchema.index({ role: 1, accountStatus: 1 });

adminAccountSchema.methods.toSafeJSON = function toSafeJSON() {
    return {
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        accountStatus: this.accountStatus,
        emailVerified: this.emailVerified,
        lastLoginAt: this.lastLoginAt,
        lastSeenAt: this.lastSeenAt,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

module.exports = mongoose.model("AdminAccount", adminAccountSchema);
module.exports.ADMIN_ROLES = ADMIN_ROLES;
