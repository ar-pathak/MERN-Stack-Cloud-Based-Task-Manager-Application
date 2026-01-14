const overviewService = require("./overview.service");
const { handleError, sendSuccess } = require("../../helpers/responseHelper");

const overviewController = {
    activity: async (req, res) => {
        try {
            userId = req.user._id;

            const activity = await overviewService.activity(userId);

            sendSuccess(res, activity)
        } catch (err) {
            handleError(err, res)
        }
    }
}



module.exports = overviewController