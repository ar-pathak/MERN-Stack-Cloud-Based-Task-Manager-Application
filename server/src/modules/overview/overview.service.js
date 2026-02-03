const Workspace = require("../../models/workspace");
const Project = require("../../models/project");
const Task = require("../../models/tasks");
const Subtask = require("../../models/subtasks");
const permissionService = require("./permission.service");
const WorkspaceMember = require("../../models/workspaceMember");

const overviewService = {
    activity: async (userId) => {
        // Get user's permissions
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

        const [workspaces, projects, tasks, subtasks] = await Promise.all([
            Workspace.find({ _id: { $in: allWorkspaceIds } }).lean(),
            Project.find({
                $or: [
                    { workspace: { $in: allWorkspaceIds } },
                    { owner: userId },
                    { 'members.user': userId }
                ]
            }).lean(),
            Task.find({
                $or: [
                    { assignees: userId },
                    { createdBy: userId },
                    { workspace: { $in: allWorkspaceIds } }
                ]
            }).lean(),
            Subtask.find({}).lean()
        ]);

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
                completed: st.completed, // Note: Duplicated key in original, keeping structure
                dueDate: st.dueDate,
                createdBy: st.createdBy // Added createdBy for permission check
            });
            return acc;
        }, {});

        const tasksByProject = {};
        const tasksByWorkspace = {};
        const globalTasks = [];

        for (const t of tasks) {
            const taskId = String(t._id);

            // Get permissions with fallback chain: task -> project -> workspace
            let taskPermissions = userPermissions.tasks[taskId] || {};
            let canEditTask = false;

            // 1. Check Task Level Permissions
            if (taskPermissions.role === 'creator' || taskPermissions.role === 'assignee') {
                canEditTask = true;
            }

            // 2. If task has a project, inherit project permissions
            if (t.project && !taskPermissions.role) {
                const projId = String(t.project);
                const projPermissions = userPermissions.projects[projId];
                if (projPermissions) {
                    taskPermissions = {
                        canCreateSubtask: projPermissions.canCreateTask || false,
                        role: projPermissions.role || null
                    };
                    // Project Owners, Admins, and Editors can usually edit tasks
                    if (['owner', 'admin', 'editor'].includes(projPermissions.role)) {
                        canEditTask = true;
                    }
                }
            }

            // 3. If task has a workspace (and no project permissions), inherit workspace permissions
            if (t.workspace && !taskPermissions.role) {
                const wsId = String(t.workspace);
                const wsPermissions = userPermissions.workspaces[wsId];
                if (wsPermissions) {
                    taskPermissions = {
                        canCreateSubtask: wsPermissions.canCreateTask || false,
                        role: wsPermissions.role || null
                    };
                    // Workspace Owners and Admins can edit tasks
                    if (['owner', 'admin'].includes(wsPermissions.role)) {
                        canEditTask = true;
                    }
                }
            }

            // 4. Process Subtasks with Permissions
            const rawSubtasks = subtasksByTask[taskId] || [];
            const processedSubtasks = rawSubtasks.map(st => {
                const isSubtaskCreator = String(st.createdBy) === String(userId);
                // User can edit subtask if they created it OR they have edit rights on the parent task
                const hasEditAccess = isSubtaskCreator || canEditTask;

                return {
                    ...st,
                    permissions: {
                        canEdit: hasEditAccess,
                        canDelete: hasEditAccess
                    }
                };
            });

            const taskObj = {
                id: t._id,
                type: "task",
                title: t.title,
                chatId: t.chatId,
                description: t.description,
                status: t.status,
                isHighPriority: t.isHighPriority,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                dueDate: t.dueDate,
                subtasks: processedSubtasks, // Updated to use processed subtasks
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

        const workspaceNodes = workspaces.map(ws => {
            const wsId = String(ws._id);
            const wsPermissions = userPermissions.workspaces[wsId] || {};

            const wsProjects = projects
                .filter(p => String(p.workspace) === wsId)
                .map(p => {
                    const projId = String(p._id);
                    // Get project permissions, fallback to workspace permissions
                    const projPermissions = userPermissions.projects[projId] || wsPermissions;

                    return {
                        id: p._id,
                        type: "project",
                        name: p.name,
                        workspace: p.workspace,
                        description: p.description,
                        chatId: p.chatId,
                        status: p.status,
                        isHighPriority: p.isHighPriority,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                        dueDate: p.dueDate,
                        tasks: (tasksByProject[projId] || [])
                            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
                        permissions: {
                            canCreateTask: projPermissions.canCreateTask || false,
                            role: projPermissions.role || null
                        }
                    };
                });

            return {
                id: ws._id,
                type: "workspace",
                name: ws.name,
                description: ws.description,
                chatId: ws.chatId,
                createdAt: ws.createdAt,
                updatedAt: ws.updatedAt,
                projects: wsProjects,
                tasks: (tasksByWorkspace[wsId] || [])
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
                permissions: {
                    canCreateProject: wsPermissions.canCreateProject || false,
                    canCreateTask: wsPermissions.canCreateTask || false,
                    role: wsPermissions.role || null
                }
            };
        });

        const feed = [...workspaceNodes, ...globalTasks]
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        return feed;
    }
};

module.exports = overviewService;