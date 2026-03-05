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
    jest.restoreAllMocks();
    jest.resetAllMocks();
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

test("assertCanViewConnections rejects unauthenticated access", async () => {
    await expect(followService.assertCanViewConnections("u2", null))
        .rejects
        .toMatchObject({ message: "Authentication required", statusCode: 401 });
});

test("getFollowers returns paginated relationship-aware follower list", async () => {
    jest.spyOn(followService, "assertCanViewConnections").mockResolvedValue(undefined);
    Follow.countDocuments.mockResolvedValue(2);
    Follow.find
        .mockReturnValueOnce(mockFindListQuery([
            {
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                follower: { _id: "u2", username: "bob", name: "Bob" }
            },
            {
                createdAt: new Date("2026-01-02T00:00:00.000Z"),
                follower: { _id: "u3", username: "cat", name: "Cat" }
            }
        ]))
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([{ follower: "u3" }])
            })
        });
    Follow.checkMultipleRelationships.mockResolvedValue({ u2: true, u3: false });

    const result = await followService.getFollowers("target-1", "viewer-1", 1, 10);

    expect(result.followers).toEqual([
        expect.objectContaining({
            _id: "u2",
            isFollowing: true,
            isFollowedBy: false
        }),
        expect.objectContaining({
            _id: "u3",
            isFollowing: false,
            isFollowedBy: true
        })
    ]);
    expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
        hasMore: false
    });
});

test("getFollowing marks current user's own following entries as followed", async () => {
    jest.spyOn(followService, "assertCanViewConnections").mockResolvedValue(undefined);
    Follow.countDocuments.mockResolvedValue(1);
    Follow.find
        .mockReturnValueOnce(mockFindListQuery([
            {
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                following: { _id: "u2", username: "bob" }
            }
        ]))
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([])
            })
        });

    const result = await followService.getFollowing("u1", "u1", 1, 10);

    expect(result.following).toEqual([
        expect.objectContaining({
            _id: "u2",
            isFollowing: true,
            isFollowedBy: false
        })
    ]);
    expect(Follow.checkMultipleRelationships).not.toHaveBeenCalled();
});

test("getMutualFollowers returns empty list when private profile blocks access", async () => {
    jest.spyOn(followService, "assertCanViewConnections")
        .mockRejectedValue({ statusCode: 403, message: "This account is private" });

    const result = await followService.getMutualFollowers("u1", "u2");

    expect(result).toEqual([]);
});

test("getFollowSuggestions excludes users already followed", async () => {
    const asId = (id) => ({ equals: (other) => String(other) === id, toString: () => id });

    Follow.find
        .mockReturnValueOnce({
            distinct: jest.fn().mockResolvedValue(["u2", "u3"])
        })
        .mockReturnValueOnce({
            distinct: jest.fn().mockResolvedValue([asId("u4")])
        });
    Follow.aggregate.mockResolvedValue([
        { _id: "u4", count: 2 },
        { _id: "u5", count: 1 }
    ]);
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                { _id: "u5", username: "eve", accountStatus: "active" }
            ])
        })
    });

    const result = await followService.getFollowSuggestions("u1", 5);

    expect(result).toEqual([
        expect.objectContaining({ _id: "u5", username: "eve" })
    ]);
});

test("removeFollower removes approved relation and decrements counters", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Follow.findOne.mockReturnValue(mockSessionQuery({
        _id: "follow-1",
        follower: "u2",
        following: "u1",
        isApproved: true
    }));
    Follow.findByIdAndDelete.mockReturnValue(mockSessionQuery({}));
    User.findByIdAndUpdate.mockResolvedValue({});

    const result = await followService.removeFollower("u1", "u2");

    expect(result).toEqual({ success: true });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u2",
        { $inc: { followingCount: -1 } },
        { session }
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        { $inc: { followersCount: -1 } },
        { session }
    );
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

test("followUser rejects when either side has blocked the other", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById
        .mockReturnValueOnce(mockSelectSession({
            _id: "u1",
            username: "alice",
            accountStatus: "active",
            blockedUsers: ["u2"]
        }))
        .mockReturnValueOnce(mockSelectSession({
            _id: "u2",
            username: "bob",
            accountStatus: "active",
            isPrivate: false,
            blockedUsers: [],
            preferences: { notifications: { follows: true } }
        }));

    await expect(followService.followUser("u1", "u2"))
        .rejects
        .toMatchObject({ message: "Unblock this user before following", statusCode: 403 });
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);

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
            isPrivate: false,
            blockedUsers: ["u1"],
            preferences: { notifications: { follows: true } }
        }));

    await expect(followService.followUser("u1", "u2"))
        .rejects
        .toMatchObject({ message: "You cannot follow this user", statusCode: 403 });
});

