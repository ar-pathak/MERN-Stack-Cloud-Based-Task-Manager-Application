jest.mock("mongoose", () => ({
    startSession: jest.fn()
}));

jest.mock("../../src/models/post", () => ({
    updateMany: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
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
    find: jest.fn(),
    updateOne: jest.fn()
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
const mongoose = require("mongoose");
const notificationService = require("../../src/modules/notification/notification.service");
const { resolveMentionUsersFromText, notifyMentionedUsers } = require("../../src/modules/utils/mentionService");
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

const makeFindByIdPopulateQuery = (value) => ({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

const makeFindByIdSelectPopulateQuery = (value) => ({
    select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(value)
        })
    })
});

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

beforeEach(() => {
    jest.restoreAllMocks();
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

test("createPost rejects inactive users", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById.mockReturnValue(mockSelectSession({
        _id: "author-1",
        accountStatus: "suspended"
    }));

    await expect(postService.createPost("author-1", { content: "Hello" }))
        .rejects
        .toThrow("User not found or inactive");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("createPost stores scheduled posts and skips mention notifications", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById.mockReturnValue(mockSelectSession({
        _id: "author-1",
        accountStatus: "active",
        name: "Alice",
        username: "alice"
    }));
    resolveMentionUsersFromText.mockResolvedValue([]);
    const postDoc = {
        _id: "post-1",
        populate: jest.fn().mockResolvedValue({}),
        toPublicJSON: jest.fn().mockReturnValue({ _id: "post-1", status: "scheduled" })
    };
    Post.create.mockResolvedValue([postDoc]);

    const scheduledFor = new Date(Date.now() + 60_000).toISOString();
    const result = await postService.createPost("author-1", {
        content: "Scheduled",
        scheduledFor
    });

    expect(result).toEqual({ _id: "post-1", status: "scheduled" });
    const savedPayload = Post.create.mock.calls[0][0][0];
    expect(savedPayload.status).toBe("scheduled");
    expect(savedPayload.publishedAt).toBeUndefined();
    expect(notifyMentionedUsers).not.toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
});

test("savePost validates access and upserts bookmark", async () => {
    jest.spyOn(postService, "assertCanAccessPostById").mockResolvedValue({ _id: "post-1" });
    PostSave.updateOne.mockResolvedValue({ acknowledged: true });

    const result = await postService.savePost("u1", "post-1");

    expect(result).toEqual({ saved: true });
    expect(PostSave.updateOne).toHaveBeenCalledWith(
        { user: "u1", post: "post-1" },
        { $setOnInsert: { user: "u1", post: "post-1" } },
        { upsert: true }
    );
});

test("getBookmarkedPosts filters active posts and enriches engagement data", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "filterAccessiblePosts").mockResolvedValue([{ _id: "post-1", status: "active" }]);
    jest.spyOn(postService, "addUserEngagementData").mockResolvedValue([{
        _id: "post-1",
        status: "active",
        userEngagement: { hasLiked: false }
    }]);
    PostSave.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
            { post: { _id: "post-1", status: "active" } },
            { post: { _id: "post-2", status: "deleted" } }
        ])
    });
    PostSave.countDocuments.mockResolvedValue(2);

    const result = await postService.getBookmarkedPosts("u1", 1, 20);

    expect(result.posts).toEqual([
        expect.objectContaining({ _id: "post-1" })
    ]);
    expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
        hasMore: false
    });
});

test("sharePost increments share count and notifies post author", async () => {
    jest.spyOn(postService, "assertCanAccessPostById").mockResolvedValue({
        _id: "post-1",
        author: "author-1"
    });
    Post.findByIdAndUpdate.mockResolvedValue({});
    User.findById
        .mockReturnValueOnce(mockSelectLean({
            preferences: { notifications: { likes: true } }
        }))
        .mockReturnValueOnce(mockSelectLean({
            name: "Viewer Name",
            username: "viewer"
        }));
    notificationService.createNotifications.mockResolvedValue([]);

    const result = await postService.sharePost("viewer-1", "post-1", "telegram");

    expect(result).toEqual({
        shared: true,
        channel: "telegram",
        shareUrl: "/post/post-1"
    });
    expect(notificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
            recipientIds: ["author-1"],
            metadata: expect.objectContaining({
                postId: "post-1",
                channel: "telegram"
            })
        })
    );
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

