jest.mock("../../src/modules/posts/post.service", () => ({
    createPost: jest.fn(),
    getPostById: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
    getUserFeed: jest.fn(),
    getPublicFeed: jest.fn(),
    getTrendingPosts: jest.fn(),
    getUserPosts: jest.fn(),
    searchPosts: jest.fn(),
    getPostsByHashtag: jest.fn(),
    savePost: jest.fn(),
    unsavePost: jest.fn(),
    getBookmarkedPosts: jest.fn(),
    sharePost: jest.fn(),
    repostPost: jest.fn()
}));

jest.mock("../../src/modules/posts/like.service", () => ({
    likePost: jest.fn(),
    unlikePost: jest.fn(),
    getPostLikes: jest.fn(),
    getUserLikedPosts: jest.fn(),
    likeComment: jest.fn(),
    unlikeComment: jest.fn()
}));

jest.mock("../../src/modules/posts/comment.service", () => ({
    createComment: jest.fn(),
    getPostComments: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
    getCommentReplies: jest.fn()
}));

jest.mock("../../src/helpers/responseHelper", () => ({
    sendSuccess: jest.fn((res, data = null, message = "Success", statusCode = 200) => (
        res.status(statusCode).json({
            success: true,
            message,
            ...(data !== null ? { data } : {})
        })
    )),
    handleError: jest.fn((error, res) => (
        res.status(error?.statusCode || 500).json({
            success: false,
            message: error?.message || "Internal server error"
        })
    ))
}));

const postService = require("../../src/modules/posts/post.service");
const likeService = require("../../src/modules/posts/like.service");
const commentService = require("../../src/modules/posts/comment.service");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/posts/post.controller");

const services = { postService, likeService, commentService };

const createResponse = () => {
    const res = {
        statusCode: null,
        body: null
    };
    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    return res;
};

const baseReq = () => ({
    user: { _id: "user-1" },
    params: {
        id: "post-1",
        userId: "author-1",
        hashtag: "mern",
        commentId: "comment-1"
    },
    query: {
        page: "2",
        limit: "15",
        timeframe: "week",
        query: "hello world",
        sortBy: "popular"
    },
    body: {
        reactionType: "love",
        channel: "telegram",
        mode: "quote",
        content: "Great post",
        parentCommentId: "parent-1",
        media: "https://cdn.example.com/file.png"
    }
});

beforeEach(() => {
    jest.clearAllMocks();
});

