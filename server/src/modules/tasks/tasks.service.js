const isUserTaskAssignee = require('../../helpers/isUserTaskAssignee');
const { canCreateTask } = require('../../middleware/resolveTaskCreatePermission');
const Task = require('../../models/tasks')
const Team = require('../../models/team');
const User = require('../../models/user');
const { touchParents } = require('../utils/updateParent');

const taskService = {
    createTask: async (userId, taskData, scope = {}) => {
        const existingTask = await Task.findOne({
            createdBy: userId,
            title: taskData.title,
            workspace: scope.workspaceId || null,
            project: scope.projectId || null,
        });

        if (existingTask) {
            throw new Error("Task with this name already exists in this scope");
        }

        const task = await Task.create({
            ...taskData,
            createdBy: userId,
            workspace: scope.workspaceId || null,
            project: scope.projectId || null,
        });

        await touchParents(task);

        return task;
    },
    updateTask: async (userId, taskId, data) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const isCreator = task.createdBy.toString() === userId.toString();

        if (!isCreator) {
            throw new Error("You are not allowed to update this task");
        }

        await Task.updateOne(
            { _id: taskId },
            { $set: data }
        );

        await touchParents(task);

        return { message: "Task updated successfully" };
    },
    addTaskAssignees: async (userId, taskId, assigneesData) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const isUserValid = canCreateTask(
            userId,
            task.workspace,
            task.project,
            task.team
        );

        if (!isUserValid) {
            throw new Error("Permission denied");
        }

        const updateQuery = {};
        let targetAssigneeIds = [];

        // 1. Collect Direct IDs
        if (assigneesData.assignees?.length) {
            targetAssigneeIds = [...assigneesData.assignees];
        }

        // 2. Resolve Usernames to IDs (NEW LOGIC)
        if (assigneesData.usernames?.length) {
            // Find users matching the provided usernames
            const usersFound = await User.find({
                username: { $in: assigneesData.usernames }
            }).select('_id');

            if (usersFound.length === 0 && !targetAssigneeIds.length && !assigneesData.assigneesTeams?.length) {
                throw new Error("No valid users found with provided usernames");
            }

            const userIdsFromNames = usersFound.map(u => u._id);
            targetAssigneeIds = [...targetAssigneeIds, ...userIdsFromNames];
        }

        // 3. Prepare Update Query
        if (targetAssigneeIds.length > 0) {
            updateQuery.assignees = {
                $each: targetAssigneeIds
            };
        }

        if (assigneesData.assigneesTeams?.length) {
            updateQuery.assigneesTeams = {
                $each: assigneesData.assigneesTeams
            };
        }

        if (Object.keys(updateQuery).length === 0) {
            throw new Error("No valid assignees or teams provided");
        }

        await Task.updateOne(
            { _id: taskId },
            {
                $addToSet: updateQuery
            }
        );
        await touchParents(task);

        return { message: "Added assignees to task" };
    },
    removeTaskAssignees: async (userId, taskId, data) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const isUserValid = canCreateTask(
            userId,
            task.workspace,
            task.project,
            task.team
        );

        if (!isUserValid) {
            throw new Error("Permission denied");
        }

        if (data.assignees?.includes(task.createdBy.toString())) {
            throw new Error("Task owner cannot be removed");
        }

        const pullQuery = {};

        if (data.assignees?.length) {
            pullQuery.assignees = {
                $in: data.assignees
            };
        }

        if (data.assigneesTeams?.length) {
            pullQuery.assigneesTeams = {
                $in: data.assigneesTeams
            };
        }

        await Task.updateOne(
            { _id: taskId },
            {
                $pull: pullQuery
            }
        );
        await touchParents(task);

        return { message: "Removed assignees from task" };
    },
    changeTaskStatus: async (userId, taskId, newStatus) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const isAuthorized = await isUserTaskAssignee(task, userId);

        if (!isAuthorized) {
            throw new Error("Only task assignees can change task status");
        }

        if (task.status === newStatus) {
            throw new Error("Task already has this status");
        }

        await Task.updateOne(
            { _id: taskId },
            {
                $set: { status: newStatus }
            }
        );
        await touchParents(task);
        return { message: "Task status updated successfully" };
    },
    deleteTask: async (userId, taskId) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        // Prevent double delete
        if (task.status === "deleted") {
            throw new Error("Task already deleted");
        }

        const isCreator =
            task.createdBy.toString() === userId.toString();

        if (!isCreator) {
            throw new Error("You are not allowed to delete this task");
        }

        await Task.updateOne(
            { _id: taskId },
            {
                $set: { status: "deleted" }
            }
        );
        await touchParents(task);

        return { message: "Task deleted successfully" };
    },
    restoreTask: async (userId, taskId) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        if (task.status !== "deleted") {
            throw new Error("Only deleted tasks can be restored");
        }

        const isCreator =
            task.createdBy.toString() === userId.toString();

        const isTeamLead = await Team.exists({
            _id: { $in: task.assigneesTeams },
            members: {
                $elemMatch: {
                    user: userId,
                    role: "lead"
                }
            }
        });

        if (!isCreator && !isTeamLead) {
            throw new Error("You are not allowed to restore this task");
        }

        await Task.updateOne(
            { _id: taskId },
            {
                $set: { status: "active" }
            }
        );
        await touchParents(task);

        return { message: "Task restored successfully" };
    },
    permanentDeleteTask: async (userId, taskId) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const isCreator =
            task.createdBy.toString() === userId.toString();

        if (!isCreator) {
            throw new Error(
                "You are not allowed to permanently delete this task"
            );
        }

        await Task.deleteOne({ _id: taskId });
        await touchParents(task);

        return { message: "Task permanently deleted" };
    },
    getAllGlobalLevelTasks: async (userId) => {
        const globalLevelTasks = await Task.find({
            createdBy: userId,
            workspace: null,
            team: null,
            project: null,
        });

        if (!globalLevelTasks.length) {
            throw new Error("Task not found");
        }

        return globalLevelTasks;
    },
    getTaskById: async (taskId) => {
        const task = await Task.findById(taskId)
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email')
            .populate('assigneesTeams')

            // Nested Populate: Project -> Members -> User
            .populate({
                path: 'project',
                populate: {
                    path: 'members.user',
                    select: 'name email'
                }
            })

            .populate('workspace')
            .exec();

        if (!task) {
            throw new Error('Task not found')
        }
        return task;
    },
    getTasksByWorkspace: async (workspaceId) => {
        const tasks = await Task.find({ workspace: workspaceId, deleted: false })
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email')
            .populate('project', 'name')
            .sort({ createdAt: -1 })
            .exec();
        return tasks;
    },
    getTasksByProject: async (projectId) => {
        const tasks = await Task.find({ project: projectId, deleted: false })
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email')
            .populate('workspace', 'name')
            .sort({ createdAt: -1 })
            .exec();
        return tasks;
    },
    leaveTask: async (taskId, userId) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        // 1. Check if user is actually assigned directly
        const isAssigned = task.assignees.some(id => id.toString() === userId.toString());
        
        if (!isAssigned) {
            // Check if assigned via team (optional feedback)
            // Agar team ke through assigned hai, to wo individual leave nahi kar sakta
            throw new Error("You are not directly assigned to this task (or already left).");
        }

        // 2. Remove user from assignees
        await Task.findByIdAndUpdate(
            taskId,
            { $pull: { assignees: userId } },
            { new: true }
        );

        return { message: "You have left the task successfully" };
    },

};

module.exports = taskService;
