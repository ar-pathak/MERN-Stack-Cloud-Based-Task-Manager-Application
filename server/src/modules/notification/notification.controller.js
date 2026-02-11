const notificationService = require("./notification.service");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");

module.exports = {
    listNotifications: async (req, res) => {
        try {
            const result = await notificationService.listNotifications(req.user._id, req.query);
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getUnreadCount: async (req, res) => {
        try {
            const count = await notificationService.getUnreadCount(req.user._id);
            return sendSuccess(res, { count });
        } catch (error) {
            return handleError(error, res);
        }
    },

    markAsRead: async (req, res) => {
        try {
            const notification = await notificationService.markAsRead(
                req.user._id,
                req.params.notificationId
            );
            return sendSuccess(res, notification, "Notification marked as read");
        } catch (error) {
            return handleError(error, res);
        }
    },

    markAsUnread: async (req, res) => {
        try {
            const notification = await notificationService.markAsUnread(
                req.user._id,
                req.params.notificationId
            );
            return sendSuccess(res, notification, "Notification marked as unread");
        } catch (error) {
            return handleError(error, res);
        }
    },

    markAllAsRead: async (req, res) => {
        try {
            const result = await notificationService.markAllAsRead(req.user._id, req.body || {});
            return sendSuccess(res, result, "All matching notifications marked as read");
        } catch (error) {
            return handleError(error, res);
        }
    },

    bulkAction: async (req, res) => {
        try {
            const result = await notificationService.bulkAction(req.user._id, req.body);
            return sendSuccess(res, result, "Bulk notification action completed");
        } catch (error) {
            return handleError(error, res);
        }
    },

    deleteNotification: async (req, res) => {
        try {
            const deleted = await notificationService.deleteNotification(
                req.user._id,
                req.params.notificationId
            );
            return sendSuccess(res, deleted, "Notification deleted");
        } catch (error) {
            return handleError(error, res);
        }
    }
};
