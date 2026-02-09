// modules/overview/overview.service.js
const Workspace = require("../../models/workspace");
const Project = require("../../models/project");
const Task = require("../../models/tasks");
const Subtask = require("../../models/subtasks");
const Chat = require("../../models/chat");
const Message = require("../../models/message");
const permissionService = require("./permission.service");
const WorkspaceMember = require("../../models/workspaceMember");

const overviewService = {
    activity: async (userId) => {
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
                select: 'content senderId createdAt type',
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
                    select: 'content senderId createdAt type',
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
                content: msg.content,
                createdAt: msg.createdAt,
                type: msg.type,
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
            let taskPermissions = userPermissions.tasks[taskId] || {};
            let canEditTask = false;

            if (taskPermissions.role === 'creator' || taskPermissions.role === 'assignee') canEditTask = true;

            // Inheritance Logic
            if (t.project && !taskPermissions.role) {
                const projId = String(t.project);
                const projPermissions = userPermissions.projects[projId];
                if (projPermissions) {
                    taskPermissions = { canCreateSubtask: projPermissions.canCreateTask || false, role: projPermissions.role || null };
                    if (['owner', 'admin', 'editor'].includes(projPermissions.role)) canEditTask = true;
                }
            }
            if (t.workspace && !taskPermissions.role) {
                const wsId = String(t.workspace);
                const wsPermissions = userPermissions.workspaces[wsId];
                if (wsPermissions) {
                    taskPermissions = { canCreateSubtask: wsPermissions.canCreateTask || false, role: wsPermissions.role || null };
                    if (['owner', 'admin'].includes(wsPermissions.role)) canEditTask = true;
                }
            }

            const rawSubtasks = subtasksByTask[taskId] || [];
            const maxSubtaskActivity = rawSubtasks.length > 0
                ? Math.max(...rawSubtasks.map(s => s.latestActivity))
                : 0;

            const processedSubtasks = rawSubtasks.map(st => {
                const isSubtaskCreator = String(st.createdBy) === String(userId);
                const hasEditAccess = isSubtaskCreator || canEditTask;
                return { ...st, permissions: { canEdit: hasEditAccess, canDelete: hasEditAccess } };
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
                    role: taskPermissions.role || null
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
                        isHighPriority: p.isHighPriority,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                        latestActivity: projectFinalActivity,
                        dueDate: p.dueDate,
                        tasks: projectTasks.sort((a, b) => b.latestActivity - a.latestActivity),
                        unreadCount: getUnread(p), // <-- Project Unread
                        permissions: {
                            canCreateTask: projPermissions.canCreateTask || false,
                            role: projPermissions.role || null
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
                    description: chat.lastMessage?.content || "Sent an attachment",
                    avatar: avatar,
                    chatType: chat.type,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                    latestActivity: getOwnActivityTime(chat),
                    unreadCount: getUnread(chat), // <-- Chat Unread
                    lastMessage: chat.lastMessage ? {
                        content: chat.lastMessage.content,
                        createdAt: chat.lastMessage.createdAt,
                        type: chat.lastMessage.type,
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

        return feed;
    }
};

module.exports = overviewService;