const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = new Schema({
    name: {
        type: String,
        trim: true,
        minLength: 2,
        maxLength: 30,
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
        select: false, // prevents accidental exposure
    },

    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true, })

const User = mongoose.model('User', userSchema)

module.exports = User;