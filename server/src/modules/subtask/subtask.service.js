const Subtask = require('../../models/subtasks');
const Task = require('../../models/tasks');
const mongoose = require('mongoose');

class SubtaskService {
    /**
     * Create a new subtask
     */
    async createSubtask({ taskId, title, description, assignedTo, dueDate, createdBy }) {
        // Verify task exists
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        // Get the current count of subtasks for ordering
        const subtaskCount = await Subtask.countDocuments({ task: taskId });

        const subtask = new Subtask({
            task: taskId,
            title,
            description,
            assignedTo,
            dueDate,
            order: subtaskCount,
            createdBy
        });

        await subtask.save();

        // Populate fields before returning
        await subtask.populate([
            { path: 'assignedTo', select: 'name email avatar' },
            { path: 'completedBy', select: 'name email avatar' }
        ]);

        return subtask;
    }

    /**
     * Get all subtasks for a task
     */
    async getSubtasksByTask(taskId) {
        const subtasks = await Subtask.find({ task: taskId })
            .sort({ order: 1, createdAt: 1 })
            .populate('assignedTo', 'name email avatar')
            .populate('completedBy', 'name email avatar')
            .lean();

        return subtasks;
    }

    /**
     * Get a single subtask by ID
     */
    async getSubtaskById(subtaskId) {
        const subtask = await Subtask.findById(subtaskId)
            .populate('assignedTo', 'name email avatar')
            .populate('completedBy', 'name email avatar')
            .populate({
                path: 'task',
                select: 'title workspace project',
                populate: [
                    { path: 'workspace', select: 'name' },
                    { path: 'project', select: 'name' }
                ]
            })
            .lean();

        if (!subtask) {
            throw new Error('Subtask not found');
        }

        return subtask;
    }

    /**
     * Update a subtask
     */
    async updateSubtask(subtaskId, updates, userId) {
        const subtask = await Subtask.findById(subtaskId);
        if (!subtask) {
            throw new Error('Subtask not found');
        }

        // Handle completion status change
        if (updates.completed !== undefined && updates.completed !== subtask.completed) {
            if (updates.completed) {
                subtask.completed = true;
                subtask.completedAt = new Date();
                subtask.completedBy = userId;
            } else {
                subtask.completed = false;
                subtask.completedAt = undefined;
                subtask.completedBy = undefined;
            }
        }

        // Update other fields
        const allowedUpdates = ['title', 'description', 'assignedTo', 'dueDate'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                subtask[field] = updates[field];
            }
        });

        await subtask.save();

        await subtask.populate([
            { path: 'assignedTo', select: 'name email avatar' },
            { path: 'completedBy', select: 'name email avatar' }
        ]);

        return subtask;
    }

    /**
     * Toggle subtask completion status
     */
    async toggleSubtask(subtaskId, userId) {
        const subtask = await Subtask.findById(subtaskId);
        if (!subtask) {
            throw new Error('Subtask not found');
        }

        subtask.completed = !subtask.completed;

        if (subtask.completed) {
            subtask.completedAt = new Date();
            subtask.completedBy = userId;
        } else {
            subtask.completedAt = undefined;
            subtask.completedBy = undefined;
        }

        await subtask.save();

        await subtask.populate([
            { path: 'assignedTo', select: 'name email avatar' },
            { path: 'completedBy', select: 'name email avatar' }
        ]);

        return subtask;
    }

    /**
     * Delete a subtask
     */
    async deleteSubtask(subtaskId) {
        const subtask = await Subtask.findById(subtaskId);
        if (!subtask) {
            throw new Error('Subtask not found');
        }

        const taskId = subtask.task;
        await subtask.deleteOne();

        // Reorder remaining subtasks
        await this.reorderSubtasks(taskId);

        return { message: 'Subtask deleted successfully' };
    }

    /**
     * Reorder subtasks after deletion
     */
    async reorderSubtasks(taskId) {
        const subtasks = await Subtask.find({ task: taskId }).sort({ order: 1 });

        const bulkOps = subtasks.map((subtask, index) => ({
            updateOne: {
                filter: { _id: subtask._id },
                update: { order: index }
            }
        }));

        if (bulkOps.length > 0) {
            await Subtask.bulkWrite(bulkOps);
        }
    }

    /**
     * Bulk update subtask order
     */
    async reorderSubtasksManual(taskId, subtaskIds) {
        // Verify all subtasks belong to the task
        const subtasks = await Subtask.find({
            _id: { $in: subtaskIds },
            task: taskId
        });

        if (subtasks.length !== subtaskIds.length) {
            throw new Error('Some subtasks do not belong to this task');
        }

        // Update order
        const bulkOps = subtaskIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { order: index }
            }
        }));

        await Subtask.bulkWrite(bulkOps);

        return this.getSubtasksByTask(taskId);
    }

    /**
     * Get subtask statistics for a task
     */
    async getSubtaskStats(taskId) {
        const stats = await Subtask.aggregate([
            { $match: { task: new mongoose.Types.ObjectId(taskId) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: ['$completed', 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: ['$completed', 0, 1] }
                    }
                }
            }
        ]);

        if (stats.length === 0) {
            return { total: 0, completed: 0, pending: 0, completionRate: 0 };
        }

        const result = stats[0];
        return {
            total: result.total,
            completed: result.completed,
            pending: result.pending,
            completionRate: result.total > 0
                ? Math.round((result.completed / result.total) * 100)
                : 0
        };
    }
}

module.exports = new SubtaskService();