test("resolveAuthorAccess returns context for anonymous viewer", async () => {
    User.findById.mockReturnValueOnce(mockSelectLean({
        _id: "author-1",
        accountStatus: "active",
        isPrivate: false,
        blockedUsers: []
    }));

    const access = await postService.resolveAuthorAccess("author-1", null);

    expect(access).toEqual({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: false
    });
});

test("resolveAuthorAccess throws when viewer is inactive", async () => {
    User.findById
        .mockReturnValueOnce(mockSelectLean({
            _id: "author-1",
            accountStatus: "active",
            isPrivate: false,
            blockedUsers: []
        }))
        .mockReturnValueOnce(mockSelectLean({
            _id: "viewer-1",
            accountStatus: "suspended",
            blockedUsers: []
        }));

    await expect(postService.resolveAuthorAccess("author-1", "viewer-1"))
        .rejects
        .toMatchObject({ message: "User not found", statusCode: 404 });
});

test("resolveAuthorAccess returns approved follower relationship", async () => {
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

    const access = await postService.resolveAuthorAccess("author-1", "viewer-1");

    expect(access).toEqual({
        isOwner: false,
        isPrivate: true,
        isApprovedFollower: true,
        isBlockedContext: false
    });
});

test("assertCanAccessPost allows scheduled posts for owner views", async () => {
    jest.spyOn(postService, "resolveAuthorAccess").mockResolvedValue({
        isOwner: true,
        isPrivate: true,
        isApprovedFollower: false,
        isBlockedContext: false
    });

    const result = await postService.assertCanAccessPost(
        { _id: "p1", author: "u1", status: "scheduled", visibility: "private" },
        "u1",
        "view this post"
    );

    expect(result).toEqual({
        authorAccess: expect.objectContaining({ isOwner: true })
    });
});

test("assertCanAccessPost throws generic permission error for non-view actions", async () => {
    jest.spyOn(postService, "resolveAuthorAccess").mockResolvedValue({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: false
    });

    await expect(postService.assertCanAccessPost(
        { _id: "p1", author: "u1", status: "active", visibility: "followers" },
        "viewer-1",
        "comment on this post"
    )).rejects.toMatchObject({
        message: "You do not have permission to comment on this post",
        statusCode: 403
    });
});

test("assertCanAccessPostById forwards session-aware query", async () => {
    const post = { _id: "post-1", author: "author-1", status: "active", visibility: "public" };
    const session = { id: "session-1" };
    Post.findById.mockReturnValue(mockSelectSession(post));
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    const assertSpy = jest.spyOn(postService, "assertCanAccessPost").mockResolvedValue({});

    const result = await postService.assertCanAccessPostById("post-1", "viewer-1", "view this post", session);

    expect(result).toEqual(post);
    expect(assertSpy).toHaveBeenCalledWith(post, "viewer-1", "view this post");
});

test("filterAccessiblePosts returns empty array for invalid input", async () => {
    await expect(postService.filterAccessiblePosts([], "viewer-1")).resolves.toEqual([]);
    await expect(postService.filterAccessiblePosts(null, "viewer-1")).resolves.toEqual([]);
});

test("getAccessibleAuthorIds merges public/following and removes blocked users", async () => {
    User.findById.mockReturnValueOnce(mockSelectLean({
        _id: "viewer-1",
        accountStatus: "active",
        blockedUsers: [
            { _id: "blocked-1" },
            { toHexString: () => "hex-blocked" },
            { toString: () => "string-blocked" },
            42,
            { toString: () => "[object Object]" }
        ]
    }));
    User.find
        .mockReturnValueOnce(mockFindQueryWithDistinct(["author-1", "blocked-1", "keep-1"]))
        .mockReturnValueOnce(mockFindQueryWithDistinct(["blocked-me", "hex-blocked"]))
        .mockReturnValueOnce(mockFindQueryWithDistinct(["follow-1", "blocked-me"]));
    Follow.find.mockReturnValueOnce(mockFindQueryWithDistinct(["follow-1", "blocked-me"]));

    const ids = await postService.getAccessibleAuthorIds("viewer-1");

    expect(ids).toEqual(expect.arrayContaining(["author-1", "keep-1", "follow-1", "viewer-1"]));
    expect(ids).not.toContain("blocked-1");
    expect(ids).not.toContain("blocked-me");
    expect(ids).not.toContain("hex-blocked");
    expect(ids).not.toContain("string-blocked");
});

