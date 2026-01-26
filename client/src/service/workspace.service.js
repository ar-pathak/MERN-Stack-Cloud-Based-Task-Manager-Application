// services/workspace.service.js
import api from "../config/axios";

/**
 * Workspace Service
 * Handles all workspace-related API calls
 */

export const getAllWorkspaces = async () => {
    try {
        const response = await api.get("/api/workspace/getAllWorkspaces");
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch workspaces",
            status: error.response?.status,
        };
    }
};

export const getWorkspaceById = async (workspaceId) => {
    try {
        const response = await api.get(`/api/workspace/getWorkspaces/${workspaceId}`);
        return response.data?.data || response.data || null;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch workspace",
            status: error.response?.status,
        };
    }
};

export const createWorkspace = async (workspaceData) => {
    try {
        const response = await api.post("/api/workspace/createWorkspaces", workspaceData);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create workspace",
            status: error.response?.status,
        };
    }
};

export const updateWorkspace = async (workspaceId, workspaceData) => {
    try {
        const response = await api.patch(`/api/workspace/updateWorkspace/${workspaceId}`, workspaceData);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update workspace",
            status: error.response?.status,
        };
    }
};

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

// Member Management
export const getWorkspaceMembers = async (workspaceId) => {
    try {
        const response = await api.get(`/api/workspace/${workspaceId}/members`);
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch members",
            status: error.response?.status,
        };
    }
};

export const addWorkspaceMember = async ( workspaceId,memberData) => {
    try {
        const response = await api.post(`/api/workspace/${workspaceId}/members`, {
           memberData
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add member",
            status: error.response?.status,
        };
    }
};

export const removeMember = async ({ workspaceId, memberId }) => {
    try {
        const response = await api.delete(`/api/workspace/${workspaceId}/members/${memberId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove member",
            status: error.response?.status,
        };
    }
};

export const updateMemberRole = async ({ workspaceId, memberId, role }) => {
    try {
        const response = await api.patch(`/api/workspace/${workspaceId}/members/${memberId}/role`, {
            role
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update member role",
            status: error.response?.status,
        };
    }
};

// Invite Management
export const sendWorkspaceInvite = async ({ workspaceId, email, role, invitedBy }) => {
    try {
        const response = await api.post(`/api/workspace/${workspaceId}/invites`, {
            email,
            role
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to send invite",
            status: error.response?.status,
        };
    }
};

export const acceptWorkspaceInvite = async (token) => {
    try {
        const response = await api.post(`/api/workspace/invites/accept/${token}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to accept invite",
            status: error.response?.status,
        };
    }
};

// Workspace Settings
export const leaveWorkspace = async (workspaceId) => {
    try {
        const response = await api.post(`/api/workspace/${workspaceId}/leave`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to leave workspace",
            status: error.response?.status,
        };
    }
};

export const transferOwnership = async ({ workspaceId, newOwnerId }) => {
    try {
        const response = await api.post(`/api/workspace/${workspaceId}/transfer-ownership`, {
            newOwnerId
        });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to transfer ownership",
            status: error.response?.status,
        };
    }
};

// Quick Actions (Star, Mute, Archive)
export const getQuickStatus = async (workspaceId) => {
    try {
        const response = await api.get(`/api/workspace/${workspaceId}/quick-status`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch quick status",
            status: error.response?.status,
        };
    }
};

export const toggleStarWorkspace = async (workspaceId) => {
    try {
        const response = await api.patch(`/api/workspace/${workspaceId}/star`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to toggle star",
            status: error.response?.status,
        };
    }
};

export const toggleMuteWorkspace = async (workspaceId) => {
    try {
        const response = await api.patch(`/api/workspace/${workspaceId}/mute`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to toggle mute",
            status: error.response?.status,
        };
    }
};

export const toggleArchiveWorkspace = async (workspaceId) => {
    try {
        const response = await api.patch(`/api/workspace/${workspaceId}/archive`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to toggle archive",
            status: error.response?.status,
        };
    }
};
