// services/workspace.service.js
import api from "../config/axios";

/**
 * Workspace Service
 * Handles all workspace-related API calls
 */

/**
 * Get all workspaces for the current user
 * @returns {Promise<Object>} Workspaces data
 */
export const getAllWorkspaces = async () => {
    try {
        const response = await api.get("/api/workspace/getAllWorkspaces");
        // Backend uses sendSuccess which returns { success: true, data: [...], message: ... }
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch workspaces",
            status: error.response?.status,
        };
    }
};

/**
 * Get workspace by ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Object>} Workspace data
 */
export const getWorkspaceById = async (workspaceId) => {
    try {
        const response = await api.get(`/api/workspace/getWorkspaces/${workspaceId}`);
        // Backend uses sendSuccess which returns { success: true, data: {...}, message: ... }
        return response.data?.data || response.data || null;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch workspace",
            status: error.response?.status,
        };
    }
};

/**
 * Create a new workspace
 * @param {Object} workspaceData - Workspace data
 * @returns {Promise<Object>} Created workspace
 */
export const createWorkspace = async (workspaceData) => {
    try {
        const response = await api.post("/api/workspace/createWorkspaces", workspaceData);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create workspace",
            status: error.response?.status,
        };
    }
};

/**
 * Update workspace
 * @param {string} workspaceId - Workspace ID
 * @param {Object} workspaceData - Updated workspace data
 * @returns {Promise<Object>} Updated workspace
 */
export const updateWorkspace = async (workspaceId, workspaceData) => {
    try {
        const response = await api.patch(`/api/workspace/updateWorkspace/${workspaceId}`, workspaceData);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update workspace",
            status: error.response?.status,
        };
    }
};

/**
 * Delete workspace
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteWorkspace = async (workspaceId) => {
    try {
        const response = await api.delete(`/api/workspace/deleteWorkspace/${workspaceId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete workspace",
            status: error.response?.status,
        };
    }
};

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

