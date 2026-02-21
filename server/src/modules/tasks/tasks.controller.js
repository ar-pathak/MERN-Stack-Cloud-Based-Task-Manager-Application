const mongoose = require("mongoose");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");
const taskService = require("./tasks.service");
const {
    createTaskSchema,
    updateTaskSchema,
    addTaskAssigneesSchema,
    removeTaskAssigneesSchema,
    changeTaskStatusSchema,
    respondTaskAssigneeRequestSchema
} = require("./tasks.validation");
const { parsePaginationQuery } = require("../../helpers/paginationHelper");

const taskController = {
    createTaskAtGlobalLevel: async (req, res) => {
        try {
            const userId = req.user._id;
            const data = createTaskSchema.parse(req.body);
            const task = await taskService.createTask(userId, data);
            return sendSuccess(res, task, "Task created successfully", 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    createTaskAtWorkspaceLevel: async (req, res) => {
        try {
            const userId = req.user._id;
            const { workspaceId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                throw new Error("Invalid workspace ID");
            }

            const data = createTaskSchema.parse(req.body);
            const task = await taskService.createTask(userId, data, { workspaceId });
            return sendSuccess(res, task, "Task created successfully", 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    createTaskAtProjectLevel: async (req, res) => {
        try {
            const userId = req.user._id;
            const { workspaceId, projectId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                throw new Error("Invalid workspace ID");
            }

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error("Invalid project ID");
            }

            const data = createTaskSchema.parse(req.body);
            const task = await taskService.createTask(userId, data, { workspaceId, projectId });
            return sendSuccess(res, task, "Task created successfully", 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    updateTask: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const data = updateTaskSchema.parse(req.body);
            const result = await taskService.updateTask(userId, taskId, data);
            return sendSuccess(res, result.task, result.message);
        } catch (error) {
            return handleError(error, res);
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
            const result = await taskService.addTaskAssignees(userId, taskId, assigneesData);
            return sendSuccess(res, result.task, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    respondTaskAssigneeRequest: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId, requestId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }
            if (!mongoose.Types.ObjectId.isValid(requestId)) {
                throw new Error("Invalid request ID");
            }

            const { action } = respondTaskAssigneeRequestSchema.parse(req.body || {});
            const result = await taskService.respondTaskAssigneeRequest({
                userId,
                taskId,
                requestId,
                action
            });

            const message = action === "approve"
                ? "Task assignment request approved"
                : "Task assignment request rejected";

            return sendSuccess(res, result, message);
        } catch (error) {
            return handleError(error, res);
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
            const result = await taskService.removeTaskAssignees(userId, taskId, data);
            return sendSuccess(res, result.task, result.message);
        } catch (error) {
            return handleError(error, res);
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
            const result = await taskService.changeTaskStatus(userId, taskId, status);
            return sendSuccess(res, result.task, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    toggleTaskCompletion: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const result = await taskService.toggleTaskCompletion(userId, taskId);
            return sendSuccess(res, result.task, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    deleteTask: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const result = await taskService.deleteTask(userId, taskId);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    restoreTask: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const result = await taskService.restoreTask(userId, taskId);
            return sendSuccess(res, result.task, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    permanentDeleteTask: async (req, res) => {
        try {
            const userId = req.user._id;
            const { taskId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const result = await taskService.permanentDeleteTask(userId, taskId);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getAllGlobalLevelTasks: async (req, res) => {
        try {
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });
            }

            const pagination = parsePaginationQuery(req.query, {
                defaultLimit: 30,
                maxLimit: 100
            });
            const tasks = await taskService.getAllGlobalLevelTasks(userId, pagination);
            return sendSuccess(res, tasks, "Tasks retrieved successfully");
        } catch (error) {
            return handleError(error, res);
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

            const task = await taskService.getTaskById(taskId, req.user._id);
            return sendSuccess(res, task, "Task retrieved successfully");
        } catch (error) {
            return handleError(error, res);
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

            const pagination = parsePaginationQuery(req.query, {
                defaultLimit: 30,
                maxLimit: 100
            });
            const tasks = await taskService.getTasksByWorkspace(workspaceId, pagination);
            return sendSuccess(res, tasks, "Tasks retrieved successfully");
        } catch (error) {
            return handleError(error, res);
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

            const pagination = parsePaginationQuery(req.query, {
                defaultLimit: 30,
                maxLimit: 100
            });
            const tasks = await taskService.getTasksByProject(projectId, pagination);
            return sendSuccess(res, tasks, "Tasks retrieved successfully");
        } catch (error) {
            return handleError(error, res);
        }
    },

    leaveTask: async (req, res) => {
        try {
            const { taskId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                throw new Error("Invalid task ID");
            }

            const result = await taskService.leaveTask(taskId, userId);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = taskController;
