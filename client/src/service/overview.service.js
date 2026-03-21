import api from "../config/axios";

const unwrap = (res, fallback) =>
    res?.data?.data ?? res?.data ?? fallback;

const normalize = (v) => (v || "").toString().toLowerCase();

export const getOverview = async (workspaceId) => {
    try {
        const [workspaceRes, projectsRes, tasksRes] = await Promise.all([
            api.get(`/api/workspace/getWorkspaces/${workspaceId}`),
            api.get(`/api/projects/workspaces/${workspaceId}/projects`),
            api.get(`/api/tasks/workspaces/${workspaceId}/tasks`),
        ]);

        const workspace = unwrap(workspaceRes, null);
        const projects = unwrap(projectsRes, []);
        const tasks = unwrap(tasksRes, []);

        const completedTasks = Array.isArray(tasks)
            ? tasks.filter(t =>
                ["done", "completed"].includes(normalize(t.status))
            ).length
            : 0;

        const highPriorityTasks = Array.isArray(tasks)
            ? tasks.filter(t =>
                normalize(t.priority) === "high" || t.isHighPriority === true
            ).length
            : 0;

        const stats = {
            projectsCount: Array.isArray(projects) ? projects.length : 0,
            totalTasks: Array.isArray(tasks) ? tasks.length : 0,
            completedTasks,
            highPriorityTasks,
            membersCount: Array.isArray(workspace?.members)
                ? workspace.members.length
                : 0,
        };

        return {
            workspace,
            projects: Array.isArray(projects) ? projects : [],
            tasks: Array.isArray(tasks) ? tasks : [],
            stats,
        };
    } catch (error) {
        throw {
            message:
                error.response?.data?.message ||
                "Failed to fetch overview data",
            status: error.response?.status || 500,
        };
    }
};

export const getOverviewActivity = async () => {
    const response = await api.get("/api/overview/activity");

    const items = response.data?.data || response.data || [];

    return items.map(item => ({
        ...item,
        id: item.id || item._id,
        name: item.title || item.name,
        type: item.type,
        updatedAt: item.updatedAt
    }));
};

// Enrich timeline with aggregated counts (moved from frontend)
export const enrichTimeline = async (timeline, activeCallsByChatId, mentionByChatId, callInviteByChatId) => {
    try {
        const response = await api.post('/api/overview/enrich-timeline', {
            timeline,
            activeCallsByChatId,
            mentionByChatId,
            callInviteByChatId
        });
        return response.data.data.timeline;
    } catch (error) {
        console.error('Failed to enrich timeline:', error);
        // Fallback to original frontend logic if backend fails
        return timeline;
    }
};
