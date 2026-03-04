const mongoose = require("mongoose");
const User = require("../../src/models/user");

const createUser = (overrides = {}) => new User({
    username: "alice",
    email: "alice@example.com",
    passwordHash: "x".repeat(60),
    ...overrides
});

const getUserPreSaveHook = () => User.schema.s.hooks._pres.get("save")
    .find((entry) => String(entry.fn).includes("Username cannot be changed after account creation"))
    .fn;

const getUserPostSaveErrorHook = () => User.schema.s.hooks._posts.get("save")
    .find((entry) => String(entry.fn).includes("error.code === 11000"))
    .fn;

afterEach(() => {
    jest.restoreAllMocks();
});

test("profile URL validators accept http(s) links and reject invalid protocols", () => {
    const valid = createUser({
        website: "https://example.com",
        avatar: "http://cdn.example.com/a.png",
        coverImage: "https://cdn.example.com/c.png"
    });
    expect(valid.validateSync()).toBeUndefined();

    const invalidWebsite = createUser({
        username: "bob",
        email: "bob@example.com",
        website: "ftp://example.com"
    }).validateSync();
    expect(invalidWebsite.errors.website.message).toBe("Website must be a valid URL");

    const invalidAvatar = createUser({
        username: "charlie",
        email: "charlie@example.com",
        avatar: "not-a-url"
    }).validateSync();
    expect(invalidAvatar.errors.avatar.message).toBe("Avatar must be a valid URL");

    const invalidCover = createUser({
        username: "david",
        email: "david@example.com",
        coverImage: "data:image/png;base64,xxx"
    }).validateSync();
    expect(invalidCover.errors.coverImage.message).toBe("Cover image must be a valid URL");
});

test("toPublicJSON returns the public profile projection", () => {
    const user = createUser({
        name: "Alice",
        bio: "Bio",
        headline: "Dev",
        location: "Delhi",
        website: "https://example.com",
        avatar: "https://cdn.example.com/a.png",
        coverImage: "https://cdn.example.com/c.png",
        isVerified: true,
        followersCount: 12,
        followingCount: 8,
        postsCount: 5,
        isPrivate: true
    });

    const payload = user.toPublicJSON();

    expect(payload).toEqual(expect.objectContaining({
        _id: user._id,
        username: "alice",
        name: "Alice",
        bio: "Bio",
        headline: "Dev",
        location: "Delhi",
        website: "https://example.com",
        avatar: "https://cdn.example.com/a.png",
        coverImage: "https://cdn.example.com/c.png",
        isVerified: true,
        followersCount: 12,
        followingCount: 8,
        postsCount: 5,
        isPrivate: true
    }));
});

test("toProfileJSON strips sensitive fields from object payload", () => {
    const user = createUser({
        googleId: "google-1",
        githubId: "github-1",
        metadata: { signupSource: "web" }
    });
    user.resetPasswordToken = "reset-token";
    user.resetPasswordExpires = new Date("2026-01-01T00:00:00.000Z");
    user.refreshToken = "refresh-token";
    user.emailVerificationToken = "verify-token";
    user.fcmToken = "fcm-token";
    user.loginAttempts = 3;
    user.lockUntil = new Date("2026-01-01T00:00:00.000Z");
    user.__v = 5;

    const profile = user.toProfileJSON();

    expect(profile.passwordHash).toBeUndefined();
    expect(profile.resetPasswordToken).toBeUndefined();
    expect(profile.resetPasswordExpires).toBeUndefined();
    expect(profile.refreshToken).toBeUndefined();
    expect(profile.emailVerificationToken).toBeUndefined();
    expect(profile.fcmToken).toBeUndefined();
    expect(profile.loginAttempts).toBeUndefined();
    expect(profile.lockUntil).toBeUndefined();
    expect(profile.googleId).toBeUndefined();
    expect(profile.githubId).toBeUndefined();
    expect(profile.metadata).toBeUndefined();
    expect(profile.__v).toBeUndefined();
});

test("incLoginAttempts resets counter when lock has expired", async () => {
    const user = createUser({
        lockUntil: new Date(Date.now() - 10_000),
        loginAttempts: 4
    });
    user.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });

    await user.incLoginAttempts();

    expect(user.updateOne).toHaveBeenCalledWith({
        $set: { loginAttempts: 1 },
        $unset: { lockUntil: 1 }
    });
});

