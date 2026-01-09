// services/team.service.js
import api from "../config/axios";

/**
 * Team Service
 * Handles all team-related API calls
 */

/**
 * Create a new team in a workspace
 * @param {string} workspaceId - Workspace ID
 * @param {Object} teamData - Team data { name, description }
 * @returns {Promise<Object>} Created team
 */
export const createTeam = async (workspaceId, teamData) => {
    try {
        const response = await api.post(`/api/teams/workspaces/${workspaceId}/teams`, teamData);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create team",
            status: error.response?.status,
        };
    }
};

/**
 * Get all teams in a workspace
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Array>} Teams data
 */
export const getTeamsByWorkspace = async (workspaceId) => {
    try {
        const response = await api.get(`/api/teams/workspaces/${workspaceId}/teams`);
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch teams",
            status: error.response?.status,
        };
    }
};

/**
 * Get team by ID
 * @param {string} workspaceId - Workspace ID
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Team data
 */
export const getTeamById = async (workspaceId, teamId) => {
    try {
        const response = await api.get(`/api/teams/workspaces/${workspaceId}/team/${teamId}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch team",
            status: error.response?.status,
        };
    }
};

/**
 * Update team
 * @param {string} workspaceId - Workspace ID
 * @param {string} teamId - Team ID
 * @param {Object} teamData - Updated team data
 * @returns {Promise<Object>} Updated team
 */
export const updateTeam = async (workspaceId, teamId, teamData) => {
    try {
        const response = await api.patch(`/api/teams/workspaces/${workspaceId}/team/${teamId}`, teamData);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update team",
            status: error.response?.status,
        };
    }
};

/**
 * Delete team
 * @param {string} workspaceId - Workspace ID
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteTeam = async (workspaceId, teamId) => {
    try {
        const response = await api.delete(`/api/teams/workspaces/${workspaceId}/team/${teamId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete team",
            status: error.response?.status,
        };
    }
};
