import { useState, useEffect } from "react";
import { getTaskById } from "../../../service/task.service";

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

            // Extract and format assignees
            let assignees = [];
            if (task?.assignees && Array.isArray(task.assignees)) {
                assignees = task.assignees.map(a => ({
                    id: a._id || a,
                    name: a.name || a.email || "Unknown",
                    email: a.email || "",
                    avatar: (a.name || "U").substring(0, 2).toUpperCase()
                }));
            }
            setData({ availableAssignees: assignees });
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