jest.mock("mongoose", () => ({
    startSession: jest.fn()
}));

jest.mock("../../src/models/comment", () => ({
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    bulkWrite: jest.fn()
}));

jest.mock("../../src/models/post", () => ({
    findById: jest.fn(),
    updateOne: jest.fn()
}));

jest.mock("../../src/models/like", () => ({
    find: jest.fn(),
    deleteMany: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn()
}));

jest.mock("../../src/modules/utils/mentionService", () => ({
    resolveMentionUsersFromText: jest.fn(),
    notifyMentionedUsers: jest.fn(),
    getMentionSnippet: jest.fn().mockReturnValue("snippet")
}));

jest.mock("../../src/modules/posts/post.service", () => ({
    publishDueScheduledPosts: jest.fn(),
    assertCanAccessPost: jest.fn(),
    assertCanAccessPostById: jest.fn()
}));

const mongoose = require("mongoose");
const Comment = require("../../src/models/comment");
const Post = require("../../src/models/post");
const Like = require("../../src/models/like");
const User = require("../../src/models/user");
const notificationService = require("../../src/modules/notification/notification.service");
const {
    resolveMentionUsersFromText,
    notifyMentionedUsers
} = require("../../src/modules/utils/mentionService");
const postService = require("../../src/modules/posts/post.service");
const commentService = require("../../src/modules/posts/comment.service");

const createSession = () => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn()
});

const selectSession = (value) => ({
    select: jest.fn(() => ({
        session: jest.fn().mockResolvedValue(value)
    }))
});

const makeCommentFindQuery = (value) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

const makeTreeQuery = (value) => ({
    select: jest.fn(() => ({
        session: jest.fn(() => ({
            lean: jest.fn().mockResolvedValue(value)
        }))
    }))
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("buildCommentLikeSet returns empty set when user is not provided", async () => {
    const liked = await commentService.buildCommentLikeSet(["c1"], null);

    expect(liked).toBeInstanceOf(Set);
    expect(liked.size).toBe(0);
    expect(Like.find).not.toHaveBeenCalled();
});

test("buildCommentLikeSet returns liked comment IDs from like model", async () => {
    Like.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(["c1", "c3"])
    });

    const liked = await commentService.buildCommentLikeSet(["c1", "c2", "c3"], "user-1");

    expect(Array.from(liked)).toEqual(["c1", "c3"]);
});

test("attachCommentEngagement annotates top-level and reply like flags", () => {
    const comment = {
        _id: "c1",
        replies: [
            { _id: "r1", content: "A" },
            { _id: "r2", content: "B" }
        ]
    };

    const result = commentService.attachCommentEngagement(comment, new Set(["c1", "r2"]));

    expect(result.userEngagement.hasLiked).toBe(true);
    expect(result.replies[0].userEngagement.hasLiked).toBe(false);
    expect(result.replies[1].userEngagement.hasLiked).toBe(true);
});

test("createComment rejects when comments are disabled on target post", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.publishDueScheduledPosts.mockResolvedValue(undefined);
    Post.findById.mockReturnValue(selectSession({
        _id: "post-1",
        author: "author-1",
        status: "active",
        visibility: "public",
        settings: { commentsDisabled: true }
    }));
    postService.assertCanAccessPost.mockResolvedValue(undefined);

    await expect(commentService.createComment("user-1", "post-1", "Hello"))
        .rejects
        .toMatchObject({
            message: "Comments are disabled on this post",
            statusCode: 403
        });

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("createComment creates comment and returns serialized engagement payload", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.publishDueScheduledPosts.mockResolvedValue(undefined);

    Post.findById.mockReturnValue(selectSession({
        _id: "post-1",
        author: "user-1",
        status: "active",
        visibility: "public",
        settings: { commentsDisabled: false }
    }));
    postService.assertCanAccessPost.mockResolvedValue(undefined);
    resolveMentionUsersFromText.mockResolvedValue([]);

    const commentDoc = {
        _id: "comment-1",
        populate: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
            _id: "comment-1",
            content: "Hello",
            mentions: []
        })
    };
    Comment.create.mockResolvedValue([commentDoc]);

    const result = await commentService.createComment("user-1", "post-1", "Hello");

    expect(Comment.create).toHaveBeenCalledWith([
        expect.objectContaining({
            post: "post-1",
            author: "user-1",
            content: "Hello"
        })
    ], { session });
    expect(notifyMentionedUsers).not.toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
        _id: "comment-1",
        content: "Hello",
        mentions: [],
        userEngagement: { hasLiked: false },
        replies: [],
        hasMoreReplies: false
    });
});

test("getCommentReplies throws 404 for missing parent comment", async () => {
    Comment.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
    });

    await expect(commentService.getCommentReplies("comment-1", "user-1"))
        .rejects
        .toMatchObject({
            message: "Comment not found",
            statusCode: 404
        });
});

