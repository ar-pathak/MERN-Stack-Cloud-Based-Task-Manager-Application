import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    CheckCircle2,
    Loader2,
    ListChecks,
} from "lucide-react";

const SubtaskPopup = ({ isOpen, onClose, onSubmit, taskId, taskTitle }) => {
    const [formData, setFormData] = useState({
        title: "",
        completed: false
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

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = "Subtask title is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                ...formData,
                task: taskId
            });
            setFormData({
                title: "",
                completed: false
            });
            setErrors({});
            onClose();
        } catch (error) {
            setErrors({
                submit:
                    error?.response?.data?.message ||
                    error?.message ||
                    "Failed to create subtask"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({
                title: "",
                completed: false
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
                    className="relative w-full max-w-lg rounded-2xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-xl shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/50 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-600/20 border border-teal-500/30 flex items-center justify-center">
                                <ListChecks className="h-5 w-5 text-teal-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-100">Create Subtask</h2>
                                <p className="text-xs text-slate-500">
                                    Add to: <span className="text-slate-400">{taskTitle || 'Task'}</span>
                                </p>
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
                    <div className="p-6 space-y-5">
                        {/* Subtask Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Subtask Title <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g., Create wireframes for login page"
                                className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 transition-colors ${errors.title ? 'border-rose-500/50' : 'border-slate-800/60'
                                    }`}
                                disabled={isSubmitting}
                                autoFocus
                            />
                            {errors.title && (
                                <p className="mt-1.5 text-xs text-rose-400">{errors.title}</p>
                            )}
                        </div>

                        {/* Completed Toggle */}
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
                            <div className="flex items-center gap-3 flex-1">
                                <CheckCircle2 className="h-5 w-5 text-teal-400" />
                                <div>
                                    <p className="text-sm font-medium text-slate-300">Mark as Completed</p>
                                    <p className="text-xs text-slate-500">Start with this subtask already done</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="completed"
                                    checked={formData.completed}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                    disabled={isSubmitting}
                                />
                                <div className="w-11 h-6 bg-slate-800/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                            </label>
                        </div>

                        {/* Info Box */}
                        <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                            <p className="text-xs text-teal-300">
                                💡 Tip: Break down complex tasks into smaller, manageable subtasks for better progress tracking.
                            </p>
                        </div>

                        {/* Submit Error */}
                        {errors.submit && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <p className="text-sm text-rose-400">{errors.submit}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
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
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-sm font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Create Subtask
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SubtaskPopup;