import api from "../config/axios";

const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

const normalizeDueDate = (value) => {
    if (value === null || value === "") return null;
    if (value === undefined) return undefined;

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            throw new Error("Invalid date format. Use ISO 8601 format");
        }
        return value.toISOString();
    }

    const raw = String(value).trim();
    if (!raw) return null;

    // Date-only input from <input type="date"> (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return `${raw}T00:00:00.000Z`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error("Invalid date format. Use ISO 8601 format");
    }

    return parsed.toISOString();
};

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

        const normalizedDueDate = normalizeDueDate(subtaskData.dueDate);
        if (normalizedDueDate) {
            payload.dueDate = normalizedDueDate;
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
        const payload = { ...subtaskData };

        if ("dueDate" in payload) {
            if (payload.dueDate === undefined) {
                delete payload.dueDate;
            } else {
                payload.dueDate = normalizeDueDate(payload.dueDate);
            }
        }

        const response = await api.patch(`/api/subtasks/${subtaskId}`, payload);
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
