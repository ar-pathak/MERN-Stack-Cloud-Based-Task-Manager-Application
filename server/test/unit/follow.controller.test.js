jest.mock("../../src/modules/follow/follow.service", () => ({
    followUser: jest.fn(),
    unfollowUser: jest.fn(),
    getFollowers: jest.fn(),
    getFollowing: jest.fn(),
    checkIsFollowing: jest.fn(),
    getMutualFollowers: jest.fn(),
    getFollowSuggestions: jest.fn(),
    removeFollower: jest.fn(),
    getPendingRequests: jest.fn(),
    approveFollowRequest: jest.fn(),
    rejectFollowRequest: jest.fn()
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

const followService = require("../../src/modules/follow/follow.service");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/follow/follow.controller");

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
    params: { id: "user-2", requestId: "request-1" },
    query: { page: "2", limit: "10" }
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("follow sends pending-request success message", async () => {
    const req = baseReq();
    const res = createResponse();
    followService.followUser.mockResolvedValue({ success: true, isPending: true });

    await controller.follow(req, res);

    expect(followService.followUser).toHaveBeenCalledWith("user-1", "user-2");
    expect(sendSuccess).toHaveBeenCalledWith(
        res,
        { success: true, isPending: true },
        "Follow request sent successfully"
    );
});

test("follow sends direct-follow success message", async () => {
    const req = baseReq();
    const res = createResponse();
    followService.followUser.mockResolvedValue({ success: true, isPending: false });

    await controller.follow(req, res);

    expect(sendSuccess).toHaveBeenCalledWith(
        res,
        { success: true, isPending: false },
        "User followed successfully"
    );
});

test.each([
    ["unfollow", "unfollowUser", (req) => [req.user._id, req.params.id], null, "User unfollowed successfully"],
    ["getFollowers", "getFollowers", (req) => [req.params.id, req.user._id, 2, 10], { followers: [] }, "Followers list retrieved"],
    ["getFollowing", "getFollowing", (req) => [req.params.id, req.user._id, 2, 10], { following: [] }, "Following list retrieved"],
    ["checkFollowStatus", "checkIsFollowing", (req) => [req.user._id, req.params.id], { isFollowing: true }, "Follow status retrieved"],
    ["removeFollower", "removeFollower", (req) => [req.user._id, req.params.id], null, "Follower removed successfully"],
    ["getPendingRequests", "getPendingRequests", (req) => [req.user._id, 2, 10], { requests: [] }, "Pending requests retrieved"],
    ["approveFollowRequest", "approveFollowRequest", (req) => [req.user._id, req.params.requestId], null, "Follow request approved"],
    ["rejectFollowRequest", "rejectFollowRequest", (req) => [req.user._id, req.params.requestId], null, "Follow request rejected"]
])("%s forwards args and returns expected success message", async (handlerName, serviceMethod, argsGetter, payload, message) => {
    const req = baseReq();
    const res = createResponse();
    followService[serviceMethod].mockResolvedValue(payload);

    await controller[handlerName](req, res);

    expect(followService[serviceMethod]).toHaveBeenCalledWith(...argsGetter(req));
    expect(sendSuccess).toHaveBeenCalledWith(res, payload, message);
    expect(res.statusCode).toBe(200);
});

test("getFollowSuggestions wraps suggestions list inside data payload", async () => {
    const req = baseReq();
    const res = createResponse();
    const suggestions = [{ _id: "u3" }];
    followService.getFollowSuggestions.mockResolvedValue(suggestions);

    await controller.getFollowSuggestions(req, res);

    expect(followService.getFollowSuggestions).toHaveBeenCalledWith("user-1", 10);
    expect(sendSuccess).toHaveBeenCalledWith(
        res,
        { suggestions },
        "Follow suggestions retrieved"
    );
});

test("getFollowers/getFollowing apply default pagination when query values are absent", async () => {
    const req = {
        user: { _id: "user-1" },
        params: { id: "user-2" },
        query: {}
    };
    const res = createResponse();
    followService.getFollowers.mockResolvedValue({ followers: [] });
    followService.getFollowing.mockResolvedValue({ following: [] });

    await controller.getFollowers(req, res);
    await controller.getFollowing(req, res);

    expect(followService.getFollowers).toHaveBeenCalledWith("user-2", "user-1", 1, 20);
    expect(followService.getFollowing).toHaveBeenCalledWith("user-2", "user-1", 1, 20);
});

test("getFollowSuggestions and getPendingRequests apply default limits/pages", async () => {
    const req = {
        user: { _id: "user-1" },
        params: { id: "user-2" },
        query: {}
    };
    const res = createResponse();
    followService.getFollowSuggestions.mockResolvedValue([]);
    followService.getPendingRequests.mockResolvedValue({ requests: [] });

    await controller.getFollowSuggestions(req, res);
    await controller.getPendingRequests(req, res);

    expect(followService.getFollowSuggestions).toHaveBeenCalledWith("user-1", 10);
    expect(followService.getPendingRequests).toHaveBeenCalledWith("user-1", 1, 20);
});

test("getMutualFollowers wraps list and count in response data", async () => {
    const req = baseReq();
    const res = createResponse();
    followService.getMutualFollowers.mockResolvedValue([
        { _id: "u5", username: "jane" },
        { _id: "u6", username: "mike" }
    ]);

    await controller.getMutualFollowers(req, res);

    expect(followService.getMutualFollowers).toHaveBeenCalledWith("user-1", "user-2");
    expect(sendSuccess).toHaveBeenCalledWith(
        res,
        {
            mutualFollowers: [
                { _id: "u5", username: "jane" },
                { _id: "u6", username: "mike" }
            ],
            count: 2
        },
        "Mutual followers retrieved"
    );
});

test("controller delegates service errors to handleError", async () => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("forbidden");
    error.statusCode = 403;
    followService.removeFollower.mockRejectedValue(error);

    await controller.removeFollower(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
        success: false,
        message: "forbidden"
    });
});

test.each([
    ["follow", "followUser"],
    ["unfollow", "unfollowUser"],
    ["getFollowers", "getFollowers"],
    ["getFollowing", "getFollowing"],
    ["checkFollowStatus", "checkIsFollowing"],
    ["getMutualFollowers", "getMutualFollowers"],
    ["getFollowSuggestions", "getFollowSuggestions"],
    ["getPendingRequests", "getPendingRequests"],
    ["approveFollowRequest", "approveFollowRequest"],
    ["rejectFollowRequest", "rejectFollowRequest"]
])("%s forwards service failures to handleError", async (handlerName, serviceMethod) => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error(`${handlerName} failed`);
    error.statusCode = 422;

    followService[serviceMethod].mockRejectedValue(error);

    await controller[handlerName](req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(422);
});
