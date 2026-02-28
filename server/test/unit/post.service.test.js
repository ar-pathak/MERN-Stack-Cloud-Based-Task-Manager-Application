jest.mock("mongoose", () => ({
    startSession: jest.fn()
}));

jest.mock("../../src/models/post", () => ({
    updateMany: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    exists: jest.fn()
}));

jest.mock("../../src/models/like", () => ({
    checkMultipleLikes: jest.fn(),
    checkUserLiked: jest.fn()
}));

jest.mock("../../src/models/comment", () => ({}));

jest.mock("../../src/models/postSave", () => ({
    checkMultipleSaved: jest.fn(),
    exists: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn()
}));

jest.mock("../../src/models/follow", () => ({
    checkRelationship: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn()
}));

jest.mock("../../src/modules/utils/mentionService", () => ({
    resolveMentionUsersFromText: jest.fn(),
    notifyMentionedUsers: jest.fn(),
    getMentionSnippet: jest.fn().mockReturnValue("snippet")
}));

const Post = require("../../src/models/post");
const Like = require("../../src/models/like");
const PostSave = require("../../src/models/postSave");
const Follow = require("../../src/models/follow");
const User = require("../../src/models/user");
const postService = require("../../src/modules/posts/post.service");

const mockSelectLean = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const mockFindQueryWithDistinct = (value) => ({
    distinct: jest.fn().mockResolvedValue(value)
});

const makePostFindQuery = (value) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("publishDueScheduledPosts returns 0 for invalid reference date", async () => {
    const updated = await postService.publishDueScheduledPosts("invalid-date");
    expect(updated).toBe(0);
    expect(Post.updateMany).not.toHaveBeenCalled();
});

test("publishDueScheduledPosts returns modifiedCount from updateMany", async () => {
    Post.updateMany.mockResolvedValue({ modifiedCount: 4 });
    const updated = await postService.publishDueScheduledPosts(new Date("2026-02-01T00:00:00.000Z"));
    expect(updated).toBe(4);
});

test("resolveAuthorAccess throws when author is missing", async () => {
    User.findById.mockReturnValueOnce(mockSelectLean(null));

    await expect(postService.resolveAuthorAccess("author-1", "viewer-1"))
        .rejects
        .toMatchObject({ message: "User not found", statusCode: 404 });
});

test("resolveAuthorAccess returns owner context for same user", async () => {
    User.findById.mockReturnValueOnce(mockSelectLean({
        _id: "author-1",
        accountStatus: "active",
        isPrivate: true,
        blockedUsers: []
    }));

    const access = await postService.resolveAuthorAccess("author-1", "author-1");

    expect(access).toEqual({
        isOwner: true,
        isPrivate: true,
        isApprovedFollower: false,
        isBlockedContext: false
    });
});

test("resolveAuthorAccess marks blocked context when users have blocking relation", async () => {
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

    const access = await postService.resolveAuthorAccess("author-1", "viewer-1");

    expect(access).toEqual({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: true
    });
    expect(Follow.checkRelationship).not.toHaveBeenCalled();
});

test("canViewPostWithAccess applies visibility and privacy rules", () => {
    const publicPost = { status: "active", visibility: "public" };
    const followersPost = { status: "active", visibility: "followers" };
    const scheduled = { status: "scheduled", visibility: "public" };

    expect(postService.canViewPostWithAccess(publicPost, { isOwner: false, isPrivate: false, isApprovedFollower: false, isBlockedContext: false })).toBe(true);
    expect(postService.canViewPostWithAccess(followersPost, { isOwner: false, isPrivate: false, isApprovedFollower: false, isBlockedContext: false })).toBe(false);
    expect(postService.canViewPostWithAccess(followersPost, { isOwner: false, isPrivate: false, isApprovedFollower: true, isBlockedContext: false })).toBe(true);
    expect(postService.canViewPostWithAccess(scheduled, { isOwner: false })).toBe(false);
    expect(postService.canViewPostWithAccess(scheduled, { isOwner: true })).toBe(true);
});

