const mongoose = require('mongoose')


const commentSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: String
}, { timestamps: true });

module.exports = mongoose.model("Comment", commentSchema);
