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
