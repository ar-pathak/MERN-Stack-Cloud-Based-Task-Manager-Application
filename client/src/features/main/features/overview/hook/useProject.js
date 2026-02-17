import { useState, useCallback } from 'react';
import * as projectService from '../../../../../service/project.service';

export const useProject = () => {
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
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

    // --- Core Project Operations ---

    const fetchProjects = useCallback(async (workspaceId) => {
        const { success, data } = await execute(projectService.getProjectsByWorkspace, workspaceId);
        if (success) {
            setProjects(Array.isArray(data) ? data : []);
        }
        return { success, data };
    }, [execute]);

    const fetchProjectById = useCallback(async (workspaceId, projectId) => {
        const { success, data } = await execute(projectService.getProjectById, workspaceId, projectId);
        if (success) {
            setCurrentProject(data || null);
        }
        return { success, data };
    }, [execute]);

    const createNewProject = useCallback(async (workspaceId, projectData) => {
        const { success, data } = await execute(projectService.createProject, workspaceId, projectData);
        if (success) {
            if (data?._id) {
                setProjects(prev => [...prev, data]);
            }
        }
        return { success, data };
    }, [execute]);

    const updateProjectDetails = useCallback(async (workspaceId, projectId, projectData) => {
        const { success, data } = await execute(projectService.updateProject, workspaceId, projectId, projectData);
        if (success) {
            if (currentProject?._id === projectId) {
                setCurrentProject(data);
            }

            setProjects(prev => prev.map(p => p._id === projectId ? { ...p, ...data } : p));
        }
        return { success, data };
    }, [execute, currentProject]);

    const deleteProjectById = useCallback(async (workspaceIdOrProjectId, maybeProjectId) => {
        const projectId = maybeProjectId || workspaceIdOrProjectId;
        const { success } = await execute(projectService.deleteProject, workspaceIdOrProjectId, maybeProjectId);
        if (success) {
            setProjects(prev => prev.filter(p => p._id !== projectId));
            if (currentProject?._id === projectId) setCurrentProject(null);
        }
        return success;
    }, [execute, currentProject]);

    // --- Team Management ---

    const fetchProjectTeams = useCallback(async (workspaceId, projectId) => {
        return await execute(projectService.getProjectTeams, workspaceId, projectId);
    }, [execute]);

    const addTeamsToProject = useCallback(async (workspaceId, projectId, teams) => {
        return await execute(projectService.addProjectTeams, workspaceId, projectId, teams);
    }, [execute]);
    const updateMemberRole = useCallback(async (workspaceId, projectId, memberId, role) => {
        return await execute(projectService.updateProjectMemberRole, workspaceId, projectId, memberId, role);
    }, [execute]);
    const removeTeamsFromProject = useCallback(async (workspaceId, projectId, teams) => {
        return await execute(projectService.removeProjectTeams, workspaceId, projectId, teams);
    }, [execute]);

    // --- Member Management ---

    const fetchProjectMembers = useCallback(async (workspaceId, projectId) => {
        return await execute(projectService.getProjectMembers, workspaceId, projectId);
    }, [execute]);

    const addMembersToProject = useCallback(async (workspaceId, projectId, data) => {
        return await execute(projectService.addProjectMembers, workspaceId, projectId, data);
    }, [execute]);

    const removeMembersFromProject = useCallback(async (workspaceId, projectId, data) => {
        return await execute(projectService.removeProjectMembers, workspaceId, projectId, data);
    }, [execute]);


    const leaveProject = useCallback(async (workspaceId, projectId) => {
        const { success, data } = await execute(projectService.leaveProject, workspaceId, projectId);
        if (success) {
            setProjects(prev => prev.filter(p => p._id !== projectId));
            if (currentProject?._id === projectId) setCurrentProject(null);
        }
        return { success, data };
    }, [execute, currentProject]);
    return {
        // State
        projects,
        currentProject,
        loading,
        error,

        // Core Actions
        fetchProjects,
        fetchProjectById,
        createProject: createNewProject,
        updateProject: updateProjectDetails,
        deleteProject: deleteProjectById,

        // Team Actions
        fetchProjectTeams,
        addProjectTeams: addTeamsToProject,
        removeProjectTeams: removeTeamsFromProject,

        // Member Actions
        fetchProjectMembers,
        addProjectMembers: addMembersToProject,
        updateProjectMembersRole: updateMemberRole,
        removeProjectMembers: removeMembersFromProject,

        leaveProject,

        // Utilities
        clearError: () => setError(null),
        resetCurrentProject: () => setCurrentProject(null)
    };
};
