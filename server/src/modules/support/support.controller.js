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
    },

    buildCommentTree: async (req, res) => {
        try {
            const { comments = [] } = req.body;

            if (!Array.isArray(comments)) {
                return sendSuccess(res, { tree: [] }, "Comments must be an array");
            }

            const tree = await supportService.buildCommentTree(comments);
            res.set("Cache-Control", "private, max-age=10");
            return sendSuccess(res, { tree }, "Comment tree built successfully");
        } catch (error) {
            return handleError(error, res);
        }
    },

    getCommentWithReplies: async (req, res) => {
        try {
            const { commentId } = req.params;
            const { page = 1, limit = 5 } = req.query;

            const result = await supportService.getCommentWithPaginatedReplies(commentId, {
                page: parseInt(page),
                limit: Math.min(parseInt(limit) || 5, 20)
            });

            res.set("Cache-Control", "private, max-age=10");
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    }
};
