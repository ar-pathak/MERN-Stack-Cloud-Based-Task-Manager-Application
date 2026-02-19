import { useState, useEffect } from "react";
import { getTaskById } from "../../../service/task.service";
import { getTeamMembers } from "../../../service/team.service";

export const useSubtaskForm = ({ isOpen, onClose, onSubmit, taskId }) => {
    // --- State ---
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        completed: false,
        assignedTo: null,
        dueDate: ""
    });

    const [uiState, setUiState] = useState({
        isSubmitting: false,
        isLoadingTask: false,
        errors: {}
    });

    const [data, setData] = useState({
        availableAssignees: []
    });

    // --- Effects ---

    // Initialize & Fetch Context
    useEffect(() => {
        if (isOpen && taskId) {
            resetForm();
            fetchTaskContext(taskId);
        }
    }, [isOpen, taskId]);

    // --- Actions ---

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            completed: false,
            assignedTo: null,
            dueDate: ""
        });
        setUiState(prev => ({ ...prev, errors: {} }));
    };

    const fetchTaskContext = async (id) => {
        setUiState(prev => ({ ...prev, isLoadingTask: true }));
        try {
            const task = await getTaskById(id);
            const workspaceId = task?.workspace?._id || task?.workspace || null;
            const uniqueAssignees = new Map();

            // 1. Parent task direct assignees
            if (task?.assignees && Array.isArray(task.assignees)) {
                task.assignees.forEach((assignee) => {
                    const assigneeId = String(assignee?._id || assignee || "");
                    if (!assigneeId) return;
                    if (uniqueAssignees.has(assigneeId)) return;

                    uniqueAssignees.set(assigneeId, {
                        id: assigneeId,
                        name: assignee?.name || assignee?.email || "Unknown",
                        email: assignee?.email || "",
                        avatar: (assignee?.name || "U").substring(0, 2).toUpperCase(),
                        source: "task",
                        sourceLabel: "Task Assignee"
                    });
                });
            }

            // 2. Parent task assigned teams members
            if (workspaceId && Array.isArray(task?.assigneesTeams) && task.assigneesTeams.length > 0) {
                const teamIds = task.assigneesTeams
                    .map((team) => String(team?._id || team || ""))
                    .filter(Boolean);

                const teamResponses = await Promise.all(
                    teamIds.map(async (teamId) => {
                        try {
                            return await getTeamMembers(workspaceId, teamId);
                        } catch (_error) {
                            return [];
                        }
                    })
                );

                teamResponses.forEach((teamMembers) => {
                    if (!Array.isArray(teamMembers)) return;

                    teamMembers.forEach((teamMember) => {
                        const user = teamMember?.user || null;
                        const userId = String(user?._id || teamMember?._id || "");
                        if (!userId) return;
                        if (uniqueAssignees.has(userId)) return;

                        uniqueAssignees.set(userId, {
                            id: userId,
                            name: user?.name || user?.email || "Unknown",
                            email: user?.email || "",
                            avatar: (user?.name || "U").substring(0, 2).toUpperCase(),
                            source: "team",
                            sourceLabel: "Team Member"
                        });
                    });
                });
            }

            setData({ availableAssignees: Array.from(uniqueAssignees.values()) });
        } catch (error) {
            console.error("Error fetching task context:", error);
            setData({ availableAssignees: [] });
        } finally {
            setUiState(prev => ({ ...prev, isLoadingTask: false }));
        }
    };

    // --- Handlers ---

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (uiState.errors[name]) {
            setUiState(prev => ({ ...prev, errors: { ...prev.errors, [name]: null } }));
        }
    };

    const handleAssigneeSelect = (id) => {
        setFormData(prev => ({
            ...prev,
            assignedTo: prev.assignedTo === id ? null : id
        }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = "Subtask title is required";
        if (!taskId) newErrors.task = "Parent task ID is required";

        setUiState(prev => ({ ...prev, errors: newErrors }));
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setUiState(prev => ({ ...prev, isSubmitting: true }));

        try {
            const payload = {
                taskId: taskId, // Specific backend requirement
                title: formData.title.trim(),
                completed: formData.completed,
                ...(formData.description.trim() && { description: formData.description.trim() }),
                ...(formData.assignedTo && { assignedTo: formData.assignedTo }),
                ...(formData.dueDate && { dueDate: formData.dueDate })
            };

            await onSubmit(payload);
            resetForm();
            onClose();
        } catch (error) {
            setUiState(prev => ({
                ...prev,
                errors: { ...prev.errors, submit: error?.message || "Failed to create subtask" }
            }));
        } finally {
            setUiState(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    const handleClose = () => {
        if (!uiState.isSubmitting) {
            resetForm();
            setData({ availableAssignees: [] });
            onClose();
        }
    };

    return {
        formData,
        uiState,
        data,
        handlers: {
            handleChange,
            handleAssigneeSelect,
            handleSubmit,
            handleClose
        }
    };
};