test.each([
    [
        "createPost",
        "postService",
        "createPost",
        (req) => [req.user._id, req.body],
        { _id: "post-1" },
        (res, payload) => [res, { post: payload }, "Post created successfully", 201]
    ],
    [
        "getPost",
        "postService",
        "getPostById",
        (req) => [req.params.id, req.user._id],
        { _id: "post-1" },
        (res, payload) => [res, { post: payload }, "Post retrieved successfully"]
    ],
    [
        "updatePost",
        "postService",
        "updatePost",
        (req) => [req.params.id, req.user._id, req.body],
        { _id: "post-1", content: "updated" },
        (res, payload) => [res, { post: payload }, "Post updated successfully"]
    ],
    [
        "deletePost",
        "postService",
        "deletePost",
        (req) => [req.params.id, req.user._id],
        undefined,
        (res) => [res, null, "Post deleted successfully"]
    ],
    [
        "getFeed",
        "postService",
        "getUserFeed",
        (req) => [req.user._id, 2, 15],
        { posts: [] },
        (res, payload) => [res, payload, "Feed retrieved successfully"]
    ],
    [
        "getExploreFeed",
        "postService",
        "getPublicFeed",
        (req) => [req.user._id, 2, 15],
        { posts: [] },
        (res, payload) => [res, payload, "Explore feed retrieved successfully"]
    ],
    [
        "getTrending",
        "postService",
        "getTrendingPosts",
        (req) => [2, 15, "week", req.user._id],
        { posts: [] },
        (res, payload) => [res, payload, "Trending posts retrieved successfully"]
    ],
    [
        "getUserPosts",
        "postService",
        "getUserPosts",
        (req) => [req.params.userId, req.user._id, 2, 15],
        { posts: [] },
        (res, payload) => [res, payload, "User posts retrieved successfully"]
    ],
    [
        "searchPosts",
        "postService",
        "searchPosts",
        (req) => [req.query.query, 2, 15, req.user._id],
        { posts: [] },
        (res, payload) => [res, payload, "Search results retrieved"]
    ],
    [
        "getHashtagPosts",
        "postService",
        "getPostsByHashtag",
        (req) => [req.params.hashtag, 2, 15, req.user._id],
        { posts: [] },
        (res, payload) => [res, payload, "Hashtag posts retrieved successfully"]
    ],
    [
        "likePost",
        "likeService",
        "likePost",
        (req) => [req.user._id, req.params.id, req.body.reactionType],
        { liked: true, message: "reaction set" },
        (res, payload) => [res, payload, "reaction set"]
    ],
    [
        "unlikePost",
        "likeService",
        "unlikePost",
        (req) => [req.user._id, req.params.id],
        { liked: false, message: "reaction removed" },
        (res, payload) => [res, payload, "reaction removed"]
    ],
    [
        "getPostLikes",
        "likeService",
        "getPostLikes",
        (req) => [req.params.id, req.user._id, 2, 15],
        { likes: [] },
        (res, payload) => [res, payload, "Post likes retrieved"]
    ],
    [
        "getLikedPosts",
        "likeService",
        "getUserLikedPosts",
        (req) => [req.user._id, 2, 15],
        { posts: [] },
        (res, payload) => [res, payload, "Liked posts retrieved"]
    ],
    [
        "savePost",
        "postService",
        "savePost",
        (req) => [req.user._id, req.params.id],
        { saved: true },
        (res, payload) => [res, payload, "Post saved successfully"]
    ],
    [
        "unsavePost",
        "postService",
        "unsavePost",
        (req) => [req.user._id, req.params.id],
        { saved: false },
        (res, payload) => [res, payload, "Post removed from saved"]
    ],
    [
        "getBookmarkedPosts",
        "postService",
        "getBookmarkedPosts",
        (req) => [req.user._id, 2, 15],
        { posts: [] },
        (res, payload) => [res, payload, "Bookmarked posts retrieved"]
    ],
    [
        "sharePost",
        "postService",
        "sharePost",
        (req) => [req.user._id, req.params.id, req.body.channel],
        { shared: true },
        (res, payload) => [res, payload, "Post shared successfully"]
    ],
    [
        "repostPost",
        "postService",
        "repostPost",
        (req) => [req.user._id, req.params.id, req.body],
        { _id: "repost-1" },
        (res, payload) => [res, { post: payload }, "Post reposted successfully", 201]
    ],
    [
        "addComment",
        "commentService",
        "createComment",
        (req) => [req.user._id, req.params.id, req.body.content, req.body.parentCommentId, req.body.media],
        { _id: "comment-1" },
        (res, payload) => [res, { comment: payload }, "Comment added successfully", 201]
    ],
    [
        "getComments",
        "commentService",
        "getPostComments",
        (req) => [req.params.id, req.user._id, 2, 15, req.query.sortBy],
        { comments: [] },
        (res, payload) => [res, payload, "Comments retrieved successfully"]
    ],
    [
        "updateComment",
        "commentService",
        "updateComment",
        (req) => [req.params.commentId, req.user._id, req.body.content],
        { _id: "comment-1" },
        (res, payload) => [res, { comment: payload }, "Comment updated successfully"]
    ],
    [
        "deleteComment",
        "commentService",
        "deleteComment",
        (req) => [req.params.commentId, req.user._id],
        undefined,
        (res) => [res, null, "Comment deleted successfully"]
    ],
    [
        "getCommentReplies",
        "commentService",
        "getCommentReplies",
        (req) => [req.params.commentId, req.user._id, 2, 15],
        { replies: [] },
        (res, payload) => [res, payload, "Replies retrieved successfully"]
    ],
    [
        "likeComment",
        "likeService",
        "likeComment",
        (req) => [req.user._id, req.params.commentId],
        { liked: true, message: "comment liked" },
        (res, payload) => [res, payload, "comment liked"]
    ],
    [
        "unlikeComment",
        "likeService",
        "unlikeComment",
        (req) => [req.user._id, req.params.commentId],
        { liked: false, message: "comment unliked" },
        (res, payload) => [res, payload, "comment unliked"]
    ]
])(
    "%s forwards args and returns expected success payload",
    async (handlerName, serviceName, methodName, argsGetter, payload, successArgsGetter) => {
        const req = baseReq();
        const res = createResponse();

        services[serviceName][methodName].mockResolvedValue(payload);

        await controller[handlerName](req, res);

        expect(services[serviceName][methodName]).toHaveBeenCalledWith(...argsGetter(req));
        expect(sendSuccess).toHaveBeenCalledWith(...successArgsGetter(res, payload));
        expect(res.statusCode).toBeDefined();
    }
);

