jest.mock("mongoose", () => ({
    startSession: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    isUsernameAvailable: jest.fn()
}));

jest.mock("../../src/models/follow", () => ({
    checkRelationship: jest.fn(),
    checkMultipleRelationships: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn()
}));

jest.mock("../../src/models/chat", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/subtasks", () => ({
    findById: jest.fn()
}));

const User = require("../../src/models/user");
const Follow = require("../../src/models/follow");
const Chat = require("../../src/models/chat");
const WorkspaceMember = require("../../src/models/workspaceMember");
const Project = require("../../src/models/project");
const Task = require("../../src/models/tasks");
const Subtask = require("../../src/models/subtasks");
const mongoose = require("mongoose");
const userService = require("../../src/modules/user/user.service");

const mockSelectResolved = (value) => ({
    select: jest.fn().mockResolvedValue(value)
});

const mockSelectLean = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const makeFindQuery = (value) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

const mockSelectSession = (value) => ({
    select: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(value)
    })
});

const createSession = () => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn()
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("getUserInfo throws when user is not found", async () => {
    User.findById.mockReturnValue(mockSelectResolved(null));

    await expect(userService.getUserInfo("u1"))
        .rejects
        .toThrow("User not found");
});

test("getUserInfo throws when account is inactive", async () => {
    User.findById.mockReturnValue(mockSelectResolved({
        accountStatus: "suspended"
    }));

    await expect(userService.getUserInfo("u1"))
        .rejects
        .toThrow("Account is not active");
});

test("getUserInfo returns normalized profile json", async () => {
    User.findById.mockReturnValue(mockSelectResolved({
        accountStatus: "active",
        toProfileJSON: () => ({ id: "u1", name: "Alice" })
    }));

    const result = await userService.getUserInfo("u1");

    expect(result).toEqual({ id: "u1", name: "Alice" });
});

test("updatePreferences rejects payload without allowed fields", async () => {
    await expect(userService.updatePreferences("u1", { random: true }))
        .rejects
        .toMatchObject({ message: "No valid preferences provided", statusCode: 400 });
});

test("updatePreferences accepts nested payload and returns updated preferences", async () => {
    User.findByIdAndUpdate.mockReturnValue(mockSelectResolved({
        preferences: {
            notifications: { email: true, likes: false },
            privacy: { showEmail: false }
        }
    }));

    const result = await userService.updatePreferences("u1", {
        preferences: {
            notifications: { email: true, likes: false },
            privacy: { showEmail: false },
            unsupported: { foo: "bar" }
        }
    });

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        {
            $set: {
                "preferences.notifications.email": true,
                "preferences.notifications.likes": false,
                "preferences.privacy.showEmail": false
            }
        },
        { new: true }
    );
    expect(result).toEqual({
        notifications: { email: true, likes: false },
        privacy: { showEmail: false }
    });
});

test("checkUsernameAvailability forwards availability result", async () => {
    User.isUsernameAvailable.mockResolvedValue(true);

    const result = await userService.checkUsernameAvailability("alice");

    expect(result).toEqual({
        available: true,
        username: "alice"
    });
});

test("searchUsers requires non-empty query", async () => {
    await expect(userService.searchUsers("   ", 1, 10))
        .rejects
        .toThrow("Search query is required");
});

test("searchUsers returns relationship-aware results", async () => {
    User.countDocuments.mockResolvedValue(2);
    User.find.mockReturnValue(makeFindQuery([
        { _id: "u2", username: "bob", name: "Bob" },
        { _id: "u3", username: "charlie", name: "Charlie" }
    ]));
    Follow.checkMultipleRelationships.mockResolvedValue({
        u2: true,
        u3: false
    });

    const result = await userService.searchUsers("b", 1, 10, "u1");

    expect(result.users).toEqual([
        { _id: "u2", username: "bob", name: "Bob", isFollowing: true },
        { _id: "u3", username: "charlie", name: "Charlie", isFollowing: false }
    ]);
    expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
        hasMore: false
    });
});