test("getAccessibleAuthorIds throws for inactive viewer", async () => {
    User.findById.mockReturnValueOnce(mockSelectLean({
        _id: "viewer-1",
        accountStatus: "suspended",
        blockedUsers: []
    }));
    User.find
        .mockReturnValueOnce(mockFindQueryWithDistinct([]))
        .mockReturnValueOnce(mockFindQueryWithDistinct([]));
    Follow.find.mockReturnValueOnce(mockFindQueryWithDistinct([]));

    await expect(postService.getAccessibleAuthorIds("viewer-1"))
        .rejects
        .toMatchObject({ message: "User not found", statusCode: 404 });
});

test("createPost merges text and explicit mentions and sends notifications for active post", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findById.mockReturnValueOnce(mockSelectSession({
        _id: "author-1",
        accountStatus: "active",
        name: "Alice",
        username: "alice"
    }));
    User.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
            session: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { _id: "m1", username: "m1" },
                    { _id: "m2", username: "m2" }
                ])
            })
        })
    });
    resolveMentionUsersFromText.mockResolvedValue([
        { _id: "m1", username: "m1" },
        { _id: "m3", username: "m3" },
        {}
    ]);
    const postDoc = {
        _id: "post-10",
        populate: jest.fn().mockResolvedValue({}),
        toPublicJSON: jest.fn().mockReturnValue({ _id: "post-10", status: "active" })
    };
    Post.create.mockResolvedValue([postDoc]);

    const result = await postService.createPost("author-1", {
        content: "hello @m1 @m3",
        mentions: ["m1", "m2"]
    });

    expect(result).toEqual({ _id: "post-10", status: "active" });
    expect(Post.create).toHaveBeenCalledTimes(1);
    expect(Post.create.mock.calls[0][0][0]).toEqual(expect.objectContaining({
        status: "active",
        author: "author-1",
        mentions: ["m1", "m3", "m2"]
    }));
    expect(notifyMentionedUsers).toHaveBeenCalledWith(expect.objectContaining({
        actorId: "author-1",
        mentionUsers: expect.arrayContaining([
            expect.objectContaining({ _id: "m1" }),
            expect.objectContaining({ _id: "m2" }),
            expect.objectContaining({ _id: "m3" })
        ])
    }));
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
});

test("getPostById adds engagement for logged-in users and increments views for active posts", async () => {
    const post = {
        _id: "post-1",
        author: { _id: "author-1" },
        status: "active"
    };
    Post.findById.mockReturnValue(makeFindByIdPopulateQuery(post));
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "assertCanAccessPost").mockResolvedValue({ authorAccess: {} });
    Like.checkUserLiked.mockResolvedValue(true);
    PostSave.exists.mockResolvedValue({ _id: "save-1" });
    Post.exists.mockResolvedValue(false);
    Follow.checkRelationship.mockResolvedValue({ isFollowing: true });
    const exec = jest.fn();
    Post.findByIdAndUpdate.mockReturnValue({ exec });

    const result = await postService.getPostById("post-1", "viewer-1");

    expect(result.userEngagement).toEqual({
        hasLiked: true,
        hasSaved: true,
        hasReposted: false,
        isFollowingAuthor: true
    });
    expect(Post.findByIdAndUpdate).toHaveBeenCalledWith("post-1", { $inc: { viewsCount: 1 } });
    expect(exec).toHaveBeenCalledTimes(1);
});

test("getPostById skips follow relationship check for author and does not increment non-active post views", async () => {
    const post = {
        _id: "post-1",
        author: { _id: "author-1" },
        status: "scheduled"
    };
    Post.findById.mockReturnValue(makeFindByIdPopulateQuery(post));
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "assertCanAccessPost").mockResolvedValue({ authorAccess: { isOwner: true } });
    Like.checkUserLiked.mockResolvedValue(false);
    PostSave.exists.mockResolvedValue(null);
    Post.exists.mockResolvedValue(false);

    const result = await postService.getPostById("post-1", "author-1");

    expect(result.userEngagement).toEqual({
        hasLiked: false,
        hasSaved: false,
        hasReposted: false,
        isFollowingAuthor: false
    });
    expect(Follow.checkRelationship).not.toHaveBeenCalled();
    expect(Post.findByIdAndUpdate).not.toHaveBeenCalled();
});

