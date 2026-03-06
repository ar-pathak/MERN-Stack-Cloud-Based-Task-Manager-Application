jest.mock("../../src/models/story", () => ({
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/models/follow", () => ({
    find: jest.fn(),
    checkRelationship: jest.fn()
}));

jest.mock("../../src/modules/utils/mentionService", () => ({
    resolveMentionUsersFromText: jest.fn(),
    notifyMentionedUsers: jest.fn(),
    getMentionSnippet: jest.fn().mockReturnValue("snippet")
}));

const Story = require("../../src/models/story");
const User = require("../../src/models/user");
const Follow = require("../../src/models/follow");
const {
    resolveMentionUsersFromText,
    notifyMentionedUsers
} = require("../../src/modules/utils/mentionService");
const storyService = require("../../src/modules/stories/story.service");

const mockSelectLean = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const mockDistinctQuery = (value) => ({
    distinct: jest.fn().mockResolvedValue(value)
});

const makeStoryListQuery = (value) => ({
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

const makeFindByIdPopulateQuery = (value) => ({
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue(value)
});

beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

test("resolveAuthorAccess handles missing/owner/blocked/follower contexts", async () => {
    User.findById.mockReturnValueOnce(mockSelectLean(null));
    await expect(storyService.resolveAuthorAccess("author-1", "viewer-1"))
        .rejects
        .toMatchObject({ message: "User not found", statusCode: 404 });

    User.findById.mockReturnValueOnce(mockSelectLean({
        _id: "author-1",
        accountStatus: "active",
        isPrivate: true,
        blockedUsers: []
    }));
    await expect(storyService.resolveAuthorAccess("author-1", "author-1"))
        .resolves
        .toEqual({
            isOwner: true,
            isPrivate: true,
            isApprovedFollower: false,
            isBlockedContext: false
        });

    User.findById
        .mockReturnValueOnce(mockSelectLean({
            _id: "author-1",
            accountStatus: "active",
            isPrivate: false,
            blockedUsers: ["viewer-1"]
        }))
        .mockReturnValueOnce(mockSelectLean({
            _id: "viewer-1",
            accountStatus: "active",
            blockedUsers: []
        }));
    await expect(storyService.resolveAuthorAccess("author-1", "viewer-1"))
        .resolves
        .toEqual({
            isOwner: false,
            isPrivate: false,
            isApprovedFollower: false,
            isBlockedContext: true
        });

    User.findById
        .mockReturnValueOnce(mockSelectLean({
            _id: "author-1",
            accountStatus: "active",
            isPrivate: true,
            blockedUsers: []
        }))
        .mockReturnValueOnce(mockSelectLean({
            _id: "viewer-1",
            accountStatus: "active",
            blockedUsers: []
        }));
    Follow.checkRelationship.mockResolvedValue({ isFollowing: true, isApproved: true });
    await expect(storyService.resolveAuthorAccess("author-1", "viewer-1"))
        .resolves
        .toEqual({
            isOwner: false,
            isPrivate: true,
            isApprovedFollower: true,
            isBlockedContext: false
        });
});

test("resolveAuthorAccess supports anonymous viewers", async () => {
    User.findById.mockReturnValueOnce(mockSelectLean({
        _id: "author-2",
        accountStatus: "active",
        isPrivate: false,
        blockedUsers: []
    }));

    const result = await storyService.resolveAuthorAccess("author-2");

    expect(result).toEqual({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: false
    });
    expect(Follow.checkRelationship).not.toHaveBeenCalled();
});

test("resolveAuthorAccess rejects inactive viewer accounts", async () => {
    User.findById
        .mockReturnValueOnce(mockSelectLean({
            _id: "author-3",
            accountStatus: "active",
            isPrivate: true,
            blockedUsers: []
        }))
        .mockReturnValueOnce(mockSelectLean({
            _id: "viewer-3",
            accountStatus: "deactivated",
            blockedUsers: []
        }));

    await expect(storyService.resolveAuthorAccess("author-3", "viewer-3"))
        .rejects
        .toMatchObject({ message: "User not found", statusCode: 404 });
});

test("createStory rejects inactive author", async () => {
    User.findById.mockReturnValueOnce(mockSelectLean({
        _id: "author-1",
        accountStatus: "suspended"
    }));

    await expect(storyService.createStory("author-1", { caption: "Hello" }))
        .rejects
        .toMatchObject({ message: "Author not found or inactive", statusCode: 404 });
});

test("createStory builds hashtags/mentions and sends mention notifications", async () => {
    User.findById.mockReturnValueOnce(mockSelectLean({
        _id: "author-1",
        accountStatus: "active",
        name: "Author Name",
        username: "author"
    }));
    resolveMentionUsersFromText.mockResolvedValue([
        { _id: "m1", username: "m1" },
        { _id: "m2", username: "m2" }
    ]);
    User.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                { _id: "m2", username: "m2" },
                { _id: "m3", username: "m3" }
            ])
        })
    });

    const storyDoc = {
        _id: "story-1",
        author: "author-1",
        viewers: [],
        reactions: [],
        populate: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({
            _id: "story-1",
            author: "author-1",
            viewers: [],
            reactions: []
        })
    };
    Story.create.mockResolvedValue(storyDoc);

    const result = await storyService.createStory("author-1", {
        caption: "Hello #Dev #dev #MERN",
        media: [{ type: "image", url: "file.jpg" }],
        visibility: "followers",
        mentions: ["m2", "m3"],
        hashtags: ["#NodeJS", "backend"]
    });

    expect(Story.create).toHaveBeenCalledWith(expect.objectContaining({
        author: "author-1",
        visibility: "followers",
        mentions: ["m1", "m2", "m3"],
        hashtags: ["dev", "mern", "nodejs", "backend"]
    }));
    expect(notifyMentionedUsers).toHaveBeenCalledWith(expect.objectContaining({
        actorId: "author-1",
        mentionUsers: expect.arrayContaining([
            expect.objectContaining({ _id: "m1" }),
            expect.objectContaining({ _id: "m2" }),
            expect.objectContaining({ _id: "m3" })
        ])
    }));
    expect(result).toEqual(expect.objectContaining({
        _id: "story-1",
        hasViewed: false,
        myReaction: null
    }));
});