test("getPublicProfile returns private-limited profile for non-follower", async () => {
    User.findById
        .mockReturnValueOnce(mockSelectResolved({
            _id: "u2",
            email: "private@example.com",
            accountStatus: "active",
            isPrivate: true,
            isOnline: true,
            lastSeen: new Date("2026-01-01T00:00:00.000Z"),
            blockedUsers: [],
            preferences: { privacy: { showEmail: true, showOnlineStatus: true } },
            toPublicJSON: () => ({
                _id: "u2",
                username: "private-user",
                bio: "private bio",
                headline: "headline",
                location: "location",
                website: "https://example.com",
                coverImage: "cover.png",
                followersCount: 10,
                followingCount: 4,
                postsCount: 20
            })
        }))
        .mockReturnValueOnce(mockSelectLean({ blockedUsers: [] }));
    Follow.checkRelationship
        .mockResolvedValueOnce({ isFollowing: false, isPending: false })
        .mockResolvedValueOnce({ isFollowing: false, isPending: false });

    const result = await userService.getPublicProfile("u2", "u1");

    expect(result.access.canViewFullProfile).toBe(false);
    expect(result.relationship).toEqual(expect.objectContaining({
        isFollowing: false,
        blockedByMe: false,
        blockedMe: false,
        canMessage: false
    }));
    expect(result.headline).toBe("");
    expect(result.location).toBe("");
    expect(result.followersCount).toBe(0);
    expect(result.postsCount).toBe(0);
});

test("getPublicProfile hides profile details in blocked context", async () => {
    User.findById
        .mockReturnValueOnce(mockSelectResolved({
            _id: "u2",
            email: "blocked@example.com",
            accountStatus: "active",
            isPrivate: false,
            blockedUsers: ["u1"],
            preferences: { privacy: { showEmail: true, showOnlineStatus: true } },
            toPublicJSON: () => ({
                _id: "u2",
                bio: "blocked bio",
                headline: "headline",
                location: "location",
                website: "https://example.com",
                coverImage: "cover.png",
                followersCount: 1,
                followingCount: 1,
                postsCount: 1
            })
        }))
        .mockReturnValueOnce(mockSelectLean({ blockedUsers: [] }));
    Follow.checkRelationship
        .mockResolvedValueOnce({ isFollowing: false, isPending: false })
        .mockResolvedValueOnce({ isFollowing: false, isPending: false });

    const result = await userService.getPublicProfile("u2", "u1");

    expect(result.access.canViewFullProfile).toBe(false);
    expect(result.relationship).toEqual(expect.objectContaining({
        blockedByMe: false,
        blockedMe: true,
        canMessage: false
    }));
    expect(result.bio).toBe("");
    expect(result.headline).toBe("");
});

test("searchMentionCandidates returns empty when requester is outside workspace scope", async () => {
    WorkspaceMember.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ user: "u2" }, { user: "u3" }])
        })
    });

    const result = await userService.searchMentionCandidates("a", "u1", {
        workspaceId: "workspace-1"
    });

    expect(result).toEqual({ users: [] });
    expect(User.find).not.toHaveBeenCalled();
});

test("searchMentionCandidates resolves chat scope members and returns scored list", async () => {
    Chat.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                members: ["u1", "u2", "u3"]
            })
        })
    });
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { _id: "u2", username: "alice", name: "Alice", isOnline: true, preferences: { privacy: {} } },
                    { _id: "u3", username: "alex", name: "Alex", isOnline: false, preferences: { privacy: {} } }
                ])
            })
        })
    });

    const result = await userService.searchMentionCandidates("al", "u1", {
        chatId: "chat-1",
        limit: 2
    });

    expect(result.users).toHaveLength(2);
    expect(result.users[0]).toEqual(expect.objectContaining({ _id: "u2", username: "alice" }));
});

test("autoApprovePendingFollowRequests marks requests approved and increments counts", async () => {
    Follow.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            session: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { _id: "req-1", follower: "u2" },
                    { _id: "req-2", follower: "u3" }
                ])
            })
        })
    });
    Follow.updateMany.mockResolvedValue({});
    User.updateMany.mockResolvedValue({});
    User.findByIdAndUpdate.mockResolvedValue({});

    const result = await userService.autoApprovePendingFollowRequests("u1", { id: "session" });

    expect(result).toEqual({ autoApprovedFollowRequests: 2 });
    expect(Follow.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ["req-1", "req-2"] } },
        { $set: { isApproved: true } },
        { session: { id: "session" } }
    );
    expect(User.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ["u2", "u3"] } },
        { $inc: { followingCount: 1 } },
        { session: { id: "session" } }
    );
});