test("getCommentReplies returns replies with like engagement flags", async () => {
    Comment.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "comment-1",
            post: "post-1",
            status: "active"
        })
    });
    postService.assertCanAccessPostById.mockResolvedValue(undefined);
    Comment.find.mockReturnValue(makeCommentFindQuery([
        { _id: "reply-1", content: "A" },
        { _id: "reply-2", content: "B" }
    ]));
    Comment.countDocuments.mockResolvedValue(2);
    Like.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(["reply-1"])
    });

    const result = await commentService.getCommentReplies("comment-1", "user-1", 1, 20);

    expect(result.replies).toEqual([
        expect.objectContaining({
            _id: "reply-1",
            userEngagement: expect.objectContaining({ hasLiked: true })
        }),
        expect.objectContaining({
            _id: "reply-2",
            userEngagement: expect.objectContaining({ hasLiked: false })
        })
    ]);
    expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
        hasMore: false
    });
});

test("updateComment rejects when comment does not exist", async () => {
    Comment.findById.mockResolvedValue(null);

    await expect(commentService.updateComment("comment-1", "user-1", "Updated"))
        .rejects
        .toThrow("Comment not found");
});

test("updateComment rejects when user is not author", async () => {
    Comment.findById.mockResolvedValue({
        author: "other-user",
        status: "active"
    });

    await expect(commentService.updateComment("comment-1", "user-1", "Updated"))
        .rejects
        .toThrow("You do not have permission to edit this comment");
});

test("updateComment saves content and notifies newly mentioned users", async () => {
    const commentDoc = {
        _id: "comment-1",
        post: "post-1",
        author: "user-1",
        status: "active",
        mentions: ["existing-mention"],
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(undefined)
    };
    Comment.findById.mockResolvedValue(commentDoc);
    resolveMentionUsersFromText.mockResolvedValue([
        { _id: "existing-mention", username: "old" },
        { _id: "new-mention", username: "new" }
    ]);
    User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                _id: "user-1",
                name: "Alice",
                username: "alice"
            })
        })
    });

    const result = await commentService.updateComment("comment-1", "user-1", "  Updated body  ");

    expect(commentDoc.content).toBe("  Updated body  ");
    expect(commentDoc.mentions).toEqual(["existing-mention", "new-mention"]);
    expect(commentDoc.save).toHaveBeenCalledTimes(1);
    expect(notifyMentionedUsers).toHaveBeenCalledWith(expect.objectContaining({
        actorId: "user-1",
        mentionUsers: [expect.objectContaining({ _id: "new-mention" })],
        metadata: expect.objectContaining({
            source: "comment.update",
            commentId: "comment-1"
        })
    }));
    expect(result).toBe(commentDoc);
});

test("deleteComment returns already deleted for inactive comment", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Comment.findById.mockReturnValue({
        select: jest.fn(() => ({
            session: jest.fn().mockResolvedValue({
                _id: "comment-1",
                post: "post-1",
                author: "user-1",
                parentComment: null,
                status: "deleted"
            })
        }))
    });
    Post.findById.mockReturnValue({
        select: jest.fn(() => ({
            session: jest.fn().mockResolvedValue({
                _id: "post-1",
                author: "post-author"
            })
        }))
    });

    const result = await commentService.deleteComment("comment-1", "user-1");

    expect(result).toEqual({
        success: true,
        message: "Comment already deleted"
    });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(session.abortTransaction).not.toHaveBeenCalled();
});