test("createStory skips mention notifications when no mentions", async () => {
    User.findById.mockReturnValueOnce(mockSelectLean({
        _id: "author-1",
        accountStatus: "active",
        username: "author"
    }));
    resolveMentionUsersFromText.mockResolvedValue([]);
    const storyDoc = {
        _id: "story-2",
        author: "author-1",
        viewers: [],
        reactions: [],
        populate: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({
            _id: "story-2",
            author: "author-1",
            viewers: [],
            reactions: []
        })
    };
    Story.create.mockResolvedValue(storyDoc);

    await storyService.createStory("author-1", { caption: "" });

    expect(notifyMentionedUsers).not.toHaveBeenCalled();
});

test("getFeedStories groups stories and computes unseen counts", async () => {
    Follow.find.mockReturnValueOnce(mockDistinctQuery(["author-2"]));
    Story.find.mockReturnValueOnce(makeStoryListQuery([
        {
            _id: "s1",
            author: { _id: "author-2", username: "a2" },
            createdAt: "2026-01-01T00:00:00.000Z",
            viewers: [],
            reactions: [],
            visibility: "public"
        },
        {
            _id: "s2",
            author: { _id: "author-2", username: "a2" },
            createdAt: "2026-01-02T00:00:00.000Z",
            viewers: [{ user: "viewer-1" }],
            reactions: [{ user: "viewer-1", emoji: "🔥" }],
            visibility: "public"
        },
        {
            _id: "s3",
            author: { _id: "viewer-1", username: "me" },
            createdAt: "2026-01-03T00:00:00.000Z",
            viewers: [],
            reactions: [],
            visibility: "followers"
        }
    ]));

    const result = await storyService.getFeedStories("viewer-1");

    expect(result.stories).toHaveLength(2);
    const authorGroup = result.stories.find((entry) => entry.author._id === "author-2");
    expect(authorGroup.unseenCount).toBe(1);
    expect(authorGroup.hasViewedAll).toBe(false);
    expect(authorGroup.stories[1]).toEqual(expect.objectContaining({
        hasViewed: true,
        myReaction: "🔥"
    }));
});

test("getStoryById enforces existence and access permissions", async () => {
    Story.findById.mockReturnValueOnce({
        populate: jest.fn().mockReturnThis()
    });
    await expect(storyService.getStoryById("story-404", "viewer-1"))
        .rejects
        .toMatchObject({ message: "Story not found", statusCode: 404 });

    const privateStory = {
        _id: "story-1",
        author: { _id: "author-1" },
        status: "active",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        viewers: [],
        reactions: [],
        populate: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({
            _id: "story-1",
            author: { _id: "author-1" },
            viewers: [],
            reactions: []
        })
    };
    Story.findById.mockReturnValueOnce({
        ...privateStory,
        populate: jest.fn().mockReturnThis()
    });
    jest.spyOn(storyService, "canUserViewStory").mockResolvedValueOnce(false);

    await expect(storyService.getStoryById("story-1", "viewer-1"))
        .rejects
        .toMatchObject({
            message: "You do not have permission to view this story",
            statusCode: 403
        });
});

