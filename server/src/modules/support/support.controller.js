const supportService = require("./support.service");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");

module.exports = {
    listHelpArticles: async (req, res) => {
        try {
            const result = await supportService.listHelpArticles(req.query || {});
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getHelpArticleBySlug: async (req, res) => {
        try {
            const result = await supportService.getHelpArticleBySlug(req.params.slug);
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    listFaqs: async (req, res) => {
        try {
            const result = await supportService.listFaqs(req.query || {});
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    createTicket: async (req, res) => {
        try {
            const result = await supportService.createSupportTicket(req.user, req.body || {});
            return sendSuccess(res, result, "Support ticket created", 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    listTickets: async (req, res) => {
        try {
            const result = await supportService.listTickets(req.user._id, req.query || {});
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getTicketById: async (req, res) => {
        try {
            const result = await supportService.getTicketById(req.user._id, req.params.ticketId);
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    updateTicketStatus: async (req, res) => {
        try {
            const result = await supportService.updateTicketStatus(
                req.user._id,
                req.params.ticketId,
                req.body.status
            );
            return sendSuccess(res, result, "Ticket status updated");
        } catch (error) {
            return handleError(error, res);
        }
    },

    addTicketComment: async (req, res) => {
        try {
            const result = await supportService.addTicketComment(
                req.user,
                req.params.ticketId,
                req.body || {}
            );
            return sendSuccess(res, result, "Comment added to ticket");
        } catch (error) {
            return handleError(error, res);
        }
    },

    contactSupport: async (req, res) => {
        try {
            const result = await supportService.contactSupport(req.user, req.body || {});
            return sendSuccess(res, result, "Contact request submitted", 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    submitFeedback: async (req, res) => {
        try {
            const result = await supportService.submitFeedback(req.user, req.body || {});
            return sendSuccess(res, result, "Feedback submitted", 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    listFeedback: async (req, res) => {
        try {
            const result = await supportService.listMyFeedback(req.user._id, req.query || {});
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    }
};
