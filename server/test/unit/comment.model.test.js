const mongoose = require("mongoose");
const Comment = require("../../src/models/comment");
const Post = require("../../src/models/post");
const Like = require("../../src/models/like");

const newId = () => new mongoose.Types.ObjectId();

const createComment = (overrides = {}) => new Comment({
    post: newId(),
    author: newId(),
    content: "Hello @Alice and @Bob_1",
    ...overrides
});

const getCommentHook = (type, marker) => {
    const hook = Comment.schema.s.hooks[type].get("save")
        .find((entry) => String(entry.fn).includes(marker));
    return hook.fn;
};

const getCommentDeleteHook = (marker) => {
    const hook = Comment.schema.s.hooks._posts.get("findOneAndDelete")
        .find((entry) => String(entry.fn).includes(marker));
    return hook.fn;
};

afterEach(() => {
    jest.restoreAllMocks();
});

test("validates media URLs and supports empty media", () => {
    const valid = createComment({ media: "https://cdn.example.com/image.png" });
    expect(valid.validateSync()).toBeUndefined();

    const emptyMedia = createComment({ media: "" });
    expect(emptyMedia.validateSync()).toBeUndefined();

    const invalid = createComment({ media: "ftp://cdn.example.com/image.png" });
    const error = invalid.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.media.message).toBe("Media must be a valid URL");
});

test("extractMentions and isReply normalize mention tokens and reply state", () => {
    const topLevel = createComment({ content: "No mentions here" });
    expect(topLevel.extractMentions()).toEqual([]);
    expect(topLevel.isReply()).toBe(false);

    const reply = createComment({
        content: "Hi @MERN_Dev and @NodeJS",
        parentComment: newId()
    });
    expect(reply.extractMentions()).toEqual(["mern_dev", "nodejs"]);
    expect(reply.isReply()).toBe(true);
});

test("getTopLevelComments builds chained query with pagination and projection", async () => {
    const rows = [{ _id: "c1" }];
    const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(rows)
    };
    const findSpy = jest.spyOn(Comment, "find").mockReturnValue(chain);

    const postId = newId();
    const result = await Comment.getTopLevelComments(postId, 2, 5);

    expect(findSpy).toHaveBeenCalledWith({
        post: postId,
        parentComment: null,
        status: "active"
    });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chain.skip).toHaveBeenCalledWith(5);
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(chain.populate).toHaveBeenCalledWith("author", "username name avatar isVerified");
    expect(result).toEqual(rows);
});

test("getTopLevelComments uses default page and limit when omitted", async () => {
    const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
    };
    jest.spyOn(Comment, "find").mockReturnValue(chain);

    await Comment.getTopLevelComments(newId());

    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(20);
});

test("getReplies builds chained query for oldest-first replies", async () => {
    const rows = [{ _id: "reply-1" }];
    const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(rows)
    };
    const findSpy = jest.spyOn(Comment, "find").mockReturnValue(chain);

    const commentId = newId();
    const result = await Comment.getReplies(commentId, 3);

    expect(findSpy).toHaveBeenCalledWith({
        parentComment: commentId,
        status: "active"
    });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: 1 });
    expect(chain.limit).toHaveBeenCalledWith(3);
    expect(chain.populate).toHaveBeenCalledWith("author", "username name avatar isVerified");
    expect(result).toEqual(rows);
});

test("getReplies uses default limit when omitted", async () => {
    const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
    };
    jest.spyOn(Comment, "find").mockReturnValue(chain);

    await Comment.getReplies(newId());

    expect(chain.limit).toHaveBeenCalledWith(10);
});

test("pre-save hooks track creation state and mark edited content updates", () => {
    const trackNewHook = getCommentHook("_pres", "this.wasNew = this.isNew");
    const editHook = getCommentHook("_pres", "this.isModified('content')");

    const fresh = createComment();
    fresh.isNew = true;
    trackNewHook.call(fresh);
    expect(fresh.wasNew).toBe(true);

    const edited = createComment();
    edited.isNew = false;
    edited.isModified = jest.fn().mockReturnValue(true);
    editHook.call(edited);
    expect(edited.isEdited).toBe(true);
    expect(edited.editedAt).toBeInstanceOf(Date);

    const unchanged = createComment();
    unchanged.isNew = false;
    unchanged.isModified = jest.fn().mockReturnValue(false);
    editHook.call(unchanged);
    expect(unchanged.isEdited).toBe(false);
    expect(unchanged.editedAt).toBeUndefined();
});

