jest.mock("../../src/modules/overview/overview.service", () => ({
    activity: jest.fn()
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

const overviewService = require("../../src/modules/overview/overview.service");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/overview/overview.controller");

const createResponse = () => {
    const res = {
        statusCode: null,
        body: null
    };

    res.set = jest.fn(() => res);
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

test("activity returns feed and sets cache-control header", async () => {
    const req = { user: { _id: "user-1" } };
    const res = createResponse();
    const feed = [{ id: "node-1", type: "chat" }];
    overviewService.activity.mockResolvedValue(feed);

    await controller.activity(req, res);

    expect(overviewService.activity).toHaveBeenCalledWith("user-1");
    expect(res.set).toHaveBeenCalledWith("Cache-Control", "private, max-age=15");
    expect(sendSuccess).toHaveBeenCalledWith(res, feed);
    expect(res.statusCode).toBe(200);
});

test("activity delegates service errors to handleError", async () => {
    const req = { user: { _id: "user-1" } };
    const res = createResponse();
    const error = new Error("overview failed");
    error.statusCode = 503;
    overviewService.activity.mockRejectedValue(error);

    await controller.activity(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
        success: false,
        message: "overview failed"
    });
});
