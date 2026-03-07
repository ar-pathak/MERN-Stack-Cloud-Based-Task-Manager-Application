const mongoose = require("mongoose");
const PostSave = require("../../src/models/postSave");

const newId = () => new mongoose.Types.ObjectId();

afterEach(() => {
    jest.restoreAllMocks();
});

test("checkMultipleSaved returns an empty map for invalid inputs", async () => {
    await expect(PostSave.checkMultipleSaved(null, [newId()])).resolves.toEqual({});
    await expect(PostSave.checkMultipleSaved(newId(), null)).resolves.toEqual({});
    await expect(PostSave.checkMultipleSaved(newId(), [])).resolves.toEqual({});
});

test("checkMultipleSaved maps requested post ids to saved flags", async () => {
    const userId = newId();
    const postA = newId();
    const postB = newId();
    const postC = newId();

    const selectSpy = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
            { post: postA },
            { post: postC }
        ])
    });
    const findSpy = jest.spyOn(PostSave, "find").mockReturnValue({
        select: selectSpy
    });

    const result = await PostSave.checkMultipleSaved(userId, [postA, postB, postC]);

    expect(findSpy).toHaveBeenCalledWith({
        user: userId,
        post: { $in: [postA, postB, postC] }
    });
    expect(result).toEqual({
        [String(postA)]: true,
        [String(postB)]: false,
        [String(postC)]: true
    });
});
