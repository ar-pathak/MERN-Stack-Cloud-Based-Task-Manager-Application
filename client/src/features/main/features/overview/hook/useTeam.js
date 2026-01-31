import { useState, useCallback } from 'react';
import {
    createTeam,
    getTeamsByWorkspace,
    getTeamById,
    updateTeam,
    deleteTeam,
    getTeamMembers,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberRole,
    leaveTeamService
} from '../../../../../service/team.service';

export const useTeam = () => {
    const [teams, setTeams] = useState([]);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);

    // UI States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- Team CRUD Operations ---

    // Fetch all teams for a workspace
    const fetchTeams = useCallback(async (workspaceId) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getTeamsByWorkspace(workspaceId);
            setTeams(data);
            return { success: true, data };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch a single team details
    const fetchTeamById = useCallback(async (workspaceId, teamId) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getTeamById(workspaceId, teamId);
            setCurrentTeam(data);
            return { success: true, data };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Create a new team
    const createNewTeam = useCallback(async (workspaceId, teamData) => {
        setLoading(true);
        setError(null);
        try {
            const newTeam = await createTeam(workspaceId, teamData);
            // Optimistically update list
            setTeams(prev => [...prev, newTeam]);
            return { success: true, data: newTeam };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Update an existing team
    const updateExistingTeam = useCallback(async (workspaceId, teamId, teamData) => {
        setLoading(true);
        setError(null);
        try {
            const updatedTeam = await updateTeam(workspaceId, teamId, teamData);

            // Update local state for list
            setTeams(prev => prev.map(t => t._id === teamId || t.id === teamId ? { ...t, ...teamData } : t));

            // Update current team if selected
            if (currentTeam && (currentTeam._id === teamId || currentTeam.id === teamId)) {
                setCurrentTeam(prev => ({ ...prev, ...teamData }));
            }

            return { success: true, data: updatedTeam };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [currentTeam]);

    // Delete a team
    const removeTeam = useCallback(async (workspaceId, teamId) => {
        setLoading(true);
        setError(null);
        try {
            await deleteTeam(workspaceId, teamId);
            // Remove from local list
            setTeams(prev => prev.filter(t => t._id !== teamId && t.id !== teamId));

            // Clear current team if it was the one deleted
            if (currentTeam && (currentTeam._id === teamId || currentTeam.id === teamId)) {
                setCurrentTeam(null);
            }

            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [currentTeam]);

    // --- Team Member Operations ---

    const fetchMembers = useCallback(async (workspaceId, teamId) => {
        try {
            const members = await getTeamMembers(workspaceId, teamId);
            setTeamMembers(members);
            return { success: true, data: members };
        } catch (err) {
            console.error("Failed to fetch members", err);
            return { success: false, error: err.message };
        }
    }, []);

    const addMember = useCallback(async (workspaceId, teamId, memberData) => {
        // memberData expects: { memberId, role }
        setLoading(true);
        try {
            const response = await addTeamMember(workspaceId, teamId, memberData);
            // Refresh members list after adding
            await fetchMembers(workspaceId, teamId);
            return { success: true, data: response };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [fetchMembers]);

    const removeMember = useCallback(async (workspaceId, teamId, memberId) => {
        setLoading(true);
        try {
            await removeTeamMember(workspaceId, teamId, memberId);
            // Optimistically remove from local state
            setTeamMembers(prev => prev.filter(m => m.user._id !== memberId && m.memberId !== memberId && m._id !== memberId));
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const updateMemberRole = useCallback(async (workspaceId, teamId, memberId, role) => {
        try {
            await updateTeamMemberRole(workspaceId, teamId, memberId, role);
            // Optimistically update local state
            setTeamMembers(prev => prev.map(m =>
                (m.user?._id === memberId || m.memberId === memberId) ? { ...m, role } : m
            ));
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, []);

    const leaveTeam = useCallback(async (workspaceId, teamId) => {
        setLoading(true);
        setError(null);
        try {
            await leaveTeamService(workspaceId, teamId);
            // Remove team from list if visible
            setTeams(prev => prev.filter(t => (t._id || t.id) !== teamId));
            if (currentTeam && (currentTeam._id || currentTeam.id) === teamId) {
                setCurrentTeam(null);
            }
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [currentTeam]);

    return {
        // Data States
        teams,
        currentTeam,
        teamMembers,
        loading,
        error,

        // Core Functions
        fetchTeams,
        fetchTeamById,
        createNewTeam,
        updateExistingTeam,
        removeTeam,

        // Member Functions
        fetchMembers,
        fetchTeamMembers: fetchMembers,
        addMember,
        removeMember,
        updateMemberRole,


        leaveTeam,
    };
};