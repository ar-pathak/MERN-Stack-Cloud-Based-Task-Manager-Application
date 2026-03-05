const mockRouter = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
};

jest.mock("express", () => ({
    Router: jest.fn(() => mockRouter)
}));

jest.mock("../../src/middleware/authMiddleware", () => "auth-middleware");
jest.mock("../../src/middleware/optionalAuthMiddleware", () => "optional-auth-middleware");
jest.mock("../../src/middleware/validate", () => ({
    validate: jest.fn((schema, source) => `validate:${source || "body"}:${String(schema)}`)
}));
jest.mock("../../src/modules/posts/post.validation", () => ({
    createPostSchema: "createPostSchema",
    updatePostSchema: "updatePostSchema",
    postIdSchema: "postIdSchema",
    userIdSchema: "userIdSchema",
    paginationSchema: "paginationSchema",
    searchSchema: "searchSchema",
    hashtagSchema: "hashtagSchema",
    trendingSchema: "trendingSchema",
    likeSchema: "likeSchema",
    sharePostSchema: "sharePostSchema",
    repostPostSchema: "repostPostSchema",
    commentSchema: "commentSchema",
    updateCommentSchema: "updateCommentSchema",
    commentIdSchema: "commentIdSchema",
    commentSortSchema: "commentSortSchema"
}));
jest.mock("../../src/modules/posts/post.controller", () => ({
    createPost: jest.fn(),
    getPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
    getFeed: jest.fn(),
    getExploreFeed: jest.fn(),
    getTrending: jest.fn(),
    getUserPosts: jest.fn(),
    searchPosts: jest.fn(),
    getHashtagPosts: jest.fn(),
    likePost: jest.fn(),
    unlikePost: jest.fn(),
    getPostLikes: jest.fn(),
    getLikedPosts: jest.fn(),
    savePost: jest.fn(),
    unsavePost: jest.fn(),
    getBookmarkedPosts: jest.fn(),
    sharePost: jest.fn(),
    repostPost: jest.fn(),
    addComment: jest.fn(),
    getComments: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
    getCommentReplies: jest.fn(),
    likeComment: jest.fn(),
    unlikeComment: jest.fn()
}));

const authMiddleware = require("../../src/middleware/authMiddleware");
const optionalAuthMiddleware = require("../../src/middleware/optionalAuthMiddleware");
const { validate } = require("../../src/middleware/validate");
const controller = require("../../src/modules/posts/post.controller");
const router = require("../../src/modules/posts/post.routes");

test("post routes register expected public/protected endpoints", () => {
    expect(router).toBe(mockRouter);
    expect(mockRouter.get).toHaveBeenCalledWith(
        "/explore",
        optionalAuthMiddleware,
        expect.any(String),
        controller.getExploreFeed
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
        "/feed",
        authMiddleware,
        expect.any(String),
        controller.getFeed
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/",
        authMiddleware,
        expect.any(String),
        controller.createPost
    );
    expect(mockRouter.put).toHaveBeenCalledWith(
        "/:id",
        authMiddleware,
        expect.any(String),
        expect.any(String),
        controller.updatePost
    );
    expect(mockRouter.delete).toHaveBeenCalledWith(
        "/:id",
        authMiddleware,
        expect.any(String),
        controller.deletePost
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/comments/:commentId/like",
        authMiddleware,
        expect.any(String),
        controller.likeComment
    );
    expect(mockRouter.delete).toHaveBeenCalledWith(
        "/comments/:commentId/like",
        authMiddleware,
        expect.any(String),
        controller.unlikeComment
    );
    expect(validate).toHaveBeenCalled();
});
