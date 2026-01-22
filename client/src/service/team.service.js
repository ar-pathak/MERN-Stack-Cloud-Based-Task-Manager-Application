// services/team.service.js
import api from "../config/axios";

/**
 * Team Service
 * Handles all team-related API calls
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

// NEW: Get team members
export const getTeamMembers = async (workspaceId, teamId) => {
    try {
        const response = await api.get(`/api/teams/workspaces/${workspaceId}/team/${teamId}/members`);
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch team members",
            status: error.response?.status,
        };
    }
};

// NEW: Add team member
export const addTeamMember = async (workspaceId, teamId, { memberId, role = "member" }) => {
    try {
        const response = await api.post(`/api/teams/workspaces/${workspaceId}/team/${teamId}/members`, {
            memberId,
            role
        });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add team member",
            status: error.response?.status,
        };
    }
};

// NEW: Remove team member
export const removeTeamMember = async (workspaceId, teamId, memberId) => {
    try {
        const response = await api.delete(`/api/teams/workspaces/${workspaceId}/team/${teamId}/members/${memberId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove team member",
            status: error.response?.status,
        };
    }
};

// NEW: Update team member role
export const updateTeamMemberRole = async (workspaceId, teamId, memberId, role) => {
    try {
        const response = await api.patch(`/api/teams/workspaces/${workspaceId}/team/${teamId}/members/${memberId}/role`, {
            role
        });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update member role",
            status: error.response?.status,
        };
    }
};