const router = require("express").Router();
const { validate } = require("../../middleware/validate");
const adminAuthMiddleware = require("../../middleware/adminAuthMiddleware");
const controller = require("./adminSupport.controller");
const validation = require("./adminSupport.validation");

router.use(adminAuthMiddleware);

router.get("/agents", controller.listAgents);
router.get("/summary", controller.getDashboardSummary);

router.get(
    "/tickets",
    validate(validation.listTicketsQuerySchema, "query"),
    controller.listTickets
);

router.get(
    "/tickets/:ticketId",
    validate(validation.ticketParamSchema, "params"),
    controller.getTicketById
);

router.patch(
    "/tickets/:ticketId/status",
    validate(validation.ticketParamSchema, "params"),
    validate(validation.updateTicketStatusSchema),
    controller.updateTicketStatus
);

router.patch(
    "/tickets/:ticketId/assign",
    validate(validation.ticketParamSchema, "params"),
    validate(validation.assignTicketSchema),
    controller.assignTicket
);

router.post(
    "/tickets/:ticketId/replies",
    validate(validation.ticketParamSchema, "params"),
    validate(validation.addReplySchema),
    controller.addReply
);

router.get(
    "/feedback",
    validate(validation.listFeedbackQuerySchema, "query"),
    controller.listFeedback
);

module.exports = router;
