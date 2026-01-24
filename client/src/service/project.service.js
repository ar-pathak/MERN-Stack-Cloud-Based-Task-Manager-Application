// services/project.service.js
import api from "../config/axios";



export const getProjectsByWorkspace = async (workspaceId) => {
    try {
        const response = await api.get(`/api/projects/workspaces/${workspaceId}/projects`);
        return response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch projects",
            status: error.response?.status,
        };
    }
};

export const getProjectById = async (projectId) => {
    try {
        const response = await api.get(`/api/projects/${projectId}`);
        return response.data || null;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch project",
            status: error.response?.status,
        };
    }
};

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

export const deleteProject = async (projectId) => {
    try {
        // Extract workspaceId from project if needed, or fetch it first
        const project = await api.get(`/api/projects/${projectId}`).catch(() => null);
        const workspaceId = project?.data?.workspace;

        if (!workspaceId) {
            throw new Error("Workspace ID required for project deletion");
        }

        const response = await api.delete(`/api/projects/workspaces/${workspaceId}/projects/${projectId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete project",
            status: error.response?.status,
        };
    }
};

// Project Teams Management
export const getProjectTeams = async (workspaceId, projectId) => {
    try {
        const response = await api.get(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/teams`);
        return response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch project teams",
            status: error.response?.status,
        };
    }
};

export const addProjectTeams = async (workspaceId, projectId, teams) => {
    try {
        const response = await api.patch(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/teams`, {
            teams
        });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add teams to project",
            status: error.response?.status,
        };
    }
};

export const removeProjectTeams = async (workspaceId, projectId, teams) => {
    try {
        const response = await api.delete(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/teams`, {
            data: { teams }
        });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove teams from project",
            status: error.response?.status,
        };
    }
};

// Project Members Management
export const getProjectMembers = async (workspaceId, projectId) => {
    try {
        const response = await api.get(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/members`);
        return response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch project members",
            status: error.response?.status,
        };
    }
};

export const addProjectMembers = async (workspaceId, projectId, members) => {
    try {
        const response = await api.patch(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/members`, {
            members
        });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add members to project",
            status: error.response?.status,
        };
    }
};

export const removeProjectMembers = async (workspaceId, projectId, users) => {
    try {
        const response = await api.delete(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/members`, {
            data: { users }
        });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove members from project",
            status: error.response?.status,
        };
    }
};