test("incLoginAttempts applies lock when max attempts are reached", async () => {
    const user = createUser({
        lockUntil: null,
        loginAttempts: 4
    });
    user.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });

    await user.incLoginAttempts();

    expect(user.updateOne).toHaveBeenCalledWith(expect.objectContaining({
        $inc: { loginAttempts: 1 },
        $set: expect.objectContaining({
            lockUntil: expect.any(Number)
        })
    }));
});

test("incLoginAttempts only increments when below lock threshold", async () => {
    const user = createUser({
        lockUntil: null,
        loginAttempts: 1
    });
    user.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });

    await user.incLoginAttempts();

    expect(user.updateOne).toHaveBeenCalledWith({
        $inc: { loginAttempts: 1 }
    });
});

test("resetLoginAttempts clears lock metadata", async () => {
    const user = createUser();
    user.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });

    await user.resetLoginAttempts();

    expect(user.updateOne).toHaveBeenCalledWith({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
});

test("updateActivity refreshes timestamps and saves document", async () => {
    const user = createUser();
    user.save = jest.fn().mockResolvedValue(user);

    await user.updateActivity();

    expect(user.lastActive).toBeInstanceOf(Date);
    expect(user.lastSeen).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalledTimes(1);
});

test("findByCredential lowercases input and requests auth fields", async () => {
    const selectedDoc = { _id: "user-1" };
    const selectSpy = jest.fn().mockResolvedValue(selectedDoc);
    const findOneSpy = jest.spyOn(User, "findOne").mockReturnValue({
        select: selectSpy
    });

    const result = await User.findByCredential("ALICE@EXAMPLE.COM");

    expect(findOneSpy).toHaveBeenCalledWith({
        $or: [
            { email: "alice@example.com" },
            { username: "alice@example.com" }
        ]
    });
    expect(selectSpy).toHaveBeenCalledWith("+passwordHash +loginAttempts +lockUntil");
    expect(result).toBe(selectedDoc);
});

test("availability helpers return true when count is zero and false otherwise", async () => {
    const countSpy = jest.spyOn(User, "countDocuments")
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

    await expect(User.isUsernameAvailable("ALICE")).resolves.toBe(true);
    await expect(User.isUsernameAvailable("ALICE")).resolves.toBe(false);
    await expect(User.isEmailAvailable("ALICE@EXAMPLE.COM")).resolves.toBe(true);
    await expect(User.isEmailAvailable("ALICE@EXAMPLE.COM")).resolves.toBe(false);

    expect(countSpy).toHaveBeenNthCalledWith(1, { username: "alice" });
    expect(countSpy).toHaveBeenNthCalledWith(2, { username: "alice" });
    expect(countSpy).toHaveBeenNthCalledWith(3, { email: "alice@example.com" });
    expect(countSpy).toHaveBeenNthCalledWith(4, { email: "alice@example.com" });
});

test("pre-save hook blocks username changes after creation", async () => {
    const preSaveHook = getUserPreSaveHook();
    const user = createUser();
    user.isNew = false;
    user.isModified = jest.fn().mockImplementation((field) => field === "username");

    await expect(preSaveHook.call(user))
        .rejects
        .toThrow("Username cannot be changed after account creation");
});

test("pre-save hook defaults name to username for new accounts", async () => {
    const preSaveHook = getUserPreSaveHook();
    const user = createUser({ name: "" });
    user.isNew = true;
    user.isModified = jest.fn().mockReturnValue(false);

    await preSaveHook.call(user);

    expect(user.name).toBe("alice");
});

test("post-save error hook maps duplicate key errors and passes other errors through", () => {
    const postSaveErrorHook = getUserPostSaveErrorHook();

    const nextDuplicate = jest.fn();
    postSaveErrorHook.call(
        {},
        {
            name: "MongoServerError",
            code: 11000,
            keyPattern: { email: 1 }
        },
        {},
        nextDuplicate
    );
    const duplicateError = nextDuplicate.mock.calls[0][0];
    expect(duplicateError).toBeInstanceOf(Error);
    expect(duplicateError.message).toBe("email already exists");

    const nextGeneric = jest.fn();
    const genericError = new Error("write failed");
    postSaveErrorHook.call({}, genericError, {}, nextGeneric);
    expect(nextGeneric).toHaveBeenCalledWith(genericError);
});
