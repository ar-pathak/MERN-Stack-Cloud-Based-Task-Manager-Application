jest.mock("../../src/modules/stories/story.service", () => ({
    createStory: jest.fn(),
    getFeedStories: jest.fn(),
    getUserStories: jest.fn(),
    getStoryById: jest.fn(),
    markStoryViewed: jest.fn(),
    reactToStory: jest.fn(),
    deleteStory: jest.fn()
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

const storyService = require("../../src/modules/stories/story.service");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/stories/story.controller");

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
    params: { id: "story-1", userId: "user-2" },
    body: { emoji: "🔥", content: "Story content" }
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("createStory forwards payload and returns created response", async () => {
    const req = baseReq();
    const res = createResponse();
    const story = { _id: "story-1" };
    storyService.createStory.mockResolvedValue(story);

    await controller.createStory(req, res);

    expect(storyService.createStory).toHaveBeenCalledWith("user-1", req.body);
    expect(sendSuccess).toHaveBeenCalledWith(res, { story }, "Story created successfully", 201);
});

test("getFeedStories returns feed payload", async () => {
    const req = baseReq();
    const res = createResponse();
    const payload = { stories: [] };
    storyService.getFeedStories.mockResolvedValue(payload);

    await controller.getFeedStories(req, res);

    expect(storyService.getFeedStories).toHaveBeenCalledWith("user-1");
    expect(sendSuccess).toHaveBeenCalledWith(res, payload, "Stories retrieved successfully");
});

test("getUserStories returns user story list", async () => {
    const req = baseReq();
    const res = createResponse();
    const payload = { stories: [{ _id: "s1" }] };
    storyService.getUserStories.mockResolvedValue(payload);

    await controller.getUserStories(req, res);

    expect(storyService.getUserStories).toHaveBeenCalledWith("user-2", "user-1");
    expect(sendSuccess).toHaveBeenCalledWith(res, payload, "User stories retrieved successfully");
});

test("getStoryById returns story details", async () => {
    const req = baseReq();
    const res = createResponse();
    const story = { _id: "story-1" };
    storyService.getStoryById.mockResolvedValue(story);

    await controller.getStoryById(req, res);

    expect(storyService.getStoryById).toHaveBeenCalledWith("story-1", "user-1");
    expect(sendSuccess).toHaveBeenCalledWith(res, { story }, "Story retrieved successfully");
});

test("markViewed marks the story as viewed", async () => {
    const req = baseReq();
    const res = createResponse();
    const story = { _id: "story-1", viewedByMe: true };
    storyService.markStoryViewed.mockResolvedValue(story);

    await controller.markViewed(req, res);

    expect(storyService.markStoryViewed).toHaveBeenCalledWith("story-1", "user-1");
    expect(sendSuccess).toHaveBeenCalledWith(res, { story }, "Story marked as viewed");
});

test("reactToStory updates story reaction", async () => {
    const req = baseReq();
    const res = createResponse();
    const story = { _id: "story-1", reaction: "🔥" };
    storyService.reactToStory.mockResolvedValue(story);

    await controller.reactToStory(req, res);

    expect(storyService.reactToStory).toHaveBeenCalledWith("story-1", "user-1", "🔥");
    expect(sendSuccess).toHaveBeenCalledWith(res, { story }, "Story reaction updated");
});

test("deleteStory returns success message", async () => {
    const req = baseReq();
    const res = createResponse();
    storyService.deleteStory.mockResolvedValue();

    await controller.deleteStory(req, res);

    expect(storyService.deleteStory).toHaveBeenCalledWith("story-1", "user-1");
    expect(sendSuccess).toHaveBeenCalledWith(res, null, "Story deleted successfully");
});

test("controller delegates service errors to handleError", async () => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("forbidden");
    error.statusCode = 403;
    storyService.getFeedStories.mockRejectedValue(error);

    await controller.getFeedStories(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
        success: false,
        message: "forbidden"
    });
});
