const mongoose = require("mongoose");
const Notification = require("../../models/notification");
const WorkspaceMember = require("../../models/workspaceMember");
const Project = require("../../models/project");
const Task = require("../../models/tasks");
const Subtask = require("../../models/subtasks");
const { getIO } = require("../utils/socketStore");

const withSession = (query, session) => (session ? query.session(session) : query);

const normalizeId = (id) => {
    if (!id) return null;
    return id._id ? id._id : id;
};

const normalizeIdString = (id) => {
    const normalized = normalizeId(id);
    return normalized ? String(normalized) : null;
};

const toObjectId = (id) => {
    const idString = normalizeIdString(id);
    if (!idString || !mongoose.Types.ObjectId.isValid(idString)) return null;
    return new mongoose.Types.ObjectId(idString);
};

const uniqueIdStrings = (ids = []) => {
    const set = new Set();
    ids.forEach((id) => {
        const stringId = normalizeIdString(id);
        if (stringId) set.add(stringId);
    });
    return Array.from(set);
};

const toObjectIds = (ids = []) =>
    uniqueIdStrings(ids)
        .map((id) => toObjectId(id))
        .filter(Boolean);

const parseCsvValue = (value) => {
    if (!value) return [];
    return String(value)
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);
};

const levelTitleMap = {
    workspace: "Workspace update",
    project: "Project update",
    task: "Task update",
    subtask: "Subtask update",
    system: "System update"
};

const buildActivityType = (action = "") => {
    const token = String(action).toLowerCase();
    if (token.includes("assign")) return "assignment";
    if (token.includes("member") || token.includes("ownership")) return "member";
    if (token.startsWith("call.")) return "call";
    return "activity";
};

const buildActivityPriority = (action = "") => {
    const token = String(action).toLowerCase();
    if (token.includes("ownership_transferred")) return "urgent";
    if (token.includes("deleted") || token.includes("removed")) return "high";
    if (token.includes("created") || token.includes("joined")) return "normal";
    return "low";
};

const resolveEntityRef = ({ workspaceId, projectId, taskId, subtaskId, chatId, callId }) => {
    if (subtaskId) return { entityType: "subtask", entityId: subtaskId };
    if (taskId) return { entityType: "task", entityId: taskId };
    if (projectId) return { entityType: "project", entityId: projectId };
    if (workspaceId) return { entityType: "workspace", entityId: workspaceId };
    if (callId) return { entityType: "call", entityId: callId };
    if (chatId) return { entityType: "chat", entityId: chatId };
    return { entityType: "none", entityId: null };
};

const emitToUser = (userId, event, payload) => {
    const io = getIO();
    if (!io) return;
    io.to(`user:${userId}`).emit(event, payload);
};

const emitUnreadCounts = async (userIds = []) => {
    const io = getIO();
    const uniqueUsers = uniqueIdStrings(userIds);
    if (!io || !uniqueUsers.length) return;

    const objectIds = toObjectIds(uniqueUsers);

    const counts = await Notification.aggregate([
        { $match: { user: { $in: objectIds }, read: false } },
        { $group: { _id: "$user", count: { $sum: 1 } } }
    ]);

    const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]));

    uniqueUsers.forEach((userId) => {
        emitToUser(userId, "notification:unread_count", {
            count: countMap.get(String(userId)) || 0
        });
    });
};

const buildActivityRecipientIds = async ({
    workspaceId = null,
    projectId = null,
    taskId = null,
    subtaskId = null,
    session = null
}) => {
    const recipientSet = new Set();

    let workspaceRef = workspaceId ? toObjectId(workspaceId) : null;
    let projectRef = projectId ? toObjectId(projectId) : null;
    let taskRef = taskId ? toObjectId(taskId) : null;

    if (subtaskId) {
        const subtaskQuery = Subtask.findById(subtaskId).select("assignedTo createdBy task");
        const subtask = await withSession(subtaskQuery, session).lean();

        if (subtask) {
            uniqueIdStrings([subtask.createdBy, ...(subtask.assignedTo || [])])
                .forEach((id) => recipientSet.add(id));

            if (!taskRef && subtask.task) {
                taskRef = toObjectId(subtask.task);
            }
        }
    }

    if (taskRef) {
        const taskQuery = Task.findById(taskRef).select("assignees createdBy project workspace");
        const task = await withSession(taskQuery, session).lean();

        if (task) {
            uniqueIdStrings([task.createdBy, ...(task.assignees || [])])
                .forEach((id) => recipientSet.add(id));

            if (!projectRef && task.project) {
                projectRef = toObjectId(task.project);
            }
            if (!workspaceRef && task.workspace) {
                workspaceRef = toObjectId(task.workspace);
            }
        }
    }

    if (projectRef) {
        const projectQuery = Project.findById(projectRef).select("owner members workspace");
        const project = await withSession(projectQuery, session).lean();

        if (project) {
            const projectMemberIds = (project.members || []).map((member) => member.user);
            uniqueIdStrings([project.owner, ...projectMemberIds])
                .forEach((id) => recipientSet.add(id));

            if (!workspaceRef && project.workspace) {
                workspaceRef = toObjectId(project.workspace);
            }
        }
    }

    if (workspaceRef) {
        const roleFilter = projectRef || taskRef || subtaskId
            ? { role: { $in: ["owner", "admin"] } }
            : {};

        const workspaceMembersQuery = WorkspaceMember.find({
            workspace: workspaceRef,
            ...roleFilter
        }).select("user");

        const workspaceMembers = await withSession(workspaceMembersQuery, session).lean();
        workspaceMembers.forEach((member) => {
            const userId = normalizeIdString(member.user);
            if (userId) recipientSet.add(userId);
        });
    }

    return Array.from(recipientSet);
};

