const router = require("express").Router();
const auth = require("../../middleware/authMiddleware");
const { validate } = require("../../middleware/validate");
const controller = require("./support.controller");
const validation = require("./support.validation");

router.use(auth);

router.get(
    "/articles",
    validate(validation.listArticlesQuerySchema, "query"),
    controller.listHelpArticles
);

router.get(
    "/articles/:slug",
    validate(validation.articleSlugParamSchema, "params"),
    controller.getHelpArticleBySlug
);

router.get(
    "/faqs",
    validate(validation.listFaqQuerySchema, "query"),
    controller.listFaqs
);

router.get(
    "/tickets",
    validate(validation.listTicketQuerySchema, "query"),
    controller.listTickets
);

router.post(
    "/tickets",
    validate(validation.createTicketSchema),
    controller.createTicket
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

router.post(
    "/tickets/:ticketId/comments",
    validate(validation.ticketParamSchema, "params"),
    validate(validation.addTicketCommentSchema),
    controller.addTicketComment
);

router.post(
    "/contact",
    validate(validation.contactSupportSchema),
    controller.contactSupport
);

router.get(
    "/feedback",
    validate(validation.listFeedbackQuerySchema, "query"),
    controller.listFeedback
);

router.post(
    "/feedback",
    validate(validation.submitFeedbackSchema),
    controller.submitFeedback
);

module.exports = router;