test("controller delegates service errors to handleError", async () => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("access denied");
    error.statusCode = 403;
    postService.getUserFeed.mockRejectedValue(error);

    await controller.getFeed(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
        success: false,
        message: "access denied"
    });
});

test.each([
    ["createPost", "postService", "createPost"],
    ["getPost", "postService", "getPostById"],
    ["updatePost", "postService", "updatePost"],
    ["deletePost", "postService", "deletePost"],
    ["getFeed", "postService", "getUserFeed"],
    ["getExploreFeed", "postService", "getPublicFeed"],
    ["getTrending", "postService", "getTrendingPosts"],
    ["getUserPosts", "postService", "getUserPosts"],
    ["searchPosts", "postService", "searchPosts"],
    ["getHashtagPosts", "postService", "getPostsByHashtag"],
    ["likePost", "likeService", "likePost"],
    ["unlikePost", "likeService", "unlikePost"],
    ["getPostLikes", "likeService", "getPostLikes"],
    ["getLikedPosts", "likeService", "getUserLikedPosts"],
    ["savePost", "postService", "savePost"],
    ["unsavePost", "postService", "unsavePost"],
    ["getBookmarkedPosts", "postService", "getBookmarkedPosts"],
    ["sharePost", "postService", "sharePost"],
    ["repostPost", "postService", "repostPost"],
    ["addComment", "commentService", "createComment"],
    ["getComments", "commentService", "getPostComments"],
    ["updateComment", "commentService", "updateComment"],
    ["deleteComment", "commentService", "deleteComment"],
    ["getCommentReplies", "commentService", "getCommentReplies"],
    ["likeComment", "likeService", "likeComment"],
    ["unlikeComment", "likeService", "unlikeComment"]
])("%s delegates failures to handleError", async (handlerName, serviceName, methodName) => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("failed");
    error.statusCode = 422;

    services[serviceName][methodName].mockRejectedValue(error);

    await controller[handlerName](req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
        success: false,
        message: "failed"
    });
});

test("like/unlike comment and post handlers use fallback success messages", async () => {
    const req = baseReq();
    const res = createResponse();
    req.body = {};
    likeService.likePost.mockResolvedValue({ liked: true });
    likeService.unlikePost.mockResolvedValue({ liked: false });
    likeService.likeComment.mockResolvedValue({ liked: true });
    likeService.unlikeComment.mockResolvedValue({ liked: false });

    await controller.likePost(req, res);
    await controller.unlikePost(req, res);
    await controller.likeComment(req, res);
    await controller.unlikeComment(req, res);

    expect(likeService.likePost).toHaveBeenCalledWith("user-1", "post-1", "like");
    expect(sendSuccess).toHaveBeenCalledWith(res, { liked: true }, "Post liked successfully");
    expect(sendSuccess).toHaveBeenCalledWith(res, { liked: false }, "Post unliked successfully");
    expect(sendSuccess).toHaveBeenCalledWith(res, { liked: true }, "Comment liked successfully");
    expect(sendSuccess).toHaveBeenCalledWith(res, { liked: false }, "Comment unliked successfully");
});

test("explore and trending feeds support anonymous users with default query values", async () => {
    const req = baseReq();
    const res = createResponse();
    req.user = undefined;
    req.query = {};
    postService.getPublicFeed.mockResolvedValue({ posts: [] });
    postService.getTrendingPosts.mockResolvedValue({ posts: [] });

    await controller.getExploreFeed(req, res);
    await controller.getTrending(req, res);

    expect(postService.getPublicFeed).toHaveBeenCalledWith(undefined, 1, 20);
    expect(postService.getTrendingPosts).toHaveBeenCalledWith(1, 20, "day", undefined);
});
