const mongoose = require("mongoose");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");
const taskService = require("./tasks.service");
const { createTaskSchema } = require('./tasks.validation')

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
}


module.exports = taskController;