test("updatePost throws when post is missing", async () => {
    Post.findById.mockResolvedValue(null);

    await expect(postService.updatePost("post-1", "user-1", { content: "x" }))
        .rejects
        .toThrow("Post not found");
});

test("updatePost throws when user is not the author", async () => {
    Post.findById.mockResolvedValue({
        author: { toString: () => "author-1" },
        status: "active"
    });

    await expect(postService.updatePost("post-1", "viewer-1", { content: "x" }))
        .rejects
        .toThrow("You do not have permission to edit this post");
});

test("updatePost rejects updates on deleted posts", async () => {
    Post.findById.mockResolvedValue({
        author: { toString: () => "author-1" },
        status: "deleted"
    });

    await expect(postService.updatePost("post-1", "author-1", { content: "x" }))
        .rejects
        .toThrow("Cannot edit a deleted or hidden post");
});

test("updatePost applies allowed updates and notifies only newly mentioned users", async () => {
    const post = {
        author: { toString: () => "author-1" },
        status: "active",
        mentions: ["m1"],
        hashtags: ["legacy"],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({}),
        toPublicJSON: jest.fn().mockReturnValue({ _id: "post-1", updated: true })
    };
    Post.findById.mockResolvedValue(post);
    resolveMentionUsersFromText.mockResolvedValue([
        { _id: "m1" },
        { _id: "m2" }
    ]);
    User.findById.mockReturnValueOnce(mockSelectLean({
        name: "Author Name",
        username: "author"
    }));

    const result = await postService.updatePost("post-1", "author-1", {
        content: "new content #Launch @m2",
        visibility: "followers",
        media: [{ url: "file.jpg" }],
        invalidField: "skip"
    });

    expect(result).toEqual({ _id: "post-1", updated: true });
    expect(post.visibility).toBe("followers");
    expect(post.media).toEqual([{ url: "file.jpg" }]);
    expect(post.mentions).toEqual(["m1", "m2"]);
    expect(post.hashtags).toEqual(["launch"]);
    expect(post.invalidField).toBeUndefined();
    expect(notifyMentionedUsers).toHaveBeenCalledWith(expect.objectContaining({
        actorId: "author-1",
        mentionUsers: [expect.objectContaining({ _id: "m2" })]
    }));
});

test("deletePost returns already deleted response for inactive status", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Post.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue({
            author: { toString: () => "author-1" },
            status: "deleted"
        })
    });

    const result = await postService.deletePost("post-1", "author-1");

    expect(result).toEqual({ success: true, message: "Post already deleted" });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(User.updateOne).not.toHaveBeenCalled();
});

test("deletePost soft-deletes active repost and decrements counts", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    const post = {
        author: { toString: () => "author-1" },
        status: "active",
        postType: "repost",
        originalPost: "original-1",
        save: jest.fn().mockResolvedValue({})
    };
    Post.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(post)
    });
    User.updateOne.mockResolvedValue({ acknowledged: true });
    Post.updateOne.mockResolvedValue({ acknowledged: true });

    const result = await postService.deletePost("post-1", "author-1");

    expect(result).toEqual({ success: true, message: "Post deleted successfully" });
    expect(post.status).toBe("deleted");
    expect(post.save).toHaveBeenCalledWith({ session });
    expect(User.updateOne).toHaveBeenCalledWith(
        { _id: "author-1", postsCount: { $gt: 0 } },
        { $inc: { postsCount: -1 } },
        { session }
    );
    expect(Post.updateOne).toHaveBeenCalledWith(
        { _id: "original-1", repostsCount: { $gt: 0 } },
        { $inc: { repostsCount: -1 } },
        { session }
    );
});

test("deletePost aborts transaction on permission errors", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Post.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue({
            author: { toString: () => "author-1" },
            status: "active"
        })
    });

    await expect(postService.deletePost("post-1", "viewer-1"))
        .rejects
        .toThrow("You do not have permission to delete this post");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("unsavePost deletes bookmark and returns saved false", async () => {
    PostSave.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const result = await postService.unsavePost("user-1", "post-1");

    expect(result).toEqual({ saved: false });
    expect(PostSave.deleteOne).toHaveBeenCalledWith({ user: "user-1", post: "post-1" });
});