const createNotifications = async ({
    recipientIds = [],
    actorId = null,
    title,
    message,
    type = "activity",
    category = "system",
    priority = "normal",
    entityType = "none",
    entityId = null,
    workspaceId = null,
    projectId = null,
    taskId = null,
    subtaskId = null,
    chatId = null,
    callId = null,
    link = "/main",
    channels = {},
    metadata = {},
    dedupeKey = null,
    session = null
}) => {
    if (!title || !message) return [];

    const actorIdString = normalizeIdString(actorId);
    let filteredRecipientIds = uniqueIdStrings(recipientIds).filter((userId) => userId !== actorIdString);
    if (!filteredRecipientIds.length) return [];

    if (dedupeKey) {
        const existingQuery = Notification.find({
            user: { $in: toObjectIds(filteredRecipientIds) },
            dedupeKey,
            createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
        }).select("user");
        const existing = await withSession(existingQuery, session).lean();
        const blockedUsers = new Set(existing.map((doc) => String(doc.user)));
        filteredRecipientIds = filteredRecipientIds.filter((userId) => !blockedUsers.has(userId));
    }

    if (!filteredRecipientIds.length) return [];

    const docs = filteredRecipientIds.map((recipientId) => ({
        user: toObjectId(recipientId),
        actor: toObjectId(actorId),
        title,
        message,
        type,
        category,
        priority,
        entityType,
        entityId: toObjectId(entityId),
        workspace: toObjectId(workspaceId),
        project: toObjectId(projectId),
        task: toObjectId(taskId),
        subtask: toObjectId(subtaskId),
        chatId: toObjectId(chatId),
        callId: toObjectId(callId),
        link: link || "/main",
        channels: {
            inApp: channels.inApp !== false,
            email: Boolean(channels.email),
            push: Boolean(channels.push)
        },
        metadata,
        dedupeKey: dedupeKey || null
    }));

    const created = await Notification.insertMany(docs, { ordered: false, session });
    if (!created.length) return [];

    const createdIds = created.map((item) => item._id);
    const populatedQuery = Notification.find({ _id: { $in: createdIds } })
        .populate("actor", "name username avatar")
        .sort({ createdAt: -1 });
    const createdNotifications = await withSession(populatedQuery, session).lean();

    if (!session) {
        createdNotifications.forEach((notification) => {
            emitToUser(String(notification.user), "notification:new", { notification });
        });
        await emitUnreadCounts(filteredRecipientIds);
    }

    return createdNotifications;
};

const createActivityNotifications = async ({
    actorId,
    action,
    message,
    level = "system",
    workspaceId = null,
    projectId = null,
    taskId = null,
    subtaskId = null,
    chatId = null,
    callId = null,
    meta = {},
    session = null
}) => {
    const recipientIds = await buildActivityRecipientIds({
        workspaceId,
        projectId,
        taskId,
        subtaskId,
        session
    });

    if (!recipientIds.length) return [];

    const { entityType, entityId } = resolveEntityRef({
        workspaceId,
        projectId,
        taskId,
        subtaskId,
        chatId,
        callId
    });

    const type = buildActivityType(action);
    const category = ["workspace", "project", "task", "subtask"].includes(level)
        ? level
        : type === "call"
            ? "call"
            : "system";

    const title = levelTitleMap[level] || "Activity update";

    return createNotifications({
        recipientIds,
        actorId,
        title,
        message,
        type,
        category,
        priority: buildActivityPriority(action),
        entityType,
        entityId,
        workspaceId,
        projectId,
        taskId,
        subtaskId,
        chatId,
        callId,
        link: "/main",
        metadata: {
            action,
            level,
            ...meta
        },
        dedupeKey: `${action}:${entityType}:${normalizeIdString(entityId) || "none"}:${normalizeIdString(actorId) || "na"}`,
        session
    });
};

