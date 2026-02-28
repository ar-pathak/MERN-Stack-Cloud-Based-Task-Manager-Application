jest.mock("mongoose", () => ({
    startSession: jest.fn()
}));

jest.mock("../../src/models/follow", () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
    exists: jest.fn(),
    checkRelationship: jest.fn(),
    checkMultipleRelationships: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn(),
    setFollowRequestNotificationState: jest.fn()
}));

const mongoose = require("mongoose");
const Follow = require("../../src/models/follow");
const User = require("../../src/models/user");
const notificationService = require("../../src/modules/notification/notification.service");
const followService = require("../../src/modules/follow/follow.service");

const createSession = () => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn()
});

const mockSelectSession = (value) => ({
    select: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(value)
    })
});

const mockSelectLean = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const mockSessionQuery = (value) => ({
    session: jest.fn().mockResolvedValue(value)
});

const mockFindListQuery = (value) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
    distinct: jest.fn().mockResolvedValue(value)
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("followUser rejects missing ids", async () => {
    await expect(followService.followUser(null, "u2"))
        .rejects
        .toMatchObject({ message: "User IDs are required", statusCode: 400 });
});

test("followUser rejects self follow", async () => {
    await expect(followService.followUser("u1", "u1"))
        .rejects
        .toMatchObject({ message: "You cannot follow yourself", statusCode: 400 });
});

test("followUser creates approved follow for public account", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);

    User.findById
        .mockReturnValueOnce(mockSelectSession({
            _id: "u1",
            name: "Alice",
            username: "alice",
            accountStatus: "active",
            blockedUsers: []
        }))
        .mockReturnValueOnce(mockSelectSession({
            _id: "u2",
            name: "Bob",
            username: "bob",
            accountStatus: "active",
            isPrivate: false,
            blockedUsers: [],
            preferences: { notifications: { follows: true } }
        }));
    Follow.findOne
        .mockReturnValueOnce(mockSessionQuery(null))
        .mockReturnValueOnce(mockSessionQuery(null));
    Follow.create.mockResolvedValue([{ _id: "follow-1" }]);
    User.findByIdAndUpdate.mockResolvedValue({});
    notificationService.createNotifications.mockResolvedValue([{ _id: "n1" }]);

    const result = await followService.followUser("u1", "u2");

    expect(result).toEqual({ success: true, isPending: false });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        { $inc: { followingCount: 1 } },
        { session }
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u2",
        { $inc: { followersCount: 1 } },
        { session }
    );
    expect(notificationService.createNotifications).toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
});

test("followUser creates pending follow for private account without count increment", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);

    User.findById
        .mockReturnValueOnce(mockSelectSession({
            _id: "u1",
            username: "alice",
            accountStatus: "active",
            blockedUsers: []
        }))
        .mockReturnValueOnce(mockSelectSession({
            _id: "u2",
            username: "bob",
            accountStatus: "active",
            isPrivate: true,
            blockedUsers: [],
            preferences: { notifications: { follows: true } }
        }));
    Follow.findOne
        .mockReturnValueOnce(mockSessionQuery(null))
        .mockReturnValueOnce(mockSessionQuery(null));
    Follow.create.mockResolvedValue([{ _id: "follow-2" }]);

    const result = await followService.followUser("u1", "u2");

    expect(result).toEqual({ success: true, isPending: true });
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(notificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
            title: "Follow request"
        })
    );
});

test("unfollowUser removes approved relation and decrements counts", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);

    Follow.findOne.mockReturnValue(mockSessionQuery({
        _id: "follow-1",
        isApproved: true
    }));
    Follow.findByIdAndDelete.mockReturnValue(mockSessionQuery({}));
    User.findByIdAndUpdate.mockResolvedValue({});

    const result = await followService.unfollowUser("u1", "u2");

    expect(result).toEqual({ success: true });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        { $inc: { followingCount: -1 } },
        { session }
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u2",
        { $inc: { followersCount: -1 } },
        { session }
    );
});

test("unfollowUser updates pending request notification state when relation is pending", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);

    Follow.findOne.mockReturnValue(mockSessionQuery({
        _id: "request-1",
        isApproved: false
    }));
    Follow.findByIdAndDelete.mockReturnValue(mockSessionQuery({}));

    const result = await followService.unfollowUser("u1", "u2");

    expect(result).toEqual({ success: true });
    expect(notificationService.setFollowRequestNotificationState).toHaveBeenCalledWith({
        recipientUserId: "u2",
        requestId: "request-1",
        requestState: "cancelled",
        read: true
    });
});

test("checkIsFollowing returns false for invalid ids", async () => {
    const result = await followService.checkIsFollowing(null, "u2");
    expect(result).toEqual({ isFollowing: false, isApproved: false });
    expect(Follow.checkRelationship).not.toHaveBeenCalled();
});

test("getPendingRequests returns empty response for public accounts", async () => {
    User.findById.mockReturnValue(mockSelectLean({
        accountStatus: "active",
        isPrivate: false
    }));

    const result = await followService.getPendingRequests("u1", 2, 10);

    expect(result).toEqual({
        requests: [],
        pagination: {
            page: 2,
            limit: 10,
            total: 0,
            pages: 1,
            hasMore: false
        }
    });
});

test("getPendingRequests returns paginated request list for private account", async () => {
    User.findById.mockReturnValue(mockSelectLean({
        accountStatus: "active",
        isPrivate: true
    }));
    Follow.countDocuments.mockResolvedValue(3);
    Follow.find.mockReturnValue(mockFindListQuery([
        {
            _id: "req-1",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            follower: { _id: "u2", username: "bob", name: "Bob", avatar: "a.png", isVerified: false }
        }
    ]));

    const result = await followService.getPendingRequests("u1", 1, 2);

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0]).toEqual(expect.objectContaining({
        _id: "u2",
        username: "bob",
        requestId: "req-1"
    }));
    expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        pages: 2,
        hasMore: true
    });
});

test("approveFollowRequest returns 404 when request is missing", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Follow.findOne.mockReturnValue(mockSessionQuery(null));

    await expect(followService.approveFollowRequest("u1", "req-1"))
        .rejects
        .toMatchObject({ message: "Follow request not found", statusCode: 404 });
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("rejectFollowRequest removes request and returns success", async () => {
    Follow.findOne.mockResolvedValue({
        _id: "req-1",
        following: "u1",
        isApproved: false
    });
    Follow.findByIdAndDelete.mockResolvedValue({});

    const result = await followService.rejectFollowRequest("u1", "req-1");

    expect(result).toEqual({ success: true });
    expect(notificationService.setFollowRequestNotificationState).toHaveBeenCalledWith({
        recipientUserId: "u1",
        requestId: "req-1",
        requestState: "rejected",
        read: true
    });
});
