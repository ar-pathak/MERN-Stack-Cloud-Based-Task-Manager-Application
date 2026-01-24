const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = new Schema({
    name: {
        type: String,
        trim: true,
        minLength: 2,
        maxLength: 30,
    },

    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[a-z0-9_]{3,20}$/, "Invalid username"],
        index: true
    },

    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },

    passwordHash: {
        type: String,
        required: true,
        select: false,
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    resetPasswordToken: {
        type: String,
        select: false,
    },

    resetPasswordExpires: {
        type: Date,
        select: false,
    },
}, { timestamps: true })

const User = mongoose.model('User', userSchema)
module.exports = User
