jest.mock("../../src/modules/activity/activity.service", () => ({
    listMyActivities: jest.fn(),
    getMyActivityDashboard: jest.fn(),
    getAdvancedDashboard: jest.fn()
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

const activityService = require("../../src/modules/activity/activity.service");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const activityController = require("../../src/modules/activity/activity.controller");

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

beforeEach(() => {
    jest.clearAllMocks();
});

test("listMyActivities returns service result via sendSuccess", async () => {
    const result = {
        activities: [{ _id: "act-1" }],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasMore: false }
    };
    activityService.listMyActivities.mockResolvedValue(result);

    const req = {
        user: { _id: "user-1" },
        query: { page: "1", limit: "25" }
    };
    const res = createResponse();

    await activityController.listMyActivities(req, res);

    expect(activityService.listMyActivities).toHaveBeenCalledWith("user-1", req.query);
    expect(sendSuccess).toHaveBeenCalledWith(res, result);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
});

test("listMyActivities delegates thrown error to handleError", async () => {
    const error = new Error("User not found");
    error.statusCode = 404;
    activityService.listMyActivities.mockRejectedValue(error);

    const req = {
        user: { _id: "user-1" },
        query: {}
    };
    const res = createResponse();

    await activityController.listMyActivities(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
        success: false,
        message: "User not found"
    });
});

test("getMyActivityDashboard returns service payload", async () => {
    const dashboard = {
        likes: { count: 0, items: [] },
        comments: { count: 0, items: [] },
        reposts: { count: 0, items: [] }
    };
    activityService.getMyActivityDashboard.mockResolvedValue(dashboard);

    const req = {
        user: { _id: "user-1" },
        query: { limit: "5" }
    };
    const res = createResponse();

    await activityController.getMyActivityDashboard(req, res);

    expect(activityService.getMyActivityDashboard).toHaveBeenCalledWith("user-1", req.query);
    expect(sendSuccess).toHaveBeenCalledWith(res, dashboard);
    expect(res.statusCode).toBe(200);
});

test("getAdvancedDashboard returns service payload", async () => {
    const advanced = {
        rangeDays: 7,
        social: {},
        productivity: {},
        activity: {},
        creator: {}
    };
    activityService.getAdvancedDashboard.mockResolvedValue(advanced);

    const req = {
        user: { _id: "user-1" },
        query: { days: "7" }
    };
    const res = createResponse();

    await activityController.getAdvancedDashboard(req, res);

    expect(activityService.getAdvancedDashboard).toHaveBeenCalledWith("user-1", req.query);
    expect(sendSuccess).toHaveBeenCalledWith(res, advanced);
    expect(res.statusCode).toBe(200);
});
