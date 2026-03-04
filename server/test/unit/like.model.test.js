const mongoose = require("mongoose");
const Like = require("../../src/models/like");

const newId = () => new mongoose.Types.ObjectId();

const createLike = (overrides = {}) => new Like({
    user: newId(),
    ...overrides
});

afterEach(() => {
    jest.restoreAllMocks();
});

test("pre-validate accepts post likes and clears comment field", async () => {
    const doc = createLike({
        post: newId(),
        comment: undefined
    });

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.comment).toBeUndefined();
    expect(doc.post).toBeDefined();
});

test("pre-validate accepts comment likes and clears post field", async () => {
    const doc = createLike({
        comment: newId(),
        post: undefined
    });

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.post).toBeUndefined();
    expect(doc.comment).toBeDefined();
});

test("pre-validate rejects likes with both targets or no target", async () => {
    const both = createLike({
        post: newId(),
        comment: newId()
    });
    let bothError;
    try {
        await both.validate();
    } catch (error) {
        bothError = error;
    }
    expect(bothError.errors.post.message).toBe("Like must target either a post or a comment");
    expect(bothError.errors.comment.message).toBe("Like must target either a post or a comment");

    const none = createLike();
    let noneError;
    try {
        await none.validate();
    } catch (error) {
        noneError = error;
    }
    expect(noneError.errors.post.message).toBe("Like must target either a post or a comment");
    expect(noneError.errors.comment.message).toBe("Like must target either a post or a comment");
});

test("checkUserLiked resolves boolean from exists query result", async () => {
    const existsSpy = jest.spyOn(Like, "exists")
        .mockResolvedValueOnce({ _id: newId() })
        .mockResolvedValueOnce(null);

    await expect(Like.checkUserLiked(newId(), newId())).resolves.toBe(true);
    await expect(Like.checkUserLiked(newId(), newId())).resolves.toBe(false);

    expect(existsSpy).toHaveBeenCalledTimes(2);
});

test("checkMultipleLikes maps liked post ids to true and defaults missing ones to false", async () => {
    const postA = newId();
    const postB = newId();
    const postC = newId();
    const userId = newId();

    const distinctSpy = jest.fn().mockResolvedValue([postB, postC]);
    const findSpy = jest.spyOn(Like, "find").mockReturnValue({
        distinct: distinctSpy
    });

    const result = await Like.checkMultipleLikes(userId, [postA, postB, postC]);

    expect(findSpy).toHaveBeenCalledWith({
        user: userId,
        post: { $in: [postA, postB, postC] }
    });
    expect(distinctSpy).toHaveBeenCalledWith("post");
    expect(result).toEqual({
        [String(postA)]: false,
        [String(postB)]: true,
        [String(postC)]: true
    });
});