test("sharePost skips notifications when sharing own post", async () => {
    jest.spyOn(postService, "assertCanAccessPostById").mockResolvedValue({
        _id: "post-1",
        author: "viewer-1"
    });
    Post.findByIdAndUpdate.mockResolvedValue({});

    const result = await postService.sharePost("viewer-1", "post-1");

    expect(result).toEqual({
        shared: true,
        channel: "copy_link",
        shareUrl: "/post/post-1"
    });
    expect(User.findById).not.toHaveBeenCalled();
    expect(notificationService.createNotifications).not.toHaveBeenCalled();
});

test("sharePost logs notification errors and still succeeds", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(postService, "assertCanAccessPostById").mockResolvedValue({
        _id: "post-1",
        author: "author-1"
    });
    Post.findByIdAndUpdate.mockResolvedValue({});
    User.findById
        .mockReturnValueOnce(mockSelectLean({
            preferences: { notifications: { likes: true } }
        }))
        .mockReturnValueOnce(mockSelectLean({
            name: "Viewer Name",
            username: "viewer"
        }));
    notificationService.createNotifications.mockRejectedValue(new Error("notify failed"));

    const result = await postService.sharePost("viewer-1", "post-1", "whatsapp");

    expect(result).toEqual({
        shared: true,
        channel: "whatsapp",
        shareUrl: "/post/post-1"
    });
    expect(consoleSpy).toHaveBeenCalled();
});

test("repostPost returns existing repost when already reposted", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    Post.findById.mockReturnValue(makeFindByIdSelectPopulateQuery({
        _id: "orig-1",
        author: { _id: "author-1", username: "author" },
        status: "active",
        visibility: "public"
    }));
    jest.spyOn(postService, "assertCanAccessPost").mockResolvedValue({ authorAccess: {} });
    Post.findOne.mockResolvedValue({ _id: "existing-repost" });
    jest.spyOn(postService, "getPostById").mockResolvedValue({ _id: "existing-repost", content: "old" });

    const result = await postService.repostPost("viewer-1", "orig-1", {});

    expect(result).toEqual({
        _id: "existing-repost",
        content: "old",
        alreadyReposted: true
    });
});

test("repostPost rejects quote mode without content", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    Post.findById.mockReturnValue(makeFindByIdSelectPopulateQuery({
        _id: "orig-1",
        author: { _id: "author-1", username: "author" },
        status: "active",
        visibility: "public"
    }));
    jest.spyOn(postService, "assertCanAccessPost").mockResolvedValue({ authorAccess: {} });

    await expect(postService.repostPost("viewer-1", "orig-1", { mode: "quote", content: "   " }))
        .rejects
        .toMatchObject({ message: "Quote repost requires content", statusCode: 400 });
});

test("repostPost creates a new repost with fallback content", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    Post.findById.mockReturnValue(makeFindByIdSelectPopulateQuery({
        _id: "orig-1",
        author: { _id: "author-1", username: "author" },
        status: "active",
        visibility: "public"
    }));
    jest.spyOn(postService, "assertCanAccessPost").mockResolvedValue({ authorAccess: {} });
    Post.findOne.mockResolvedValue(null);
    const createSpy = jest.spyOn(postService, "createPost").mockResolvedValue({ _id: "new-repost" });
    Post.findByIdAndUpdate.mockResolvedValue({});

    const result = await postService.repostPost("viewer-1", "orig-1");

    expect(result).toEqual({ _id: "new-repost", alreadyReposted: false });
    expect(createSpy).toHaveBeenCalledWith("viewer-1", {
        content: "Reposted from @author",
        postType: "repost",
        originalPost: "orig-1",
        visibility: "public"
    });
    expect(Post.findByIdAndUpdate).toHaveBeenCalledWith("orig-1", { $inc: { repostsCount: 1 } });
});