test("assertCanAccessPost blocks scheduled posts for non-owner", async () => {
    const post = { _id: "post-1", author: "author-1", status: "scheduled", visibility: "public" };
    jest.spyOn(postService, "resolveAuthorAccess").mockResolvedValue({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: false
    });

    await expect(postService.assertCanAccessPost(post, "viewer-1", "view this post"))
        .rejects
        .toMatchObject({ message: "Post not found", statusCode: 404 });
});

test("assertCanAccessPost blocks blocked profile for interactions", async () => {
    const post = { _id: "post-1", author: "author-1", status: "active", visibility: "public" };
    jest.spyOn(postService, "resolveAuthorAccess").mockResolvedValue({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: true
    });

    await expect(postService.assertCanAccessPost(post, "viewer-1", "like this post"))
        .rejects
        .toMatchObject({ message: "You cannot interact with this profile", statusCode: 403 });
});

test("filterAccessiblePosts ignores forbidden/not-found posts", async () => {
    const assertSpy = jest.spyOn(postService, "assertCanAccessPost");
    assertSpy
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce({ statusCode: 403 })
        .mockRejectedValueOnce({ statusCode: 404 });

    const filtered = await postService.filterAccessiblePosts(
        [{ _id: "p1" }, { _id: "p2" }, { _id: "p3" }],
        "viewer-1"
    );

    expect(filtered).toEqual([{ _id: "p1" }]);
});

test("getAccessibleAuthorIds returns public active authors when user is anonymous", async () => {
    User.find.mockReturnValue(mockFindQueryWithDistinct(["u1", "u2"]));

    const ids = await postService.getAccessibleAuthorIds(null);

    expect(ids).toEqual(["u1", "u2"]);
    expect(User.find).toHaveBeenCalledWith({
        accountStatus: "active",
        isPrivate: false
    });
});

test("getPublicFeed returns empty result when no accessible authors", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "getAccessibleAuthorIds").mockResolvedValue([]);

    const result = await postService.getPublicFeed("viewer-1", 2, 5);

    expect(result).toEqual({
        posts: [],
        pagination: {
            page: 2,
            limit: 5,
            total: 0,
            pages: 1,
            hasMore: false
        }
    });
});

test("getUserPosts returns empty list for private profile without follow access", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "resolveAuthorAccess").mockResolvedValue({
        isOwner: false,
        isPrivate: true,
        isApprovedFollower: false,
        isBlockedContext: false
    });

    const result = await postService.getUserPosts("author-1", "viewer-1", 1, 10);

    expect(result).toEqual({
        posts: [],
        pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 1,
            hasMore: false
        }
    });
});

test("addUserEngagementData enriches posts with engagement flags", async () => {
    const posts = [
        { _id: "p1", author: { _id: "a1" } },
        { _id: "p2", author: { _id: "a2" } }
    ];

    Like.checkMultipleLikes.mockResolvedValue({ p1: true, p2: false });
    PostSave.checkMultipleSaved.mockResolvedValue({ p1: false, p2: true });
    Post.find
        .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([{ originalPost: "p2" }])
        })
        .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([{ following: "a1", isApproved: true }])
        })
        .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([{ follower: "a2" }])
        });
    Follow.find
        .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([{ following: "a1", isApproved: true }])
        })
        .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([{ follower: "a2" }])
        });

    const result = await postService.addUserEngagementData(posts, "viewer-1");

    expect(result[0].userEngagement).toEqual({
        hasLiked: true,
        hasSaved: false,
        hasReposted: false,
        isFollowingAuthor: true,
        isFollowRequestPending: false,
        isFollowedByAuthor: false
    });
    expect(result[1].userEngagement).toEqual({
        hasLiked: false,
        hasSaved: true,
        hasReposted: true,
        isFollowingAuthor: false,
        isFollowRequestPending: false,
        isFollowedByAuthor: true
    });
});
