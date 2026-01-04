// services/project.service.js
import api from "../config/axios";

/**
 * Project Service
 * Handles all project-related API calls
 */

/**
 * Get all projects for a workspace
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Object>} Projects data
 */
export const getProjectsByWorkspace = async (workspaceId) => {
    try {
        const response = await api.get(`/api/projects/workspaces/${workspaceId}/projects`);
        // Backend returns data directly (not wrapped in sendSuccess)
        return response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch projects",
            status: error.response?.status,
        };
    }
};

/**
 * Get project by ID
 * @param {string} workspaceId - Workspace ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project data
 */
export const getProjectById = async (workspaceId, projectId) => {
    try {
        const response = await api.get(`/api/projects/workspaces/${workspaceId}/projects/${projectId}`);
        // Backend returns data directly
        return response.data || null;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch project",
            status: error.response?.status,
        };
    }
};

/**
 * Create a new project
 * @param {string} workspaceId - Workspace ID
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project
 */
export const createProject = async (workspaceId, projectData) => {
    try {
        const response = await api.post(`/api/projects/workspaces/${workspaceId}/projects`, projectData);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create project",
            status: error.response?.status,
        };
    }
};

/**
 * Update project
 * @param {string} workspaceId - Workspace ID
 * @param {string} projectId - Project ID
 * @param {Object} projectData - Updated project data
 * @returns {Promise<Object>} Updated project
 */
export const updateProject = async (workspaceId, projectId, projectData) => {
    try {
        const response = await api.patch(`/api/projects/workspaces/${workspaceId}/projects/${projectId}`, projectData);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update project",
            status: error.response?.status,
        };
    }
};

/**
 * Delete project
 * @param {string} workspaceId - Workspace ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteProject = async (workspaceId, projectId) => {
    try {
        const response = await api.delete(`/api/projects/workspaces/${workspaceId}/projects/${projectId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete project",
            status: error.response?.status,
        };
    }
};