test("getUserFeed builds followed-users query and returns pagination", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    Follow.find.mockReturnValueOnce(mockFindQueryWithDistinct(["followed-1"]));
    Post.find.mockReset();
    Post.find.mockReturnValueOnce(makePostFindQuery([{ _id: "post-1" }]));
    Post.countDocuments.mockResolvedValue(3);
    jest.spyOn(postService, "addUserEngagementData").mockResolvedValue([{ _id: "post-1", enriched: true }]);

    const result = await postService.getUserFeed("viewer-1", 1, 2);

    expect(Post.find).toHaveBeenCalledWith({
        author: { $in: ["followed-1", "viewer-1"] },
        status: "active",
        visibility: { $in: ["public", "followers"] }
    });
    expect(result).toEqual({
        posts: [{ _id: "post-1", enriched: true }],
        pagination: {
            page: 1,
            limit: 2,
            total: 3,
            pages: 2,
            hasMore: true
        }
    });
});

test("getPublicFeed returns enriched posts for logged-in user", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "getAccessibleAuthorIds").mockResolvedValue(["author-1"]);
    Post.find.mockReset();
    Post.find.mockReturnValueOnce(makePostFindQuery([{ _id: "post-1" }]));
    Post.countDocuments.mockResolvedValue(1);
    jest.spyOn(postService, "addUserEngagementData").mockResolvedValue([{ _id: "post-1", userEngagement: {} }]);

    const result = await postService.getPublicFeed("viewer-1", 1, 10);

    expect(result.posts).toEqual([{ _id: "post-1", userEngagement: {} }]);
    expect(Post.find).toHaveBeenCalledWith({
        status: "active",
        visibility: "public",
        author: { $in: ["author-1"] }
    });
});

test("getUserPosts throws when viewer is blocked", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "resolveAuthorAccess").mockResolvedValue({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: true
    });

    await expect(postService.getUserPosts("author-1", "viewer-1", 1, 20))
        .rejects
        .toMatchObject({ message: "You cannot view this profile", statusCode: 403 });
});

test("getUserPosts owner query includes scheduled posts", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "resolveAuthorAccess").mockResolvedValue({
        isOwner: true,
        isPrivate: true,
        isApprovedFollower: false,
        isBlockedContext: false
    });
    Post.find.mockReturnValueOnce(makePostFindQuery([{ _id: "post-1" }]));
    Post.countDocuments.mockResolvedValue(1);
    jest.spyOn(postService, "addUserEngagementData").mockResolvedValue([{ _id: "post-1", userEngagement: {} }]);

    await postService.getUserPosts("author-1", "author-1", 1, 10);

    expect(Post.find).toHaveBeenCalledWith({
        author: "author-1",
        status: { $in: ["active", "scheduled"] }
    });
});

test("getUserPosts approved followers can see followers-only posts", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "resolveAuthorAccess").mockResolvedValue({
        isOwner: false,
        isPrivate: true,
        isApprovedFollower: true,
        isBlockedContext: false
    });
    Post.find.mockReturnValueOnce(makePostFindQuery([{ _id: "post-1" }]));
    Post.countDocuments.mockResolvedValue(1);
    jest.spyOn(postService, "addUserEngagementData").mockResolvedValue([{ _id: "post-1", userEngagement: {} }]);

    await postService.getUserPosts("author-1", "viewer-1", 1, 10);

    expect(Post.find).toHaveBeenCalledWith({
        author: "author-1",
        status: "active",
        visibility: { $in: ["public", "followers"] }
    });
});

test("getTrendingPosts uses default 24h window for unknown timeframe", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "getAccessibleAuthorIds").mockResolvedValue(["author-1"]);
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    Post.find.mockReturnValueOnce(makePostFindQuery([{ _id: "post-1" }]));
    Post.countDocuments.mockResolvedValue(1);

    const result = await postService.getTrendingPosts(1, 10, "unknown", "viewer-1");

    expect(Post.find).toHaveBeenCalledWith(expect.objectContaining({
        status: "active",
        visibility: "public",
        author: { $in: ["author-1"] },
        createdAt: expect.objectContaining({ $gte: expect.any(Date) })
    }));
    expect(result.pagination.total).toBe(1);
    nowSpy.mockRestore();
});

test("getTrendingPosts returns empty result when no accessible authors", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "getAccessibleAuthorIds").mockResolvedValue([]);

    const result = await postService.getTrendingPosts(2, 5, "week", "viewer-1");

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

test("searchPosts returns empty result when no accessible authors", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "getAccessibleAuthorIds").mockResolvedValue([]);

    const result = await postService.searchPosts("hello", 1, 20, "viewer-1");

    expect(result).toEqual({
        posts: [],
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 1,
            hasMore: false
        }
    });
});