test("getBlockedUsers throws 404 when current user does not exist", async () => {
    User.findById.mockReturnValue(mockSelectLean(null));

    await expect(userService.getBlockedUsers("u1"))
        .rejects
        .toMatchObject({ message: "User not found", statusCode: 404 });
});

test("getBlockedUsers returns empty page when no blocked ids in requested window", async () => {
    User.findById.mockReturnValue(mockSelectLean({
        blockedUsers: ["u2"]
    }));

    const result = await userService.getBlockedUsers("u1", 2, 10);

    expect(result).toEqual({
        users: [],
        pagination: {
            page: 2,
            limit: 10,
            total: 1,
            pages: 1,
            hasMore: false
        }
    });
});

test("getBlockedUsers returns ordered blocked users", async () => {
    User.findById.mockReturnValue(mockSelectLean({
        blockedUsers: ["u3", "u2", "u4"]
    }));
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                { _id: "u2", username: "bob", accountStatus: "active" },
                { _id: "u3", username: "charlie", accountStatus: "active" },
                { _id: "u4", username: "dave", accountStatus: "active" }
            ])
        })
    });

    const result = await userService.getBlockedUsers("u1", 1, 3);

    expect(result.users.map((entry) => entry._id)).toEqual(["u3", "u2", "u4"]);
    expect(result.pagination.total).toBe(3);
});

test("blockUser rejects self block attempts", async () => {
    await expect(userService.blockUser("u1", "u1"))
        .rejects
        .toMatchObject({ message: "You cannot block yourself", statusCode: 400 });
});

test("blockUser returns alreadyBlocked true when target is already blocked", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById
        .mockReturnValueOnce(mockSelectSession({ _id: "u1", blockedUsers: ["u2"] }))
        .mockReturnValueOnce(mockSelectSession({ _id: "u2", accountStatus: "active" }));

    const result = await userService.blockUser("u1", "u2");

    expect(result).toEqual({ success: true, alreadyBlocked: true });
    expect(Follow.find).not.toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
});

test("blockUser removes approved follow relations and updates counters", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById
        .mockReturnValueOnce(mockSelectSession({ _id: "u1", blockedUsers: [] }))
        .mockReturnValueOnce(mockSelectSession({ _id: "u2", accountStatus: "active" }));
    Follow.find.mockReturnValue({
        session: jest.fn().mockResolvedValue([
            { _id: "f-1", follower: "u1", following: "u2", isApproved: true },
            { _id: "f-2", follower: "u2", following: "u1", isApproved: true }
        ])
    });
    Follow.deleteMany.mockReturnValue({
        session: jest.fn().mockResolvedValue({ deletedCount: 2 })
    });
    User.findByIdAndUpdate.mockResolvedValue({});

    const result = await userService.blockUser("u1", "u2");

    expect(result).toEqual({ success: true, alreadyBlocked: false });
    expect(Follow.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ["f-1", "f-2"] }
    });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        {
            $addToSet: { blockedUsers: "u2" },
            $inc: { followersCount: -1, followingCount: -1 }
        },
        { session }
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u2",
        { $inc: { followersCount: -1, followingCount: -1 } },
        { session }
    );
});

test("unblockUser validates update result and returns success", async () => {
    User.updateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 0 });
    await expect(userService.unblockUser("u1", "u2"))
        .rejects
        .toMatchObject({ message: "User is not in your block list", statusCode: 400 });

    User.updateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });
    const result = await userService.unblockUser("u1", "u2");
    expect(result).toEqual({ success: true });
});

test("autoApprovePendingFollowRequests returns zero when there are no pending requests", async () => {
    Follow.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            session: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([])
            })
        })
    });

    const result = await userService.autoApprovePendingFollowRequests("u1", { id: "session" });

    expect(result).toEqual({ autoApprovedFollowRequests: 0 });
    expect(Follow.updateMany).not.toHaveBeenCalled();
    expect(User.updateMany).not.toHaveBeenCalled();
});

test("getPublicProfile throws when target user does not exist", async () => {
    User.findById.mockReturnValue(mockSelectResolved(null));

    await expect(userService.getPublicProfile("u2", "u1"))
        .rejects
        .toThrow("User not found");
});

