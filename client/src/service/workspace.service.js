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
        return response.data;
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
        return response.data;
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

// NEW: Send workspace invite
export const sendWorkspaceInvite = async ({ workspaceId, email, role, invitedBy }) => {
    try {
        const response = await api.post(`/api/workspace/${workspaceId}/invite`, {
            email,
            role,
            invitedBy
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to send invite",
            status: error.response?.status,
        };
    }
};

// NEW: Accept workspace invite
export const acceptWorkspaceInvite = async (token, userId) => {
    try {
        const response = await api.post(`/api/workspace/invite/accept`, {
            token,
            userId
        });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to accept invite",
            status: error.response?.status,
        };
    }
};

// NEW: Update member role
export const updateMemberRole = async ({ workspaceId, memberId, role }) => {
    try {
        const response = await api.patch(`/api/workspace/${workspaceId}/members/${memberId}/role`, {
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

// NEW: Remove member from workspace
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

// NEW: Add member to workspace
export const addWorkspaceMember = async ({ workspaceId, userId, role = "member" }) => {
    try {
        const response = await api.post(`/api/workspace/${workspaceId}/members`, {
            userId,
            role
        });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add member",
            status: error.response?.status,
        };
    }
};