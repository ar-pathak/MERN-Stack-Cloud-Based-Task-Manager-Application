jest.mock("../../src/models/activity", () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/like", () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/comment", () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/post", () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/postSave", () => ({
    aggregate: jest.fn()
}));

jest.mock("../../src/models/follow", () => ({
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/workspace", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    aggregate: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    find: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/subtasks", () => ({
    aggregate: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/RefreshToken", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/modules/posts/post.service", () => ({
    filterAccessiblePosts: jest.fn()
}));

const Activity = require("../../src/models/activity");
const Like = require("../../src/models/like");
const Comment = require("../../src/models/comment");
const Post = require("../../src/models/post");
const PostSave = require("../../src/models/postSave");
const Follow = require("../../src/models/follow");
const Workspace = require("../../src/models/workspace");
const WorkspaceMember = require("../../src/models/workspaceMember");
const Project = require("../../src/models/project");
const Task = require("../../src/models/tasks");
const Subtask = require("../../src/models/subtasks");
const User = require("../../src/models/user");
const RefreshToken = require("../../src/models/RefreshToken");
const postService = require("../../src/modules/posts/post.service");
const activityService = require("../../src/modules/activity/activity.service");

const makeListQuery = (value) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
    distinct: jest.fn().mockResolvedValue(value)
});

const makeSelectLeanQuery = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const makeRefreshTokenQuery = (value) => ({
    sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(value)
        })
    })
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("listMyActivities applies filters and maps entity metadata", async () => {
    Activity.find.mockReturnValue(makeListQuery([
        {
            _id: "act-1",
            level: "task",
            action: "task.updated",
            message: "Bug fixed",
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
            task: { _id: "task-1", title: "Fix bug", status: "active" }
        }
    ]));
    Activity.countDocuments.mockResolvedValue(3);

    const result = await activityService.listMyActivities("user-1", {
        page: "2",
        limit: "1",
        level: "task",
        action: "task.updated",
        search: "bug"
    });

    expect(Activity.find).toHaveBeenCalledWith(expect.objectContaining({
        user: "user-1",
        level: "task",
        action: expect.objectContaining({
            $options: "i"
        }),
        $or: expect.any(Array)
    }));
    expect(Activity.countDocuments).toHaveBeenCalledTimes(1);
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0].entity).toEqual({
        type: "task",
        id: "task-1",
        name: "Fix bug"
    });
    expect(result.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
        hasMore: true
    });
});

test("getMyActivityDashboard throws 404 when user does not exist", async () => {
    User.findById.mockReturnValue(makeSelectLeanQuery(null));

    await expect(activityService.getMyActivityDashboard("missing-user", {}))
        .rejects
        .toMatchObject({
            message: "User not found",
            statusCode: 404
        });
});