test("deleteComment rejects unauthorized user", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Comment.findById.mockReturnValue({
        select: jest.fn(() => ({
            session: jest.fn().mockResolvedValue({
                _id: "comment-1",
                post: "post-1",
                author: "comment-author",
                parentComment: null,
                status: "active"
            })
        }))
    });
    Post.findById.mockReturnValue({
        select: jest.fn(() => ({
            session: jest.fn().mockResolvedValue({
                _id: "post-1",
                author: "post-author"
            })
        }))
    });

    await expect(commentService.deleteComment("comment-1", "outsider"))
        .rejects
        .toMatchObject({
            statusCode: 403,
            message: "You do not have permission to delete this comment"
        });

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("deleteComment cascades active replies and updates counters", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);

    Comment.findById.mockReturnValue({
        select: jest.fn(() => ({
            session: jest.fn().mockResolvedValue({
                _id: "root",
                post: "post-1",
                author: "user-1",
                parentComment: null,
                status: "active"
            })
        }))
    });
    Post.findById.mockReturnValue({
        select: jest.fn(() => ({
            session: jest.fn().mockResolvedValue({
                _id: "post-1",
                author: "user-1"
            })
        }))
    });
    Comment.find
        .mockReturnValueOnce(makeTreeQuery([
            { _id: "child-1", parentComment: "root", status: "active" },
            { _id: "child-2", parentComment: "orphan-parent", status: "active" },
            { _id: "child-inactive", parentComment: "root", status: "deleted" }
        ]))
        .mockReturnValueOnce(makeTreeQuery([]));
    Comment.updateMany.mockResolvedValue({});
    Comment.bulkWrite.mockResolvedValue({});
    Post.updateOne.mockResolvedValue({});
    Like.deleteMany.mockReturnValue({
        session: jest.fn().mockResolvedValue({})
    });

    const result = await commentService.deleteComment("root", "user-1");

    expect(Comment.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ["root", "child-1", "child-2"] } },
        { $set: { status: "deleted" } },
        { session }
    );
    expect(Post.updateOne).toHaveBeenCalledWith(
        { _id: "post-1", commentsCount: { $gt: 0 } },
        { $inc: { commentsCount: -3 } },
        { session }
    );
    expect(Comment.bulkWrite).toHaveBeenCalled();
    expect(Like.deleteMany).toHaveBeenCalledWith({
        comment: { $in: ["root", "child-1", "child-2"] }
    });
    expect(result).toEqual({
        success: true,
        message: "Comment deleted successfully"
    });
});

test("getPostComments returns top-level comments with replies and engagement", async () => {
    postService.assertCanAccessPostById.mockResolvedValue(undefined);
    Comment.find.mockReset();
    Comment.find
        .mockReturnValueOnce(makeCommentFindQuery([
            { _id: "comment-1", repliesCount: 4, content: "Top comment" }
        ]))
        .mockReturnValueOnce(makeCommentFindQuery([
            { _id: "reply-1", content: "Reply content" }
        ]));
    Comment.countDocuments.mockResolvedValue(5);
    Like.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(["comment-1", "reply-1"])
    });

    const result = await commentService.getPostComments("post-1", "user-1", 1, 2, "popular");

    expect(Comment.find).toHaveBeenNthCalledWith(1, {
        post: "post-1",
        parentComment: null,
        status: "active"
    });
    expect(result.comments).toEqual([
        expect.objectContaining({
            _id: "comment-1",
            hasMoreReplies: true,
            userEngagement: expect.objectContaining({ hasLiked: true }),
            replies: [
                expect.objectContaining({
                    _id: "reply-1",
                    userEngagement: expect.objectContaining({ hasLiked: true })
                })
            ]
        })
    ]);
    expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        pages: 3,
        hasMore: true
    });
});

test("getPostComments applies default pagination/sort values", async () => {
    postService.assertCanAccessPostById.mockResolvedValue(undefined);
    Comment.find.mockReset();
    Comment.find
        .mockReturnValueOnce(makeCommentFindQuery([
            { _id: "comment-1", repliesCount: 0, content: "Top comment" }
        ]))
        .mockReturnValueOnce(makeCommentFindQuery([]));
    Comment.countDocuments.mockResolvedValue(1);
    Like.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue([])
    });

    const result = await commentService.getPostComments("post-1", "user-1");

    expect(Comment.find).toHaveBeenNthCalledWith(1, {
        post: "post-1",
        parentComment: null,
        status: "active"
    });
    expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
        hasMore: false
    });
});

test("getUserComments returns paginated comments with post references", async () => {
    Comment.find.mockReturnValue(makeCommentFindQuery([
        {
            _id: "comment-1",
            content: "Mine",
            post: { _id: "post-1" }
        }
    ]));
    Comment.countDocuments.mockResolvedValue(1);

    const result = await commentService.getUserComments("user-1", 1, 10);

    expect(Comment.find).toHaveBeenCalledWith({
        author: "user-1",
        status: "active"
    });
    expect(result.comments).toHaveLength(1);
    expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
        hasMore: false
    });
});

test("createComment rejects when post is missing or inactive", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.publishDueScheduledPosts.mockResolvedValue(undefined);
    Post.findById.mockReturnValue(selectSession(null));

    await expect(commentService.createComment("user-1", "post-1", "Hello"))
        .rejects
        .toMatchObject({
            message: "Post not found",
            statusCode: 404
        });

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("createComment validates parent comment existence and post ownership", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.publishDueScheduledPosts.mockResolvedValue(undefined);
    Post.findById.mockReturnValue(selectSession({
        _id: "post-1",
        author: "author-1",
        status: "active",
        visibility: "public",
        settings: { commentsDisabled: false }
    }));
    postService.assertCanAccessPost.mockResolvedValue(undefined);

    Comment.findById.mockReturnValueOnce({
        session: jest.fn().mockResolvedValue(null)
    });

    await expect(commentService.createComment("user-1", "post-1", "Hello", "parent-1"))
        .rejects
        .toMatchObject({
            message: "Parent comment not found",
            statusCode: 404
        });

    Comment.findById.mockReturnValueOnce({
        session: jest.fn().mockResolvedValue({
            _id: "parent-1",
            post: "other-post",
            status: "active"
        })
    });

    await expect(commentService.createComment("user-1", "post-1", "Hello", "parent-1"))
        .rejects
        .toMatchObject({
            message: "Parent comment does not belong to this post",
            statusCode: 400
        });
});

