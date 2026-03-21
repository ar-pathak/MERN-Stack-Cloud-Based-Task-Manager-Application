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
    },

    // Enrich timeline with aggregated counts
    // Moves the recursive tree traversal from frontend to backend
    enrichTimeline: async (req, res) => {
        try {
            const { timeline, activeCallsByChatId, mentionByChatId, callInviteByChatId } = req.body;

            // Validate input
            if (!Array.isArray(timeline)) {
                return sendSuccess(res, { timeline: [] }, "Timeline must be an array");
            }

            const enrichedTimeline = overviewService.enrichTimeline(
                timeline,
                activeCallsByChatId || {},
                mentionByChatId || {},
                callInviteByChatId || {}
            );

            res.set("Cache-Control", "private, max-age=5");
            return sendSuccess(res, { timeline: enrichedTimeline });
        } catch (err) {
            handleError(err, res);
        }
    }
}



module.exports = overviewController
