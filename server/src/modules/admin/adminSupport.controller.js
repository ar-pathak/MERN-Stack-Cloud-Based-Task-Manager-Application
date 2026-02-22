const AdminSupportService = require("./adminSupport.service");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");

const AdminSupportController = {
    listAgents: async (_req, res) => {
        try {
            const result = await AdminSupportService.listAgents();
            return sendSuccess(res, { agents: result });
        } catch (error) {
            return handleError(error, res);
        }
    },

    getDashboardSummary: async (_req, res) => {
        try {
            const result = await AdminSupportService.getDashboardSummary();
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    listTickets: async (req, res) => {
        try {
            const result = await AdminSupportService.listTickets(req.admin, req.query || {});
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getTicketById: async (req, res) => {
        try {
            const result = await AdminSupportService.getTicketById(req.params.ticketId);
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    updateTicketStatus: async (req, res) => {
        try {
            const result = await AdminSupportService.updateTicketStatus(
                req.admin,
                req.params.ticketId,
                req.body.status
            );
            return sendSuccess(res, result, "Ticket status updated");
        } catch (error) {
            return handleError(error, res);
        }
    },

    assignTicket: async (req, res) => {
        try {
            const result = await AdminSupportService.assignTicket(
                req.params.ticketId,
                req.body.assigneeId
            );
            return sendSuccess(res, result, "Ticket assignment updated");
        } catch (error) {
            return handleError(error, res);
        }
    },

    addReply: async (req, res) => {
        try {
            const result = await AdminSupportService.addReply(
                req.admin,
                req.params.ticketId,
                req.body || {}
            );
            return sendSuccess(res, result, "Reply posted");
        } catch (error) {
            return handleError(error, res);
        }
    },

    listFeedback: async (req, res) => {
        try {
            const result = await AdminSupportService.listFeedback(req.query || {});
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = AdminSupportController;
