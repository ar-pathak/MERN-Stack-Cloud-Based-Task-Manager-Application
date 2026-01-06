const isUserTaskAssignee = require('../../helpers/isUserTaskAssignee');
const { canCreateTask } = require('../../middleware/resolveTaskCreatePermission');
const Task = require('../../models/tasks')
const Team = require('../../models/team')

const taskService = {
    createTask: async (userId, taskData, scope = {}) => {
        const existingTask = await Task.findOne({
            createdBy: userId,
            title: taskData.title,
            workspace: scope.workspaceId || null,
            project: scope.projectId || null,
            team: scope.teamId || null
        });

        if (existingTask) {
            throw new Error("Task with this name already exists in this scope");
        }

        return Task.create({
            ...taskData,
            createdBy: userId,
            workspace: scope.workspaceId || null,
            project: scope.projectId || null,
            team: scope.teamId || null
        });
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

        if (assigneesData.assignees?.length) {
            updateQuery.assignees = {
                $each: assigneesData.assignees
            };
        }

        if (assigneesData.assigneesTeams?.length) {
            updateQuery.assigneesTeams = {
                $each: assigneesData.assigneesTeams
            };
        }

        if (Object.keys(updateQuery).length === 0) {
            throw new Error("No assignees provided");
        }

        await Task.updateOne(
            { _id: taskId },
            {
                $addToSet: updateQuery
            }
        );

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

        if (newStatus === "completed" && task.assignees.length === 0 && task.assigneesTeams.length === 0) {
            throw new Error("Cannot complete unassigned task");
        }

        await Task.updateOne(
            { _id: taskId },
            {
                $set: { status: newStatus }
            }
        );

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

        return { message: "Task permanently deleted" };
    }

};

module.exports = taskService;
