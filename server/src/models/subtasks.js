const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    isHighPriority: {
        type: Boolean,
        default: false,
    },
    completedAt: Date,
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    // Order for sorting (drag & drop support)
    order: {
        type: Number,
        default: 0
    },

    // Assignment
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    // Due date
    dueDate: Date,

    // Creator tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }

}, {
    timestamps: true
});

// Compound index for efficient querying
subtaskSchema.index({ task: 1, order: 1 });
subtaskSchema.index({ task: 1, completed: 1 });

// Auto-set completedAt when completed
subtaskSchema.pre('save', async function () {
    if (this.completed && !this.completedAt) {
        this.completedAt = new Date();
    }
    if (!this.completed) {
        this.completedAt = undefined;
    }
});

// Method to check if subtask is overdue
subtaskSchema.methods.isOverdue = function () {
    if (!this.dueDate || this.completed) {
        return false;
    }
    return new Date() > new Date(this.dueDate);
};

// Static method to get completion rate for a task
subtaskSchema.statics.getCompletionRate = async function (taskId) {
    const result = await this.aggregate([
        { $match: { task: new mongoose.Types.ObjectId(taskId) } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                completed: { $sum: { $cond: ['$completed', 1, 0] } }
            }
        }
    ]);

    if (result.length === 0) return 0;
    return Math.round((result[0].completed / result[0].total) * 100);
};

module.exports = mongoose.model("Subtask", subtaskSchema);
