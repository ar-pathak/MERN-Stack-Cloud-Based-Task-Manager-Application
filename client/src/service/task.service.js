import api from "../config/axios";

const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

export const createGlobalTask = async (taskData) => {
    try {
        const response = await api.post(`/api/tasks/createTasksAtGlobalLevel`, taskData);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create global task",
            status: error.response?.status,
        };
    }
};

export const createWorkspaceTask = async (workspaceId, taskData) => {
    try {
        const response = await api.post(
            `/api/tasks/workspace/${workspaceId}/createTasksAtWorkspaceLevel`,
            taskData
        );
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create workspace task",
            status: error.response?.status,
        };
    }
};

export const createProjectTask = async (workspaceId, projectId, taskData) => {
    try {
        const response = await api.post(
            `/api/tasks/workspace/${workspaceId}/project/${projectId}/createTasksAtProjectLevel`,
            taskData
        );
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create project task",
            status: error.response?.status,
        };
    }
};

export const getTaskById = async (taskId) => {
    try {
        const response = await api.get(`/api/tasks/${taskId}`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch task",
            status: error.response?.status,
        };
    }
};

export const updateTask = async (taskId, taskData) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/update`, taskData);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update task",
            status: error.response?.status,
        };
    }
};

export const updateTaskStatus = async (taskId, status) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/status`, { status });
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update status",
            status: error.response?.status,
        };
    }
};

export const deleteTask = async (taskId) => {
    try {
        const response = await api.delete(`/api/tasks/${taskId}/softDelete`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete task",
            status: error.response?.status,
        };
    }
};

export const hardDeleteTask = async (taskId) => {
    try {
        const response = await api.delete(`/api/tasks/${taskId}/permanentDelete`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to permanently delete task",
            status: error.response?.status,
        };
    }
};

export const restoreTask = async (taskId) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/restore`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to restore task",
            status: error.response?.status,
        };
    }
};

export const toggleTaskCompletion = async (taskId) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/toggle`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to toggle task completion",
            status: error.response?.status,
        };
    }
};

export const assignUsersToTask = async (taskId, assignees) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/assignees/add`, { assignees });
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to assign users",
            status: error.response?.status,
        };
    }
};

export const assignTeamsToTask = async (taskId, assigneesTeams) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/assignees/add`, { assigneesTeams });
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to assign teams",
            status: error.response?.status,
        };
    }
};

export const assignUsersToTaskByUsername = async (taskId, usernames) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/assignees/add`, { usernames });
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to assign users",
            status: error.response?.status,
        };
    }
};

export const removeAssignUsersFromTask = async (taskId, assignees) => {
    try {
        const response = await api.delete(`/api/tasks/${taskId}/assignees/remove`, {
            data: { assignees }
        });
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove assignees",
            status: error.response?.status,
        };
    }
};

export const removeAssignTeamsFromTask = async (taskId, assigneesTeams) => {
    try {
        const teamsArray = Array.isArray(assigneesTeams)
            ? assigneesTeams
            : assigneesTeams
                ? [assigneesTeams]
                : undefined;

        const response = await api.delete(`/api/tasks/${taskId}/assignees/remove`, {
            data: { assigneesTeams: teamsArray }
        });

        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to remove assignees",
            status: error.response?.status,
        };
    }
};

export const getTasks = async (scope, id, secondaryId = null) => {
    try {
        let url = '';
        if (scope === 'global') url = '/api/tasks/getAllGlobalLevelTasks';
        else if (scope === 'workspace') url = `/api/tasks/workspaces/${id}/tasks`;
        else if (scope === 'project') url = `/api/tasks/workspaces/${id}/projects/${secondaryId}/tasks`;

        const response = await api.get(url);
        return unwrap(response) || [];
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }
};

export const getAllGlobalTasks = async () => {
    try {
        const response = await api.get('/api/tasks/getAllGlobalLevelTasks');
        return unwrap(response) || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch global tasks",
            status: error.response?.status,
        };
    }
};

export const getWorkspaceTasks = async (workspaceId) => {
    try {
        const response = await api.get(`/api/tasks/workspaces/${workspaceId}/tasks`);
        return unwrap(response) || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch workspace tasks",
            status: error.response?.status,
        };
    }
};

export const getProjectTasks = async (workspaceId, projectId) => {
    try {
        const response = await api.get(`/api/tasks/workspaces/${workspaceId}/projects/${projectId}/tasks`);
        return unwrap(response) || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch project tasks",
            status: error.response?.status,
        };
    }
};

export const leaveTask = async (taskId) => {
    try {
        const response = await api.post(`/api/tasks/${taskId}/leave`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to leave task",
            status: error.response?.status,
        };
    }
};
