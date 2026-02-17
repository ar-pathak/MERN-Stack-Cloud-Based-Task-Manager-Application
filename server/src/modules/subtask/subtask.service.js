const Subtask = require('../../models/subtasks');
const Task = require('../../models/tasks');
const Project = require('../../models/project');
const Workspace = require('../../models/workspace');
const mongoose = require('mongoose');
// Import Chat and Message models
const Chat = require('../../models/chat');
const Message = require('../../models/message');
const { logActivity, getUserLabel, getUserLabels, formatUserList } = require('../utils/activityLogger');

const withSession = (query, session) => (session ? query.session(session) : query);

const loadSubtaskContext = async (subtaskOrTaskId, session = null) => {
    const taskId = typeof subtaskOrTaskId === "object" && subtaskOrTaskId.task
        ? subtaskOrTaskId.task
        : subtaskOrTaskId;

    const taskQuery = Task.findById(taskId).select('title workspace project chatId');
    const task = await withSession(taskQuery, session).lean();
    if (!task) return { task: null, project: null, workspace: null };

    let project = null;
    if (task.project) {
        const projectQuery = Project.findById(task.project).select('name chatId workspace');
        project = await withSession(projectQuery, session).lean();
    }

    const workspaceId = task.workspace || project?.workspace || null;
    let workspace = null;
    if (workspaceId) {
        const workspaceQuery = Workspace.findById(workspaceId).select('name chatId');
        workspace = await withSession(workspaceQuery, session).lean();
    }

    return { task, project, workspace };
};

const normalizeUniqueIds = (values = []) => {
    const unique = [];
    const seen = new Set();
    values.forEach((value) => {
        const id = String(value);
        if (seen.has(id)) return;
        seen.add(id);
        unique.push(value);
    });
    return unique;
};

const toAssigneeArray = (assignedTo) => {
    if (!assignedTo) return [];
    if (Array.isArray(assignedTo)) return normalizeUniqueIds(assignedTo);
    return [assignedTo];
};

const getAllowedAssigneeIdsForTask = (task) => {
    const allowed = new Set([String(task.createdBy)]);
    (task.assignees || []).forEach((assigneeId) => allowed.add(String(assigneeId)));
    return allowed;
};

