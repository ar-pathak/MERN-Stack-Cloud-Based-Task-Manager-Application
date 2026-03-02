jest.mock("../../src/modules/user/user.service", () => ({
    getUserInfo: jest.fn(),
    updateProfile: jest.fn(),
    getPublicProfile: jest.fn(),
    searchUsers: jest.fn(),
    searchMentionCandidates: jest.fn(),
    updatePreferences: jest.fn(),
    getBlockedUsers: jest.fn(),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    checkUsernameAvailability: jest.fn(),
    getUserStats: jest.fn(),
    updateActivity: jest.fn(),
    deactivateAccount: jest.fn(),
    getPopularUsers: jest.fn()
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

const userService = require("../../src/modules/user/user.service");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/user/user.controller");

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
    params: { id: "user-2", username: "alice" },
    query: {
        query: "ali",
        page: "2",
        limit: "15",
        chatId: "chat-1"
    },
    body: {
        name: "Alice",
        isOnline: false,
        preferences: { privacy: { showEmail: false } }
    }
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("getMyProfile returns wrapped user profile payload", async () => {
    const req = baseReq();
    const res = createResponse();
    const profile = { _id: "user-1", username: "alice" };
    userService.getUserInfo.mockResolvedValue(profile);

    await controller.getMyProfile(req, res);

    expect(userService.getUserInfo).toHaveBeenCalledWith("user-1");
    expect(sendSuccess).toHaveBeenCalledWith(res, { user: profile }, "User profile retrieved");
});

test("updateProfile sends result as-is when service returns user + metadata", async () => {
    const req = baseReq();
    const res = createResponse();
    const payload = {
        user: { _id: "user-1", name: "Alice" },
        privacySync: { autoApprovedFollowRequests: 2 }
    };
    userService.updateProfile.mockResolvedValue(payload);

    await controller.updateProfile(req, res);

    expect(userService.updateProfile).toHaveBeenCalledWith("user-1", req.body);
    expect(sendSuccess).toHaveBeenCalledWith(res, payload, "Profile updated successfully");
});

test("updateProfile wraps legacy service payload under user key", async () => {
    const req = baseReq();
    const res = createResponse();
    const userPayload = { _id: "user-1", name: "Alice" };
    userService.updateProfile.mockResolvedValue(userPayload);

    await controller.updateProfile(req, res);

    expect(sendSuccess).toHaveBeenCalledWith(
        res,
        { user: userPayload },
        "Profile updated successfully"
    );
});

test.each([
    [
        "getUserById",
        "getPublicProfile",
        (req) => [req.params.id, req.user._id],
        { _id: "user-2", username: "target" },
        (res, payload) => [res, { user: payload }, "User profile found"]
    ],
    [
        "searchUsers",
        "searchUsers",
        (req) => [req.query.query, 2, 15, req.user._id],
        { users: [] },
        (res, payload) => [res, payload, "Search results retrieved"]
    ],
    [
        "searchMentions",
        "searchMentionCandidates",
        (req) => [req.query.query, req.user._id, req.query],
        { users: [{ _id: "user-2" }] },
        (res, payload) => [res, payload, "Mention candidates retrieved"]
    ],
    [
        "updatePreferences",
        "updatePreferences",
        (req) => [req.user._id, req.body],
        { privacy: { showEmail: false } },
        (res, payload) => [res, { preferences: payload }, "Preferences updated"]
    ],
    [
        "getBlockedUsers",
        "getBlockedUsers",
        (req) => [req.user._id, 2, 15],
        { users: [] },
        (res, payload) => [res, payload, "Blocked users retrieved"]
    ],
    [
        "blockUser",
        "blockUser",
        (req) => [req.user._id, req.params.id],
        { success: true },
        (res, payload) => [res, payload, "User blocked successfully"]
    ],
    [
        "unblockUser",
        "unblockUser",
        (req) => [req.user._id, req.params.id],
        { success: true },
        (res, payload) => [res, payload, "User unblocked successfully"]
    ],
    [
        "checkUsername",
        "checkUsernameAvailability",
        (req) => [req.params.username],
        { available: true, username: "alice" },
        (res, payload) => [res, payload, "Username availability checked"]
    ],
    [
        "getUserStats",
        "getUserStats",
        (req) => [req.params.id],
        { posts: 10 },
        (res, payload) => [res, { stats: payload }, "User statistics retrieved"]
    ],
    [
        "updateActivity",
        "updateActivity",
        (req) => [req.user._id, req.body.isOnline],
        undefined,
        (res) => [res, null, "Activity updated"]
    ],
    [
        "deactivateAccount",
        "deactivateAccount",
        (req) => [req.user._id],
        { success: true },
        (res, payload) => [res, payload, "Account deactivated"]
    ],
    [
        "getPopularUsers",
        "getPopularUsers",
        (req) => [15],
        [{ _id: "user-2", followersCount: 20 }],
        (res, payload) => [res, { users: payload }, "Popular users retrieved"]
    ]
])(
    "%s forwards args and returns expected success response",
    async (handlerName, serviceMethod, argsGetter, payload, successArgsGetter) => {
        const req = baseReq();
        const res = createResponse();
        userService[serviceMethod].mockResolvedValue(payload);

        await controller[handlerName](req, res);

        expect(userService[serviceMethod]).toHaveBeenCalledWith(...argsGetter(req));
        expect(sendSuccess).toHaveBeenCalledWith(...successArgsGetter(res, payload));
        expect(res.statusCode).toBe(200);
    }
);

test("controller delegates service errors to handleError", async () => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("forbidden");
    error.statusCode = 403;
    userService.blockUser.mockRejectedValue(error);

    await controller.blockUser(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
        success: false,
        message: "forbidden"
    });
});
