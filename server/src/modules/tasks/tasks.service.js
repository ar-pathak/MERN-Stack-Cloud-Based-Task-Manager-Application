const Task = require('../../models/tasks')

const taskService = {
    createTask: async (userId, taskData, scope = {}) => {
        const existingTask = await Task.findOne({
            createdBy: userId,
            title: taskData.title
        });

        if (existingTask) {
            throw new Error("Task with this name already exists");
        }

        return Task.create({
            ...taskData,
            createdBy: userId,
            workspace: scope.workspaceId || null,
            project: scope.projectId || null,
            team: scope.teamId || null
        });
    }
};

module.exports = taskService;
