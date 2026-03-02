jest.mock("../../src/models/notification", () => ({
    aggregate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    insertMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    findOneAndDelete: jest.fn(),
    deleteMany: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/subtasks", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/modules/utils/socketStore", () => ({
    getIO: jest.fn()
}));

const mongoose = require("mongoose");
const Notification = require("../../src/models/notification");
const WorkspaceMember = require("../../src/models/workspaceMember");
const Project = require("../../src/models/project");
const Task = require("../../src/models/tasks");
const Subtask = require("../../src/models/subtasks");
const { getIO } = require("../../src/modules/utils/socketStore");
const notificationService = require("../../src/modules/notification/notification.service");

const USER_ID = "507f1f77bcf86cd799439011";
const USER_ID_2 = "507f1f77bcf86cd799439012";
const USER_ID_3 = "507f1f77bcf86cd799439013";
const ACTOR_ID = "507f1f77bcf86cd799439014";
const NOTIFICATION_ID = "507f1f77bcf86cd799439015";
const REQUEST_ID = "507f1f77bcf86cd799439016";
const TASK_ID = "507f1f77bcf86cd799439017";
const SUBTASK_ID = "507f1f77bcf86cd799439018";
const PROJECT_ID = "507f1f77bcf86cd799439019";
const WORKSPACE_ID = "507f1f77bcf86cd799439020";

const makeChainQuery = (value) => {
    const query = {
        select: jest.fn(() => query),
        populate: jest.fn(() => query),
        sort: jest.fn(() => query),
        skip: jest.fn(() => query),
        limit: jest.fn(() => query),
        session: jest.fn(() => query),
        lean: jest.fn().mockResolvedValue(value)
    };
    return query;
};

const makeDeleteQuery = (value) => ({
    lean: jest.fn().mockResolvedValue(value)
});

const createIo = () => {
    const emit = jest.fn();
    const io = {
        to: jest.fn(() => ({ emit }))
    };
    return { io, emit };
};

beforeEach(() => {
    jest.clearAllMocks();
    getIO.mockReturnValue(null);
});

test("listNotifications applies filters and returns pagination metadata", async () => {
    Notification.find.mockReturnValue(makeChainQuery([{ _id: NOTIFICATION_ID }]));
    Notification.countDocuments
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);

    const result = await notificationService.listNotifications(USER_ID, {
        page: "2",
        limit: "2",
        read: "false",
        category: "social,system",
        type: "activity",
        priority: "high",
        entityType: "task",
        search: "mention"
    });

    expect(Notification.find).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.any(mongoose.Types.ObjectId),
        read: false,
        category: { $in: ["social", "system"] },
        type: "activity",
        priority: "high",
        entityType: "task",
        $or: expect.any(Array)
    }));
    expect(result.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasMore: true
    });
    expect(result.unreadCount).toBe(2);
});

test("getUnreadCount returns unread notification count", async () => {
    Notification.countDocuments.mockResolvedValue(7);

    const count = await notificationService.getUnreadCount(USER_ID);

    expect(count).toBe(7);
    expect(Notification.countDocuments).toHaveBeenCalledWith({
        user: expect.any(mongoose.Types.ObjectId),
        read: false
    });
});

test("markAsRead updates notification and emits updated + unread_count events", async () => {
    const { io, emit } = createIo();
    getIO.mockReturnValue(io);

    Notification.findOneAndUpdate.mockReturnValue(makeChainQuery({
        _id: NOTIFICATION_ID,
        user: USER_ID,
        read: true
    }));
    Notification.aggregate.mockResolvedValue([
        { _id: new mongoose.Types.ObjectId(USER_ID), count: 3 }
    ]);

    const result = await notificationService.markAsRead(USER_ID, NOTIFICATION_ID);

    expect(result).toEqual(expect.objectContaining({
        _id: NOTIFICATION_ID,
        user: USER_ID,
        read: true
    }));
    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: NOTIFICATION_ID, user: USER_ID },
        { $set: { read: true, readAt: expect.any(Date), seenAt: expect.any(Date) } },
        { new: true }
    );
    expect(io.to).toHaveBeenCalledWith(`user:${USER_ID}`);
    expect(emit).toHaveBeenCalledWith("notification:updated", {
        notification: expect.objectContaining({ _id: NOTIFICATION_ID })
    });
    expect(emit).toHaveBeenCalledWith("notification:unread_count", { count: 3 });
});