test("getPublicProfile throws when target account is inactive", async () => {
    User.findById.mockReturnValue(mockSelectResolved({
        _id: "u2",
        accountStatus: "suspended"
    }));

    await expect(userService.getPublicProfile("u2", "u1"))
        .rejects
        .toThrow("User not found");
});

test("getPublicProfile returns self-view with email and online status", async () => {
    User.findById.mockReturnValue(mockSelectResolved({
        _id: "u1",
        email: "self@example.com",
        accountStatus: "active",
        isPrivate: true,
        isOnline: true,
        lastSeen: new Date("2026-02-01T00:00:00.000Z"),
        blockedUsers: [],
        preferences: { privacy: { showEmail: false, showOnlineStatus: false } },
        toPublicJSON: () => ({
            _id: "u1",
            bio: "my bio",
            headline: "headline",
            location: "location",
            website: "https://example.com",
            coverImage: "cover.png",
            followersCount: 5,
            followingCount: 2,
            postsCount: 7
        })
    }));

    const result = await userService.getPublicProfile("u1", "u1");

    expect(result.access.canViewFullProfile).toBe(true);
    expect(result.email).toBe("self@example.com");
    expect(result.isOnline).toBe(true);
    expect(result.lastSeen).toEqual(new Date("2026-02-01T00:00:00.000Z"));
    expect(result.relationship).toBeUndefined();
    expect(Follow.checkRelationship).not.toHaveBeenCalled();
});

test("updateProfile validates maximum profile field lengths", async () => {
    await expect(userService.updateProfile("u1", { bio: "x".repeat(161) }))
        .rejects
        .toThrow("Bio cannot exceed 160 characters");
    await expect(userService.updateProfile("u1", { headline: "x".repeat(81) }))
        .rejects
        .toThrow("Headline cannot exceed 80 characters");
    await expect(userService.updateProfile("u1", { location: "x".repeat(81) }))
        .rejects
        .toThrow("Location cannot exceed 80 characters");
    await expect(userService.updateProfile("u1", { name: "x".repeat(51) }))
        .rejects
        .toThrow("Name cannot exceed 50 characters");
});

test("updateProfile rejects empty/unsupported update payload", async () => {
    await expect(userService.updateProfile("u1", { unsupported: true }))
        .rejects
        .toMatchObject({ message: "No valid profile fields provided", statusCode: 400 });
});

test("updateProfile aborts and returns 404 when current user is missing", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue(null)
        })
    });

    await expect(userService.updateProfile("u1", { bio: "ok" }))
        .rejects
        .toMatchObject({ message: "User not found", statusCode: 404 });
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("updateProfile auto-approves pending follow requests when account becomes public", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                session: jest.fn().mockResolvedValue({ isPrivate: true })
            })
        })
        .mockReturnValueOnce(mockSelectResolved({
            toProfileJSON: () => ({ id: "u1" })
        }));
    User.findByIdAndUpdate.mockResolvedValue({});
    const autoApproveSpy = jest.spyOn(userService, "autoApprovePendingFollowRequests")
        .mockResolvedValue({ autoApprovedFollowRequests: 3 });

    const result = await userService.updateProfile("u1", { isPrivate: false, bio: "updated" });

    expect(autoApproveSpy).toHaveBeenCalledWith("u1", session);
    expect(result.privacySync).toEqual({ autoApprovedFollowRequests: 3 });
    autoApproveSpy.mockRestore();
});

test("updateProfile throws when user cannot be reloaded after commit", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                session: jest.fn().mockResolvedValue({ isPrivate: false })
            })
        })
        .mockReturnValueOnce(mockSelectResolved(null));
    User.findByIdAndUpdate.mockResolvedValue({});

    await expect(userService.updateProfile("u1", { bio: "updated" }))
        .rejects
        .toMatchObject({ message: "User not found", statusCode: 404 });
});

test("searchUsers returns plain results when current user is not provided", async () => {
    User.countDocuments.mockResolvedValue(1);
    User.find.mockReturnValue(makeFindQuery([
        { _id: "u2", username: "bob", name: "Bob" }
    ]));

    const result = await userService.searchUsers("b", 1, 10);

    expect(Follow.checkMultipleRelationships).not.toHaveBeenCalled();
    expect(result.users).toEqual([{ _id: "u2", username: "bob", name: "Bob" }]);
});

