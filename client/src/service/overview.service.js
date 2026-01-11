import api from "../config/axios";

/**
 * Get overview data for a workspace
 * Aggregates workspace details, projects and tasks into a single payload
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Object>} Overview data { workspace, projects, tasks, stats }
 */
export const getOverview = async (workspaceId) => {
    try {
        const [workspaceRes, projectsRes, tasksRes] = await Promise.all([
            api.get(`/api/workspace/getWorkspaces/${workspaceId}`),
            api.get(`/api/projects/workspaces/${workspaceId}/projects`),
            api.get(`/api/tasks/workspaces/${workspaceId}/tasks`),
        ]);

        const workspace = workspaceRes.data?.data || workspaceRes.data || null;
        const projects = projectsRes.data?.data || projectsRes.data || [];
        const tasks = tasksRes.data?.data || tasksRes.data || [];

        const stats = {
            projectsCount: Array.isArray(projects) ? projects.length : 0,
            totalTasks: Array.isArray(tasks) ? tasks.length : 0,
            completedTasks: Array.isArray(tasks) ? tasks.filter(t => t.status === 'Done' || t.status === 'completed').length : 0,
            highPriorityTasks: Array.isArray(tasks) ? tasks.filter(t => (t.priority || '').toLowerCase() === 'high').length : 0,
            membersCount: Array.isArray(workspace?.members) ? workspace.members.length : 0,
        };

        return { workspace, projects, tasks, stats };
    } catch (error) {
        throw {
            message: error.response?.data?.message || 'Failed to fetch overview data',
            status: error.response?.status,
        };
    }
};

