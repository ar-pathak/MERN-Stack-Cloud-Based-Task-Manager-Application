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
    jest.restoreAllMocks();
    jest.resetAllMocks();
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

test("listMyActivities maps multiple entity types and supports default filters", async () => {
    Activity.find.mockReturnValue(makeListQuery([
        {
            _id: "act-1",
            action: "subtask.updated",
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
            subtask: { _id: "st-1", title: "Subtask A" }
        },
        {
            _id: "act-2",
            action: "project.updated",
            createdAt: new Date("2026-02-02T00:00:00.000Z"),
            project: { _id: "pr-1", name: "Project A" }
        },
        {
            _id: "act-3",
            action: "workspace.updated",
            createdAt: new Date("2026-02-03T00:00:00.000Z"),
            workspace: { _id: "ws-1", name: "Workspace A" }
        },
        {
            _id: "act-4",
            action: "chat.updated",
            createdAt: new Date("2026-02-04T00:00:00.000Z"),
            chatId: { _id: "chat-1", name: "General" }
        },
        {
            _id: "act-5",
            action: "other.action",
            createdAt: new Date("2026-02-05T00:00:00.000Z")
        }
    ]));
    Activity.countDocuments.mockResolvedValue(5);

    const result = await activityService.listMyActivities("user-1", {
        page: 1,
        limit: 10,
        level: "all",
        action: "   ",
        search: ""
    });

    expect(Activity.find).toHaveBeenCalledWith({ user: "user-1" });
    expect(result.activities.map((entry) => entry.entity?.type || null)).toEqual([
        "subtask",
        "project",
        "workspace",
        "chat",
        null
    ]);
    expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1,
        hasMore: false
    });
});

test("getMyActivityDashboard handles inaccessible content and presence fallback", async () => {
    const lastActive = new Date();
    User.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "user-1",
        name: "Alice",
        username: "alice",
        email: "alice@example.com",
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        updatedAt: new Date("2026-02-01T00:00:30.000Z"),
        lastSeen: null,
        lastActive,
        isOnline: false,
        emailVerified: true,
        accountStatus: "active"
    }));

    Like.find.mockReturnValue(makeListQuery([
        {
            _id: "like-1",
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
            post: { _id: "post-1", status: "active", content: "A" }
        }
    ]));
    Like.countDocuments.mockResolvedValue(1);
    Comment.find.mockReturnValue(makeListQuery([
        {
            _id: "comment-1",
            content: "Hidden",
            createdAt: new Date("2026-02-01T01:00:00.000Z"),
            post: { _id: "post-2", status: "active", content: "B" }
        }
    ]));
    Comment.countDocuments.mockResolvedValue(1);
    Post.find.mockReturnValueOnce(makeListQuery([
        {
            _id: "repost-1",
            createdAt: new Date("2026-02-01T02:00:00.000Z"),
            postType: "quote",
            status: "active",
            content: "Quoted",
            originalPost: { _id: "orig-1", status: "active", content: "Original" }
        }
    ]));
    Post.countDocuments.mockResolvedValue(1);

    RefreshToken.findOne.mockReturnValue(makeRefreshTokenQuery(null));

    Activity.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
    Like.aggregate.mockResolvedValue([]);
    Comment.aggregate.mockResolvedValue([]);
    Post.aggregate.mockResolvedValue([]);

    postService.filterAccessiblePosts
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

    const result = await activityService.getMyActivityDashboard("user-1", { limit: 5 });

    expect(result.likes.items).toEqual([]);
    expect(result.comments.items).toEqual([]);
    expect(result.reposts.items).toHaveLength(1);
    expect(result.timeSpent.dataSources).toContain("presence");
    expect(result.accountHistory.summary.activeSessionStartedAt).toBeNull();
    expect(result.analytics.kpis.topAction).toBeNull();
});