test("post-save hook updates post and parent reply counters for new replies", async () => {
    const postSaveHook = getCommentHook("_posts", "doc.wasNew");
    const session = { id: "session-1" };
    const postUpdateSpy = jest.spyOn(Post, "findByIdAndUpdate").mockResolvedValue(null);
    const replyCountSpy = jest.spyOn(Comment, "findByIdAndUpdate").mockResolvedValue(null);

    const doc = createComment({ parentComment: newId() });
    doc.wasNew = true;
    doc.$session = jest.fn().mockReturnValue(session);

    await postSaveHook.call(doc, doc);

    expect(postUpdateSpy).toHaveBeenCalledWith(
        doc.post,
        { $inc: { commentsCount: 1 } },
        { session }
    );
    expect(replyCountSpy).toHaveBeenCalledWith(
        doc.parentComment,
        { $inc: { repliesCount: 1 } },
        { session }
    );
});

test("post-save hook skips fanout when document is not newly created", async () => {
    const postSaveHook = getCommentHook("_posts", "doc.wasNew");
    const postUpdateSpy = jest.spyOn(Post, "findByIdAndUpdate").mockResolvedValue(null);
    const replyCountSpy = jest.spyOn(Comment, "findByIdAndUpdate").mockResolvedValue(null);

    const doc = createComment();
    doc.wasNew = false;

    await postSaveHook.call(doc, doc);

    expect(postUpdateSpy).not.toHaveBeenCalled();
    expect(replyCountSpy).not.toHaveBeenCalled();
});

test("post-save hook handles new top-level comments without session", async () => {
    const postSaveHook = getCommentHook("_posts", "doc.wasNew");
    const postUpdateSpy = jest.spyOn(Post, "findByIdAndUpdate").mockResolvedValue(null);
    const replyCountSpy = jest.spyOn(Comment, "findByIdAndUpdate").mockResolvedValue(null);

    const doc = createComment({ parentComment: null });
    doc.wasNew = true;
    doc.$session = undefined;

    await postSaveHook.call(doc, doc);

    expect(postUpdateSpy).toHaveBeenCalledWith(
        doc.post,
        { $inc: { commentsCount: 1 } },
        {}
    );
    expect(replyCountSpy).not.toHaveBeenCalled();
});

test("post-findOneAndDelete hook decrements counters and cascades deletions", async () => {
    const deleteHook = getCommentDeleteHook("Delete all replies to this comment");
    const postUpdateSpy = jest.spyOn(Post, "findByIdAndUpdate").mockResolvedValue(null);
    const commentUpdateSpy = jest.spyOn(Comment, "findByIdAndUpdate").mockResolvedValue(null);
    const commentDeleteManySpy = jest.spyOn(Comment, "deleteMany").mockResolvedValue({ deletedCount: 2 });
    const likeDeleteManySpy = jest.spyOn(Like, "deleteMany").mockResolvedValue({ deletedCount: 3 });
    const session = { id: "delete-session" };

    const doc = {
        _id: newId(),
        post: newId(),
        parentComment: newId()
    };

    await deleteHook.call(
        {
            getOptions: () => ({ session })
        },
        doc
    );

    expect(postUpdateSpy).toHaveBeenCalledWith(
        doc.post,
        { $inc: { commentsCount: -1 } },
        { session }
    );
    expect(commentUpdateSpy).toHaveBeenCalledWith(
        doc.parentComment,
        { $inc: { repliesCount: -1 } },
        { session }
    );
    expect(commentDeleteManySpy).toHaveBeenCalledWith({ parentComment: doc._id }, { session });
    expect(likeDeleteManySpy).toHaveBeenCalledWith({ comment: doc._id }, { session });
});

test("post-findOneAndDelete uses empty options without session and no-ops for missing doc", async () => {
    const deleteHook = getCommentDeleteHook("Delete all replies to this comment");
    const postUpdateSpy = jest.spyOn(Post, "findByIdAndUpdate").mockResolvedValue(null);
    const commentUpdateSpy = jest.spyOn(Comment, "findByIdAndUpdate").mockResolvedValue(null);
    const commentDeleteManySpy = jest.spyOn(Comment, "deleteMany").mockResolvedValue({ deletedCount: 0 });
    const likeDeleteManySpy = jest.spyOn(Like, "deleteMany").mockResolvedValue({ deletedCount: 0 });

    const doc = {
        _id: newId(),
        post: newId(),
        parentComment: null
    };

    await deleteHook.call({}, doc);

    expect(postUpdateSpy).toHaveBeenCalledWith(
        doc.post,
        { $inc: { commentsCount: -1 } },
        {}
    );
    expect(commentUpdateSpy).not.toHaveBeenCalled();
    expect(commentDeleteManySpy).toHaveBeenCalledWith({ parentComment: doc._id }, {});
    expect(likeDeleteManySpy).toHaveBeenCalledWith({ comment: doc._id }, {});

    postUpdateSpy.mockClear();
    commentDeleteManySpy.mockClear();
    likeDeleteManySpy.mockClear();

    await deleteHook.call({}, null);

    expect(postUpdateSpy).not.toHaveBeenCalled();
    expect(commentDeleteManySpy).not.toHaveBeenCalled();
    expect(likeDeleteManySpy).not.toHaveBeenCalled();
});