test("getMyActivityDashboard returns normalized dashboard sections", async () => {
    User.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "user-1",
        name: "Alice",
        username: "alice",
        email: "alice@example.com",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-02-01T00:00:00.000Z"),
        lastSeen: new Date("2026-02-10T00:00:00.000Z"),
        lastActive: new Date("2026-02-10T00:00:00.000Z"),
        isOnline: true,
        emailVerified: true,
        accountStatus: "active"
    }));

    Like.find.mockReturnValue(makeListQuery([
        {
            _id: "like-1",
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
            post: {
                _id: "post-1",
                status: "active",
                content: "Liked post",
                postType: "text",
                createdAt: new Date("2026-02-01T00:00:00.000Z"),
                author: { _id: "author-1", name: "Author", username: "author" }
            }
        }
    ]));
    Like.countDocuments.mockResolvedValue(1);

    Comment.find.mockReturnValue(makeListQuery([
        {
            _id: "comment-1",
            content: "Nice post",
            createdAt: new Date("2026-02-02T00:00:00.000Z"),
            post: {
                _id: "post-2",
                status: "active",
                content: "Commented post",
                postType: "text",
                createdAt: new Date("2026-02-01T00:00:00.000Z"),
                author: { _id: "author-2", name: "Author2", username: "author2" }
            }
        }
    ]));
    Comment.countDocuments.mockResolvedValue(1);

    Post.find.mockReturnValueOnce(makeListQuery([
        {
            _id: "repost-1",
            createdAt: new Date("2026-02-03T00:00:00.000Z"),
            content: "Repost content",
            postType: "repost",
            status: "active",
            author: { _id: "user-1", name: "Alice", username: "alice" },
            originalPost: {
                _id: "orig-1",
                status: "active",
                content: "Original post",
                postType: "text",
                author: { _id: "author-3", name: "Author3", username: "author3" }
            }
        }
    ]));
    Post.countDocuments.mockResolvedValue(1);

    RefreshToken.findOne.mockReturnValue(makeRefreshTokenQuery({
        createdAt: new Date("2026-02-05T00:00:00.000Z"),
        expiresAt: new Date("2026-02-10T00:00:00.000Z")
    }));

    Activity.aggregate.mockResolvedValue([]);
    Like.aggregate.mockResolvedValue([]);
    Comment.aggregate.mockResolvedValue([]);
    Post.aggregate.mockResolvedValue([]);
    postService.filterAccessiblePosts.mockImplementation(async (posts) => posts);

    const result = await activityService.getMyActivityDashboard("user-1", { limit: 10 });

    expect(result.likes.count).toBe(1);
    expect(result.comments.count).toBe(1);
    expect(result.reposts.count).toBe(1);
    expect(result.likes.items).toHaveLength(1);
    expect(result.comments.items).toHaveLength(1);
    expect(result.reposts.items).toHaveLength(1);
    expect(result.timeSpent).toEqual(expect.objectContaining({
        estimated: true,
        dailyBreakdownLast7: expect.any(Array),
        dailyBreakdownLast30: expect.any(Array)
    }));
    expect(result.accountHistory).toEqual(expect.objectContaining({
        summary: expect.objectContaining({
            accountStatus: "active",
            emailVerified: true
        }),
        events: expect.any(Array)
    }));
    expect(result.analytics).toEqual(expect.objectContaining({
        rangeDays: 30,
        kpis: expect.any(Object),
        charts: expect.any(Object)
    }));
});

test("getAdvancedDashboard throws 404 when user does not exist", async () => {
    User.findById.mockReturnValue(makeSelectLeanQuery(null));

    await expect(activityService.getAdvancedDashboard("missing-user", { days: 7 }))
        .rejects
        .toMatchObject({
            message: "User not found",
            statusCode: 404
        });
});

test("getAdvancedDashboard returns dashboard payload with clamped range", async () => {
    User.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "user-1",
        name: "Alice",
        username: "alice",
        email: "alice@example.com",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-02-01T00:00:00.000Z"),
        lastSeen: new Date("2026-02-10T00:00:00.000Z"),
        lastActive: new Date("2026-02-10T00:00:00.000Z"),
        isOnline: false,
        emailVerified: true,
        accountStatus: "active"
    }));

    Activity.aggregate.mockResolvedValue([]);
    Like.aggregate.mockResolvedValue([]);
    Comment.aggregate.mockResolvedValue([]);
    Post.aggregate.mockResolvedValue([]);
    Follow.aggregate.mockResolvedValue([]);
    PostSave.aggregate.mockResolvedValue([]);
    Project.aggregate.mockResolvedValue([]);
    Task.aggregate.mockResolvedValue([]);
    Subtask.aggregate.mockResolvedValue([]);

    Like.countDocuments.mockResolvedValue(0);
    Comment.countDocuments.mockResolvedValue(0);
    Post.countDocuments.mockResolvedValue(0);
    Follow.countDocuments.mockResolvedValue(0);

    Post.find.mockReturnValue(makeListQuery([]));
    WorkspaceMember.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue([])
    });
    Workspace.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue([])
    });
    Task.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue([])
    });

    const result = await activityService.getAdvancedDashboard("user-1", { days: 100 });

    expect(result.rangeDays).toBe(30);
    expect(result).toEqual(expect.objectContaining({
        generatedAt: expect.any(Date),
        social: expect.any(Object),
        productivity: expect.any(Object),
        activity: expect.any(Object),
        creator: expect.any(Object)
    }));
    expect(result.activity).toEqual(expect.objectContaining({
        rangeDays: 30,
        charts: expect.any(Object)
    }));
});
