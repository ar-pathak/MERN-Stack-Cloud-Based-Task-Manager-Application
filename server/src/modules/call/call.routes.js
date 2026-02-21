const router = require("express").Router();
const auth = require("../../middleware/authMiddleware");
const controller = require("./call.controller");
const { validate } = require("../../middleware/validate");
const validation = require("./Call.validation");

// All routes require authentication
router.use(auth);

// ============================================================================
// CALL HISTORY & LOGS
// ============================================================================

// GET /api/calls/history - Get user's call history with filters
router.get(
    "/history",
    validate(validation.callHistoryQuerySchema, "query"),
    controller.getCallHistory
);

// GET /api/calls/active - Get current active call if any
router.get(
    "/active",
    validate(validation.activeCallQuerySchema, "query"),
    controller.getActiveCall
);

// GET /api/calls/active/list - Get active calls for user's chats
router.get("/active/list", controller.getActiveCalls);

// GET /api/calls/:callId - Get specific call details
router.get(
    "/:callId",
    validate(validation.callIdParamSchema, "params"),
    controller.getCallDetails
);

// GET /api/calls/chat/:chatId/logs - Get call logs for specific chat
router.get(
    "/chat/:chatId/logs",
    validate(validation.chatIdParamSchema, "params"),
    validate(validation.chatCallLogsQuerySchema, "query"),
    controller.getChatCallLogs
);

// DELETE /api/calls/:callId - Delete call from history
router.delete(
    "/:callId",
    validate(validation.callIdParamSchema, "params"),
    controller.deleteCallHistory
);

// DELETE /api/calls/history/clear - Clear all call history
router.delete("/history/clear", controller.clearCallHistory);

// ============================================================================
// CALL STATISTICS
// ============================================================================

// GET /api/calls/stats/overview - Get call statistics
router.get(
    "/stats/overview",
    validate(validation.callStatsQuerySchema, "query"),
    controller.getCallStatistics
);

// GET /api/calls/missed/count - Get missed calls count
router.get("/missed/count", controller.getMissedCallsCount);

// POST /api/calls/missed/mark-viewed - Mark missed calls as viewed
router.post("/missed/mark-viewed", controller.markMissedCallsAsViewed);

// ============================================================================
// CALL QUALITY & FEEDBACK
// ============================================================================

// POST /api/calls/:callId/feedback - Submit call quality feedback
router.post(
    "/:callId/feedback",
    validate(validation.callIdParamSchema, "params"),
    validate(validation.callFeedbackSchema),
    controller.submitCallFeedback
);

module.exports = router;
