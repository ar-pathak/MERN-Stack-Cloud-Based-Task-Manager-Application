import api from "../config/axios";

const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

const resolveProjectArgs = (workspaceIdOrProjectId, maybeProjectId) => ({
    workspaceId: maybeProjectId ? workspaceIdOrProjectId : null,
    projectId: maybeProjectId || workspaceIdOrProjectId
});

export const getProjectsByWorkspace = async (workspaceId) => {
    try {
        const response = await api.get(`/api/projects/workspaces/${workspaceId}/projects`);
        return unwrap(response) || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch projects",
            status: error.response?.status,
        };
    }
};

export const getProjectById = async (workspaceIdOrProjectId, maybeProjectId) => {
    try {
        const { projectId } = resolveProjectArgs(workspaceIdOrProjectId, maybeProjectId);
        const response = await api.get(`/api/projects/${projectId}`);
        return unwrap(response);
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
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create project",
            status: error.response?.status,
        };
    }
};

export const updateProject = async (workspaceId, projectId, projectData) => {
    try {
        const response = await api.patch(
            `/api/projects/workspaces/${workspaceId}/projects/${projectId}`,
            projectData
        );
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update project",
            status: error.response?.status,
        };
    }
};

export const deleteProject = async (workspaceIdOrProjectId, maybeProjectId) => {
    try {
        let { workspaceId, projectId } = resolveProjectArgs(workspaceIdOrProjectId, maybeProjectId);

        if (!workspaceId) {
            const project = await getProjectById(projectId);
            workspaceId = project?.workspace?._id || project?.workspace;
        }

        if (!workspaceId) {
            throw new Error("Workspace ID required for project deletion");
        }

        const response = await api.delete(`/api/projects/workspaces/${workspaceId}/projects/${projectId}`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || error.message || "Failed to delete project",
            status: error.response?.status,
        };
    }
};

export const getProjectTeams = async (workspaceId, projectId) => {
    try {
        const response = await api.get(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/teams`);
        return unwrap(response) || [];
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
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add teams to project",
            status: error.response?.status,
        };
    }
};

export const removeProjectTeams = async (workspaceId, projectId, teams) => {
    try {
        const teamArray = Array.isArray(teams) ? teams : [teams];
        const response = await api.delete(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/teams`, {
            data: { teams: teamArray }
        });
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove teams from project",
            status: error.response?.status,
        };
    }
};

export const getProjectMembers = async (workspaceId, projectId) => {
    try {
        const response = await api.get(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/members`);
        return unwrap(response) || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch project members",
            status: error.response?.status,
        };
    }
};

export const addProjectMembers = async (workspaceId, projectId, data) => {
    try {
        const response = await api.patch(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/members`, data);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add members to project",
            status: error.response?.status,
        };
    }
};

export const removeProjectMembers = async (workspaceId, projectId, data) => {
    try {
        const response = await api.delete(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/members`, {
            data
        });
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove members from project",
            status: error.response?.status,
        };
    }
};

export const updateProjectMemberRole = async (workspaceId, projectId, memberId, role) => {
    try {
        const response = await api.patch(
            `/api/projects/workspaces/${workspaceId}/projects/${projectId}/members/${memberId}`,
            { role }
        );
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update member role",
            status: error.response?.status,
        };
    }
};

export const leaveProject = async (workspaceId, projectId) => {
    try {
        const response = await api.post(`/api/projects/workspaces/${workspaceId}/projects/${projectId}/leave`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to leave project",
            status: error.response?.status,
        };
    }
};

export const requestProjectStatusChange = async (workspaceId, projectId, data) => {
    try {
        const response = await api.post(
            `/api/projects/workspaces/${workspaceId}/projects/${projectId}/status-requests`,
            data
        );
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to request project status change",
            status: error.response?.status,
        };
    }
};

export const respondProjectStatusChangeRequest = async (
    workspaceId,
    projectId,
    requestId,
    action
) => {
    try {
        const response = await api.post(
            `/api/projects/workspaces/${workspaceId}/projects/${projectId}/status-requests/${requestId}/respond`,
            { action }
        );
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to respond to project status request",
            status: error.response?.status,
        };
    }
};