test("createComment sends social + mention notifications and tolerates notification errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    postService.publishDueScheduledPosts.mockResolvedValue(undefined);
    Post.findById.mockReturnValue(selectSession({
        _id: "post-1",
        author: "post-author",
        status: "active",
        visibility: "public",
        settings: { commentsDisabled: false }
    }));
    postService.assertCanAccessPost.mockResolvedValue(undefined);
    Comment.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue({
            _id: "parent-1",
            post: "post-1",
            author: "parent-author",
            status: "active"
        })
    });
    resolveMentionUsersFromText.mockResolvedValue([
        { _id: "mention-1", username: "mention1" }
    ]);
    const commentDoc = {
        _id: "comment-1",
        populate: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
            _id: "comment-1",
            content: "Hello @mention1"
        }),
        author: { name: "Alice", username: "alice" }
    };
    Comment.create.mockResolvedValue([commentDoc]);
    User.findById
        .mockReturnValueOnce({
            select: jest.fn(() => ({
                session: jest.fn(() => ({
                    lean: jest.fn().mockResolvedValue({
                        preferences: { notifications: { comments: true } }
                    })
                }))
            }))
        })
        .mockReturnValueOnce({
            select: jest.fn(() => ({
                session: jest.fn(() => ({
                    lean: jest.fn().mockResolvedValue({
                        preferences: { notifications: { comments: true } }
                    })
                }))
            }))
        });
    notificationService.createNotifications
        .mockRejectedValueOnce(new Error("notify-failed"))
        .mockResolvedValueOnce([]);

    const result = await commentService.createComment(
        "user-1",
        "post-1",
        "Hello @mention1",
        "parent-1"
    );

    expect(notificationService.createNotifications).toHaveBeenCalledTimes(2);
    expect(notifyMentionedUsers).toHaveBeenCalledWith(expect.objectContaining({
        actorId: "user-1",
        metadata: expect.objectContaining({
            source: "comment.create",
            commentId: "comment-1",
            postId: "post-1"
        })
    }));
    expect(consoleSpy).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
        _id: "comment-1",
        userEngagement: { hasLiked: false }
    }));
    consoleSpy.mockRestore();
});

test("updateComment rejects when comment is not active", async () => {
    Comment.findById.mockResolvedValue({
        author: "user-1",
        status: "deleted"
    });

    await expect(commentService.updateComment("comment-1", "user-1", "Updated"))
        .rejects
        .toThrow("Cannot edit a deleted or hidden comment");
});

test("updateComment skips mention notification when no new mentions are added", async () => {
    const commentDoc = {
        _id: "comment-1",
        post: "post-1",
        author: "user-1",
        status: "active",
        mentions: ["existing-1"],
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(undefined)
    };
    Comment.findById.mockResolvedValue(commentDoc);
    resolveMentionUsersFromText.mockResolvedValue([{ _id: "existing-1", username: "old" }]);

    const result = await commentService.updateComment("comment-1", "user-1", "No new mentions");

    expect(result).toBe(commentDoc);
    expect(notifyMentionedUsers).not.toHaveBeenCalled();
});

test("deleteComment validates missing comment/post and aborts transaction", async () => {
    const session = createSession();
    mongoose.startSession.mockResolvedValue(session);
    Comment.findById.mockReturnValue({
        select: jest.fn(() => ({
            session: jest.fn().mockResolvedValue(null)
        }))
    });

    await expect(commentService.deleteComment("comment-404", "user-1"))
        .rejects
        .toMatchObject({
            message: "Comment not found",
            statusCode: 404
        });

    Comment.findById.mockReturnValue({
        select: jest.fn(() => ({
            session: jest.fn().mockResolvedValue({
                _id: "comment-1",
                post: "post-1",
                author: "user-1",
                parentComment: null,
                status: "active"
            })
        }))
    });
    Post.findById.mockReturnValue({
        select: jest.fn(() => ({
            session: jest.fn().mockResolvedValue(null)
        }))
    });

    await expect(commentService.deleteComment("comment-1", "user-1"))
        .rejects
        .toMatchObject({
            message: "Post not found",
            statusCode: 404
        });

    expect(session.abortTransaction).toHaveBeenCalled();
});
