jest.mock("mongoose", () => ({
    startSession: jest.fn()
}));

jest.mock("../../src/models/like", () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn()
}));

jest.mock("../../src/models/post", () => ({
    findByIdAndUpdate: jest.fn(),
    updateOne: jest.fn()
}));

jest.mock("../../src/models/comment", () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateOne: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn()
}));

jest.mock("../../src/modules/posts/post.service", () => ({
    assertCanAccessPostById: jest.fn(),
    filterAccessiblePosts: jest.fn()
}));

const mongoose = require("mongoose");
const Like = require("../../src/models/like");
const Post = require("../../src/models/post");
const Comment = require("../../src/models/comment");
const User = require("../../src/models/user");
const notificationService = require("../../src/modules/notification/notification.service");
const postService = require("../../src/modules/posts/post.service");
const likeService = require("../../src/modules/posts/like.service");

const createSession = () => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn(),
    inTransaction: jest.fn(() => true)
});

const withSession = (value) => ({
    session: jest.fn().mockResolvedValue(value)
});

const selectSessionLean = (value) => ({
    select: jest.fn(() => ({
        session: jest.fn(() => ({
            lean: jest.fn().mockResolvedValue(value)
        }))
    }))
});

const makeFindQuery = (value) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
});

test("likePost updates reaction when like already exists with different reaction", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);

    postService.assertCanAccessPostById.mockResolvedValue({ author: "author-1" });
    const likeDoc = {
        reactionType: "like",
        save: jest.fn().mockResolvedValue(undefined)
    };
    Like.findOne.mockReturnValue(withSession(likeDoc));

    const result = await likeService.likePost("user-1", "post-1", "love");

    expect(likeDoc.reactionType).toBe("love");
    expect(likeDoc.save).toHaveBeenCalledWith({ session });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
        success: true,
        message: "Reaction updated",
        liked: true
    });
});

test("likePost creates new like, increments counter and sends notification", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);

    postService.assertCanAccessPostById.mockResolvedValue({ author: "author-2" });
    Like.findOne.mockReturnValue(withSession(null));
    User.findById
        .mockReturnValueOnce(selectSessionLean({
            preferences: { notifications: { likes: true } }
        }))
        .mockReturnValueOnce(selectSessionLean({
            name: "Alice",
            username: "alice"
        }));

    const result = await likeService.likePost("user-1", "post-1", "like");

    expect(Like.create).toHaveBeenCalledWith([
        {
            user: "user-1",
            post: "post-1",
            reactionType: "like"
        }
    ], { session });
    expect(Post.findByIdAndUpdate).toHaveBeenCalledWith(
        "post-1",
        { $inc: { likesCount: 1 } },
        { session }
    );
    expect(notificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
            recipientIds: ["author-2"],
            actorId: "user-1",
            metadata: expect.objectContaining({
                kind: "post_like",
                postId: "post-1",
                reactionType: "like"
            })
        })
    );
    expect(result).toEqual({
        success: true,
        message: "Post liked successfully",
        liked: true
    });
});

test("likePost handles duplicate-like race condition gracefully", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);

    postService.assertCanAccessPostById.mockResolvedValue({ author: "author-2" });
    Like.findOne
        .mockReturnValueOnce(withSession(null))
        .mockResolvedValueOnce({
            reactionType: "like",
            save: jest.fn().mockResolvedValue(undefined)
        });
    Like.create.mockRejectedValue({
        name: "MongoServerError",
        code: 11000,
        keyPattern: { user: 1, post: 1 }
    });

    const result = await likeService.likePost("user-1", "post-1", "like");

    expect(session.abortTransaction).toHaveBeenCalled();
    expect(result).toEqual({
        success: true,
        message: "Post already liked",
        liked: true
    });
});

test("unlikePost returns already-unliked when like record does not exist", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Like.findOne.mockReturnValue(withSession(null));

    const result = await likeService.unlikePost("user-1", "post-1");

    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
        success: true,
        message: "Post already unliked",
        liked: false
    });
});

test("likeComment throws 404 when comment is not active", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Comment.findById.mockReturnValue({
        select: jest.fn(() => withSession(null))
    });

    await expect(likeService.likeComment("user-1", "comment-1"))
        .rejects
        .toMatchObject({
            message: "Comment not found",
            statusCode: 404
        });

    expect(session.abortTransaction).toHaveBeenCalled();
});

test("unlikeComment removes like and decrements comment counter", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);

    Like.findOne.mockReturnValue(withSession({ _id: "like-1" }));
    Like.findByIdAndDelete.mockReturnValue(withSession({ _id: "like-1" }));

    const result = await likeService.unlikeComment("user-1", "comment-1");

    expect(Comment.updateOne).toHaveBeenCalledWith(
        { _id: "comment-1", likesCount: { $gt: 0 } },
        { $inc: { likesCount: -1 } },
        { session }
    );
    expect(result).toEqual({
        success: true,
        message: "Comment unliked successfully",
        liked: false
    });
});

