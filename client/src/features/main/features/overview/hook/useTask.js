import { useState, useCallback } from 'react';
import * as taskService from '../../../../../service/task.service';

export const useTask = () => {
    const [tasks, setTasks] = useState([]);
    const [currentTask, setCurrentTask] = useState(null);
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

    // --- Fetching Operations ---

    const fetchGlobalTasks = useCallback(async () => {
        const { success, data } = await execute(taskService.getAllGlobalTasks);
        if (success) setTasks(data);
        return { success, data };
    }, [execute]);

    const fetchWorkspaceTasks = useCallback(async (workspaceId) => {
        const { success, data } = await execute(taskService.getWorkspaceTasks, workspaceId);
        if (success) setTasks(data);
        return { success, data };
    }, [execute]);

    const fetchProjectTasks = useCallback(async (workspaceId, projectId) => {
        const { success, data } = await execute(taskService.getProjectTasks, workspaceId, projectId);
        if (success) setTasks(data);
        return { success, data };
    }, [execute]);

    const fetchTaskById = useCallback(async (taskId) => {
        const { success, data } = await execute(taskService.getTaskById, taskId);
        if (success) setCurrentTask(data);
        return { success, data };
    }, [execute]);

    // --- Creation Operations ---

    const createGlobalTask = useCallback(async (taskData) => {
        const { success, data } = await execute(taskService.createGlobalTask, taskData);
        if (success) setTasks(prev => [data, ...prev]);
        return { success, data };
    }, [execute]);

    const createWorkspaceTask = useCallback(async (workspaceId, taskData) => {
        const { success, data } = await execute(taskService.createWorkspaceTask, workspaceId, taskData);
        if (success) setTasks(prev => [data, ...prev]);
        return { success, data };
    }, [execute]);

    const createProjectTask = useCallback(async (workspaceId, projectId, taskData) => {
        const { success, data } = await execute(taskService.createProjectTask, workspaceId, projectId, taskData);
        if (success) setTasks(prev => [data, ...prev]);
        return { success, data };
    }, [execute]);

    // --- Update Operations ---

    // Generic helper to update local state
    const updateLocalState = useCallback((updatedTask) => {
        if (!updatedTask || !updatedTask._id) return;

        // Update list
        setTasks(prev => prev.map(t => t._id === updatedTask._id ? { ...t, ...updatedTask } : t));

        // Update current selected task if it matches
        setCurrentTask(prev => (prev && prev._id === updatedTask._id) ? { ...prev, ...updatedTask } : prev);
    }, []);

    const updateTaskDetails = useCallback(async (taskId, taskData) => {
        const { success, data } = await execute(taskService.updateTask, taskId, taskData);
        if (success) updateLocalState(data);
        return { success, data };
    }, [execute, updateLocalState]);

    const changeTaskStatus = useCallback(async (taskId, status) => {
        // Optimistic update (optional, but makes UI snappy)
        setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status } : t));

        const { success, data } = await execute(taskService.updateTaskStatus, taskId, status);
        if (success) {
            // Re-sync with actual server response in case of extra fields updated
            updateLocalState(data);
        } else {
            // Revert on failure (optional implementation detail)
            // fetchTaskById(taskId); 
        }
        return { success, data };
    }, [execute, updateLocalState]);

    const toggleTaskComplete = useCallback(async (taskId) => {
        const { success, data } = await execute(taskService.toggleTaskCompletion, taskId);
        if (success) updateLocalState(data);
        return { success, data };
    }, [execute, updateLocalState]);

    const assignUsers = useCallback(async (taskId, userIds) => {
        const { success, data } = await execute(taskService.assignUsersToTask, taskId, userIds);
        if (success) updateLocalState(data);
        return { success, data };
    }, [execute, updateLocalState]);
    const assignUsersByUsername = useCallback(async (taskId, usernames) => {
        const { success, data } = await execute(taskService.assignUsersToTaskByUsername, taskId, usernames);
        if (success) updateLocalState(data);
        return { success, data };
    }, [execute, updateLocalState]);
    const removeAssignUsers = useCallback(async (taskId, userIds) => {
        const { success, data, error } = await execute(taskService.removeAssignUsersFromTask, taskId, userIds);
        if (success) updateLocalState(data);
        return { success, data, error };
    }, [execute, updateLocalState]);

    // --- Delete / Restore Operations ---

    const removeTask = useCallback(async (taskId) => {
        // Soft delete
        const { success } = await execute(taskService.deleteTask, taskId);
        if (success) {
            // Remove from list view
            setTasks(prev => prev.filter(t => t._id !== taskId));
            if (currentTask?._id === taskId) setCurrentTask(null);
        }
        return success;
    }, [execute, currentTask]);

    const permanentDeleteTask = useCallback(async (taskId) => {
        // Hard delete
        const { success } = await execute(taskService.hardDeleteTask, taskId);
        if (success) {
            setTasks(prev => prev.filter(t => t._id !== taskId));
            if (currentTask?._id === taskId) setCurrentTask(null);
        }
        return success;
    }, [execute, currentTask]);

    const restoreDeletedTask = useCallback(async (taskId) => {
        const { success, data } = await execute(taskService.restoreTask, taskId);
        if (success) {
            // Add back to list if appropriate, or just return success
            setTasks(prev => [data, ...prev]);
        }
        return { success, data };
    }, [execute]);

    return {
        // State
        tasks,
        currentTask,
        loading,
        error,

        // Fetch Actions
        fetchGlobalTasks,
        fetchWorkspaceTasks,
        fetchProjectTasks,
        fetchTaskById,

        // Create Actions
        createGlobalTask,
        createWorkspaceTask,
        createProjectTask,

        // Update Actions
        updateTask: updateTaskDetails,
        updateStatus: changeTaskStatus,
        toggleComplete: toggleTaskComplete,
        assignUsers,
        assignUsersByUsername,
        removeAssignUsers,

        // Delete/Restore Actions
        deleteTask: removeTask,           // Soft Delete
        hardDeleteTask: permanentDeleteTask, // Hard Delete
        restoreTask: restoreDeletedTask,

        // Utilities
        clearError: () => setError(null),
        resetCurrentTask: () => setCurrentTask(null)
    };
};