test("getStoryById includes audience data for story owner", async () => {
    const story = {
        _id: "story-2",
        author: { _id: "viewer-1" },
        status: "active",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        viewers: [{ user: "viewer-1" }],
        reactions: [{ user: "viewer-1", emoji: "❤️" }],
        populate: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({
            _id: "story-2",
            author: { _id: "viewer-1" },
            viewers: [{ user: "viewer-1" }],
            reactions: [{ user: "viewer-1", emoji: "❤️" }]
        })
    };
    Story.findById.mockReturnValue({
        ...story,
        populate: jest.fn().mockReturnThis()
    });
    jest.spyOn(storyService, "canUserViewStory").mockResolvedValue(true);

    const result = await storyService.getStoryById("story-2", "viewer-1");

    expect(result).toEqual(expect.objectContaining({
        hasViewed: true,
        myReaction: "❤️",
        viewers: [{ user: "viewer-1" }],
        reactions: [{ user: "viewer-1", emoji: "❤️" }]
    }));
});

test("markStoryViewed skips updates for owner and updates for other users", async () => {
    jest.spyOn(storyService, "getStoryById")
        .mockResolvedValueOnce({ _id: "story-1", author: "viewer-1" })
        .mockResolvedValueOnce({ _id: "story-2", author: "author-2" })
        .mockResolvedValueOnce({ _id: "story-2", author: "author-2", refreshed: true });

    const ownerResult = await storyService.markStoryViewed("story-1", "viewer-1");
    expect(ownerResult).toEqual({ _id: "story-1", author: "viewer-1" });
    expect(Story.updateOne).not.toHaveBeenCalled();

    const viewerResult = await storyService.markStoryViewed("story-2", "viewer-1");
    expect(Story.updateOne).toHaveBeenCalledWith(
        { _id: "story-2", "viewers.user": { $ne: "viewer-1" } },
        expect.objectContaining({ $inc: { viewsCount: 1 } })
    );
    expect(viewerResult).toEqual({ _id: "story-2", author: "author-2", refreshed: true });
});

test("reactToStory validates access and toggles same reaction", async () => {
    Story.findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(null)
    });
    await expect(storyService.reactToStory("story-1", "viewer-1", "🔥"))
        .rejects
        .toMatchObject({ message: "Story not found", statusCode: 404 });

    Story.findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
            _id: "story-1",
            author: "author-1",
            visibility: "public",
            status: "active",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
            reactions: []
        })
    });
    jest.spyOn(storyService, "canUserViewStory").mockResolvedValueOnce(false);
    await expect(storyService.reactToStory("story-1", "viewer-1", "🔥"))
        .rejects
        .toMatchObject({
            message: "You do not have permission to view this story",
            statusCode: 403
        });

    Story.findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
            _id: "story-2",
            author: "author-1",
            visibility: "public",
            status: "active",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
            reactions: [{ user: "viewer-1", emoji: "🔥" }]
        })
    });
    storyService.canUserViewStory.mockResolvedValue(true);
    jest.spyOn(storyService, "getStoryById").mockResolvedValue({ _id: "story-2", ok: true });

    const sameReactionResult = await storyService.reactToStory("story-2", "viewer-1", "🔥");

    expect(Story.updateOne).toHaveBeenCalledWith(
        { _id: "story-2" },
        { $pull: { reactions: { user: "viewer-1" } } }
    );
    expect(Story.updateOne).toHaveBeenCalledTimes(1);
    expect(sameReactionResult).toEqual({ _id: "story-2", ok: true });
});