test("searchPosts builds text query and returns results", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "getAccessibleAuthorIds").mockResolvedValue(["author-1"]);
    Post.find.mockReturnValueOnce(makePostFindQuery([{ _id: "post-1" }]));
    Post.countDocuments.mockResolvedValue(2);

    const result = await postService.searchPosts("project", 1, 10, "viewer-1");

    expect(Post.find).toHaveBeenCalledWith({
        status: "active",
        visibility: "public",
        author: { $in: ["author-1"] },
        $text: { $search: "project" }
    });
    expect(result.pagination.total).toBe(2);
});

test("getPostsByHashtag returns empty result when no accessible authors", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "getAccessibleAuthorIds").mockResolvedValue([]);

    const result = await postService.getPostsByHashtag("React", 1, 10, "viewer-1");

    expect(result).toEqual({
        hashtag: "#React",
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

test("getPostsByHashtag lowercases hashtag in query", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "getAccessibleAuthorIds").mockResolvedValue(["author-1"]);
    Post.find.mockReturnValueOnce(makePostFindQuery([{ _id: "post-1" }]));
    Post.countDocuments.mockResolvedValue(1);

    const result = await postService.getPostsByHashtag("ReactJS", 1, 10, "viewer-1");

    expect(Post.find).toHaveBeenCalledWith({
        status: "active",
        visibility: "public",
        author: { $in: ["author-1"] },
        hashtags: "reactjs"
    });
    expect(result.hashtag).toBe("#ReactJS");
});

test("addUserEngagementData returns input when posts list is empty", async () => {
    const result = await postService.addUserEngagementData([], "viewer-1");
    expect(result).toEqual([]);
});

test("addUserEngagementData returns input when posts do not have valid ids", async () => {
    const input = [{ author: "author-1" }];
    const result = await postService.addUserEngagementData(input, "viewer-1");
    expect(result).toEqual(input);
});

test("addUserEngagementData marks follow requests as pending for unapproved relations", async () => {
    const posts = [{ _id: "p1", author: "a1" }];
    Like.checkMultipleLikes.mockResolvedValue({ p1: false });
    PostSave.checkMultipleSaved.mockResolvedValue({ p1: false });
    Post.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
    });
    Follow.find
        .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([{ following: "a1", isApproved: false }])
        })
        .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([])
        });

    const result = await postService.addUserEngagementData(posts, "viewer-1");

    expect(result[0].userEngagement).toEqual({
        hasLiked: false,
        hasSaved: false,
        hasReposted: false,
        isFollowingAuthor: false,
        isFollowRequestPending: true,
        isFollowedByAuthor: false
    });
});

test("canViewPostWithAccess handles null and restricted visibility edge cases", () => {
    expect(postService.canViewPostWithAccess(null, {})).toBe(false);
    expect(postService.canViewPostWithAccess({ status: "deleted", visibility: "public" }, {})).toBe(false);
    expect(postService.canViewPostWithAccess(
        { status: "active", visibility: "public" },
        { isBlockedContext: true }
    )).toBe(false);
    expect(postService.canViewPostWithAccess(
        { status: "active", visibility: "public" },
        { isPrivate: true, isOwner: false, isApprovedFollower: false }
    )).toBe(false);
    expect(postService.canViewPostWithAccess(
        { status: "active", visibility: "private" },
        { isOwner: true }
    )).toBe(true);
    expect(postService.canViewPostWithAccess(
        { status: "active", visibility: "private" },
        { isOwner: false, isApprovedFollower: true }
    )).toBe(false);
});

test("assertCanAccessPost covers null, deleted, private and success paths", async () => {
    await expect(postService.assertCanAccessPost(null, "viewer-1"))
        .rejects
        .toMatchObject({ message: "Post not found", statusCode: 404 });

    jest.spyOn(postService, "resolveAuthorAccess").mockResolvedValue({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: false
    });
    await expect(postService.assertCanAccessPost(
        { _id: "p1", author: "a1", status: "hidden", visibility: "public" },
        "viewer-1",
        "view this post"
    )).rejects.toMatchObject({
        message: "Post not found",
        statusCode: 404
    });

    postService.resolveAuthorAccess.mockResolvedValueOnce({
        isOwner: false,
        isPrivate: true,
        isApprovedFollower: false,
        isBlockedContext: false
    });
    await expect(postService.assertCanAccessPost(
        { _id: "p2", author: "a1", status: "active", visibility: "public" },
        "viewer-1",
        "view this post"
    )).rejects.toMatchObject({
        message: "This profile is private",
        statusCode: 403
    });

    postService.resolveAuthorAccess.mockResolvedValueOnce({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: true,
        isBlockedContext: false
    });
    await expect(postService.assertCanAccessPost(
        { _id: "p3", author: "a1", status: "active", visibility: "followers" },
        "viewer-1",
        "view this post"
    )).resolves.toEqual({
        authorAccess: expect.objectContaining({ isApprovedFollower: true })
    });
});

