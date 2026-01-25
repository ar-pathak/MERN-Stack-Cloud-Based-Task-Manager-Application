import api from "../config/axios";

/**
 * Create Task at Global Level
 * Route: POST /api/tasks/createTasksAtGlobalLevel
 */
export const createGlobalTask = async (taskData) => {
    try {
        const response = await api.post(`/api/tasks/createTasksAtGlobalLevel`, taskData);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create global task",
            status: error.response?.status,
        };
    }
};

/**
 * Create Task at Workspace Level
 * Route: POST /api/tasks/workspace/:workspaceId/createTasksAtWorkspaceLevel
 */
export const createWorkspaceTask = async (workspaceId, taskData) => {
    try {
        const response = await api.post(
            `/api/tasks/workspace/${workspaceId}/createTasksAtWorkspaceLevel`,
            taskData
        );
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create workspace task",
            status: error.response?.status,
        };
    }
};

/**
 * Create Task at Project Level
 * Route: POST /api/tasks/workspace/:workspaceId/project/:projectId/createTasksAtProjectLevel
 */
export const createProjectTask = async (workspaceId, projectId, taskData) => {
    try {
        const response = await api.post(
            `/api/tasks/workspace/${workspaceId}/project/${projectId}/createTasksAtProjectLevel`,
            taskData
        );
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create project task",
            status: error.response?.status,
        };
    }
};

/**
 * Get Task by ID
 * Route: GET /api/tasks/:taskId
 */
export const getTaskById = async (taskId) => {
    try {
        const response = await api.get(`/api/tasks/${taskId}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch task",
            status: error.response?.status,
        };
    }
};

/**
 * Update Task
 * Route: PATCH /api/tasks/:taskId
 * FIX: Added missing update method
 */
export const updateTask = async (taskId, taskData) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/update`, taskData);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update task",
            status: error.response?.status,
        };
    }
};

/**
 * Change Task Status
 * Route: PATCH /api/tasks/:taskId/status
 */
export const updateTaskStatus = async (taskId, status) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/status`, { status });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update status",
            status: error.response?.status,
        };
    }
};

/**
 * Soft Delete Task
 * Route: DELETE /api/tasks/:taskId/softDelete
 */
export const deleteTask = async (taskId) => {
    try {
        const response = await api.delete(`/api/tasks/${taskId}/softDelete`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete task",
            status: error.response?.status,
        };
    }
};

/**
 * Hard Delete Task (Permanent)
 * Route: DELETE /api/tasks/:taskId
 * FIX: Added hard delete for permanent removal
 */
export const hardDeleteTask = async (taskId) => {
    try {
        const response = await api.delete(`/api/tasks/${taskId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to permanently delete task",
            status: error.response?.status,
        };
    }
};

/**
 * Restore Deleted Task
 * Route: PATCH /api/tasks/:taskId/restore
 * FIX: Added restore method for soft-deleted tasks
 */
export const restoreTask = async (taskId) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/restore`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to restore task",
            status: error.response?.status,
        };
    }
};

/**
 * Toggle Task Completion
 * Route: PATCH /api/tasks/:taskId/toggle
 * FIX: Added toggle completion method
 */
export const toggleTaskCompletion = async (taskId) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/toggle`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to toggle task completion",
            status: error.response?.status,
        };
    }
};

/**
 * Assign Users to Task
 * Route: PATCH /api/tasks/:taskId/assign
 * FIX: Added method to assign users
 */
export const assignUsersToTask = async (taskId, userIds) => {
    try {
        const response = await api.patch(`/api/tasks/${taskId}/assign`, { userIds });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to assign users",
            status: error.response?.status,
        };
    }
};

/**
 * Get Tasks based on scope (Helper function)
 */
export const getTasks = async (scope, id, secondaryId = null) => {
    try {
        let url = '';
        if (scope === 'global') url = '/api/tasks/getAllGlobalLevelTasks';
        else if (scope === 'workspace') url = `/api/tasks/workspaces/${id}/tasks`;
        else if (scope === 'project') url = `/api/tasks/workspaces/${id}/projects/${secondaryId}/tasks`;

        const response = await api.get(url);
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }
};

/**
 * Get All Global Level Tasks
 * Route: GET /api/tasks/getAllGlobalLevelTasks
 */
export const getAllGlobalTasks = async () => {
    try {
        const response = await api.get('/api/tasks/getAllGlobalLevelTasks');
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch global tasks",
            status: error.response?.status,
        };
    }
};

/**
 * Get Tasks by Workspace
 * Route: GET /api/tasks/workspaces/:workspaceId/tasks
 */
export const getWorkspaceTasks = async (workspaceId) => {
    try {
        const response = await api.get(`/api/tasks/workspaces/${workspaceId}/tasks`);
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch workspace tasks",
            status: error.response?.status,
        };
    }
};

/**
 * Get Tasks by Project
 * Route: GET /api/tasks/workspaces/:workspaceId/projects/:projectId/tasks
 */
export const getProjectTasks = async (workspaceId, projectId) => {
    try {
        const response = await api.get(`/api/tasks/workspaces/${workspaceId}/projects/${projectId}/tasks`);
        return response.data?.data || response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch project tasks",
            status: error.response?.status,
        };
    }
};