test("getAdvancedDashboard computes populated social, creator, and productivity insights", async () => {
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayKey = dayStart.toISOString().slice(0, 10);

    User.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "user-1",
        name: "Alice",
        username: "alice",
        email: "alice@example.com",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-02-01T00:00:00.000Z"),
        lastSeen: new Date("2026-02-10T00:00:00.000Z"),
        lastActive: new Date("2026-02-10T01:00:00.000Z"),
        isOnline: true,
        emailVerified: true,
        accountStatus: "active",
        followersCount: 20,
        followingCount: 7
    }));

    Activity.aggregate
        .mockResolvedValueOnce([
            {
                _id: dayKey,
                firstAt: new Date(dayStart.getTime()),
                lastAt: new Date(dayStart.getTime() + 60 * 60 * 1000),
                actions: 4
            }
        ])
        .mockResolvedValueOnce([{ _id: "task", count: 4 }])
        .mockResolvedValueOnce([{ _id: "task_completed", count: 3 }, { _id: "comment_added", count: 1 }]);

    Like.aggregate
        .mockResolvedValueOnce([{ _id: dayKey, firstAt: dayStart, lastAt: dayStart, actions: 2 }])
        .mockResolvedValueOnce([{ _id: dayKey, count: 6 }]);
    Comment.aggregate
        .mockResolvedValueOnce([{ _id: dayKey, firstAt: dayStart, lastAt: dayStart, actions: 1 }])
        .mockResolvedValueOnce([{ _id: dayKey, count: 2 }]);

    Post.aggregate
        .mockResolvedValueOnce([{ _id: dayKey, firstAt: dayStart, lastAt: dayStart, actions: 1 }])
        .mockResolvedValueOnce([{
            _id: null,
            posts: 5,
            views: 500,
            likes: 100,
            comments: 25,
            shares: 10,
            reposts: 5
        }])
        .mockResolvedValueOnce([{ _id: "text", count: 3 }, { _id: "video", count: 2 }])
        .mockResolvedValueOnce([{ _id: "public", count: 4 }, { _id: "followers", count: 1 }])
        .mockResolvedValueOnce([{
            _id: dayKey,
            posts: 2,
            views: 120,
            likes: 40,
            comments: 10,
            shares: 4,
            reposts: 2
        }])
        .mockResolvedValueOnce([{ _id: dayKey, count: 3 }])
        .mockResolvedValueOnce([{ _id: dayKey, count: 2 }])
        .mockResolvedValueOnce([{ _id: 14, posts: 3, likes: 30, comments: 9, shares: 3, reposts: 2 }]);

    Like.countDocuments.mockResolvedValue(11);
    Comment.countDocuments.mockResolvedValue(5);
    Post.countDocuments.mockResolvedValueOnce(3).mockResolvedValueOnce(12);
    Follow.countDocuments.mockResolvedValueOnce(20).mockResolvedValueOnce(7);

    Post.find
        .mockReturnValueOnce(makeListQuery([
            {
                _id: "post-top",
                content: "Top content",
                postType: "text",
                visibility: "public",
                createdAt: dayStart,
                viewsCount: 200,
                likesCount: 60,
                commentsCount: 10,
                sharesCount: 5,
                repostsCount: 2
            }
        ]))
        .mockReturnValueOnce(makeListQuery([
            {
                _id: "post-a",
                content: "Active post",
                createdAt: dayStart,
                status: "active",
                scheduledFor: null,
                visibility: "public",
                postType: "text",
                viewsCount: 100,
                likesCount: 30,
                commentsCount: 5,
                sharesCount: 2,
                repostsCount: 1
            },
            {
                _id: "post-b",
                content: "Scheduled post",
                createdAt: dayStart,
                status: "scheduled",
                scheduledFor: new Date(dayStart.getTime() + 2 * 24 * 60 * 60 * 1000),
                visibility: "followers",
                postType: "video",
                viewsCount: 0,
                likesCount: 0,
                commentsCount: 0,
                sharesCount: 0,
                repostsCount: 0
            }
        ]));

    Follow.aggregate
        .mockResolvedValueOnce([{ _id: dayKey, count: 4 }])
        .mockResolvedValueOnce([{ _id: "India", count: 8 }, { _id: null, count: 2 }]);

    PostSave.aggregate
        .mockResolvedValueOnce([{ total: 9 }])
        .mockResolvedValueOnce([{ _id: "post-a", count: 5 }]);

    WorkspaceMember.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(["w1", "w2"])
    });
    Workspace.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(["w2", "w3"])
    });
    Task.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(["t1", "t2"])
    });

    Project.aggregate.mockResolvedValue([{ _id: "active", count: 2 }, { _id: "completed", count: 1 }]);
    Task.aggregate
        .mockResolvedValueOnce([{ _id: "active", count: 4 }, { _id: "completed", count: 2 }])
        .mockResolvedValueOnce([{
            _id: null,
            totalTasks: 6,
            activeTasks: 4,
            completedTasks: 2,
            overdueTasks: 1,
            dueSoonTasks: 1,
            highPriorityTasks: 2
        }])
        .mockResolvedValueOnce([{ _id: dayKey, count: 2 }])
        .mockResolvedValueOnce([{ _id: dayKey, count: 1 }]);
    Subtask.aggregate
        .mockResolvedValueOnce([{ _id: null, totalSubtasks: 10, completedSubtasks: 6 }])
        .mockResolvedValueOnce([{ _id: dayKey, count: 3 }]);

    const result = await activityService.getAdvancedDashboard("user-1", { days: 15 });

    expect(result.rangeDays).toBe(15);
    expect(result.social.totals).toEqual(expect.objectContaining({
        posts: 5,
        views: 500,
        totalEngagement: 140
    }));
    expect(result.creator.totals).toEqual(expect.objectContaining({
        posts: 12,
        followers: 20,
        saves: 9
    }));
    expect(result.creator.audience.activeTime.bestPostingHour).toEqual(expect.objectContaining({
        hour: 14
    }));
    expect(result.productivity.totals).toEqual(expect.objectContaining({
        workspaces: 3,
        ownedWorkspaces: 2,
        memberWorkspaces: 1,
        tasks: 6
    }));
    expect(result.activity.kpis).toEqual(expect.objectContaining({
        totalActions: expect.any(Number),
        topAction: expect.objectContaining({ key: "task_completed" })
    }));
});