test("searchMentionCandidates handles subtask/task/project scopes and default query scoring", async () => {
    Subtask.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                assignedTo: ["u2"],
                createdBy: "u1",
                task: "task-1"
            })
        })
    });
    Task.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                assignees: ["u3"],
                createdBy: "u4"
            })
        })
    });
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { _id: "u2", username: "alpha", name: "Alpha", isOnline: true, preferences: { privacy: {} } },
                    { _id: "u3", username: "beta", name: "Beta", isOnline: false, preferences: { privacy: { showOnlineStatus: false } } }
                ])
            })
        })
    });

    const scoped = await userService.searchMentionCandidates("", "u1", { subtaskId: "st-1", limit: 2 });

    expect(scoped.users).toHaveLength(2);
    expect(scoped.users[0].username).toBe("alpha");
    expect(scoped.users[1].isOnline).toBe(false);

    Project.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                owner: "u1",
                members: [{ user: "u5" }, { user: "u6" }]
            })
        })
    });
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([])
            })
        })
    });

    const projectScoped = await userService.searchMentionCandidates("x", "u1", { projectId: "p-1" });
    expect(projectScoped).toEqual({ users: [] });
});

test("searchMentionCandidates returns empty when task scope cannot be resolved", async () => {
    Task.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null)
        })
    });

    const result = await userService.searchMentionCandidates("al", "u1", { taskId: "task-404" });
    expect(result).toEqual({ users: [] });
    expect(User.find).not.toHaveBeenCalled();
});

test("searchMentionCandidates resolves task scope assignees and creator", async () => {
    Task.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                assignees: ["u1", "u2"],
                createdBy: "u3"
            })
        })
    });
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { _id: "u2", username: "alex", name: "Alex", isOnline: false, preferences: { privacy: {} } }
                ])
            })
        })
    });

    const result = await userService.searchMentionCandidates("al", "u1", { taskId: "task-1" });

    expect(result).toEqual({
        users: [
            {
                _id: "u2",
                username: "alex",
                name: "Alex",
                avatar: undefined,
                isOnline: false
            }
        ]
    });
    expect(User.find).toHaveBeenCalledWith(expect.objectContaining({
        _id: expect.objectContaining({
            $in: expect.arrayContaining(["u1", "u2", "u3"])
        })
    }));
});

test("searchMentionCandidates falls back to global search when no scope is provided", async () => {
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { _id: "u2", username: "alice", name: "Alice", isOnline: true, preferences: { privacy: {} } }
                ])
            })
        })
    });

    const result = await userService.searchMentionCandidates("", "u1", {});

    expect(result.users).toHaveLength(1);
    expect(User.find).toHaveBeenCalledWith(expect.objectContaining({
        accountStatus: "active",
        "preferences.privacy.allowMentions": { $ne: false },
        _id: { $ne: "u1" }
    }));
});

test("updatePreferences throws when user does not exist", async () => {
    User.findByIdAndUpdate.mockReturnValue(mockSelectResolved(null));

    await expect(userService.updatePreferences("u1", {
        preferences: { notifications: { email: true } }
    })).rejects.toThrow("User not found");
});

test("getUserStats returns counters and account age", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(new Date("2026-01-11T00:00:00.000Z").getTime());
    User.findById.mockReturnValue(mockSelectResolved({
        followersCount: 8,
        followingCount: 3,
        postsCount: 11,
        createdAt
    }));

    const result = await userService.getUserStats("u1");

    expect(result).toEqual({
        followers: 8,
        following: 3,
        posts: 11,
        accountAgeDays: 10,
        joinedAt: createdAt
    });
    nowSpy.mockRestore();
});

test("getUserStats throws when user is missing", async () => {
    User.findById.mockReturnValue(mockSelectResolved(null));

    await expect(userService.getUserStats("u1"))
        .rejects
        .toThrow("User not found");
});

test("updateActivity writes online state and timestamps", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    User.findByIdAndUpdate.mockResolvedValue({});

    await userService.updateActivity("u1", false);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("u1", {
        $set: {
            isOnline: false,
            lastSeen: 1700000000000,
            lastActive: 1700000000000
        }
    });
    nowSpy.mockRestore();
});

