const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
        required: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    members: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            role: {
                type: String,
                enum: ["lead", "member"],
                default: "member"
            }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("Team", teamSchema);