test("listMyActivities uses fallback entity names and default pagination when query is omitted", async () => {
    Activity.find.mockReturnValue(makeListQuery([
        {
            _id: "act-1",
            task: { _id: "task-1" }
        },
        {
            _id: "act-2",
            project: { _id: "project-1" }
        },
        {
            _id: "act-3",
            workspace: { _id: "workspace-1" }
        },
        {
            _id: "act-4",
            chatId: { _id: "chat-1" }
        }
    ]));
    Activity.countDocuments.mockResolvedValue(4);

    const result = await activityService.listMyActivities("user-1");

    expect(Activity.find).toHaveBeenCalledWith({ user: "user-1" });
    expect(result.activities.map((activity) => activity.entity)).toEqual([
        { type: "task", id: "task-1", name: "Task" },
        { type: "project", id: "project-1", name: "Project" },
        { type: "workspace", id: "workspace-1", name: "Workspace" },
        { type: "chat", id: "chat-1", name: "Chat" }
    ]);
    expect(result.pagination).toEqual({
        page: 1,
        limit: 25,
        total: 4,
        totalPages: 1,
        hasMore: false
    });
});

test("getMyActivityDashboard falls back to empty-history defaults when no signals exist", async () => {
    User.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "user-1",
        createdAt: new Date("2026-02-01T00:00:00.000Z")
    }));

    Like.find.mockReturnValue(makeListQuery([]));
    Like.countDocuments.mockResolvedValue(0);
    Comment.find.mockReturnValue(makeListQuery([]));
    Comment.countDocuments.mockResolvedValue(0);
    Post.find.mockReturnValue(makeListQuery([]));
    Post.countDocuments.mockResolvedValue(0);
    RefreshToken.findOne.mockReturnValue(makeRefreshTokenQuery(null));

    Activity.aggregate.mockResolvedValue([]);
    Like.aggregate.mockResolvedValue([]);
    Comment.aggregate.mockResolvedValue([]);
    Post.aggregate.mockResolvedValue([]);
    postService.filterAccessiblePosts.mockResolvedValue([]);

    const result = await activityService.getMyActivityDashboard("user-1");

    expect(result.timeSpent.note).toBe("No activity signals found in the last 30 days yet.");
    expect(result.timeSpent.dataSources).toEqual([]);
    expect(result.timeSpent.averageActiveDayMinutes).toBe(0);
    expect(result.timeSpent.lastActiveAt).toBeNull();
    expect(result.accountHistory.summary).toEqual(expect.objectContaining({
        accountStatus: "active",
        activeSessionStartedAt: null,
        activeSessionExpiresAt: null
    }));
    expect(result.analytics.kpis).toEqual(expect.objectContaining({
        peakDay: null,
        totalActions: 0
    }));
    expect(result.analytics.charts.sourceDistribution).toEqual([]);
});

