const WorkspaceMember = require("../../models/workspaceMember");
const Workspace = require("../../models/workspace");
const Project = require("../../models/project");
const Task = require("../../models/tasks");
const Subtask = require("../../models/subtasks");

const overviewService = {
    activity: async (userId) => {
        const memberships = await WorkspaceMember
            .find({ user: userId })
            .select("workspace")
            .lean();

        const workspaceIds = memberships.map(m => m.workspace).filter(Boolean);

        const [workspaces, projects, tasks, subtasks] = await Promise.all([
            Workspace.find({ _id: { $in: workspaceIds } }).lean(),
            Project.find({ workspace: { $in: workspaceIds } }).lean(),
            Task.find({
                $or: [
                    { assignees: userId },
                    { createdBy: userId },
                    { workspace: { $in: workspaceIds } }
                ]
            }).lean(),
            Subtask.find({}).lean()
        ]);

        const subtasksByTask = subtasks.reduce((acc, st) => {
            const key = String(st.task);
            if (!acc[key]) acc[key] = [];
            acc[key].push({
                id: st._id,
                title: st.title,
                completed: st.completed
            });
            return acc;
        }, {});

        const tasksByProject = {};
        const tasksByWorkspace = {};
        const globalTasks = [];

        for (const t of tasks) {
            const taskObj = {
                id: t._id,
                type: "task",
                title: t.title,
                status: t.status,
                updatedAt: t.updatedAt,
                subtasks: subtasksByTask[String(t._id)] || []
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
            const wsProjects = projects
                .filter(p => String(p.workspace) === String(ws._id))
                .map(p => ({
                    id: p._id,
                    type: "project",
                    name: p.name,
                    updatedAt: p.updatedAt,
                    tasks: (tasksByProject[String(p._id)] || [])
                        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                }));

            return {
                id: ws._id,
                type: "workspace",
                name: ws.name,
                updatedAt: ws.updatedAt,
                projects: wsProjects,
                tasks: (tasksByWorkspace[String(ws._id)] || [])
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            };
        });

        // Final mixed activity feed
        const feed = [...workspaceNodes, ...globalTasks]
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        return feed;
    }
};

module.exports = overviewService;