test("markAsRead throws 404 when notification does not exist", async () => {
    Notification.findOneAndUpdate.mockReturnValue(makeChainQuery(null));

    await expect(notificationService.markAsRead(USER_ID, NOTIFICATION_ID))
        .rejects
        .toMatchObject({
            message: "Notification not found",
            statusCode: 404
        });
});

test("markAsUnread and deleteNotification emit expected socket events", async () => {
    const { io, emit } = createIo();
    getIO.mockReturnValue(io);
    Notification.aggregate.mockResolvedValue([
        { _id: new mongoose.Types.ObjectId(USER_ID), count: 1 }
    ]);

    Notification.findOneAndUpdate.mockReturnValue(makeChainQuery({
        _id: NOTIFICATION_ID,
        user: USER_ID,
        read: false
    }));
    Notification.findOneAndDelete.mockReturnValue(makeDeleteQuery({
        _id: NOTIFICATION_ID,
        user: USER_ID
    }));

    const unread = await notificationService.markAsUnread(USER_ID, NOTIFICATION_ID);
    const deleted = await notificationService.deleteNotification(USER_ID, NOTIFICATION_ID);

    expect(unread.read).toBe(false);
    expect(deleted._id).toBe(NOTIFICATION_ID);
    expect(emit).toHaveBeenCalledWith("notification:updated", {
        notification: expect.objectContaining({ _id: NOTIFICATION_ID })
    });
    expect(emit).toHaveBeenCalledWith("notification:deleted", {
        notificationId: NOTIFICATION_ID
    });
});

test("deleteNotification throws 404 when target notification does not exist", async () => {
    Notification.findOneAndDelete.mockReturnValue(makeDeleteQuery(null));

    await expect(notificationService.deleteNotification(USER_ID, NOTIFICATION_ID))
        .rejects
        .toMatchObject({
            message: "Notification not found",
            statusCode: 404
        });
});

test("markAllAsRead updates unread records and emits aggregate state", async () => {
    const { io, emit } = createIo();
    getIO.mockReturnValue(io);
    Notification.updateMany.mockResolvedValue({ matchedCount: 4, modifiedCount: 3 });
    Notification.aggregate.mockResolvedValue([]);

    const result = await notificationService.markAllAsRead(USER_ID, {
        category: "social",
        type: "activity",
        entityType: "user"
    });

    expect(Notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
            user: expect.any(mongoose.Types.ObjectId),
            read: false,
            category: "social",
            type: "activity",
            entityType: "user"
        }),
        { $set: { read: true, readAt: expect.any(Date), seenAt: expect.any(Date) } }
    );
    expect(result).toEqual({
        matchedCount: 4,
        modifiedCount: 3
    });
    expect(emit).toHaveBeenCalledWith("notification:all_read", {
        matchedCount: 4,
        modifiedCount: 3
    });
});