test("followUser rejects when relationship is already active and approved", async () => {
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
            isPrivate: false,
            blockedUsers: [],
            preferences: { notifications: { follows: true } }
        }));
    Follow.findOne
        .mockReturnValueOnce(mockSessionQuery(null))
        .mockReturnValueOnce(mockSessionQuery({
            _id: "f-1",
            status: "active",
            isApproved: true
        }));

    await expect(followService.followUser("u1", "u2"))
        .rejects
        .toMatchObject({ message: "Already following this user", statusCode: 409 });
});

test("followUser rejects when relationship is already pending", async () => {
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
            isPrivate: false,
            blockedUsers: [],
            preferences: { notifications: { follows: true } }
        }));
    Follow.findOne
        .mockReturnValueOnce(mockSessionQuery(null))
        .mockReturnValueOnce(mockSessionQuery({
            _id: "f-2",
            status: "active",
            isApproved: false
        }));

    await expect(followService.followUser("u1", "u2"))
        .rejects
        .toMatchObject({ message: "Follow request already pending", statusCode: 409 });
});

test("followUser reactivates inactive relation and increments counters for public profile", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    const existing = {
        _id: "f-3",
        status: "inactive",
        isApproved: false,
        save: jest.fn().mockResolvedValue(undefined)
    };
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
            username: "bob",
            accountStatus: "active",
            isPrivate: false,
            blockedUsers: [],
            preferences: { notifications: { follows: true } }
        }));
    Follow.findOne
        .mockReturnValueOnce(mockSessionQuery(null))
        .mockReturnValueOnce(mockSessionQuery(existing));
    User.findByIdAndUpdate.mockResolvedValue({});

    const result = await followService.followUser("u1", "u2");

    expect(result).toEqual({ success: true, isPending: false });
    expect(existing.status).toBe("active");
    expect(existing.isApproved).toBe(true);
    expect(existing.save).toHaveBeenCalledWith({ session });
    expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(2);
});

test("followUser skips notification delivery when follows notifications are disabled", async () => {
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
            username: "bob",
            accountStatus: "active",
            isPrivate: false,
            blockedUsers: [],
            preferences: { notifications: { follows: false } }
        }));
    Follow.findOne
        .mockReturnValueOnce(mockSessionQuery(null))
        .mockReturnValueOnce(mockSessionQuery(null));
    Follow.create.mockResolvedValue([{ _id: "f-4" }]);
    User.findByIdAndUpdate.mockResolvedValue({});

    const result = await followService.followUser("u1", "u2");

    expect(result).toEqual({ success: true, isPending: false });
    expect(notificationService.createNotifications).not.toHaveBeenCalled();
});

test("unfollowUser validates ids and not-following condition", async () => {
    await expect(followService.unfollowUser(null, "u2"))
        .rejects
        .toMatchObject({ message: "User IDs are required", statusCode: 400 });
    await expect(followService.unfollowUser("u1", "u1"))
        .rejects
        .toMatchObject({ message: "Invalid operation", statusCode: 400 });

    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Follow.findOne.mockReturnValue(mockSessionQuery(null));

    await expect(followService.unfollowUser("u1", "u2"))
        .rejects
        .toMatchObject({ message: "You are not following this user", statusCode: 404 });
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("unfollowUser swallows follow-request notification update failures", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Follow.findOne.mockReturnValueOnce(mockSessionQuery({
        _id: "request-2",
        isApproved: false
    }));
    Follow.findByIdAndDelete.mockReturnValue(mockSessionQuery({}));
    notificationService.setFollowRequestNotificationState.mockRejectedValue(new Error("notify down"));

    const result = await followService.unfollowUser("u1", "u2");

    expect(result).toEqual({ success: true });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
});

test("assertCanViewConnections allows self-view without extra lookups", async () => {
    await expect(followService.assertCanViewConnections("u1", "u1"))
        .resolves
        .toBeUndefined();
    expect(User.findById).not.toHaveBeenCalled();
});

test("assertCanViewConnections blocks access to private profiles when requester is not approved", async () => {
    User.findById
        .mockReturnValueOnce(mockSelectLean({
            _id: "u2",
            accountStatus: "active",
            isPrivate: true,
            blockedUsers: []
        }))
        .mockReturnValueOnce(mockSelectLean({
            _id: "u1",
            accountStatus: "active",
            blockedUsers: []
        }));
    Follow.exists.mockResolvedValue(false);

    await expect(followService.assertCanViewConnections("u2", "u1"))
        .rejects
        .toMatchObject({ message: "This account is private", statusCode: 403 });
});

test("assertCanViewConnections blocks access when users blocked each other", async () => {
    User.findById
        .mockReturnValueOnce(mockSelectLean({
            _id: "u2",
            accountStatus: "active",
            isPrivate: false,
            blockedUsers: ["u1"]
        }))
        .mockReturnValueOnce(mockSelectLean({
            _id: "u1",
            accountStatus: "active",
            blockedUsers: []
        }));
    await expect(followService.assertCanViewConnections("u2", "u1"))
        .rejects
        .toMatchObject({ message: "You cannot view this profile", statusCode: 403 });
});

test("getFollowing fetches relationship state for non-self requester", async () => {
    jest.spyOn(followService, "assertCanViewConnections").mockResolvedValue(undefined);
    Follow.countDocuments.mockResolvedValue(2);
    Follow.find
        .mockReturnValueOnce(mockFindListQuery([
            {
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                following: { _id: "u2", username: "bob" }
            },
            {
                createdAt: new Date("2026-01-02T00:00:00.000Z"),
                following: { _id: "u3", username: "cat" }
            }
        ]))
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([{ follower: "u3" }])
            })
        });
    Follow.checkMultipleRelationships.mockResolvedValue({ u2: true, u3: false });

    const result = await followService.getFollowing("target-1", "viewer-1", 1, 10);

    expect(Follow.checkMultipleRelationships).toHaveBeenCalledWith("viewer-1", ["u2", "u3"]);
    expect(result.following).toEqual([
        expect.objectContaining({ _id: "u2", isFollowing: true, isFollowedBy: false }),
        expect.objectContaining({ _id: "u3", isFollowing: false, isFollowedBy: true })
    ]);
});