test("reactToStory pushes a new reaction when emoji changes", async () => {
    Story.findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
            _id: "story-3",
            author: "author-1",
            visibility: "public",
            status: "active",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
            reactions: [{ user: "viewer-1", emoji: "😀" }]
        })
    });
    jest.spyOn(storyService, "canUserViewStory").mockResolvedValueOnce(true);
    jest.spyOn(storyService, "getStoryById").mockResolvedValue({ _id: "story-3", refreshed: true });

    const result = await storyService.reactToStory("story-3", "viewer-1", "🔥");

    expect(Story.updateOne).toHaveBeenNthCalledWith(
        1,
        { _id: "story-3" },
        { $pull: { reactions: { user: "viewer-1" } } }
    );
    expect(Story.updateOne).toHaveBeenNthCalledWith(
        2,
        { _id: "story-3" },
        expect.objectContaining({
            $push: expect.objectContaining({
                reactions: expect.objectContaining({
                    user: "viewer-1",
                    emoji: "🔥"
                })
            })
        })
    );
    expect(result).toEqual({ _id: "story-3", refreshed: true });
});

test("getUserStories enforces blocked/private contexts and filters visibility", async () => {
    jest.spyOn(storyService, "resolveAuthorAccess").mockResolvedValueOnce({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: true
    });
    await expect(storyService.getUserStories("author-1", "viewer-1"))
        .rejects
        .toMatchObject({ message: "You cannot view this profile", statusCode: 403 });

    storyService.resolveAuthorAccess.mockResolvedValueOnce({
        isOwner: false,
        isPrivate: true,
        isApprovedFollower: false,
        isBlockedContext: false
    });
    await expect(storyService.getUserStories("author-1", "viewer-1"))
        .rejects
        .toMatchObject({ message: "This profile is private", statusCode: 403 });

    storyService.resolveAuthorAccess.mockResolvedValueOnce({
        isOwner: false,
        isPrivate: true,
        isApprovedFollower: true,
        isBlockedContext: false
    });
    Story.find.mockReturnValueOnce(makeStoryListQuery([
        {
            _id: "s1",
            author: { _id: "author-1" },
            visibility: "public",
            viewers: [],
            reactions: []
        },
        {
            _id: "s2",
            author: { _id: "author-1" },
            visibility: "followers",
            viewers: [],
            reactions: []
        }
    ]));

    const result = await storyService.getUserStories("author-1", "viewer-1");
    expect(result.stories).toHaveLength(2);
});

test("deleteStory validates existence/ownership and soft deletes story", async () => {
    Story.findById.mockResolvedValueOnce(null);
    await expect(storyService.deleteStory("story-1", "viewer-1"))
        .rejects
        .toMatchObject({ message: "Story not found", statusCode: 404 });

    Story.findById.mockResolvedValueOnce({
        _id: "story-2",
        author: "author-1",
        status: "active"
    });
    await expect(storyService.deleteStory("story-2", "viewer-1"))
        .rejects
        .toMatchObject({
            message: "You do not have permission to delete this story",
            statusCode: 403
        });

    const storyDoc = {
        _id: "story-3",
        author: "viewer-1",
        status: "active",
        save: jest.fn().mockResolvedValue({})
    };
    Story.findById.mockResolvedValueOnce(storyDoc);
    const result = await storyService.deleteStory("story-3", "viewer-1");

    expect(storyDoc.status).toBe("deleted");
    expect(storyDoc.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
});

test("canUserViewStory applies visibility and access rules", async () => {
    const accessSpy = jest.spyOn(storyService, "resolveAuthorAccess");
    accessSpy.mockResolvedValueOnce({
            isOwner: false,
            isPrivate: false,
            isApprovedFollower: false,
            isBlockedContext: true
        });
    accessSpy.mockResolvedValueOnce({
            isOwner: false,
            isPrivate: true,
            isApprovedFollower: false,
            isBlockedContext: false
        });
    accessSpy.mockResolvedValueOnce({
            isOwner: true,
            isPrivate: true,
            isApprovedFollower: false,
            isBlockedContext: false
        });
    accessSpy.mockResolvedValueOnce({
            isOwner: false,
            isPrivate: false,
            isApprovedFollower: false,
            isBlockedContext: false
        });
    accessSpy.mockResolvedValueOnce({
            isOwner: false,
            isPrivate: false,
            isApprovedFollower: true,
            isBlockedContext: false
        });

    expect(await storyService.canUserViewStory({ author: "author-1", visibility: "public" }, "viewer-1")).toBe(false);
    expect(await storyService.canUserViewStory({ author: "author-1", visibility: "public" }, "viewer-1")).toBe(false);
    expect(await storyService.canUserViewStory({ author: "author-1", visibility: "followers" }, "author-1")).toBe(true);
    expect(await storyService.canUserViewStory({ author: "author-1", visibility: "public" }, "viewer-1")).toBe(true);
    expect(await storyService.canUserViewStory({ author: "author-1", visibility: "followers" }, "viewer-1")).toBe(true);
});
