import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    FolderOpen,
    Loader2,
    Palette,
    Users,
    Briefcase,
} from "lucide-react";

const ProjectPopup = ({ isOpen, onClose, onSubmit, workspaces = [], teams = [] }) => {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "#4f46e5",
        workspace: "",
        teams: [],
        status: "active"
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const colorOptions = [
        { value: "#4f46e5", label: "Indigo" },
        { value: "#10b981", label: "Emerald" },
        { value: "#f59e0b", label: "Amber" },
        { value: "#ef4444", label: "Red" },
        { value: "#8b5cf6", label: "Violet" },
        { value: "#06b6d4", label: "Cyan" },
        { value: "#ec4899", label: "Pink" },
        { value: "#6366f1", label: "Blue" },
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const handleTeamToggle = (teamId) => {
        setFormData(prev => ({
            ...prev,
            teams: prev.teams.includes(teamId)
                ? prev.teams.filter(id => id !== teamId)
                : [...prev.teams, teamId]
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = "Project name is required";
        }
        if (!formData.workspace) {
            newErrors.workspace = "Please select a workspace";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            setFormData({
                name: "",
                description: "",
                color: "#4f46e5",
                workspace: "",
                teams: [],
                status: "active"
            });
            setErrors({});
            onClose();
        } catch (error) {
            setErrors({
                submit:
                    error?.response?.data?.message ||
                    error?.message ||
                    "Failed to create project"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({
                name: "",
                description: "",
                color: "#4f46e5",
                workspace: "",
                teams: [],
                status: "active"
            });
            setErrors({});
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-2xl rounded-2xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/50 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
                                <FolderOpen className="h-5 w-5 text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-100">Create Project</h2>
                                <p className="text-xs text-slate-500">Organize tasks within a project</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors disabled:opacity-50"
                        >
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* Project Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Project Name <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., Mobile App Redesign"
                                className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors ${errors.name ? 'border-rose-500/50' : 'border-slate-800/60'
                                    }`}
                                disabled={isSubmitting}
                            />
                            {errors.name && (
                                <p className="mt-1.5 text-xs text-rose-400">{errors.name}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the project goals and scope..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Two Column Layout */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Workspace */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Workspace <span className="text-rose-400">*</span>
                                </label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <select
                                        name="workspace"
                                        value={formData.workspace}
                                        onChange={handleChange}
                                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 transition-colors appearance-none ${errors.workspace ? 'border-rose-500/50' : 'border-slate-800/60'
                                            }`}
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select workspace</option>
                                        {workspaces.map(ws => (
                                            <option key={ws.id} value={ws.id}>{ws.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {errors.workspace && (
                                    <p className="mt-1.5 text-xs text-rose-400">{errors.workspace}</p>
                                )}
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 transition-colors appearance-none"
                                    disabled={isSubmitting}
                                >
                                    <option value="active">Active</option>
                                    <option value="archived">Archived</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>

                        {/* Color Picker */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                <Palette className="h-4 w-4" />
                                Project Color
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {colorOptions.map(color => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                                        className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${formData.color === color.value
                                                ? 'border-violet-500/50 bg-violet-500/10'
                                                : 'border-slate-800/50 bg-slate-900/40 hover:bg-slate-800/40'
                                            }`}
                                        disabled={isSubmitting}
                                    >
                                        <div
                                            className="h-6 w-6 rounded-lg"
                                            style={{ backgroundColor: color.value }}
                                        />
                                        <span className="text-xs text-slate-300">{color.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Teams */}
                        {teams.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Assign Teams
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {teams.map(team => (
                                        <button
                                            key={team.id}
                                            type="button"
                                            onClick={() => handleTeamToggle(team.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${formData.teams.includes(team.id)
                                                    ? 'bg-violet-500/10 border-violet-500/30'
                                                    : 'bg-slate-900/40 border-slate-800/50 hover:bg-slate-800/40'
                                                }`}
                                            disabled={isSubmitting}
                                        >
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                                                <Users className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-sm text-slate-300 flex-1 text-left">{team.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit Error */}
                        {errors.submit && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <p className="text-sm text-rose-400">{errors.submit}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 border-t border-slate-800/50 px-6 py-4">
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800/60 bg-slate-900/60 text-slate-300 text-sm font-medium hover:bg-slate-800/60 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <FolderOpen className="h-4 w-4" />
                                    Create Project
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ProjectPopup;