const storyService = require("./story.service");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");

const storyController = {
    createStory: async (req, res) => {
        try {
            const story = await storyService.createStory(req.user._id, req.body);
            return sendSuccess(res, { story }, "Story created successfully", 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getFeedStories: async (req, res) => {
        try {
            const result = await storyService.getFeedStories(req.user._id);
            return sendSuccess(res, result, "Stories retrieved successfully");
        } catch (error) {
            return handleError(error, res);
        }
    },

    getUserStories: async (req, res) => {
        try {
            const result = await storyService.getUserStories(req.params.userId, req.user._id);
            return sendSuccess(res, result, "User stories retrieved successfully");
        } catch (error) {
            return handleError(error, res);
        }
    },

    getStoryById: async (req, res) => {
        try {
            const story = await storyService.getStoryById(req.params.id, req.user._id);
            return sendSuccess(res, { story }, "Story retrieved successfully");
        } catch (error) {
            return handleError(error, res);
        }
    },

    markViewed: async (req, res) => {
        try {
            const story = await storyService.markStoryViewed(req.params.id, req.user._id);
            return sendSuccess(res, { story }, "Story marked as viewed");
        } catch (error) {
            return handleError(error, res);
        }
    },

    reactToStory: async (req, res) => {
        try {
            const story = await storyService.reactToStory(req.params.id, req.user._id, req.body.emoji);
            return sendSuccess(res, { story }, "Story reaction updated");
        } catch (error) {
            return handleError(error, res);
        }
    },

    deleteStory: async (req, res) => {
        try {
            await storyService.deleteStory(req.params.id, req.user._id);
            return sendSuccess(res, null, "Story deleted successfully");
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = storyController;

