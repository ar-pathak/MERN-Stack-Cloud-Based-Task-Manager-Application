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

test("unblockUser validates update result and returns success", async () => {
    User.updateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 0 });
    await expect(userService.unblockUser("u1", "u2"))
        .rejects
        .toMatchObject({ message: "User is not in your block list", statusCode: 400 });

    User.updateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });
    const result = await userService.unblockUser("u1", "u2");
    expect(result).toEqual({ success: true });
});