const validateAssigneesForTask = (task, assigneeIds) => {
    if (!assigneeIds?.length) return;

    const allowedAssignees = getAllowedAssigneeIdsForTask(task);
    const hasInvalidAssignee = assigneeIds.some((id) => !allowedAssignees.has(String(id)));
    if (hasInvalidAssignee) {
        throw new Error('Subtask assignees must already be assigned to the parent task');
    }
};

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

        const assignedUsers = toAssigneeArray(assignedTo);
        validateAssigneesForTask(task, assignedUsers);

        // Get the current count of subtasks for ordering
        const subtaskCount = await Subtask.countDocuments({ task: taskId });

        // 1. Prepare Initial Chat Members (Creator + Assigned User if any)
        const chatMembers = [createdBy, ...assignedUsers];
        // Remove duplicates just in case
        const uniqueMembers = [...new Set(chatMembers.map(id => id.toString()))];

        // 2. Create Subtask Chat (UPDATED)
        const chat = await Chat.create({
            type: "group",
            name: title, // Chat name same as Subtask title
            members: uniqueMembers,
            admin: createdBy,
        });

        // 3. Create Subtask with chatId
        const subtask = new Subtask({
            task: taskId,
            title,
            description,
            assignedTo: assignedUsers,
            dueDate,
            order: subtaskCount,
            createdBy,
            chatId: chat._id // Store chat ID
        });

        await subtask.save();

        await Task.findByIdAndUpdate(taskId, {
            $set: { updatedAt: new Date() }
        });

        // Populate fields before returning
        await subtask.populate([
            { path: 'assignedTo', select: 'name email avatar' },
            { path: 'completedBy', select: 'name email avatar' }
        ]);

        const { task: parentTask, project, workspace } = await loadSubtaskContext(taskId);
        const actorLabel = await getUserLabel(createdBy);
        await logActivity({
            actorId: createdBy,
            action: "subtask.created",
            level: "subtask",
            workspaceId: parentTask?.workspace || workspace?._id || null,
            projectId: parentTask?.project || project?._id || null,
            taskId,
            subtaskId: subtask._id,
            chatId: subtask.chatId,
            mirrorChatIds: [parentTask?.chatId, project?.chatId, workspace?.chatId],
            message: `${actorLabel} created subtask "${subtask.title}" in task "${parentTask?.title || "task"}".`,
            meta: {
                subtaskTitle: subtask.title
            }
        });

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

        const oldTitle = subtask.title;
        const oldCompleted = subtask.completed;

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
        const allowedUpdates = ['title', 'description', 'assignedTo', 'dueDate', 'isHighPriority'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'assignedTo') {
                    const assignedUsers = toAssigneeArray(updates.assignedTo);
                    subtask[field] = assignedUsers;
                } else {
                    subtask[field] = updates[field];
                }
            }
        });

        if (updates.assignedTo !== undefined) {
            const task = await Task.findById(subtask.task).select('createdBy assignees');
            if (task) {
                validateAssigneesForTask(task, subtask.assignedTo || []);
            }
        }

        await subtask.save();

        // Sync Subtask Title with Chat Name (UPDATED)
        if (updates.title && subtask.chatId) {
            await Chat.findByIdAndUpdate(subtask.chatId, {
                name: updates.title
            });
        }

        // If assignedTo was updated directly via updateSubtask (replacing the list), 
        // we might need to sync chat members, but usually addAssignees/removeAssignees is preferred.
        // However, if assignedTo is passed here, let's sync strictly.
        if (updates.assignedTo !== undefined && subtask.chatId) {
            const newAssignees = toAssigneeArray(updates.assignedTo);
            // We generally add new people, not remove old ones indiscriminately in a simple update, 
            // but to be safe let's just addToSet.
            await Chat.findByIdAndUpdate(subtask.chatId, {
                $addToSet: { members: { $each: newAssignees } }
            });
        }

        await Task.findByIdAndUpdate(subtask.task, {
            $set: { updatedAt: new Date() }
        });
        await subtask.populate([
            { path: 'assignedTo', select: 'name email avatar' },
            { path: 'completedBy', select: 'name email avatar' }
        ]);

        const { task, project, workspace } = await loadSubtaskContext(subtask.task);
        const actorLabel = await getUserLabel(userId);
        const renamed = updates.title && updates.title !== oldTitle;
        const completionChanged = updates.completed !== undefined && updates.completed !== oldCompleted;

        let message = `${actorLabel} updated subtask "${subtask.title}".`;
        let action = "subtask.updated";

        if (renamed) {
            action = "subtask.renamed";
            message = `${actorLabel} renamed subtask from "${oldTitle}" to "${subtask.title}".`;
        } else if (completionChanged) {
            action = updates.completed ? "subtask.completed" : "subtask.reopened";
            message = updates.completed
                ? `${actorLabel} marked subtask "${subtask.title}" as completed.`
                : `${actorLabel} reopened subtask "${subtask.title}".`;
        }

        await logActivity({
            actorId: userId,
            action,
            level: "subtask",
            workspaceId: task?.workspace || workspace?._id || null,
            projectId: task?.project || project?._id || null,
            taskId: subtask.task,
            subtaskId: subtask._id,
            chatId: subtask.chatId,
            mirrorChatIds: [task?.chatId, project?.chatId, workspace?.chatId],
            message,
            meta: {
                oldTitle,
                newTitle: subtask.title
            }
        });

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
        await Task.findByIdAndUpdate(subtask.task, {
            $set: { updatedAt: new Date() }
        });
        await subtask.populate([
            { path: 'assignedTo', select: 'name email avatar' },
            { path: 'completedBy', select: 'name email avatar' }
        ]);

        const { task, project, workspace } = await loadSubtaskContext(subtask.task);
        const actorLabel = await getUserLabel(userId);
        await logActivity({
            actorId: userId,
            action: subtask.completed ? "subtask.completed" : "subtask.reopened",
            level: "subtask",
            workspaceId: task?.workspace || workspace?._id || null,
            projectId: task?.project || project?._id || null,
            taskId: subtask.task,
            subtaskId: subtask._id,
            chatId: subtask.chatId,
            mirrorChatIds: [task?.chatId, project?.chatId, workspace?.chatId],
            message: subtask.completed
                ? `${actorLabel} marked subtask "${subtask.title}" as completed.`
                : `${actorLabel} reopened subtask "${subtask.title}".`,
            meta: {}
        });

        return subtask;
    }

    /**
     * Delete a subtask
     */
    async deleteSubtask(subtaskId, actorId = null) {
        const subtask = await Subtask.findById(subtaskId);
        if (!subtask) {
            throw new Error('Subtask not found');
        }

        const taskId = subtask.task;

        // Start Transaction for cleanup
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { task, project, workspace } = await loadSubtaskContext(subtask.task, session);
            const actionUserId = actorId || subtask.createdBy;
            const actorLabel = await getUserLabel(actionUserId, session);
            await logActivity({
                actorId: actionUserId,
                action: "subtask.deleted",
                level: "subtask",
                workspaceId: task?.workspace || workspace?._id || null,
                projectId: task?.project || project?._id || null,
                taskId: subtask.task,
                subtaskId: subtask._id,
                chatId: task?.chatId || project?.chatId || workspace?.chatId || null,
                mirrorChatIds: [project?.chatId, workspace?.chatId],
                message: `${actorLabel} deleted subtask "${subtask.title}".`,
                meta: {},
                session
            });

            // 1. Delete Chat and Messages (UPDATED)
            if (subtask.chatId) {
                await Message.deleteMany({ chatId: subtask.chatId }, { session });
                await Chat.findByIdAndDelete(subtask.chatId, { session });
            }

            // 2. Delete the Subtask
            await subtask.deleteOne({ session });

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        await Task.findByIdAndUpdate(taskId, {
            $set: { updatedAt: new Date() }
        });

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
     * Add specific assignees to an existing list
     */
    async addAssignees(subtaskId, userIds, actorId) {
        const subtask = await Subtask.findById(subtaskId);
        if (!subtask) throw new Error('Subtask not found');

        const normalizedUserIds = normalizeUniqueIds(userIds || []);
        if (!normalizedUserIds.length) {
            throw new Error('At least one assignee is required');
        }

        const parentTask = await Task.findById(subtask.task).select('createdBy assignees');
        if (parentTask) {
            validateAssigneesForTask(parentTask, normalizedUserIds);
        }

        // Add to set to prevent duplicates
        await Subtask.updateOne(
            { _id: subtaskId },
            { $addToSet: { assignedTo: { $each: normalizedUserIds } } }
        );

        // Add users to Subtask Chat (UPDATED)
        if (subtask.chatId) {
            await Chat.findByIdAndUpdate(subtask.chatId, {
                $addToSet: { members: { $each: normalizedUserIds } }
            });
        }

        const { task, project, workspace } = await loadSubtaskContext(subtask.task);
        const actionUserId = actorId || subtask.createdBy;
        const actorLabel = await getUserLabel(actionUserId);
        const labels = await getUserLabels(normalizedUserIds);
        await logActivity({
            actorId: actionUserId,
            action: "subtask.assignees_added",
            level: "subtask",
            workspaceId: task?.workspace || workspace?._id || null,
            projectId: task?.project || project?._id || null,
            taskId: subtask.task,
            subtaskId: subtask._id,
            chatId: subtask.chatId,
            mirrorChatIds: [task?.chatId, project?.chatId, workspace?.chatId],
            message: `${actorLabel} assigned ${formatUserList(labels)} to subtask "${subtask.title}".`,
            meta: {
                assigneeIds: normalizedUserIds
            }
        });

        return this.getSubtaskById(subtaskId);
    }

    /**
     * Remove specific assignees
     */
    async removeAssignees(subtaskId, userIds, actorId) {
        const subtask = await Subtask.findById(subtaskId);
        if (!subtask) throw new Error('Subtask not found');

        const normalizedUserIds = normalizeUniqueIds(userIds || []);
        if (!normalizedUserIds.length) {
            throw new Error('At least one assignee is required');
        }

        await Subtask.updateOne(
            { _id: subtaskId },
            { $pull: { assignedTo: { $in: normalizedUserIds } } }
        );

        // Remove users from Subtask Chat (UPDATED)
        if (subtask.chatId) {
            await Chat.findByIdAndUpdate(subtask.chatId, {
                $pull: { members: { $in: normalizedUserIds } }
            });
        }

        const { task, project, workspace } = await loadSubtaskContext(subtask.task);
        const actionUserId = actorId || subtask.createdBy;
        const actorLabel = await getUserLabel(actionUserId);
        const labels = await getUserLabels(normalizedUserIds);
        await logActivity({
            actorId: actionUserId,
            action: "subtask.assignees_removed",
            level: "subtask",
            workspaceId: task?.workspace || workspace?._id || null,
            projectId: task?.project || project?._id || null,
            taskId: subtask.task,
            subtaskId: subtask._id,
            chatId: subtask.chatId,
            mirrorChatIds: [task?.chatId, project?.chatId, workspace?.chatId],
            message: `${actorLabel} removed ${formatUserList(labels)} from subtask "${subtask.title}".`,
            meta: {
                assigneeIds: normalizedUserIds
            }
        });

        return this.getSubtaskById(subtaskId);
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

    /**
     * Leave a subtask (Self-removal)
     */
    async leaveSubtask(subtaskId, userId) {
        const subtask = await Subtask.findById(subtaskId);
        if (!subtask) {
            throw new Error('Subtask not found');
        }

        // 1. Check if user is assigned
        const isAssigned = subtask.assignedTo.some(id => id.toString() === userId.toString());

        if (!isAssigned) {
            throw new Error("You are not assigned to this subtask");
        }

        const { task, project, workspace } = await loadSubtaskContext(subtask.task);
        const actorLabel = await getUserLabel(userId);
        await logActivity({
            actorId: userId,
            action: "subtask.member_left",
            level: "subtask",
            workspaceId: task?.workspace || workspace?._id || null,
            projectId: task?.project || project?._id || null,
            taskId: subtask.task,
            subtaskId: subtask._id,
            chatId: subtask.chatId,
            mirrorChatIds: [task?.chatId, project?.chatId, workspace?.chatId],
            message: `${actorLabel} left subtask "${subtask.title}".`,
            meta: {}
        });

        // 2. Remove user from assignedTo array
        await Subtask.updateOne(
            { _id: subtaskId },
            { $pull: { assignedTo: userId } }
        );

        // 3. Remove user from Subtask Chat (UPDATED)
        if (subtask.chatId) {
            await Chat.findByIdAndUpdate(subtask.chatId, {
                $pull: { members: userId }
            });
        }

        return { message: "You have left the subtask successfully" };
    }
}

module.exports = new SubtaskService();
