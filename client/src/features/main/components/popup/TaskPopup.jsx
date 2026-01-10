import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Briefcase,
    CheckSquare,
    Calendar,
    Users,
    Flag,
    Loader2,
    FolderOpen,
} from "lucide-react";
import ScrollBar from "../../../../common/components/ScrollBar";



const TaskPopup = ({ isOpen, onClose, onSubmit, workspaces = [], projects = [], teams = [] }) => {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        workspace: "",
        project: "",
        team: "",
        assignees: [],
        assigneesTeams: [],
        isHighPriority: false,
        dueDate: "",
        status: "active"
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const handleAssigneeToggle = (userId) => {
        setFormData(prev => ({
            ...prev,
            assignees: prev.assignees.includes(userId)
                ? prev.assignees.filter(id => id !== userId)
                : [...prev.assignees, userId]
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = "Task title is required";
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
                title: "",
                description: "",
                workspace: "",
                project: "",
                team: "",
                assignees: [],
                assigneesTeams: [],
                isHighPriority: false,
                dueDate: "",
                status: "active"
            });
            setErrors({});
            onClose();
        } catch (error) {
            setErrors({ submit: error.message || "Failed to create task" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({
                title: "",
                description: "",
                workspace: "",
                project: "",
                team: "",
                assignees: [],
                assigneesTeams: [],
                isHighPriority: false,
                dueDate: "",
                status: "active"
            });
            setErrors({});
            onClose();
        }
    };

    const mockUsers = [
        { id: "1", name: "Sarah Chen", avatar: "SC" },
        { id: "2", name: "Mike Ross", avatar: "MR" },
        { id: "3", name: "Emma Wilson", avatar: "EW" }
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="relative z-50 flex items-center justify-center p-4">
                <ScrollBar />
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0  backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-2xl rounded-2xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-[80vh] flex flex-col custom-scrollbar scroll-smooth"
                >
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-800/50 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                <CheckSquare className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-100">Create Task</h2>
                                <p className="text-xs text-slate-500">Add a new task to your workspace</p>
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
                        {/* Task Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Task Title <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g., Design system audit"
                                className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-green-500/50 transition-colors ${errors.title ? 'border-rose-500/50' : 'border-slate-800/60'
                                    }`}
                                disabled={isSubmitting}
                            />
                            {errors.title && (
                                <p className="mt-1.5 text-xs text-rose-400">{errors.title}</p>
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
                                placeholder="Describe the task details..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-green-500/50 transition-colors resize-none"
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
                                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-slate-300 focus:outline-none focus:border-green-500/50 transition-colors appearance-none ${errors.workspace ? 'border-rose-500/50' : 'border-slate-800/60'
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

                            {/* Project */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Project
                                </label>
                                <div className="relative">
                                    <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <select
                                        name="project"
                                        value={formData.project}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-green-500/50 transition-colors appearance-none"
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select project</option>
                                        {projects.map(proj => (
                                            <option key={proj.id} value={proj.id}>{proj.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Team */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Team
                                </label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <select
                                        name="team"
                                        value={formData.team}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-green-500/50 transition-colors appearance-none"
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select team</option>
                                        {teams.map(team => (
                                            <option key={team.id} value={team.id}>{team.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Due Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Due Date
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="date"
                                        name="dueDate"
                                        value={formData.dueDate}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-green-500/50 transition-colors"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Priority */}
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
                            <div className="flex items-center gap-3 flex-1">
                                <Flag className="h-5 w-5 text-rose-400" />
                                <div>
                                    <p className="text-sm font-medium text-slate-300">High Priority</p>
                                    <p className="text-xs text-slate-500">Mark this task as high priority</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isHighPriority"
                                    checked={formData.isHighPriority}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                    disabled={isSubmitting}
                                />
                                <div className="w-11 h-6 bg-slate-800/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                            </label>
                        </div>

                        {/* Assignees */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-3">
                                Assign to Team Members
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {mockUsers.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => handleAssigneeToggle(user.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${formData.assignees.includes(user.id)
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : 'bg-slate-900/40 border-slate-800/50 hover:bg-slate-800/40'
                                            }`}
                                        disabled={isSubmitting}
                                    >
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                                            {user.avatar}
                                        </div>
                                        <span className="text-sm text-slate-300 flex-1 text-left">{user.name}</span>
                                        {formData.assignees.includes(user.id) && (
                                            <CheckSquare className="h-4 w-4 text-green-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit Error */}
                        {errors.submit && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <p className="text-sm text-rose-400">{errors.submit}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-3 border-t border-slate-800/50 px-6 py-4">
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
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CheckSquare className="h-4 w-4" />
                                    Create Task
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TaskPopup;