test("bulkAction handles empty ids and read/unread/delete branches", async () => {
    const { io, emit } = createIo();
    getIO.mockReturnValue(io);
    Notification.aggregate.mockResolvedValue([]);

    const empty = await notificationService.bulkAction(USER_ID, {
        action: "read",
        notificationIds: ["bad-id"]
    });
    expect(empty).toEqual({
        matchedCount: 0,
        modifiedCount: 0
    });

    Notification.updateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });
    const readResult = await notificationService.bulkAction(USER_ID, {
        action: "read",
        notificationIds: [NOTIFICATION_ID, "507f1f77bcf86cd799439021"]
    });
    expect(readResult).toEqual({
        matchedCount: 2,
        modifiedCount: 2,
        deletedCount: 0
    });

    Notification.updateMany.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const unreadResult = await notificationService.bulkAction(USER_ID, {
        action: "unread",
        notificationIds: [NOTIFICATION_ID]
    });
    expect(unreadResult).toEqual({
        matchedCount: 1,
        modifiedCount: 1,
        deletedCount: 0
    });

    Notification.deleteMany.mockResolvedValue({ deletedCount: 3 });
    const deleteResult = await notificationService.bulkAction(USER_ID, {
        action: "delete",
        notificationIds: [NOTIFICATION_ID]
    });
    expect(deleteResult).toEqual({
        matchedCount: 3,
        modifiedCount: 0,
        deletedCount: 3
    });
    expect(emit).toHaveBeenCalledWith("notification:bulk", expect.objectContaining({
        action: "delete",
        deletedCount: 3
    }));
});

test("createNotifications dedupes recipients, excludes actor and emits realtime updates", async () => {
    const { io, emit } = createIo();
    getIO.mockReturnValue(io);

    Notification.find
        .mockReturnValueOnce(makeChainQuery([
            { user: new mongoose.Types.ObjectId(USER_ID_2) }
        ]))
        .mockReturnValueOnce(makeChainQuery([
            { _id: NOTIFICATION_ID, user: USER_ID }
        ]));

    Notification.insertMany.mockResolvedValue([
        { _id: new mongoose.Types.ObjectId(NOTIFICATION_ID) }
    ]);

    Notification.aggregate.mockResolvedValue([
        { _id: new mongoose.Types.ObjectId(USER_ID), count: 2 }
    ]);

    const created = await notificationService.createNotifications({
        recipientIds: [USER_ID, USER_ID_2, ACTOR_ID],
        actorId: ACTOR_ID,
        title: "New follower",
        message: "Someone followed you",
        category: "social",
        dedupeKey: "follow:dedupe"
    });

    expect(created).toHaveLength(1);
    expect(Notification.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                user: expect.any(mongoose.Types.ObjectId),
                actor: expect.any(mongoose.Types.ObjectId),
                title: "New follower",
                category: "social",
                dedupeKey: "follow:dedupe"
            })
        ]),
        { ordered: false, session: null }
    );
    expect(emit).toHaveBeenCalledWith("notification:new", {
        notification: expect.objectContaining({ _id: NOTIFICATION_ID })
    });
    expect(emit).toHaveBeenCalledWith("notification:unread_count", { count: 2 });
});

test("setFollowRequestNotificationState returns null for invalid params", async () => {
    const result = await notificationService.setFollowRequestNotificationState({
        recipientUserId: USER_ID,
        requestId: null,
        requestState: "approved"
    });

    expect(result).toBeNull();
    expect(Notification.findOneAndUpdate).not.toHaveBeenCalled();
});

test("setFollowRequestNotificationState updates and emits notification updates", async () => {
    const { io, emit } = createIo();
    getIO.mockReturnValue(io);
    Notification.findOneAndUpdate.mockReturnValue(makeChainQuery({
        _id: NOTIFICATION_ID,
        user: USER_ID
    }));
    Notification.aggregate.mockResolvedValue([
        { _id: new mongoose.Types.ObjectId(USER_ID), count: 0 }
    ]);

    const updated = await notificationService.setFollowRequestNotificationState({
        recipientUserId: USER_ID,
        requestId: REQUEST_ID,
        requestState: "approved",
        read: true
    });

    expect(updated).toEqual(expect.objectContaining({ _id: NOTIFICATION_ID }));
    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
            user: expect.any(mongoose.Types.ObjectId),
            "metadata.kind": "follow_request",
            "metadata.requestId": REQUEST_ID
        }),
        { $set: expect.objectContaining({ "metadata.requestState": "approved", read: true }) },
        { new: true }
    );
    expect(emit).toHaveBeenCalledWith("notification:updated", {
        notification: expect.objectContaining({ _id: NOTIFICATION_ID })
    });
});

