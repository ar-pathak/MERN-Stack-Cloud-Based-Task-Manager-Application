// modules/overview/overview.service.js
const Workspace = require("../../models/workspace");
const Project = require("../../models/project");
const Task = require("../../models/tasks");
const Subtask = require("../../models/subtasks");
const Chat = require("../../models/chat");
const Message = require("../../models/message");
const permissionService = require("./permission.service");
const WorkspaceMember = require("../../models/workspaceMember");
const { appCache } = require("../../helpers/cacheHelper");

const OVERVIEW_CACHE_TTL_MS = Math.max(
    1000,
    Number(process.env.OVERVIEW_CACHE_TTL_MS) || 15000
);

const buildMessagePreview = (message) => {
    if (!message) return "";

    const content = String(message.content || "").trim();
    if (content) return content;

    if (message.type === "post" || message.sharedPost) {
        return "Shared a post";
    }
    if (message.type === "image") return "Sent an image";
    if (message.type === "video") return "Sent a video";
    if (message.type === "audio") return "Sent an audio message";
    if (message.type === "file") return "Sent an attachment";
    return "Sent a message";
};

const overviewService = {
    activity: async (userId) => {
        const cacheKey = `overview:activity:${String(userId)}`;
        const cached = appCache.get(cacheKey);
        if (cached.hit) {
            return cached.value;
        }

        // 1. Get user's permissions and workspace memberships
        const userPermissions = await permissionService.getUserPermissionsForTimeline(userId);

        const memberships = await WorkspaceMember
            .find({ user: userId })
            .select("workspace")
            .lean();

        const workspaceIds = memberships.map(m => m.workspace).filter(Boolean);

        // Also include workspaces created by user
        const createdWorkspaces = await Workspace.find({ createdBy: userId }).lean();
        const createdWorkspaceIds = createdWorkspaces.map(w => w._id);
        const allWorkspaceIds = [...new Set([...workspaceIds, ...createdWorkspaceIds])];

        // --- DEFINING POPULATION LOGIC ---
        const commonChatPopulate = {
            path: 'chatId',
            select: 'lastMessage',
            populate: {
                path: 'lastMessage',
                select: 'content senderId createdAt type sharedPost',
                populate: {
                    path: 'senderId',
                    select: 'username avatar email'
                }
            }
        };

        // 2. Fetch all necessary data
        const [workspaces, projects, tasks, chats] = await Promise.all([
            Workspace.find({ _id: { $in: allWorkspaceIds } })
                .populate(commonChatPopulate)
                .lean(),
            Project.find({
                $or: [
                    { workspace: { $in: allWorkspaceIds } },
                    { owner: userId },
                    { 'members.user': userId }
                ]
            })
                .populate(commonChatPopulate)
                .lean(),
            Task.find({
                $or: [
                    { assignees: userId },
                    { createdBy: userId },
                    { workspace: { $in: allWorkspaceIds } }
                ]
            })
                .populate(commonChatPopulate)
                .lean(),
            // Fetch ALL chats where user is member (Private & Group)
            // We will filter duplicates later
            Chat.find({
                members: userId,
                lastMessage: { $exists: true, $ne: null }
            })
                .populate({ path: 'members', select: 'name avatar email' })
                .populate({
                    path: 'lastMessage',
                    select: 'content senderId createdAt type sharedPost',
                    populate: { path: 'senderId', select: 'username avatar' }
                })
                .lean()
        ]);

        // 3. Fetch only relevant subtasks (Optimization)
        const taskIds = tasks.map(t => t._id);
        const subtasks = await Subtask.find({ task: { $in: taskIds } }).lean();

        // ---------------------------------------------------------
        // [FIX] DUPLICATE FILTERING LOGIC
        // ---------------------------------------------------------
        // Identify all Chat IDs that are linked to Workspaces, Projects, Tasks, or Subtasks
        const linkedChatIds = new Set();
        const extractId = (doc) => doc.chatId?._id || doc.chatId;

        [...workspaces, ...projects, ...tasks, ...subtasks].forEach(entity => {
            const cId = extractId(entity);
            if (cId) {
                linkedChatIds.add(String(cId));
            }
        });

        // ---------------------------------------------------------
        // UNIVERSAL UNREAD COUNT AGGREGATION
        // ---------------------------------------------------------
        const allChatIds = [
            ...Array.from(linkedChatIds), // Use the IDs we just collected
            ...chats.map(c => c._id)      // Plus the direct chats
        ];

        // Efficient single query to count unread messages
        const unreadCounts = await Message.aggregate([
            {
                $match: {
                    chatId: { $in: allChatIds },       // Target all collected chats
                    "readBy.userId": { $ne: userId },  // User has NOT read this
                    senderId: { $ne: userId }          // Sender is NOT the current user
                }
            },
            {
                $group: {
                    _id: "$chatId",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Map for O(1) Access: { "chatIdString": 5 }
        const unreadMap = unreadCounts.reduce((acc, curr) => {
            acc[String(curr._id)] = curr.count;
            return acc;
        }, {});

        // Helper to safely get count
        const getUnread = (doc) => {
            const id = doc.chatId?._id || doc.chatId || doc._id;
            return unreadMap[String(id)] || 0;
        };

        // ---------------------------------------------------------
        // HELPERS (Activity Time & Formatting)
        // ---------------------------------------------------------
        const getOwnActivityTime = (entity) => {
            let lastMsgTime = 0;
            if (entity.lastMessage && entity.lastMessage.createdAt) {
                lastMsgTime = new Date(entity.lastMessage.createdAt).getTime();
            } else if (entity.chatId && entity.chatId.lastMessage && entity.chatId.lastMessage.createdAt) {
                lastMsgTime = new Date(entity.chatId.lastMessage.createdAt).getTime();
            }
            const updateTime = entity.updatedAt ? new Date(entity.updatedAt).getTime() : 0;
            const createTime = entity.createdAt ? new Date(entity.createdAt).getTime() : 0;
            return Math.max(lastMsgTime, updateTime, createTime);
        };

        const formatLastMessage = (chatObj) => {
            if (!chatObj || !chatObj.lastMessage) return null;
            const msg = chatObj.lastMessage;
            return {
                content: buildMessagePreview(msg),
                createdAt: msg.createdAt,
                type: msg.type,
                sharedPost: msg.sharedPost || null,
                sender: msg.senderId
            };
        };

        // ---------------------------------------------------------
        // LEVEL 1: Process Subtasks
        // ---------------------------------------------------------
        const subtasksByTask = subtasks.reduce((acc, st) => {
            const key = String(st.task);
            if (!acc[key]) acc[key] = [];

            acc[key].push({
                id: st._id,
                task: st.task,
                title: st.title,
                chatId: st.chatId,
                type: 'subtask',
                completed: st.completed,
                isHighPriority: st.isHighPriority,
                description: st.description,
                createdBy: st.createdBy,
                assignedTo: st.assignedTo || [],
                createdAt: st.createdAt,
                updatedAt: st.updatedAt,
                latestActivity: getOwnActivityTime(st),
                unreadCount: getUnread(st) // <-- Subtask Unread
            });
            return acc;
        }, {});

        // ---------------------------------------------------------
        // LEVEL 2: Process Tasks
        // ---------------------------------------------------------
        const tasksByProject = {};
        const tasksByWorkspace = {};
        const globalTasks = [];

        for (const t of tasks) {
            const taskId = String(t._id);
            let taskPermissions = {
                canCreateSubtask: false,
                canChangeStatus: false,
                canUpdateTask: false,
                canUpdatePriority: false,
                inheritedFromTeam: false,
                ...(userPermissions.tasks[taskId] || {})
            };
            let canEditTask = false;

            const taskRole = String(taskPermissions.role || "").toLowerCase();
            if (
                taskRole === 'creator'
                || taskRole === 'assignee'
                || (taskPermissions.inheritedFromTeam && ['lead', 'member'].includes(taskRole))
                || ['owner', 'admin'].includes(taskRole)
            ) {
                canEditTask = true;
            }

            // Inheritance Logic
            if (t.project && !taskPermissions.role) {
                const projId = String(t.project);
                const projPermissions = userPermissions.projects[projId];
                if (projPermissions) {
                    taskPermissions = {
                        ...taskPermissions,
                        canCreateSubtask: projPermissions.canEdit || ['owner', 'admin', 'member'].includes(projPermissions.role),
                        role: projPermissions.role || null
                    };
                    if (['owner', 'admin', 'editor'].includes(projPermissions.role)) canEditTask = true;
                }
            }
            if (t.workspace && !taskPermissions.role) {
                const wsId = String(t.workspace);
                const wsPermissions = userPermissions.workspaces[wsId];
                if (wsPermissions) {
                    taskPermissions = {
                        ...taskPermissions,
                        canCreateSubtask: wsPermissions.canEdit || ['owner', 'admin', 'member'].includes(wsPermissions.role),
                        role: wsPermissions.role || null
                    };
                    if (['owner', 'admin'].includes(wsPermissions.role)) canEditTask = true;
                }
            }

            const rawSubtasks = subtasksByTask[taskId] || [];
            const maxSubtaskActivity = rawSubtasks.length > 0
                ? Math.max(...rawSubtasks.map(s => s.latestActivity))
                : 0;

            const processedSubtasks = rawSubtasks.map(st => {
                const isSubtaskCreator = String(st.createdBy) === String(userId);
                const isSubtaskAssignee = Array.isArray(st.assignedTo)
                    && st.assignedTo.some((assigneeId) => String(assigneeId) === String(userId));
                const hasEditAccess = isSubtaskCreator || isSubtaskAssignee || canEditTask;
                return {
                    ...st,
                    permissions: {
                        canEdit: hasEditAccess,
                        canDelete: hasEditAccess,
                        canChangeStatus: hasEditAccess,
                        canUpdatePriority: hasEditAccess
                    }
                };
            });

            const taskFinalActivity = Math.max(getOwnActivityTime(t), maxSubtaskActivity);

            const taskObj = {
                id: t._id,
                type: "task",
                title: t.title,
                chatId: t.chatId?._id || t.chatId,
                lastMessage: formatLastMessage(t.chatId),
                description: t.description,
                status: t.status,
                isHighPriority: t.isHighPriority,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                latestActivity: taskFinalActivity,
                dueDate: t.dueDate,
                subtasks: processedSubtasks,
                unreadCount: getUnread(t), // <-- Task Unread
                permissions: {
                    canCreateSubtask: taskPermissions.canCreateSubtask || false,
                    canChangeStatus: Boolean(taskPermissions.canChangeStatus),
                    canUpdateTask: Boolean(taskPermissions.canUpdateTask),
                    canUpdatePriority: Boolean(taskPermissions.canUpdatePriority),
                    role: taskPermissions.role || null,
                    inheritedFromTeam: Boolean(taskPermissions.inheritedFromTeam)
                }
            };

            if (t.project) {
                const key = String(t.project);
                if (!tasksByProject[key]) tasksByProject[key] = [];
                tasksByProject[key].push(taskObj);
            } else if (t.workspace) {
                const key = String(t.workspace);
                if (!tasksByWorkspace[key]) tasksByWorkspace[key] = [];
                tasksByWorkspace[key].push(taskObj);
            } else {
                globalTasks.push(taskObj);
            }
        }

        // ---------------------------------------------------------
        // LEVEL 3 & 4: Process Projects & Workspaces
        // ---------------------------------------------------------
        const workspaceNodes = workspaces.map(ws => {
            const wsId = String(ws._id);
            const wsPermissions = userPermissions.workspaces[wsId] || {};

            const wsProjects = projects
                .filter(p => String(p.workspace) === wsId)
                .map(p => {
                    const projId = String(p._id);
                    const projPermissions = userPermissions.projects[projId] || wsPermissions;
                    const projectTasks = tasksByProject[projId] || [];
                    const maxTaskActivity = projectTasks.length > 0
                        ? Math.max(...projectTasks.map(tk => tk.latestActivity))
                        : 0;
                    const projectFinalActivity = Math.max(getOwnActivityTime(p), maxTaskActivity);

                    return {
                        id: p._id,
                        type: "project",
                        name: p.name,
                        workspace: p.workspace,
                        description: p.description,
                        chatId: p.chatId?._id || p.chatId,
                        lastMessage: formatLastMessage(p.chatId),
                        status: p.status,
                        settings: p.settings || {},
                        isHighPriority: p.isHighPriority,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                        latestActivity: projectFinalActivity,
                        dueDate: p.dueDate,
                        tasks: projectTasks.sort((a, b) => b.latestActivity - a.latestActivity),
                        unreadCount: getUnread(p), // <-- Project Unread
                        permissions: {
                            canEdit: Boolean(projPermissions.canEdit),
                            canCreateTask: projPermissions.canCreateTask || false,
                            role: projPermissions.role || null,
                            isProjectAdmin: Boolean(projPermissions.isProjectAdmin),
                            inheritedFromWorkspace: Boolean(projPermissions.inheritedFromWorkspace)
                        }
                    };
                });

            const directWsTasks = tasksByWorkspace[wsId] || [];
            const maxProjectActivity = wsProjects.length > 0 ? Math.max(...wsProjects.map(p => p.latestActivity)) : 0;
            const maxDirectTaskActivity = directWsTasks.length > 0 ? Math.max(...directWsTasks.map(t => t.latestActivity)) : 0;
            const wsFinalActivity = Math.max(getOwnActivityTime(ws), maxProjectActivity, maxDirectTaskActivity);

            return {
                id: ws._id,
                type: "workspace",
                name: ws.name,
                description: ws.description,
                chatId: ws.chatId?._id || ws.chatId,
                lastMessage: formatLastMessage(ws.chatId),
                createdAt: ws.createdAt,
                updatedAt: ws.updatedAt,
                latestActivity: wsFinalActivity,
                projects: wsProjects.sort((a, b) => b.latestActivity - a.latestActivity),
                tasks: directWsTasks.sort((a, b) => b.latestActivity - a.latestActivity),
                unreadCount: getUnread(ws), // <-- Workspace Unread
                permissions: {
                    canCreateProject: wsPermissions.canCreateProject || false,
                    canCreateTask: wsPermissions.canCreateTask || false,
                    role: wsPermissions.role || null
                }
            };
        });

        // ---------------------------------------------------------
        // LEVEL 5: Process Chats (FILTERED)
        // ---------------------------------------------------------
        // Filter out any chat that is already linked to a Workspace/Project/Task/Subtask
        const chatNodes = chats
            .filter(chat => !linkedChatIds.has(String(chat._id))) // <--- DUPLICATE REMOVAL
            .map(chat => {
                let name = chat.name;
                let avatar = chat.avatar;

                if (chat.type === 'private') {
                    if (chat.members && chat.members.length === 2) {
                        const otherMember = chat.members.find(m => String(m._id) !== String(userId));
                        if (otherMember) {
                            name = otherMember.name;
                            avatar = otherMember.avatar;
                        }
                    }
                    if (!name) name = "Unknown User";
                }

                return {
                    id: chat._id,
                    type: "chat",
                    title: name,
                    description: buildMessagePreview(chat.lastMessage),
                    avatar: avatar,
                    chatType: chat.type,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                    latestActivity: getOwnActivityTime(chat),
                    unreadCount: getUnread(chat), // <-- Chat Unread
                    lastMessage: chat.lastMessage ? {
                        content: buildMessagePreview(chat.lastMessage),
                        createdAt: chat.lastMessage.createdAt,
                        type: chat.lastMessage.type,
                        sharedPost: chat.lastMessage.sharedPost || null,
                        sender: chat.lastMessage.senderId
                    } : null,
                    permissions: { canView: true, canEdit: false }
                };
            });

        // ---------------------------------------------------------
        // Final Merge & Sort
        // ---------------------------------------------------------
        globalTasks.sort((a, b) => b.latestActivity - a.latestActivity);

        const feed = [...workspaceNodes, ...globalTasks, ...chatNodes]
            .sort((a, b) => b.latestActivity - a.latestActivity);

        appCache.set(cacheKey, feed, OVERVIEW_CACHE_TTL_MS);

        return feed;
    },

    // Enrich timeline with aggregated counts and metadata
    // This moves the recursive tree traversal from frontend to backend
    // Expected performance improvement: 40-60ms per update
    enrichTimeline: (timeline, activeCallsByChatId = {}, mentionByChatId = {}, callInviteByChatId = {}) => {
        const getItemChatId = (item) => {
            if (item.type === "chat") return item.id;
            return item.chatId;
        };

        const recurse = (items) =>
            items.map((item) => {
                const nextItem = { ...item };
                let deepUnreadCount = 0;
                let deepMentionUnreadCount = 0;
                let deepCallInviteUnreadCount = 0;
                let deepActiveCallCount = 0;

                // Process nested projects
                if (nextItem.projects) {
                    nextItem.projects = recurse(nextItem.projects);
                    deepUnreadCount += nextItem.projects.reduce(
                        (acc, project) => acc + (project.unreadCount || 0) + (project.deepUnreadCount || 0),
                        0
                    );
                    deepMentionUnreadCount += nextItem.projects.reduce(
                        (acc, project) =>
                            acc + (project.mentionUnreadCount || 0) + (project.deepMentionUnreadCount || 0),
                        0
                    );
                    deepCallInviteUnreadCount += nextItem.projects.reduce(
                        (acc, project) =>
                            acc + (project.callInviteUnreadCount || 0) + (project.deepCallInviteUnreadCount || 0),
                        0
                    );
                    deepActiveCallCount += nextItem.projects.reduce(
                        (acc, project) =>
                            acc + (project.activeCallCount || 0) + (project.deepActiveCallCount || 0),
                        0
                    );
                }

                // Process nested tasks
                if (nextItem.tasks) {
                    nextItem.tasks = recurse(nextItem.tasks);
                    deepUnreadCount += nextItem.tasks.reduce(
                        (acc, task) => acc + (task.unreadCount || 0) + (task.deepUnreadCount || 0),
                        0
                    );
                    deepMentionUnreadCount += nextItem.tasks.reduce(
                        (acc, task) => acc + (task.mentionUnreadCount || 0) + (task.deepMentionUnreadCount || 0),
                        0
                    );
                    deepCallInviteUnreadCount += nextItem.tasks.reduce(
                        (acc, task) =>
                            acc + (task.callInviteUnreadCount || 0) + (task.deepCallInviteUnreadCount || 0),
                        0
                    );
                    deepActiveCallCount += nextItem.tasks.reduce(
                        (acc, task) => acc + (task.activeCallCount || 0) + (task.deepActiveCallCount || 0),
                        0
                    );
                }

                // Process nested subtasks
                if (nextItem.subtasks) {
                    nextItem.subtasks = recurse(nextItem.subtasks);
                    deepUnreadCount += nextItem.subtasks.reduce(
                        (acc, subtask) => acc + (subtask.unreadCount || 0) + (subtask.deepUnreadCount || 0),
                        0
                    );
                    deepMentionUnreadCount += nextItem.subtasks.reduce(
                        (acc, subtask) =>
                            acc + (subtask.mentionUnreadCount || 0) + (subtask.deepMentionUnreadCount || 0),
                        0
                    );
                    deepCallInviteUnreadCount += nextItem.subtasks.reduce(
                        (acc, subtask) =>
                            acc + (subtask.callInviteUnreadCount || 0) + (subtask.deepCallInviteUnreadCount || 0),
                        0
                    );
                    deepActiveCallCount += nextItem.subtasks.reduce(
                        (acc, subtask) =>
                            acc + (subtask.activeCallCount || 0) + (subtask.deepActiveCallCount || 0),
                        0
                    );
                }

                // Get metadata for this item
                const itemChatId = getItemChatId(nextItem);
                const mentionInfo = mentionByChatId[itemChatId] || null;
                const callInviteInfo = callInviteByChatId[itemChatId] || null;
                const ownActiveCall = nextItem.type === "chat" ? activeCallsByChatId[itemChatId] : null;

                // Set aggregated values
                nextItem.deepUnreadCount = deepUnreadCount;
                nextItem.hasChildUnread = deepUnreadCount > 0;
                nextItem.mentionUnreadCount = mentionInfo?.unreadMentionCount || 0;
                nextItem.nextMentionMessageId = mentionInfo?.nextMentionMessageId || null;
                nextItem.nextMentionCreatedAt = mentionInfo?.nextMentionCreatedAt || null;
                nextItem.nextMentionContent = mentionInfo?.nextMentionContent || "";
                nextItem.deepMentionUnreadCount = deepMentionUnreadCount;
                nextItem.hasChildMentionUnread = deepMentionUnreadCount > 0;
                nextItem.callInviteUnreadCount = callInviteInfo?.unreadCallInviteCount || 0;
                nextItem.nextCallInviteId = callInviteInfo?.nextCallInviteId || null;
                nextItem.deepCallInviteUnreadCount = deepCallInviteUnreadCount;
                nextItem.hasChildCallInviteUnread = deepCallInviteUnreadCount > 0;
                nextItem.activeCallCount = ownActiveCall ? 1 : 0;
                nextItem.deepActiveCallCount = deepActiveCallCount + (ownActiveCall ? 1 : 0);
                nextItem.hasChildActiveCall = nextItem.deepActiveCallCount > 0;
                nextItem.activeCall = ownActiveCall || null;

                return nextItem;
            });

        return recurse(timeline);
    }
};

module.exports = overviewService;
