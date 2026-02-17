import api from "../config/axios";

const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

export const getSubtasksByTask = async (taskId) => {
    try {
        const response = await api.get(`/api/subtasks/task/${taskId}`);
        return unwrap(response) || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch subtasks",
            status: error.response?.status,
        };
    }
};

export const getSubtaskById = async (subtaskId) => {
    try {
        const response = await api.get(`/api/subtasks/${subtaskId}`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch subtask",
            status: error.response?.status,
        };
    }
};

export const createSubtask = async (subtaskData) => {
    try {
        if (!subtaskData.taskId) {
            throw new Error("taskId is required");
        }

        if (!subtaskData.title || !subtaskData.title.trim()) {
            throw new Error("title is required");
        }

        const payload = {
            taskId: subtaskData.taskId,
            title: subtaskData.title.trim()
        };

        if (subtaskData.description && subtaskData.description.trim()) {
            payload.description = subtaskData.description.trim();
        }

        if (subtaskData.assignedTo) {
            payload.assignedTo = subtaskData.assignedTo;
        }

        if (subtaskData.dueDate) {
            payload.dueDate = subtaskData.dueDate;
        }

        const response = await api.post('/api/subtasks/createSubtask', payload);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || error.message || "Failed to create subtask",
            status: error.response?.status,
        };
    }
};

export const updateSubtask = async (subtaskId, subtaskData) => {
    try {
        const response = await api.patch(`/api/subtasks/${subtaskId}`, subtaskData);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update subtask",
            status: error.response?.status,
        };
    }
};

export const toggleSubtaskCompletion = async (subtaskId) => {
    try {
        const response = await api.patch(`/api/subtasks/${subtaskId}/toggle`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to toggle subtask",
            status: error.response?.status,
        };
    }
};

export const deleteSubtask = async (subtaskId) => {
    try {
        const response = await api.delete(`/api/subtasks/${subtaskId}`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete subtask",
            status: error.response?.status,
        };
    }
};

export const addAssignees = async (subtaskId, { assignees = [] }) => {
    try {
        const response = await api.patch(`/api/subtasks/${subtaskId}/assignees/add`, {
            assignees
        });
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add assignees",
            status: error.response?.status,
        };
    }
};

export const removeAssignees = async (subtaskId, { assignees = [] }) => {
    try {
        const response = await api.delete(`/api/subtasks/${subtaskId}/assignees/remove`, {
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

export const leaveSubtask = async (subtaskId) => {
    try {
        const response = await api.post(`/api/subtasks/${subtaskId}/leave`);
        return unwrap(response);
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to leave subtask",
            status: error.response?.status,
        };
    }
};
