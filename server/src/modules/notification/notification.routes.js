const router = require("express").Router();
const auth = require("../../middleware/authMiddleware");
const { validate } = require("../../middleware/validate");
const controller = require("./notification.controller");
const validation = require("./notification.validation");

router.use(auth);

router.get(
    "/",
    validate(validation.listNotificationsQuerySchema, "query"),
    controller.listNotifications
);

router.get("/unread-count", controller.getUnreadCount);

router.patch(
    "/read-all",
    validate(validation.markAllReadSchema),
    controller.markAllAsRead
);

router.post(
    "/bulk",
    validate(validation.bulkActionSchema),
    controller.bulkAction
);

router.patch(
    "/:notificationId/read",
    validate(validation.notificationParamSchema, "params"),
    controller.markAsRead
);

router.patch(
    "/:notificationId/unread",
    validate(validation.notificationParamSchema, "params"),
    controller.markAsUnread
);

router.delete(
    "/:notificationId",
    validate(validation.notificationParamSchema, "params"),
    controller.deleteNotification
);

module.exports = router;
