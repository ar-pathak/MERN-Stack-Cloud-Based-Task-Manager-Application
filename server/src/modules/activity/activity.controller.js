const activityService = require("./activity.service");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");

const activityController = {
    listMyActivities: async (req, res) => {
        try {
            const result = await activityService.listMyActivities(req.user._id, req.query);
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getMyActivityDashboard: async (req, res) => {
        try {
            const result = await activityService.getMyActivityDashboard(req.user._id, req.query);
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = activityController;
