// services/subtask.service.js
import api from "../config/axios";

/**
 * Subtask Service
 * Handles all subtask-related API calls
 * 
 * IMPORTANT: Backend expects "taskId" not "task" in payload
 */

/**
 * Get all subtasks for a task
 * @param {string} taskId - Task ID
 * @returns {Promise<Array>} Subtasks data
 */
export const getSubtasksByTask = async (taskId) => {
    try {
        const response = await api.get(`/api/subtasks/task/${taskId}`);
        return response.data || [];
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch subtasks",
            status: error.response?.status,
        };
    }
};

/**
 * Get subtask by ID
 * @param {string} subtaskId - Subtask ID
 * @returns {Promise<Object>} Subtask data
 */
export const getSubtaskById = async (subtaskId) => {
    try {
        const response = await api.get(`/api/subtasks/${subtaskId}`);
        return response.data || null;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch subtask",
            status: error.response?.status,
        };
    }
};

/**
 * Create a new subtask
 * @param {Object} subtaskData - Subtask data
 * @param {string} subtaskData.taskId - Parent task ID (REQUIRED)
 * @param {string} subtaskData.title - Subtask title (REQUIRED)
 * @param {string} subtaskData.description - Subtask description (OPTIONAL)
 * @param {string} subtaskData.assignedTo - User ID to assign (OPTIONAL)
 * @param {string} subtaskData.dueDate - Due date (OPTIONAL)
 * @param {boolean} subtaskData.completed - Completion status (OPTIONAL, default: false)
 * @returns {Promise<Object>} Created subtask
 */
export const createSubtask = async (subtaskData) => {
    try {
        // Validate required fields
        if (!subtaskData.taskId) {
            throw new Error("taskId is required");
        }

        if (!subtaskData.title || !subtaskData.title.trim()) {
            throw new Error("title is required");
        }

        // Build clean payload
        const payload = {
            taskId: subtaskData.taskId,
            title: subtaskData.title.trim()
        };

        // Add optional fields only if they exist
        if (subtaskData.description && subtaskData.description.trim()) {
            payload.description = subtaskData.description.trim();
        }

        if (subtaskData.assignedTo) {
            payload.assignedTo = subtaskData.assignedTo;
        }

        if (subtaskData.dueDate) {
            payload.dueDate = subtaskData.dueDate;
        }

        if (subtaskData.completed !== undefined) {
            payload.completed = subtaskData.completed;
        }

        const response = await api.post('/api/subtasks/createSubtask', payload);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || error.message || "Failed to create subtask",
            status: error.response?.status,
        };
    }
};

/**
 * Update subtask
 * @param {string} subtaskId - Subtask ID
 * @param {Object} subtaskData - Updated subtask data
 * @returns {Promise<Object>} Updated subtask
 */
export const updateSubtask = async (subtaskId, subtaskData) => {
    try {
        const response = await api.patch(`/api/subtasks/${subtaskId}`, subtaskData);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update subtask",
            status: error.response?.status,
        };
    }
};

/**
 * Toggle subtask completion
 * @param {string} subtaskId - Subtask ID
 * @returns {Promise<Object>} Updated subtask
 */
export const toggleSubtaskCompletion = async (subtaskId) => {
    try {
        const response = await api.patch(`/api/subtasks/${subtaskId}/toggle`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to toggle subtask",
            status: error.response?.status,
        };
    }
};

/**
 * Delete subtask
 * @param {string} subtaskId - Subtask ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteSubtask = async (subtaskId) => {
    try {
        const response = await api.delete(`/api/subtasks/${subtaskId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete subtask",
            status: error.response?.status,
        };
    }
};

/**
 * Add Assignees to Subtask
 * @param {string} subtaskId 
 * @param {Object} data - { assignees: [], usernames: [] }
 */
export const addAssignees = async (subtaskId, { assignees = [], usernames = [] }) => {
    try {
        const response = await api.patch(`/api/subtasks/${subtaskId}/assignees/add`, {
            assignees,
            usernames
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to add assignees",
            status: error.response?.status,
        };
    }
};

/**
 * Remove Assignees from Subtask
 * @param {string} subtaskId 
 * @param {Object} data - { assignees: [], usernames: [] }
 */
export const removeAssignees = async (subtaskId, { assignees = [], usernames = [] }) => {
    try {
        // IMPORTANT: Axios DELETE requires data to be wrapped in a 'data' property
        const response = await api.delete(`/api/subtasks/${subtaskId}/assignees/remove`, {
            data: {
                assignees,
                usernames
            }
        });
        return response.data?.data || response.data;
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
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to leave subtask",
            status: error.response?.status,
        };
    }
};