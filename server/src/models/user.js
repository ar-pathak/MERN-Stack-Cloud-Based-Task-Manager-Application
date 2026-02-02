const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    // --- Auth Core ---
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [20, 'Username cannot exceed 20 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        select: false,
        match: [/^\S+@\S+\.\S+$/, "Invalid email address"]
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
        select: false,
        minlength: 60 // bcrypt hash length
    },

    // --- Profile Info ---
    name: {
        type: String,
        trim: true,
        maxLength: [50, 'Name cannot exceed 50 characters'],
        default: ''
    },
    bio: {
        type: String,
        trim: true,
        maxLength: [160, 'Bio cannot exceed 160 characters'],
        default: ""
    },
    avatar: {
        type: String,
        default: "",
        validate: {
            validator: function (v) {
                if (!v) return true;
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Avatar must be a valid URL'
        }
    },
    coverImage: {
        type: String,
        default: "",
        validate: {
            validator: function (v) {
                if (!v) return true;
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Cover image must be a valid URL'
        }
    },

    // --- Account Settings ---
    isVerified: {
        type: Boolean,
        default: false,
        index: true
    },
    isPrivate: {
        type: Boolean,
        default: false,
        index: true
    },
    accountStatus: {
        type: String,
        enum: {
            values: ['active', 'suspended', 'banned', 'deactivated'],
            message: '{VALUE} is not a valid account status'
        },
        default: 'active',
        index: true
    },

    // --- Social Metrics (Denormalized for Performance) ---
    followersCount: {
        type: Number,
        default: 0,
        min: [0, 'Followers count cannot be negative'],
        index: true
    },
    followingCount: {
        type: Number,
        default: 0,
        min: [0, 'Following count cannot be negative']
    },
    postsCount: {
        type: Number,
        default: 0,
        min: [0, 'Posts count cannot be negative']
    },

    // --- Activity Tracking ---
    isOnline: {
        type: Boolean,
        default: false,
        index: true
    },
    lastSeen: {
        type: Date,
        default: Date.now,
        index: true
    },
    lastActive: {
        type: Date,
        default: Date.now
    },

    // --- Notifications & Tokens ---
    fcmToken: {
        type: String,
        select: false,
        sparse: true,
        index: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        select: false
    },
    emailVerificationExpires: {
        type: Date,
        select: false
    },

    // --- Security Tokens ---
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
    refreshToken: {
        type: String,
        select: false
    },

    // --- Account Security ---
    loginAttempts: {
        type: Number,
        default: 0,
        select: false
    },
    lockUntil: {
        type: Date,
        select: false
    },

    // --- Privacy & Preferences ---
    preferences: {
        language: {
            type: String,
            default: 'en'
        },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            follows: { type: Boolean, default: true },
            comments: { type: Boolean, default: true },
            likes: { type: Boolean, default: true }
        },
        privacy: {
            showEmail: { type: Boolean, default: false },
            showOnlineStatus: { type: Boolean, default: true },
            allowTagging: { type: Boolean, default: true },
            allowMentions: { type: Boolean, default: true }
        }
    },

    // --- Metadata ---
    metadata: {
        signupSource: String, // web, ios, android
        ipAddress: { type: String, select: false },
        userAgent: { type: String, select: false },
        location: {
            country: String,
            city: String
        }
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// --- Indexes for Performance ---
userSchema.index({ username: 'text', name: 'text' }); // Text search
userSchema.index({ createdAt: -1 }); // Recent users
userSchema.index({ followersCount: -1 }); // Popular users
userSchema.index({ accountStatus: 1, isVerified: 1 }); // Active verified users

// --- Virtuals ---
userSchema.virtual('profileUrl').get(function () {
    return `/u/${this.username}`;
});

userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// --- Instance Methods ---

// Sanitized profile for public viewing
userSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        username: this.username,
        name: this.name,
        bio: this.bio,
        avatar: this.avatar,
        coverImage: this.coverImage,
        isVerified: this.isVerified,
        followersCount: this.followersCount,
        followingCount: this.followingCount,
        postsCount: this.postsCount,
        isPrivate: this.isPrivate,
        createdAt: this.createdAt
    };
};

// Sanitized profile for authenticated user (own profile)
userSchema.methods.toProfileJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    delete obj.refreshToken;
    delete obj.emailVerificationToken;
    delete obj.fcmToken;
    delete obj.loginAttempts;
    delete obj.lockUntil;
    delete obj.metadata;
    delete obj.__v;
    return obj;
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function () {
    // If lock has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 hours

    // Lock account after max attempts
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + lockTime };
    }

    return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
};

// Update last activity
userSchema.methods.updateActivity = function () {
    this.lastActive = Date.now();
    this.lastSeen = Date.now();
    return this.save();
};

// --- Static Methods ---

// Find by username or email
userSchema.statics.findByCredential = function (credential) {
    return this.findOne({
        $or: [
            { email: credential.toLowerCase() },
            { username: credential.toLowerCase() }
        ]
    }).select('+passwordHash +loginAttempts +lockUntil');
};

// Check username availability
userSchema.statics.isUsernameAvailable = async function (username) {
    const count = await this.countDocuments({
        username: username.toLowerCase()
    });
    return count === 0;
};

// Check email availability
userSchema.statics.isEmailAvailable = async function (email) {
    const count = await this.countDocuments({
        email: email.toLowerCase()
    });
    return count === 0;
};

// --- Middleware ---

// Pre-save: Validate username hasn't changed after creation
userSchema.pre('save', function (next) {
    if (!this.isNew && this.isModified('username')) {
        next(new Error('Username cannot be changed after account creation'));
    }
    next();
});

// Pre-save: Set default name to username if not provided
userSchema.pre('save', function (next) {
    if (this.isNew && !this.name) {
        this.name = this.username;
    }
    next();
});

// Post-save: Handle errors
userSchema.post('save', function (error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        next(new Error(`${field} already exists`));
    } else {
        next(error);
    }
});

module.exports = mongoose.model('User', userSchema);