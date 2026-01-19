import { useState, useEffect } from "react";
import {
    createGlobalTask,
    createWorkspaceTask,
    createProjectTask
} from "../../../service/task.service";
import { getWorkspaceMembers } from "../../../service/workspace.service";
import { getProjectById } from "../../../service/project.service";
import { getTeamsByWorkspace } from "../../../service/team.service";

export const useTaskForm = ({
    isOpen,
    onClose,
    onSubmit,
    level,
    workspaceId,
    projectId,
    projects
}) => {
    // --- State ---
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        workspace: workspaceId || "",
        project: projectId || "",
        assignees: [],
        assigneesTeams: [],
        isHighPriority: false,
        dueDate: "",
        status: "active"
    });

    const [uiState, setUiState] = useState({
        isSubmitting: false,
        isLoadingMembers: false,
        isLoadingTeams: false,
        errors: {}
    });

    const [data, setData] = useState({
        availableMembers: [],
        availableTeams: [],
        filteredProjects: []
    });

    // --- Helpers ---
    const isGlobal = level === "global";
    const isWorkspace = level === "workspace";
    const isProject = level === "project";

    // --- Effects ---

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                title: "",
                description: "",
                workspace: workspaceId || "",
                project: projectId || "",
                assignees: [],
                assigneesTeams: [],
                isHighPriority: false,
                dueDate: "",
                status: "active"
            }));
            setUiState(prev => ({ ...prev, errors: {} }));
        }
    }, [isOpen, level, workspaceId, projectId]);

    // Fetch Context Data
    useEffect(() => {
        if (!isOpen) return;

        const fetchContext = async () => {
            try {
                if (isProject && projectId) {
                    await fetchProjectMembers(workspaceId, projectId);
                } else if (isWorkspace && workspaceId) {
                    await fetchWorkspaceMembers(workspaceId);
                } else if (isGlobal) {
                    setData(prev => ({ ...prev, availableMembers: [], availableTeams: [] }));
                }
            } catch (error) {
                console.error("Context fetch error:", error);
                setUiState(prev => ({
                    ...prev,
                    errors: { ...prev.errors, fetch: "Failed to load members" }
                }));
            }
        };

        fetchContext();
    }, [isOpen, level, workspaceId, projectId]);

    // --- Fetching Logic ---
    const fetchWorkspaceMembers = async (wsId) => {
        setUiState(prev => ({ ...prev, isLoadingMembers: true, isLoadingTeams: true }));
        try {
            const membersResponse = await getWorkspaceMembers(wsId);
            const teamsResponse = await getTeamsByWorkspace(wsId);

            const members = (membersResponse || []).map(transformMember);
            const teams = (teamsResponse || []).map(t => ({
                id: t._id || t.id,
                name: t.name
            }));

            const wsProjects = projects.filter(p => p.workspace === wsId);

            setData(prev => ({
                ...prev,
                availableMembers: members,
                availableTeams: teams,
                filteredProjects: wsProjects
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setUiState(prev => ({ ...prev, isLoadingMembers: false, isLoadingTeams: false }));
        }
    };


    const fetchProjectMembers = async (wsId, projId) => {
        setUiState(prev => ({ ...prev, isLoadingMembers: true, isLoadingTeams: true }));
        try {
            const response = await getProjectById(wsId, projId);
            if (response) {
                setData(prev => ({
                    ...prev,
                    availableMembers: (response.members || []).map(transformMember),
                    availableTeams: (response.teams || []).map(t => ({ id: t._id || t, name: t.name || "Unknown" }))
                }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setUiState(prev => ({ ...prev, isLoadingMembers: false, isLoadingTeams: false }));
        }
    };

    const transformMember = (m) => ({
        id: m.user?._id || m.user,
        name: m.user?.name || m.user?.email || "Unknown",
        email: m.user?.email || "",
        avatar: m.user?.name?.substring(0, 2).toUpperCase() || "U",
        role: m.role
    });

    // --- Handlers ---

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));

        // Clear specific error
        if (uiState.errors[name]) {
            setUiState(prev => ({ ...prev, errors: { ...prev.errors, [name]: null } }));
        }

        // Context Switching Logic
        if (name === "workspace" && isGlobal && value) fetchWorkspaceMembers(value);
        if (name === "project" && value) {
            const ws = formData.workspace;
            if (ws) fetchProjectMembers(ws, value);
        }
    };

    const handleToggle = (field, id) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(id)
                ? prev[field].filter(item => item !== id)
                : [...prev[field], id]
        }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = "Task title is required";
        if (isWorkspace && !formData.workspace) newErrors.workspace = "Workspace is required";
        if (isProject && !formData.project) newErrors.project = "Project is required";

        setUiState(prev => ({ ...prev, errors: newErrors }));
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setUiState(prev => ({ ...prev, isSubmitting: true }));

        try {
            const payload = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                isHighPriority: formData.isHighPriority,
                status: formData.status,
                assignees: formData.assignees,
                assigneesTeams: formData.assigneesTeams,
                ...(formData.dueDate && { dueDate: formData.dueDate }),
                ...(isGlobal && { workspace: formData.workspace, project: formData.project }),
                ...(isWorkspace && { workspace: workspaceId, project: formData.project }),
                ...(isProject && { workspace: workspaceId, project: projectId })
            };

            // Clean undefined optional fields
            if (!payload.project) delete payload.project;
            if (!payload.workspace) delete payload.workspace;

            let response;
            if (isProject) response = await createProjectTask(workspaceId, projectId, payload);
            else if (isWorkspace) response = await createWorkspaceTask(workspaceId, payload);
            else response = await createGlobalTask(payload);

            if (onSubmit) onSubmit(response);
            onClose();
        } catch (error) {
            setUiState(prev => ({
                ...prev,
                errors: { ...prev.errors, submit: error?.message || "Failed to create task" }
            }));
        } finally {
            setUiState(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    return {
        formData,
        uiState,
        data,
        handlers: {
            handleChange,
            handleToggle,
            handleSubmit,
            handleClose: onClose
        },
        flags: { isGlobal, isWorkspace, isProject }
    };
};