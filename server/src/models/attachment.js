const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    url: String,
    fileName: String,
    fileType: String
}, { timestamps: true });

module.exports = mongoose.model("Attachment", attachmentSchema);
