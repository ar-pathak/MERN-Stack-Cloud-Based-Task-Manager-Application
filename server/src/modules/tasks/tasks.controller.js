const mongoose = require("mongoose");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");
const taskService = require("./tasks.service");
const { createTaskSchema, addTaskAssigneesSchema, removeTaskAssigneesSchema, changeTaskStatusSchema } = require('./tasks.validation')

const taskController = {
    createTaskAtGlobalLevel: async (req, res) => {
        try {
            const userId = req.user._id;
            const data = createTaskSchema.parse(req.body);
            const task = await taskService.createTask(userId, data)
            sendSuccess(res, task)
        } catch (error) {
            handleError(error, res);
        }
    },
    createTaskAtWorkspaceLevel: async (req, res) => {
        try {
            const userId = req.user._id;
            const { workspaceId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                throw new Error('Invalid workspace Id')
            }
            const data = createTaskSchema.parse(req.body);
            const task = await taskService.createTask(userId, data, { workspaceId })
            sendSuccess(res, task)
        } catch (error) {
            handleError(error, res);
        }
    },
    createTaskAtProjectLevel: async (req, res) => {
        try {
            const userId = req.user._id;
            const { workspaceId, projectId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                throw new Error('Invalid workspace Id')
            }
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project Id')
            }
            const data = createTaskSchema.parse(req.body);
            const task = await taskService.createTask(userId, data, { workspaceId, projectId })
            sendSuccess(res, task)
        } catch (error) {
            handleError(error, res);
        }
    },
    createTaskAtTeamLevel: async (req, res) => {
        try {
            const userId = req.user._id;
            const { workspaceId, teamId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                throw new Error('Invalid workspace Id')
            }
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                throw new Error('Invalid team Id')
            }
            const data = createTaskSchema.parse(req.body);
            const task = await taskService.createTask(userId, data, { workspaceId, teamId })
            sendSuccess(res, task)
        } catch (error) {
            handleError(error, res);
        }
    },
    addTaskAssignees: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const assigneesData = addTaskAssigneesSchema.parse(req.body);

            const result = await taskService.addTaskAssignees(
                userId,
                taskId,
                assigneesData
            );

            sendSuccess(res, null, result.message);
        } catch (error) {
            handleError(error, res);
        }
    },
    removeTaskAssignees: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const data = removeTaskAssigneesSchema.parse(req.body);

            const result = await taskService.removeTaskAssignees(
                userId,
                taskId,
                data
            );

            sendSuccess(res, null, result.message);
        } catch (error) {
            handleError(error, res);
        }
    },
    changeTaskStatus: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const { status } = changeTaskStatusSchema.parse(req.body);

            const result = await taskService.changeTaskStatus(
                userId,
                taskId,
                status
            );

            sendSuccess(res, null, result.message);
        } catch (error) {
            handleError(error, res);
        }
    },
    changeTaskStatus: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const { status } = changeTaskStatusSchema.parse(req.body);

            const result = await taskService.changeTaskStatus(
                userId,
                taskId,
                status
            );

            sendSuccess(res, null, result.message);
        } catch (error) {
            handleError(error, res);
        }
    }, deleteTask: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const result = await taskService.deleteTask(userId, taskId);

            sendSuccess(res, null, result.message);
        } catch (error) {
            handleError(error, res);
        }
    }
    ,
    restoreTask: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const result = await taskService.restoreTask(userId, taskId);

            sendSuccess(res, null, result.message);
        } catch (error) {
            handleError(error, res);
        }
    },
    permanentDeleteTask: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const result = await taskService.permanentDeleteTask(
                userId,
                taskId
            );

            sendSuccess(res, null, result.message);
        } catch (error) {
            handleError(error, res);
        }
    },
    getTask: async (req, res) => {
        try {
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid task ID"
                });
            }

            const task = await taskService.getTaskById(taskId);
            sendSuccess(res, task, "Task retrieved successfully");
        } catch (error) {
            handleError(error, res);
        }
    },
    getTasksByWorkspace: async (req, res) => {
        try {
            const { workspaceId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            const tasks = await taskService.getTasksByWorkspace(workspaceId);
            sendSuccess(res, tasks, "Tasks retrieved successfully");
        } catch (error) {
            handleError(error, res);
        }
    },
    getTasksByProject: async (req, res) => {
        try {
            const { workspaceId, projectId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid project ID"
                });
            }

            const tasks = await taskService.getTasksByProject(projectId);
            sendSuccess(res, tasks, "Tasks retrieved successfully");
        } catch (error) {
            handleError(error, res);
        }
    }
}


module.exports = taskController;