const listNotifications = async (userId, query = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filters = { user: toObjectId(userId) };

    if (query.read === "true") filters.read = true;
    if (query.read === "false") filters.read = false;

    const categories = parseCsvValue(query.category);
    if (categories.length === 1) filters.category = categories[0];
    if (categories.length > 1) filters.category = { $in: categories };

    const types = parseCsvValue(query.type);
    if (types.length === 1) filters.type = types[0];
    if (types.length > 1) filters.type = { $in: types };

    const priorities = parseCsvValue(query.priority);
    if (priorities.length === 1) filters.priority = priorities[0];
    if (priorities.length > 1) filters.priority = { $in: priorities };

    const entityTypes = parseCsvValue(query.entityType);
    if (entityTypes.length === 1) filters.entityType = entityTypes[0];
    if (entityTypes.length > 1) filters.entityType = { $in: entityTypes };

    if (query.search) {
        const token = String(query.search).trim();
        filters.$or = [
            { title: { $regex: token, $options: "i" } },
            { message: { $regex: token, $options: "i" } }
        ];
    }

    const notificationsQuery = Notification.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("actor", "name username avatar")
        .lean();

    const [notifications, total, unreadCount] = await Promise.all([
        notificationsQuery,
        Notification.countDocuments(filters),
        Notification.countDocuments({ user: toObjectId(userId), read: false })
    ]);

    return {
        notifications,
        unreadCount,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + notifications.length < total
        }
    };
};

const getUnreadCount = async (userId) => {
    return Notification.countDocuments({
        user: toObjectId(userId),
        read: false
    });
};

const setFollowRequestNotificationState = async ({
    recipientUserId,
    requestId,
    requestState,
    read = true
}) => {
    const recipientId = toObjectId(recipientUserId);
    const requestIdString = normalizeIdString(requestId);

    if (!recipientId || !requestIdString || !requestState) {
        return null;
    }

    const now = new Date();
    const setPayload = {
        "metadata.requestState": requestState
    };

    if (read) {
        setPayload.read = true;
        setPayload.readAt = now;
        setPayload.seenAt = now;
    }

    const notification = await Notification.findOneAndUpdate(
        {
            user: recipientId,
            "metadata.kind": "follow_request",
            "metadata.requestId": requestIdString
        },
        { $set: setPayload },
        { new: true }
    )
        .populate("actor", "name username avatar")
        .lean();

    if (!notification) {
        return null;
    }

    emitToUser(String(recipientUserId), "notification:updated", { notification });
    await emitUnreadCounts([recipientUserId]);

    return notification;
};

const setWorkspaceInviteNotificationState = async ({
    recipientUserId,
    inviteId,
    requestState,
    read = true
}) => {
    const recipientId = toObjectId(recipientUserId);
    const inviteIdString = normalizeIdString(inviteId);

    if (!recipientId || !inviteIdString || !requestState) {
        return null;
    }

    const now = new Date();
    const setPayload = {
        "metadata.requestState": requestState
    };

    if (read) {
        setPayload.read = true;
        setPayload.readAt = now;
        setPayload.seenAt = now;
    }

    const notification = await Notification.findOneAndUpdate(
        {
            user: recipientId,
            "metadata.kind": "workspace_invite_request",
            "metadata.inviteId": inviteIdString
        },
        { $set: setPayload },
        { new: true }
    )
        .populate("actor", "name username avatar")
        .lean();

    if (!notification) {
        return null;
    }

    emitToUser(String(recipientUserId), "notification:updated", { notification });
    await emitUnreadCounts([recipientUserId]);

    return notification;
};

const setRequestNotificationStateByKind = async ({
    kind,
    requestId,
    requestState,
    recipientUserIds = [],
    read = true
}) => {
    const requestIdString = normalizeIdString(requestId);

    if (!kind || !requestIdString || !requestState) {
        return [];
    }

    const filter = {
        "metadata.kind": kind,
        "metadata.requestId": requestIdString
    };

    const recipientIds = toObjectIds(recipientUserIds || []);
    if (recipientIds.length > 0) {
        filter.user = { $in: recipientIds };
    }

    const now = new Date();
    const setPayload = {
        "metadata.requestState": requestState
    };

    if (read) {
        setPayload.read = true;
        setPayload.readAt = now;
        setPayload.seenAt = now;
    }

    await Notification.updateMany(filter, { $set: setPayload });

    const updatedNotifications = await Notification.find(filter)
        .populate("actor", "name username avatar")
        .lean();

    const updatedRecipientIds = [];
    updatedNotifications.forEach((notification) => {
        const recipientId = String(notification.user);
        updatedRecipientIds.push(recipientId);
        emitToUser(recipientId, "notification:updated", { notification });
    });

    if (updatedRecipientIds.length > 0) {
        await emitUnreadCounts(updatedRecipientIds);
    }

    return updatedNotifications;
};