test("getPostLikes returns mapped likes list with pagination", async () => {
    postService.assertCanAccessPostById.mockResolvedValue({ _id: "post-1" });
    Like.find.mockReturnValue(makeFindQuery([
        {
            user: { _id: "u2", username: "bob", name: "Bob" },
            createdAt: "2026-01-01T00:00:00.000Z",
            reactionType: "love"
        }
    ]));
    Like.countDocuments.mockResolvedValue(1);

    const result = await likeService.getPostLikes("post-1", "viewer-1", 1, 20);

    expect(result.likes).toEqual([
        {
            _id: "u2",
            username: "bob",
            name: "Bob",
            likedAt: "2026-01-01T00:00:00.000Z",
            reactionType: "love"
        }
    ]);
    expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
        hasMore: false
    });
});

test("getUserLikedPosts filters inactive posts and applies access filtering", async () => {
    Like.find.mockReturnValue(makeFindQuery([
        {
            post: { _id: "post-1", status: "active", content: "A" },
            createdAt: "2026-01-01T00:00:00.000Z"
        },
        {
            post: { _id: "post-2", status: "deleted", content: "B" },
            createdAt: "2026-01-02T00:00:00.000Z"
        }
    ]));
    Like.countDocuments.mockResolvedValue(2);
    postService.filterAccessiblePosts.mockResolvedValue([
        {
            _id: "post-1",
            status: "active",
            content: "A",
            likedAt: "2026-01-01T00:00:00.000Z"
        }
    ]);

    const result = await likeService.getUserLikedPosts("user-1", 1, 10);

    expect(postService.filterAccessiblePosts).toHaveBeenCalledWith(
        [
            {
                _id: "post-1",
                status: "active",
                content: "A",
                likedAt: "2026-01-01T00:00:00.000Z"
            }
        ],
        "user-1"
    );
    expect(result.posts).toHaveLength(1);
    expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
        hasMore: false
    });
});

test("likePost returns already-liked when reaction is unchanged", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.assertCanAccessPostById.mockResolvedValue({ author: "author-2" });
    Like.findOne.mockReturnValue(withSession({
        reactionType: "like",
        save: jest.fn().mockResolvedValue(undefined)
    }));

    const result = await likeService.likePost("user-1", "post-1", "like");

    expect(result).toEqual({
        success: true,
        message: "Post already liked",
        liked: true
    });
    expect(Like.create).not.toHaveBeenCalled();
});

test("likePost skips notifications for self-likes", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.assertCanAccessPostById.mockResolvedValue({ author: "user-1" });
    Like.findOne.mockReturnValue(withSession(null));

    const result = await likeService.likePost("user-1", "post-1", "love");

    expect(result).toEqual({
        success: true,
        message: "Post liked successfully",
        liked: true
    });
    expect(User.findById).not.toHaveBeenCalled();
    expect(notificationService.createNotifications).not.toHaveBeenCalled();
});

test("likePost does not send notification when post author disabled like notifications", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.assertCanAccessPostById.mockResolvedValue({ author: "author-2" });
    Like.findOne.mockReturnValue(withSession(null));
    User.findById
        .mockReturnValueOnce(selectSessionLean({
            preferences: { notifications: { likes: false } }
        }))
        .mockReturnValueOnce(selectSessionLean({
            name: "Alice",
            username: "alice"
        }));

    const result = await likeService.likePost("user-1", "post-1", "like");

    expect(result).toEqual({
        success: true,
        message: "Post liked successfully",
        liked: true
    });
    expect(notificationService.createNotifications).not.toHaveBeenCalled();
});

test("likePost swallows notification failures after successful commit", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.assertCanAccessPostById.mockResolvedValue({ author: "author-2" });
    Like.findOne.mockReturnValue(withSession(null));
    User.findById
        .mockReturnValueOnce(selectSessionLean({
            preferences: { notifications: { likes: true } }
        }))
        .mockReturnValueOnce(selectSessionLean({
            username: "alice"
        }));
    notificationService.createNotifications.mockRejectedValue(new Error("notify down"));

    const result = await likeService.likePost("user-1", "post-1", "wow");

    expect(result).toEqual({
        success: true,
        message: "Post liked successfully",
        liked: true
    });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
});

test("likePost duplicate race updates reaction when existing like differs", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.assertCanAccessPostById.mockResolvedValue({ author: "author-2" });
    Like.findOne
        .mockReturnValueOnce(withSession(null))
        .mockResolvedValueOnce({
            reactionType: "like",
            save: jest.fn().mockResolvedValue(undefined)
        });
    Like.create.mockRejectedValue({
        name: "MongoServerError",
        code: 11000,
        keyPattern: { user: 1, post: 1 }
    });

    const result = await likeService.likePost("user-1", "post-1", "sad");

    expect(result).toEqual({
        success: true,
        message: "Reaction updated",
        liked: true
    });
});