test("deactivateAccount and reactivateAccount handle success and missing user", async () => {
    User.findByIdAndUpdate.mockResolvedValueOnce({
        _id: "u1",
        accountStatus: "deactivated"
    });

    const deactivateResult = await userService.deactivateAccount("u1");
    expect(deactivateResult).toEqual({ success: true, message: "Account deactivated" });

    User.findByIdAndUpdate.mockResolvedValueOnce(null);
    await expect(userService.deactivateAccount("u404"))
        .rejects
        .toThrow("User not found");

    User.findByIdAndUpdate.mockResolvedValueOnce({
        _id: "u1",
        accountStatus: "active"
    });
    const reactivateResult = await userService.reactivateAccount("u1");
    expect(reactivateResult).toEqual({ success: true, message: "Account reactivated" });

    User.findByIdAndUpdate.mockResolvedValueOnce(null);
    await expect(userService.reactivateAccount("u404"))
        .rejects
        .toThrow("User not found");
});

test("getPopularUsers returns active users sorted by popularity", async () => {
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([{ _id: "u2", username: "bob" }])
                })
            })
        })
    });

    const result = await userService.getPopularUsers(5);

    expect(result).toEqual([{ _id: "u2", username: "bob" }]);
});

test("getBlockedUsers normalizes mixed blocked id shapes", async () => {
    User.findById.mockReturnValue(mockSelectLean({
        blockedUsers: [
            101,
            { _id: "u2" },
            { toHexString: () => "u3" },
            { toString: () => "u4" },
            { toString: () => "[object Object]" }
        ]
    }));
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                { _id: "u2", username: "bob", accountStatus: "active" },
                { _id: "u3", username: "charlie", accountStatus: "active" },
                { _id: "u4", username: "dave", accountStatus: "active" }
            ])
        })
    });

    const result = await userService.getBlockedUsers("u1", 1, 10);

    expect(result.users.map((entry) => entry._id)).toEqual(["u2", "u3", "u4"]);
    expect(result.pagination.total).toBe(4);
});

test("blockUser validates required ids and aborts for inactive target user", async () => {
    await expect(userService.blockUser(null, "u2"))
        .rejects
        .toMatchObject({ message: "User IDs are required", statusCode: 400 });

    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById
        .mockReturnValueOnce(mockSelectSession({ _id: "u1", blockedUsers: [] }))
        .mockReturnValueOnce(mockSelectSession({ _id: "u2", accountStatus: "deactivated" }));

    await expect(userService.blockUser("u1", "u2"))
        .rejects
        .toMatchObject({ message: "User not found", statusCode: 404 });
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("blockUser skips target counter update when no reverse delta exists", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById
        .mockReturnValueOnce(mockSelectSession({ _id: "u1", blockedUsers: [] }))
        .mockReturnValueOnce(mockSelectSession({ _id: "u2", accountStatus: "active" }));
    Follow.find.mockReturnValue({
        session: jest.fn().mockResolvedValue([
            { _id: "f-1", follower: "u1", following: "u2", isApproved: false }
        ])
    });
    Follow.deleteMany.mockReturnValue({
        session: jest.fn().mockResolvedValue({ deletedCount: 1 })
    });
    User.findByIdAndUpdate.mockResolvedValue({});

    const result = await userService.blockUser("u1", "u2");

    expect(result).toEqual({ success: true, alreadyBlocked: false });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        { $addToSet: { blockedUsers: "u2" } },
        { session }
    );
    expect(User.findByIdAndUpdate).not.toHaveBeenCalledWith(
        "u2",
        expect.anything(),
        { session }
    );
});

test("unblockUser validates required ids and missing user match", async () => {
    await expect(userService.unblockUser(null, "u2"))
        .rejects
        .toMatchObject({ message: "User IDs are required", statusCode: 400 });

    await expect(userService.unblockUser("u1", "u1"))
        .rejects
        .toMatchObject({ message: "Invalid operation", statusCode: 400 });

    User.updateOne.mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });
    await expect(userService.unblockUser("u404", "u2"))
        .rejects
        .toMatchObject({ message: "User not found", statusCode: 404 });
});