test("filterAccessiblePosts rethrows unexpected errors", async () => {
    jest.spyOn(postService, "assertCanAccessPost")
        .mockRejectedValueOnce(new Error("db failure"));

    await expect(postService.filterAccessiblePosts([{ _id: "p1" }], "viewer-1"))
        .rejects
        .toThrow("db failure");
});

test("deletePost throws when post does not exist", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Post.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(null)
    });

    await expect(postService.deletePost("post-404", "author-1"))
        .rejects
        .toThrow("Post not found");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("getUserPosts uses public visibility filter for non-followers", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    jest.spyOn(postService, "resolveAuthorAccess").mockResolvedValue({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: false
    });
    Post.find.mockReturnValueOnce(makePostFindQuery([{ _id: "post-1" }]));
    Post.countDocuments.mockResolvedValue(1);
    jest.spyOn(postService, "addUserEngagementData").mockResolvedValue([{ _id: "post-1" }]);

    await postService.getUserPosts("author-1", "viewer-1", 1, 10);

    expect(Post.find).toHaveBeenCalledWith({
        author: "author-1",
        status: "active",
        visibility: "public"
    });
});

test("getPostById supports anonymous callers and skips engagement enrichment", async () => {
    jest.spyOn(postService, "publishDueScheduledPosts").mockResolvedValue(0);
    Post.findById.mockReturnValue(makeFindByIdPopulateQuery({
        _id: "post-1",
        author: { _id: "author-1" },
        status: "active",
        visibility: "public"
    }));
    jest.spyOn(postService, "assertCanAccessPost").mockResolvedValue({
        authorAccess: {
            isOwner: false,
            isPrivate: false,
            isApprovedFollower: false,
            isBlockedContext: false
        }
    });
    Post.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

    const result = await postService.getPostById("post-1");

    expect(Like.checkUserLiked).not.toHaveBeenCalled();
    expect(result).toEqual({
        _id: "post-1",
        author: { _id: "author-1" },
        status: "active",
        visibility: "public"
    });
});

test("resolveAuthorAccess tolerates blocked list entries without toString", async () => {
    const noProtoObject = Object.create(null);
    User.findById
        .mockReturnValueOnce(mockSelectLean({
            _id: "author-1",
            accountStatus: "active",
            isPrivate: false,
            blockedUsers: [noProtoObject]
        }))
        .mockReturnValueOnce(mockSelectLean({
            _id: "viewer-1",
            accountStatus: "active",
            blockedUsers: []
        }));
    Follow.checkRelationship.mockResolvedValue({ isFollowing: false, isApproved: false });

    const access = await postService.resolveAuthorAccess("author-1", "viewer-1");

    expect(access).toEqual({
        isOwner: false,
        isPrivate: false,
        isApprovedFollower: false,
        isBlockedContext: false
    });
});

test("addUserEngagementData ignores malformed follow/repost rows", async () => {
    const posts = [{ _id: "p1", author: { _id: "a1" } }];
    Like.checkMultipleLikes.mockResolvedValue({ p1: false });
    PostSave.checkMultipleSaved.mockResolvedValue({ p1: false });
    Post.find
        .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([
                {},
                { originalPost: "p1" }
            ])
        });
    Follow.find
        .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([
                {},
                { following: "a1", isApproved: false }
            ])
        })
        .mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([
                {},
                { follower: "a1" }
            ])
        });

    const result = await postService.addUserEngagementData(posts, "viewer-1");

    expect(result[0].userEngagement).toEqual({
        hasLiked: false,
        hasSaved: false,
        hasReposted: true,
        isFollowingAuthor: false,
        isFollowRequestPending: true,
        isFollowedByAuthor: true
    });
});
