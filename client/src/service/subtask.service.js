// services/subtask.service.js
import api from "../config/axios";

/**
 * Subtask Service
 * Handles all subtask-related API calls
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
 * @param {Object} subtaskData - Subtask data { task, title, completed }
 * @returns {Promise<Object>} Created subtask
 */
export const createSubtask = async (subtaskData) => {
    try {
        const response = await api.post('/api/subtasks/createSubtask', subtaskData);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create subtask",
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