test("likePost rethrows non-duplicate create failures", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.assertCanAccessPostById.mockResolvedValue({ author: "author-2" });
    Like.findOne.mockReturnValue(withSession(null));
    Like.create.mockRejectedValue(new Error("db write failed"));

    await expect(likeService.likePost("user-1", "post-1", "like"))
        .rejects
        .toThrow("db write failed");
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("unlikePost removes like and decrements post counters", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Like.findOne.mockReturnValue(withSession({ _id: "like-1" }));
    Like.findByIdAndDelete.mockReturnValue(withSession({ _id: "like-1" }));

    const result = await likeService.unlikePost("user-1", "post-1");

    expect(Post.updateOne).toHaveBeenCalledWith(
        { _id: "post-1", likesCount: { $gt: 0 } },
        { $inc: { likesCount: -1 } },
        { session }
    );
    expect(result).toEqual({
        success: true,
        message: "Post unliked successfully",
        liked: false
    });
});

test("unlikePost skips abort when transaction is already inactive", async () => {
    const session = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        endSession: jest.fn(),
        inTransaction: jest.fn(() => false)
    };
    mongoose.startSession.mockResolvedValue(session);
    Like.findOne.mockReturnValue(withSession({ _id: "like-1" }));
    Like.findByIdAndDelete.mockReturnValue({
        session: jest.fn().mockRejectedValue(new Error("delete failed"))
    });

    await expect(likeService.unlikePost("user-1", "post-1"))
        .rejects
        .toThrow("delete failed");
    expect(session.abortTransaction).not.toHaveBeenCalled();
});

test("likeComment returns already-liked when like exists", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Comment.findById.mockReturnValue({
        select: jest.fn(() => withSession({
            _id: "comment-1",
            author: "author-2",
            post: "post-1",
            status: "active"
        }))
    });
    postService.assertCanAccessPostById.mockResolvedValue({ _id: "post-1" });
    Like.findOne.mockReturnValue(withSession({ _id: "like-1" }));

    const result = await likeService.likeComment("user-1", "comment-1");

    expect(result).toEqual({
        success: true,
        message: "Comment already liked",
        liked: true
    });
});

test("likeComment creates like and optionally sends notification", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Comment.findById.mockReturnValue({
        select: jest.fn(() => withSession({
            _id: "comment-1",
            author: "author-2",
            post: "post-1",
            status: "active"
        }))
    });
    postService.assertCanAccessPostById.mockResolvedValue({ _id: "post-1" });
    Like.findOne.mockReturnValue(withSession(null));
    User.findById
        .mockReturnValueOnce(selectSessionLean({
            preferences: { notifications: { likes: true } }
        }))
        .mockReturnValueOnce(selectSessionLean({
            name: "Alice"
        }));

    const result = await likeService.likeComment("user-1", "comment-1");

    expect(result).toEqual({
        success: true,
        message: "Comment liked successfully",
        liked: true
    });
    expect(notificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
            recipientIds: ["author-2"],
            metadata: expect.objectContaining({
                kind: "comment_like",
                commentId: "comment-1",
                postId: "post-1"
            })
        })
    );
});

test("likeComment handles duplicate-like race and returns already-liked", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Comment.findById.mockReturnValue({
        select: jest.fn(() => withSession({
            _id: "comment-1",
            author: "author-2",
            post: "post-1",
            status: "active"
        }))
    });
    postService.assertCanAccessPostById.mockResolvedValue({ _id: "post-1" });
    Like.findOne
        .mockReturnValueOnce(withSession(null))
        .mockResolvedValueOnce({ _id: "like-1" });
    Like.create.mockRejectedValue({
        name: "MongoServerError",
        code: 11000,
        keyPattern: { user: 1, comment: 1 }
    });

    const result = await likeService.likeComment("user-1", "comment-1");

    expect(result).toEqual({
        success: true,
        message: "Comment already liked",
        liked: true
    });
});

test("likeComment rethrows duplicate errors when no existing like is found", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Comment.findById.mockReturnValue({
        select: jest.fn(() => withSession({
            _id: "comment-1",
            author: "author-2",
            post: "post-1",
            status: "active"
        }))
    });
    postService.assertCanAccessPostById.mockResolvedValue({ _id: "post-1" });
    Like.findOne
        .mockReturnValueOnce(withSession(null))
        .mockResolvedValueOnce(null);
    Like.create.mockRejectedValue({
        name: "MongoServerError",
        code: 11000,
        keyPattern: { user: 1, comment: 1 }
    });

    await expect(likeService.likeComment("user-1", "comment-1"))
        .rejects
        .toMatchObject({ code: 11000 });
});

test("unlikeComment returns already-unliked when no like exists", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Like.findOne.mockReturnValue(withSession(null));

    const result = await likeService.unlikeComment("user-1", "comment-1");

    expect(result).toEqual({
        success: true,
        message: "Comment already unliked",
        liked: false
    });
});
