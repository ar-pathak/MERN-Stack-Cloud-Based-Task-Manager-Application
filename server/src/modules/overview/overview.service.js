const WorkspaceMember = require('../../models/workspaceMember')
const Task = require('../../models/tasks')

const overviewService = {
    activity: async (userId) => {
        const memberships = await WorkspaceMember
            .find({ user: userId })
            .populate("workspace", "name updatedAt")
            .lean();

        const workspaces = memberships
            .filter(m => m.workspace)
            .map(m => ({
                type: "workspace",
                id: m.workspace._id,
                title: m.workspace.name,
                updatedAt: m.workspace.updatedAt
            }));

        const workspaceIds = memberships
            .filter(m => m.workspace)
            .map(m => m.workspace._id);


        const tasks = await Task.find({
            $or: [
                { assignees: userId },
                { createdBy: userId },
                { workspace: { $in: workspaceIds } }
            ]
        })
            .select("title workspace project updatedAt status")
            .lean();

        const taskActivities = tasks.map(t => ({
            type: "task",
            id: t._id,
            title: t.title,
            workspace: t.workspace,
            project: t.project,
            status: t.status,
            updatedAt: t.updatedAt
        }));

        // 3. Merge + sort (WhatsApp logic)
        const activities = [...workspaces, ...taskActivities];

        activities.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        return activities;
    }
};

module.exports = overviewService;
