import { useState, useCallback } from 'react';
import * as subtaskService from '../../../../../service/subtask.service';

export const useSubtask = () => {
    const [subtasks, setSubtasks] = useState([]);
    const [currentSubtask, setCurrentSubtask] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Helper to handle API calls with loading/error state
    const execute = useCallback(async (apiCall, ...args) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiCall(...args);
            return { success: true, data: result };
        } catch (err) {
            const errorMessage = err.message || "An unexpected error occurred";
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, []);

    // --- Core Subtask Operations ---

    const fetchSubtasks = useCallback(async (taskId) => {
        const { success, data } = await execute(subtaskService.getSubtasksByTask, taskId);
        if (success) {
            setSubtasks(data || []);
        }
        return { success, data };
    }, [execute]);

    const fetchSubtaskById = useCallback(async (subtaskId) => {
        const { success, data } = await execute(subtaskService.getSubtaskById, subtaskId);
        if (success) {
            setCurrentSubtask(data);
        }
        return { success, data };
    }, [execute]);

    const createNewSubtask = useCallback(async (subtaskData) => {
        const { success, data } = await execute(subtaskService.createSubtask, subtaskData);
        if (success) {
            setSubtasks(prev => [...prev, data]);
        }
        return { success, data };
    }, [execute]);

    const updateSubtaskDetails = useCallback(async (subtaskId, subtaskData) => {
        const { success, data } = await execute(subtaskService.updateSubtask, subtaskId, subtaskData);
        if (success) {
            const updatedSubtask = data;

            // Update current subtask if it matches
            if (currentSubtask?._id === subtaskId) {
                setCurrentSubtask(updatedSubtask);
            }

            // Update the list item
            setSubtasks(prev => prev.map(st => st._id === subtaskId ? updatedSubtask : st));
        }
        return { success, data };
    }, [execute, currentSubtask]);

    const toggleComplete = useCallback(async (subtaskId) => {
        // Optimistic update for immediate UI feedback
        setSubtasks(prev => prev.map(st =>
            st._id === subtaskId ? { ...st, completed: !st.completed } : st
        ));

        const { success, data } = await execute(subtaskService.toggleSubtaskCompletion, subtaskId);

        if (success) {
            // Re-sync with actual server data
            setSubtasks(prev => prev.map(st => st._id === subtaskId ? data : st));
            if (currentSubtask?._id === subtaskId) setCurrentSubtask(data);
        } else {
            // Revert on failure
            // You might want to re-fetch the list here to ensure consistency
        }
        return { success, data };
    }, [execute, currentSubtask]);

    const deleteSubtaskById = useCallback(async (subtaskId) => {
        const { success } = await execute(subtaskService.deleteSubtask, subtaskId);
        if (success) {
            setSubtasks(prev => prev.filter(st => st._id !== subtaskId));
            if (currentSubtask?._id === subtaskId) setCurrentSubtask(null);
        }
        return success;
    }, [execute, currentSubtask]);

    return {
        // State
        subtasks,
        currentSubtask,
        loading,
        error,

        // Actions
        fetchSubtasks,
        fetchSubtaskById,
        createSubtask: createNewSubtask,
        updateSubtask: updateSubtaskDetails,
        toggleSubtaskCompletion: toggleComplete,
        deleteSubtask: deleteSubtaskById,

        // Utilities
        clearError: () => setError(null),
        resetCurrentSubtask: () => setCurrentSubtask(null)
    };
};