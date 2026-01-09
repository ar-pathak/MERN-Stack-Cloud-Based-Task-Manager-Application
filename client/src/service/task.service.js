// services/task.service.js
import api from "../config/axios";

/**
 * Task Service
 * Handles all task-related API calls
 */

/**
 * Get tasks by workspace
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Object>} Tasks data
 */
export const getTasksByWorkspace = async (workspaceId) => {
    try {
        const response = await api.get(`/api/tasks/workspaces/${workspaceId}/tasks`);
        return response.data?.data || response.data || [];
    } catch (error) {
        // If endpoint doesn't exist (404), return empty array
        if (error.response?.status === 404) {
            return [];
        }
        throw {
            message: error.response?.data?.message || "Failed to fetch tasks",
            status: error.response?.status,
        };
    }
};

/**
 * Get tasks by project
 * @param {string} workspaceId - Workspace ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Tasks data
 */
export const getTasksByProject = async (workspaceId, projectId) => {
    try {
        const response = await api.get(`/api/tasks/workspaces/${workspaceId}/projects/${projectId}/tasks`);
        return response.data?.data || response.data || [];
    } catch (error) {
        // If endpoint doesn't exist (404), return empty array
        if (error.response?.status === 404) {
            return [];
        }
        throw {
            message: error.response?.data?.message || "Failed to fetch tasks",
            status: error.response?.status,
        };
    }
};

/**
 * Get task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Task data
 */
export const getTaskById = async (taskId) => {
    try {
        const response = await api.get(`/api/tasks/${taskId}`);
        return response.data?.data || response.data || null;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch task",
            status: error.response?.status,
        };
    }
};

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @param {string} taskData.title - Task title
 * @param {string} taskData.description - Task description (optional)
 * @param {string} taskData.priority - Task priority (optional)
 * @param {string} taskData.projectId - Project ID (optional)
 * @param {string} taskData.workspaceId - Workspace ID (optional)
 * @returns {Promise<Object>} Created task data
 */
export const createTask = async (taskData) => {
    try {
        const response = await api.post(`/api/tasks/createTasksAtGlobalLevel`, taskData);
        return response.data?.data || response.data || null;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create task",
            status: error.response?.status,
        };
    }
};
