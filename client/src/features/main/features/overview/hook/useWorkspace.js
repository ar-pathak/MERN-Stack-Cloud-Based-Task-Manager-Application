import { useState, useCallback } from 'react';
import * as workspaceService from '../../../../../service/workspace.service';

export const useWorkspace = () => {
    const [workspaces, setWorkspaces] = useState([]);
    const [currentWorkspace, setCurrentWorkspace] = useState(null);
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

    // --- Core Workspace Operations ---

    const fetchWorkspaces = useCallback(async () => {
        const { success, data } = await execute(workspaceService.getAllWorkspaces);
        if (success) setWorkspaces(data);
    }, [execute]);

    const fetchWorkspaceById = useCallback(async (id) => {
        const { success, data } = await execute(workspaceService.getWorkspaceById, id);
        if (success) setCurrentWorkspace(data);
        return data;
    }, [execute]);

    const createNewWorkspace = useCallback(async (workspaceData) => {
        const { success, data } = await execute(workspaceService.createWorkspace, workspaceData);
        if (success) {
            // Optimistically add to list or re-fetch
            setWorkspaces(prev => [...prev, data]);
        }
        return { success, data };
    }, [execute]);

    const updateWorkspaceDetails = useCallback(async (id, workspaceData) => {
        const { success, data } = await execute(workspaceService.updateWorkspace, id, workspaceData);
        if (success) {
            // Update local state if the updated workspace is the current one
            if (currentWorkspace?._id === id) {
                setCurrentWorkspace(data);
            }
            // Update the list item
            setWorkspaces(prev => prev.map(ws => ws._id === id ? data : ws));
        }
        return { success, data };
    }, [execute, currentWorkspace]);

    const deleteWorkspaceById = useCallback(async (id) => {
        const { success } = await execute(workspaceService.deleteWorkspace, id);
        if (success) {
            setWorkspaces(prev => prev.filter(ws => ws._id !== id));
            if (currentWorkspace?._id === id) setCurrentWorkspace(null);
        }
        return success;
    }, [execute, currentWorkspace]);

    // --- Member Management ---

    const fetchMembers = useCallback(async (workspaceId) => {
        return await execute(workspaceService.getWorkspaceMembers, workspaceId);
    }, [execute]);

    const addMember = useCallback(async (workspaceId, memberData) => {
        return await execute(workspaceService.addWorkspaceMember, workspaceId, memberData);
    }, [execute]);

    const removeMemberFromWorkspace = useCallback(async (params) => {
        return await execute(workspaceService.removeMember, params);
    }, [execute]);

    const changeMemberRole = useCallback(async (params) => {
        return await execute(workspaceService.updateMemberRole, params);
    }, [execute]);

    // --- Invite Management ---

    const sendInvite = useCallback(async (params) => {
        return await execute(workspaceService.sendWorkspaceInvite, params);
    }, [execute]);

    const acceptInvite = useCallback(async (token) => {
        return await execute(workspaceService.acceptWorkspaceInvite, token);
    }, [execute]);

    // --- Workspace Settings & Actions ---

    const leaveCurrentWorkspace = useCallback(async (workspaceId) => {
        const { success } = await execute(workspaceService.leaveWorkspace, workspaceId);
        if (success) {
            setWorkspaces(prev => prev.filter(ws => ws._id !== workspaceId));
        }
        return success;
    }, [execute]);

    const transferWorkspaceOwnership = useCallback(async (params) => {
        return await execute(workspaceService.transferOwnership, params);
    }, [execute]);

    // --- Quick Actions ---

    const getQuickStatus = useCallback(async (id) => {
        return await execute(workspaceService.getQuickStatus, id);
    }, [execute]);

    const toggleStar = useCallback(async (id) => {
        const { success, data } = await execute(workspaceService.toggleStarWorkspace, id);
        if (success) {
            setWorkspaces(prev => prev.map(ws => ws._id === id ? { ...ws, isStarred: !ws.isStarred } : ws));
        }
        return { success, data };
    }, [execute]);

    const toggleMute = useCallback(async (id) => {
        const { success, data } = await execute(workspaceService.toggleMuteWorkspace, id);
        if (success) {
            setWorkspaces(prev => prev.map(ws => ws._id === id ? { ...ws, isMuted: !ws.isMuted } : ws));
        }
        return { success, data };
    }, [execute]);

    const toggleArchive = useCallback(async (id) => {
        const { success, data } = await execute(workspaceService.toggleArchiveWorkspace, id);
        if (success) {
            setWorkspaces(prev => prev.map(ws => ws._id === id ? { ...ws, isArchived: !ws.isArchived } : ws));
        }
        return { success, data };
    }, [execute]);

    return {
        // State
        workspaces,
        currentWorkspace,
        loading,
        error,

        // Actions
        fetchWorkspaces,
        fetchWorkspaceById,
        createWorkspace: createNewWorkspace,
        updateWorkspace: updateWorkspaceDetails,
        deleteWorkspace: deleteWorkspaceById,

        // Members
        fetchMembers,
        addMember,
        removeMember: removeMemberFromWorkspace,
        updateMemberRole: changeMemberRole,

        // Invites
        sendInvite,
        acceptInvite,

        // Settings/Actions
        leaveWorkspace: leaveCurrentWorkspace,
        transferOwnership: transferWorkspaceOwnership,
        getQuickStatus,
        toggleStar,
        toggleMute,
        toggleArchive,

        // Reset Error
        clearError: () => setError(null)
    };
};