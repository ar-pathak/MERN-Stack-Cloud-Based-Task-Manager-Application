const mongoose = require('mongoose')

const subtaskSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    title: String,
    completed: { type: Boolean, default: false }
});

module.exports = mongoose.model("Subtask", subtaskSchema);
