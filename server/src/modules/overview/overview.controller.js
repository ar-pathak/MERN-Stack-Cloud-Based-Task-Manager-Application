const overviewService = require("./overview.service");
const { handleError, sendSuccess } = require("../../helpers/responseHelper");

const overviewController = {
    activity: async (req, res) => {
        try {
            const userId = req.user._id;

            const activity = await overviewService.activity(userId);
            res.set("Cache-Control", "private, max-age=15");

            sendSuccess(res, activity)
        } catch (err) {
            handleError(err, res)
        }
    }
}



module.exports = overviewController