test("setProjectStatusRequestNotificationState updates notifications for targeted users", async () => {
    const { io, emit } = createIo();
    getIO.mockReturnValue(io);
    Notification.updateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });
    Notification.find.mockReturnValue(makeChainQuery([
        { _id: "n1", user: USER_ID },
        { _id: "n2", user: USER_ID_2 }
    ]));
    Notification.aggregate.mockResolvedValue([
        { _id: new mongoose.Types.ObjectId(USER_ID), count: 1 },
        { _id: new mongoose.Types.ObjectId(USER_ID_2), count: 4 }
    ]);

    const updated = await notificationService.setProjectStatusRequestNotificationState({
        requestId: REQUEST_ID,
        requestState: "approved",
        recipientUserIds: [USER_ID, USER_ID_2],
        read: true
    });

    expect(updated).toHaveLength(2);
    expect(Notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
            "metadata.kind": "project_status_change_request",
            "metadata.requestId": REQUEST_ID,
            user: { $in: [expect.any(mongoose.Types.ObjectId), expect.any(mongoose.Types.ObjectId)] }
        }),
        { $set: expect.objectContaining({ "metadata.requestState": "approved", read: true }) }
    );
    expect(emit).toHaveBeenCalledWith("notification:updated", expect.any(Object));
    expect(emit).toHaveBeenCalledWith("notification:unread_count", { count: 1 });
    expect(emit).toHaveBeenCalledWith("notification:unread_count", { count: 4 });
});

test("buildActivityRecipientIds resolves recipients across subtask/task/project/workspace scopes", async () => {
    Subtask.findById.mockReturnValue(makeChainQuery({
        createdBy: USER_ID,
        assignedTo: [USER_ID_2],
        task: TASK_ID
    }));
    Task.findById.mockReturnValue(makeChainQuery({
        createdBy: USER_ID_3,
        assignees: [USER_ID_2],
        project: PROJECT_ID,
        workspace: WORKSPACE_ID
    }));
    Project.findById.mockReturnValue(makeChainQuery({
        owner: ACTOR_ID,
        members: [{ user: USER_ID }],
        workspace: WORKSPACE_ID
    }));
    WorkspaceMember.find.mockReturnValue(makeChainQuery([
        { user: USER_ID_3 },
        { user: ACTOR_ID }
    ]));

    const recipients = await notificationService.buildActivityRecipientIds({
        subtaskId: SUBTASK_ID
    });

    expect(recipients).toEqual(expect.arrayContaining([
        USER_ID,
        USER_ID_2,
        USER_ID_3,
        ACTOR_ID
    ]));
    expect(WorkspaceMember.find).toHaveBeenCalledWith(expect.objectContaining({
        workspace: expect.any(mongoose.Types.ObjectId),
        role: { $in: ["owner", "admin"] }
    }));
});

test("createActivityNotifications creates notifications using resolved scope", async () => {
    const { io, emit } = createIo();
    getIO.mockReturnValue(io);

    WorkspaceMember.find.mockReturnValue(makeChainQuery([
        { user: USER_ID },
        { user: USER_ID_2 }
    ]));
    Notification.insertMany.mockResolvedValue([
        { _id: new mongoose.Types.ObjectId(NOTIFICATION_ID) }
    ]);
    Notification.find.mockReturnValue(makeChainQuery([
        { _id: NOTIFICATION_ID, user: USER_ID }
    ]));
    Notification.aggregate.mockResolvedValue([
        { _id: new mongoose.Types.ObjectId(USER_ID), count: 2 }
    ]);

    const created = await notificationService.createActivityNotifications({
        actorId: ACTOR_ID,
        action: "task.created",
        message: "Task created",
        level: "workspace",
        workspaceId: WORKSPACE_ID
    });

    expect(created).toHaveLength(1);
    expect(Notification.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                title: "Workspace update",
                type: "activity",
                category: "workspace",
                priority: "normal"
            })
        ]),
        expect.any(Object)
    );
    expect(emit).toHaveBeenCalledWith("notification:new", expect.any(Object));
});