const setProjectStatusRequestNotificationState = async ({
    requestId,
    requestState,
    recipientUserIds = [],
    read = true
}) =>
    setRequestNotificationStateByKind({
        kind: "project_status_change_request",
        requestId,
        requestState,
        recipientUserIds,
        read
    });

const setTaskAssigneeRequestNotificationState = async ({
    requestId,
    requestState,
    recipientUserIds = [],
    read = true
}) =>
    setRequestNotificationStateByKind({
        kind: "global_task_assignee_request",
        requestId,
        requestState,
        recipientUserIds,
        read
    });


const markAsRead = async (userId, notificationId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { $set: { read: true, readAt: new Date(), seenAt: new Date() } },
        { new: true }
    )
        .populate("actor", "name username avatar")
        .lean();

    if (!notification) {
        throw new Error("Notification not found");
    }

    emitToUser(String(userId), "notification:updated", { notification });
    await emitUnreadCounts([userId]);

    return notification;
};

const markAsUnread = async (userId, notificationId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { $set: { read: false, readAt: null } },
        { new: true }
    )
        .populate("actor", "name username avatar")
        .lean();

    if (!notification) {
        throw new Error("Notification not found");
    }

    emitToUser(String(userId), "notification:updated", { notification });
    await emitUnreadCounts([userId]);

    return notification;
};

const markAllAsRead = async (userId, { category, type, entityType } = {}) => {
    const filter = {
        user: toObjectId(userId),
        read: false
    };

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (entityType) filter.entityType = entityType;

    const result = await Notification.updateMany(filter, {
        $set: { read: true, readAt: new Date(), seenAt: new Date() }
    });

    emitToUser(String(userId), "notification:all_read", {
        matchedCount: result.matchedCount || 0,
        modifiedCount: result.modifiedCount || 0
    });
    await emitUnreadCounts([userId]);

    return {
        matchedCount: result.matchedCount || 0,
        modifiedCount: result.modifiedCount || 0
    };
};

const deleteNotification = async (userId, notificationId) => {
    const deleted = await Notification.findOneAndDelete({
        _id: notificationId,
        user: userId
    }).lean();

    if (!deleted) {
        throw new Error("Notification not found");
    }

    emitToUser(String(userId), "notification:deleted", { notificationId });
    await emitUnreadCounts([userId]);

    return deleted;
};

const bulkAction = async (userId, { action, notificationIds }) => {
    const ids = toObjectIds(notificationIds);
    if (!ids.length) {
        return { matchedCount: 0, modifiedCount: 0 };
    }

    const filter = {
        user: toObjectId(userId),
        _id: { $in: ids }
    };

    let result = { matchedCount: 0, modifiedCount: 0, deletedCount: 0 };

    if (action === "read") {
        const op = await Notification.updateMany(filter, {
            $set: { read: true, readAt: new Date(), seenAt: new Date() }
        });
        result = {
            matchedCount: op.matchedCount || 0,
            modifiedCount: op.modifiedCount || 0,
            deletedCount: 0
        };
    } else if (action === "unread") {
        const op = await Notification.updateMany(filter, {
            $set: { read: false, readAt: null }
        });
        result = {
            matchedCount: op.matchedCount || 0,
            modifiedCount: op.modifiedCount || 0,
            deletedCount: 0
        };
    } else if (action === "delete") {
        const op = await Notification.deleteMany(filter);
        result = {
            matchedCount: op.deletedCount || 0,
            modifiedCount: 0,
            deletedCount: op.deletedCount || 0
        };
    }

    emitToUser(String(userId), "notification:bulk", {
        action,
        notificationIds: uniqueIdStrings(notificationIds),
        ...result
    });
    await emitUnreadCounts([userId]);

    return result;
};

module.exports = {
    createNotifications,
    createActivityNotifications,
    listNotifications,
    getUnreadCount,
    setFollowRequestNotificationState,
    setWorkspaceInviteNotificationState,
    setProjectStatusRequestNotificationState,
    setTaskAssigneeRequestNotificationState,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    bulkAction,
    buildActivityRecipientIds
};
