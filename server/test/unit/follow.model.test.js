const mongoose = require("mongoose");
const Follow = require("../../src/models/follow");

const newId = () => new mongoose.Types.ObjectId();

const createFollow = (overrides = {}) => new Follow({
    follower: newId(),
    following: newId(),
    ...overrides
});

const getFollowPreSaveHook = () => Follow.schema.s.hooks._pres.get("save")
    .find((entry) => String(entry.fn).includes("Users cannot follow themselves"))
    .fn;

afterEach(() => {
    jest.restoreAllMocks();
});

test("pre-save hook rejects self-follow attempts", async () => {
    const sameId = newId();
    const doc = createFollow({
        follower: sameId,
        following: sameId
    });
    const preSaveHook = getFollowPreSaveHook();

    await expect(preSaveHook.call(doc)).rejects.toThrow("Users cannot follow themselves");
});

test("pre-save hook allows distinct follower/following pair", async () => {
    const doc = createFollow();
    const preSaveHook = getFollowPreSaveHook();

    await expect(preSaveHook.call(doc)).resolves.toBeUndefined();
});

test("checkRelationship returns false flags when no active relationship exists", async () => {
    const findOneSpy = jest.spyOn(Follow, "findOne").mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
    });

    const result = await Follow.checkRelationship(newId(), newId());

    expect(findOneSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: "active"
    }));
    expect(result).toEqual({
        isFollowing: false,
        isApproved: false,
        isPending: false
    });
});

test("checkRelationship returns pending status when relation exists but not approved", async () => {
    jest.spyOn(Follow, "findOne").mockReturnValue({
        lean: jest.fn().mockResolvedValue({
            isApproved: false
        })
    });

    const result = await Follow.checkRelationship(newId(), newId());

    expect(result).toEqual({
        isFollowing: false,
        isApproved: false,
        isPending: true
    });
});

test("checkMultipleRelationships maps defaults and approved states for target users", async () => {
    const userA = newId();
    const userB = newId();
    const userC = newId();
    const currentUserId = newId();

    const findSpy = jest.spyOn(Follow, "find").mockReturnValue({
        lean: jest.fn().mockResolvedValue([
            { following: userB, isApproved: true },
            { following: userC, isApproved: false }
        ])
    });

    const map = await Follow.checkMultipleRelationships(currentUserId, [userA, userB, userC]);

    expect(findSpy).toHaveBeenCalledWith({
        follower: currentUserId,
        following: { $in: [userA, userB, userC] },
        status: "active"
    });
    expect(map).toEqual({
        [String(userA)]: false,
        [String(userB)]: true,
        [String(userC)]: false
    });
});