test("getMutualFollowers rethrows non-private authorization failures", async () => {
    jest.spyOn(followService, "assertCanViewConnections")
        .mockRejectedValue({ statusCode: 403, message: "You cannot view this profile" });

    await expect(followService.getMutualFollowers("u1", "u2"))
        .rejects
        .toMatchObject({ message: "You cannot view this profile", statusCode: 403 });
});

test("removeFollower throws when follower relation is missing", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Follow.findOne.mockReturnValue(mockSessionQuery(null));

    await expect(followService.removeFollower("u1", "u2"))
        .rejects
        .toMatchObject({ message: "This user is not following you", statusCode: 404 });
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("approveFollowRequest approves and notifies requester", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    const followRequest = {
        _id: "req-2",
        follower: "u2",
        isApproved: false,
        save: jest.fn().mockResolvedValue(undefined)
    };
    Follow.findOne.mockReturnValue(mockSessionQuery(followRequest));
    User.findById
        .mockReturnValueOnce(mockSelectSession({
            _id: "u1",
            name: "Alice",
            username: "alice",
            blockedUsers: []
        }))
        .mockReturnValueOnce(mockSelectSession({
            _id: "u2",
            name: "Bob",
            username: "bob",
            blockedUsers: [],
            preferences: { notifications: { follows: true } }
        }));
    User.findByIdAndUpdate.mockResolvedValue({});

    const result = await followService.approveFollowRequest("u1", "req-2");

    expect(result).toEqual({ success: true });
    expect(followRequest.isApproved).toBe(true);
    expect(notificationService.setFollowRequestNotificationState).toHaveBeenCalledWith({
        recipientUserId: "u1",
        requestId: "req-2",
        requestState: "approved",
        read: true
    });
    expect(notificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
            recipientIds: ["u2"],
            title: "Follow request accepted"
        })
    );
});

test("approveFollowRequest blocks approval when users have blocked each other", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Follow.findOne.mockReturnValue(mockSessionQuery({
        _id: "req-3",
        follower: "u2",
        isApproved: false
    }));
    User.findById
        .mockReturnValueOnce(mockSelectSession({
            _id: "u1",
            blockedUsers: ["u2"]
        }))
        .mockReturnValueOnce(mockSelectSession({
            _id: "u2",
            blockedUsers: [],
            preferences: { notifications: { follows: true } }
        }));

    await expect(followService.approveFollowRequest("u1", "req-3"))
        .rejects
        .toMatchObject({
            message: "Cannot approve request because one of you has blocked the other",
            statusCode: 403
        });
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("rejectFollowRequest handles not-found and notification-update errors", async () => {
    Follow.findOne.mockResolvedValueOnce(null);
    await expect(followService.rejectFollowRequest("u1", "req-missing"))
        .rejects
        .toMatchObject({ message: "Follow request not found", statusCode: 404 });

    Follow.findOne.mockResolvedValueOnce({
        _id: "req-4",
        following: "u1",
        isApproved: false
    });
    Follow.findByIdAndDelete.mockResolvedValue({});
    notificationService.setFollowRequestNotificationState.mockRejectedValue(new Error("notify down"));

    const result = await followService.rejectFollowRequest("u1", "req-4");
    expect(result).toEqual({ success: true });
});