test("getAdvancedDashboard normalizes edge-case creator, social, and productivity rows", async () => {
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayKey = dayStart.toISOString().slice(0, 10);

    User.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "user-1",
        name: "Alice",
        username: "alice",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        followersCount: 8,
        followingCount: 3
    }));

    Activity.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ _id: null, count: 0 }])
        .mockResolvedValueOnce([{ _id: "", count: 0 }]);

    Like.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ _id: dayKey, count: 0 }]);

    Comment.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ _id: dayKey, count: 0 }]);

    Post.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{ _id: null, count: 1 }])
        .mockResolvedValueOnce([{ _id: "team_only", count: 2 }, { _id: "", count: 1 }])
        .mockResolvedValueOnce([{
            _id: dayKey,
            posts: 1,
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            reposts: 0
        }])
        .mockResolvedValueOnce([{ _id: dayKey, count: 1 }])
        .mockResolvedValueOnce([{ _id: dayKey, count: 0 }])
        .mockResolvedValueOnce([
            { _id: 0, posts: 1, likes: 1, comments: 0, shares: 0, reposts: 0 },
            { _id: 24, posts: 1, likes: 1, comments: 0, shares: 0, reposts: 0 }
        ]);

    Post.find
        .mockReturnValueOnce(makeListQuery([
            {
                _id: "social-top",
                content: "",
                postType: null,
                visibility: null,
                viewsCount: 0,
                likesCount: 0,
                commentsCount: 0,
                sharesCount: 0,
                repostsCount: 0
            }
        ]))
        .mockReturnValueOnce(makeListQuery([
            {
                _id: "active-a",
                status: "active",
                content: "A".repeat(180),
                viewsCount: 50,
                likesCount: 1,
                commentsCount: 1,
                sharesCount: 0,
                repostsCount: 0
            },
            {
                _id: "active-b",
                status: "active",
                content: null,
                viewsCount: 100,
                likesCount: 1,
                commentsCount: 1,
                sharesCount: 0,
                repostsCount: 0
            },
            {
                _id: "scheduled-a",
                status: "scheduled",
                scheduledFor: new Date(dayStart.getTime() + (2 * 24 * 60 * 60 * 1000)),
                visibility: "followers",
                postType: "video",
                content: "Later A"
            },
            {
                _id: "scheduled-b",
                status: "scheduled",
                scheduledFor: new Date(dayStart.getTime() + (24 * 60 * 60 * 1000)),
                visibility: null,
                postType: null,
                content: "Later B"
            }
        ]));

    PostSave.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ _id: "active-a", count: 2 }]);

    Follow.aggregate
        .mockResolvedValueOnce([{ _id: dayKey, count: 0 }])
        .mockResolvedValueOnce([{ _id: " ", count: 2 }]);

    Like.countDocuments.mockResolvedValue(0);
    Comment.countDocuments.mockResolvedValue(0);
    Post.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(4);
    Follow.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

    WorkspaceMember.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue([null, "workspace-1"])
    });
    Workspace.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(["workspace-1", "workspace-2"])
    });
    Task.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue([])
    });

    Project.aggregate.mockResolvedValue([{ _id: null, count: 2 }]);
    Task.aggregate
        .mockResolvedValueOnce([{ _id: null, count: 3 }])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{ _id: null, count: 0 }])
        .mockResolvedValueOnce([{ _id: null, count: 0 }]);
    Subtask.aggregate
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{ _id: null, count: 0 }]);

    const result = await activityService.getAdvancedDashboard("user-1");

    expect(result.rangeDays).toBe(30);
    expect(result.activity.charts.levelDistribution[0]).toEqual({
        key: "system",
        label: "System",
        value: 0,
        share: 0
    });
    expect(result.activity.kpis.topAction).toEqual({
        key: "",
        label: "Other",
        value: 0,
        share: 0
    });
    expect(result.social.postTypeDistribution[0]).toEqual({
        key: "text",
        label: "Text",
        value: 1
    });
    expect(result.social.visibilityDistribution).toEqual([
        { key: "team_only", label: "Team Only", value: 2 },
        { key: "public", label: "Public", value: 1 }
    ]);
    expect(result.social.topPosts[0].engagementRate).toBe(0);
    expect(result.creator.totals).toEqual(expect.objectContaining({
        followers: 8,
        following: 3,
        saves: 0
    }));
    expect(result.creator.audience.followersByCountry).toEqual([
        { country: "Unknown", value: 2 }
    ]);
    expect(result.creator.audience.activeTime.bestPostingHour).toEqual({
        hour: 0,
        label: "12:00 AM",
        averageEngagement: 1,
        posts: 1
    });
    expect(result.creator.management.scheduledPosts.map((post) => post._id)).toEqual([
        "scheduled-b",
        "scheduled-a"
    ]);
    expect(result.productivity.projectStatusDistribution[0]).toEqual({
        key: "active",
        label: "Active",
        value: 2
    });
    expect(result.productivity.taskStatusDistribution[0]).toEqual({
        key: "active",
        label: "Active",
        value: 3
    });
});
