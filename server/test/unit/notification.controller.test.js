jest.mock("../../src/modules/notification/notification.service", () => ({
    listNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAsUnread: jest.fn(),
    markAllAsRead: jest.fn(),
    bulkAction: jest.fn(),
    deleteNotification: jest.fn()
}));

jest.mock("../../src/helpers/responseHelper", () => ({
    sendSuccess: jest.fn((res, data = null, message = "Success", statusCode = 200) => (
        res.status(statusCode).json({
            success: true,
            message,
            ...(data !== null ? { data } : {})
        })
    )),
    handleError: jest.fn((error, res) => (
        res.status(error?.statusCode || 500).json({
            success: false,
            message: error?.message || "Internal server error"
        })
    ))
}));

const notificationService = require("../../src/modules/notification/notification.service");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/notification/notification.controller");

const createResponse = () => {
    const res = {
        statusCode: null,
        body: null
    };
    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    return res;
};

const baseReq = () => ({
    user: { _id: "user-1" },
    params: { notificationId: "507f1f77bcf86cd799439011" },
    query: { page: "2", limit: "20" },
    body: {
        action: "read",
        notificationIds: ["507f1f77bcf86cd799439011"]
    }
});

beforeEach(() => {
    jest.clearAllMocks();
});

test.each([
    ["getUnreadCount", "getUnreadCount", (req) => [req.user._id], 4, "Success"],
    ["markAsRead", "markAsRead", (req) => [req.user._id, req.params.notificationId], { _id: "n1", read: true }, "Notification marked as read"],
    ["markAsUnread", "markAsUnread", (req) => [req.user._id, req.params.notificationId], { _id: "n1", read: false }, "Notification marked as unread"],
    ["markAllAsRead", "markAllAsRead", (req) => [req.user._id, req.body], { modifiedCount: 2 }, "All matching notifications marked as read"],
    ["bulkAction", "bulkAction", (req) => [req.user._id, req.body], { matchedCount: 1, modifiedCount: 1 }, "Bulk notification action completed"],
    ["deleteNotification", "deleteNotification", (req) => [req.user._id, req.params.notificationId], { _id: "n1" }, "Notification deleted"]
])("%s forwards args and sends expected success response", async (handlerName, serviceMethod, argsGetter, payload, message) => {
    const req = baseReq();
    const res = createResponse();
    notificationService[serviceMethod].mockResolvedValue(payload);

    await controller[handlerName](req, res);

    expect(notificationService[serviceMethod]).toHaveBeenCalledWith(...argsGetter(req));
    if (handlerName === "getUnreadCount") {
        expect(sendSuccess).toHaveBeenCalledWith(res, { count: payload });
    } else {
        expect(sendSuccess).toHaveBeenCalledWith(res, payload, message);
    }
    expect(res.statusCode).toBe(200);
});

test("listNotifications forwards query payload and uses default success message", async () => {
    const req = baseReq();
    const res = createResponse();
    const payload = { notifications: [] };
    notificationService.listNotifications.mockResolvedValue(payload);

    await controller.listNotifications(req, res);

    expect(notificationService.listNotifications).toHaveBeenCalledWith("user-1", req.query);
    expect(sendSuccess).toHaveBeenCalledWith(res, payload);
});

test("controller delegates service errors to handleError", async () => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("Notification not found");
    error.statusCode = 404;
    notificationService.deleteNotification.mockRejectedValue(error);

    await controller.deleteNotification(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
        success: false,
        message: "Notification not found"
    });
});
