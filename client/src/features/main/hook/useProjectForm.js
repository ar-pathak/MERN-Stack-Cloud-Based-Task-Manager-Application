import { useState, useEffect } from "react";
import { getWorkspaceMembers } from "../../../service/workspace.service";
import { getTeamsByWorkspace } from "../../../service/team.service";

export const useProjectForm = (isOpen, workspaceId, onSubmit, onClose) => {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "#4f46e5",
        teams: [],
        members: [],
        status: "active"
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [isLoadingTeams, setIsLoadingTeams] = useState(false);
    const [availableMembers, setAvailableMembers] = useState([]);
    const [availableTeams, setAvailableTeams] = useState([]);

    // Reset & fetch context on open
    useEffect(() => {
        if (isOpen && workspaceId) {
            setFormData({
                name: "",
                description: "",
                color: "#4f46e5",
                teams: [],
                members: [],
                status: "active"
            });
            setErrors({});
            fetchWorkspaceContext();
        }
    }, [isOpen, workspaceId]);

    const fetchWorkspaceContext = async () => {
        setIsLoadingMembers(true);
        setIsLoadingTeams(true);
        try {
            const membersResponse = await getWorkspaceMembers(workspaceId);
            const teamsResponse = await getTeamsByWorkspace(workspaceId);

            const members = (membersResponse || []).map(member => ({
                id: member.user?._id || member.user,
                name: member.user?.name || member.user?.email || "Unknown User",
                email: member.user?.email || "",
                avatar: member.user?.name?.substring(0, 2).toUpperCase() || "U",
                role: member.role
            }));

            const teams = (teamsResponse || []).map(t => ({
                id: t._id || t.id,
                name: t.name
            }));

            setAvailableMembers(members);
            setAvailableTeams(teams);
        } catch (error) {
            console.error("Error fetching project context:", error);
            setErrors(prev => ({ ...prev, fetch: "Failed to load workspace data" }));
            setAvailableMembers([]);
            setAvailableTeams([]);
        } finally {
            setIsLoadingMembers(false);
            setIsLoadingTeams(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const n = { ...prev };
                delete n[name];
                return n;
            });
        }
    };

    const handleSetColor = (color) => {
        setFormData(prev => ({ ...prev, color }));
    };

    const handleToggle = (field, id) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(id)
                ? prev[field].filter(x => x !== id)
                : [...prev[field], id]
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Project name is required";
        if (!workspaceId) newErrors.workspace = "Workspace is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                color: formData.color,
                status: formData.status,
                teams: formData.teams,
                members: formData.members.map(id => ({ user: id, role: "viewer" }))
            };

            await onSubmit(payload);
            onClose();
        } catch (error) {
            setErrors({ submit: error?.message || "Failed to create project" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        formData,
        errors,
        isSubmitting,
        isLoadingMembers,
        isLoadingTeams,
        availableMembers,
        availableTeams,
        handleChange,
        handleSetColor,
        handleToggle,
        handleSubmit
    };
};
