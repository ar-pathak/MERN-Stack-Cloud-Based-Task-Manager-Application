import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar, Clock, Hash,
    Copy, Check, Info,
    X,
    Save,
    Edit2
} from "lucide-react";

// Import Custom Hooks
import { useTask } from "../../hook/useTask";
import { useProject } from "../../hook/useProject";
import { useSubtask } from "../../hook/useSubtask";

const MetaDetails = ({ item }) => {
    const [copied, setCopied] = useState(false);
    const [isEditingDueDate, setIsEditingDueDate] = useState(false);
    const [dueDate, setDueDate] = useState(item.dueDate || '');
    const [includeTime, setIncludeTime] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initialize Hooks
    const { updateTask } = useTask();
    const { updateProject, fetchProjectById } = useProject();
    const { updateSubtask } = useSubtask();

    // Sync local state when item prop changes
    useEffect(() => {
        setDueDate(item.dueDate || '');
        // Check if the stored date has a specific time (not midnight UTC)
        if (item.dueDate) {
            const date = new Date(item.dueDate);
            const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0;
            setIncludeTime(hasTime);
        }
    }, [item.dueDate, item.id]);

    const formatDate = (d, showTime = true) => {
        if (!d) return 'Not set';
        try {
            const date = new Date(d);
            // Check if date has specific time (not midnight UTC)
            const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0;
            
            if (!hasTime || !showTime) {
                // Show only date
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            } else {
                // Show date and time
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch {
            return 'Invalid date';
        }
    };

    const formatInputDate = (d, withTime = true) => {
        if (!d) return '';
        try {
            const date = new Date(d);
            // Check if date is valid
            if (isNaN(date.getTime())) return '';
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            if (withTime) {
                // Convert to local datetime-local format (YYYY-MM-DDTHH:mm)
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            } else {
                // Return date only format (YYYY-MM-DD)
                return `${year}-${month}-${day}`;
            }
        } catch {
            return '';
        }
    };

    const copyId = () => {
        const id = item.id || item._id;
        if (!id) return;
        
        navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDueDateUpdate = async () => {
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            let result;
            let dateToSave = dueDate;
            
            // If time is not included, set to midnight UTC to indicate date-only
            if (!includeTime && dueDate) {
                const date = new Date(dueDate);
                date.setUTCHours(0, 0, 0, 0);
                dateToSave = date.toISOString();
            }
            
            const updateData = { dueDate: dateToSave || null };

            if (item.type === 'task') {
                result = await updateTask(item.id || item._id, updateData);
            } else if (item.type === 'project') {
                
                result = await updateProject(item.workspace, item.id || item._id, updateData);
            } else if (item.type === 'subtask') {
                result = await updateSubtask(item.id || item._id, updateData);
            } else {
                throw new Error(`Unknown item type: ${item.type}`);
            }

            if (!result?.success) {
                throw new Error('Due date update failed');
            }

            setIsEditingDueDate(false);
        } catch (err) {
            console.error("Error updating due date:", err);
            setError('Failed to update due date');
            setDueDate(item.dueDate || ''); // Revert to original
            
            // Clear error after 3 seconds
            setTimeout(() => setError(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setDueDate(item.dueDate || '');
        setIsEditingDueDate(false);
        setError(null);
    };

    const handleClearDueDate = async () => {
        setDueDate('');
        // Auto-save when clearing
        setLoading(true);
        setError(null);

        try {
            let result;
            const updateData = { dueDate: null };

            if (item.type === 'task') {
                result = await updateTask(item.id || item._id, updateData);
            } else if (item.type === 'project') {
                const project = await fetchProjectById(item.workspace, item.id || item._id);
                if (!project?.data?.workspace) {
                    throw new Error('Project workspace not found');
                }
                result = await updateProject(project.data.workspace, item.id || item._id, updateData);
            } else if (item.type === 'subtask') {
                result = await updateSubtask(item.id || item._id, updateData);
            }

            if (!result?.success) {
                throw new Error('Due date clear failed');
            }

            setIsEditingDueDate(false);
        } catch (err) {
            console.error("Error clearing due date:", err);
            setError('Failed to clear due date');
            setDueDate(item.dueDate || '');
            setTimeout(() => setError(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'completed';

    return (
        <section className="relative">
            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute -top-8 left-0 right-0 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-1.5 rounded-md mb-2 z-10"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Details</h3>
            </div>

            <div className="bg-slate-900/40 rounded-xl border border-slate-800/50 overflow-hidden divide-y divide-slate-800/50">
                {/* Due Date - Editable */}
                <motion.div
                    whileHover={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
                    className="p-3 transition-colors"
                >
                    {!isEditingDueDate ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Calendar className={`h-4 w-4 ${isOverdue ? 'text-rose-400' : 'text-slate-600'}`} />
                                <span className="text-xs text-slate-400 font-medium">Due Date</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium ${
                                    isOverdue ? 'text-rose-400' : item.dueDate ? 'text-sky-400' : 'text-slate-500'
                                }`}>
                                    {formatDate(item.dueDate)}
                                </span>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsEditingDueDate(true)}
                                    className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-all"
                                    title="Edit due date"
                                    aria-label="Edit due date"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </motion.button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2.5">
                                    <Calendar className="h-4 w-4 text-slate-600" />
                                    <span className="text-xs text-slate-400 font-medium">Due Date</span>
                                </div>
                                <button
                                    onClick={handleCancelEdit}
                                    className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-all"
                                    title="Cancel"
                                    aria-label="Cancel editing"
                                    disabled={loading}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            
                            {/* Toggle for Date/DateTime */}
                            <div className="flex gap-2 mb-2">
                                <button
                                    onClick={() => setIncludeTime(false)}
                                    className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-all ${
                                        !includeTime
                                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20'
                                            : 'bg-slate-800/50 text-slate-500 border border-slate-700 hover:text-slate-400'
                                    }`}
                                >
                                    Date Only
                                </button>
                                <button
                                    onClick={() => setIncludeTime(true)}
                                    className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-all ${
                                        includeTime
                                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20'
                                            : 'bg-slate-800/50 text-slate-500 border border-slate-700 hover:text-slate-400'
                                    }`}
                                >
                                    Date & Time
                                </button>
                            </div>
                            
                            <input
                                type={includeTime ? "datetime-local" : "date"}
                                value={formatInputDate(dueDate, includeTime)}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        if (includeTime) {
                                            // Convert local datetime to ISO string
                                            const localDate = new Date(e.target.value);
                                            setDueDate(localDate.toISOString());
                                        } else {
                                            // For date-only, set to midnight UTC
                                            const localDate = new Date(e.target.value + 'T00:00:00');
                                            setDueDate(localDate.toISOString());
                                        }
                                    } else {
                                        setDueDate('');
                                    }
                                }}
                                disabled={loading}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Select due date"
                            />
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleDueDateUpdate}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/20 rounded-lg px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Clock className="h-3.5 w-3.5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-3.5 w-3.5" />
                                            Save
                                        </>
                                    )}
                                </motion.button>
                                {dueDate && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleClearDueDate}
                                        disabled={loading}
                                        className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-400 border border-slate-700 hover:border-rose-500/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Clear due date"
                                    >
                                        Clear
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Created Date */}
                <motion.div
                    whileHover={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
                    className="flex items-center justify-between p-3 transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-slate-600" />
                        <span className="text-xs text-slate-400 font-medium">Created</span>
                    </div>
                    <span className="text-xs font-medium text-slate-300">{formatDate(item.createdAt)}</span>
                </motion.div>

                {/* Last Updated */}
                <motion.div
                    whileHover={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
                    className="flex items-center justify-between p-3 transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-slate-600" />
                        <span className="text-xs text-slate-400 font-medium">Last Updated</span>
                    </div>
                    <span className="text-xs font-medium text-slate-300">{formatDate(item.updatedAt)}</span>
                </motion.div>

                {/* ID with Copy */}
                <motion.div
                    whileHover={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
                    className="flex items-center justify-between p-3 transition-colors group"
                >
                    <div className="flex items-center gap-2.5">
                        <Hash className="h-4 w-4 text-slate-600" />
                        <span className="text-xs text-slate-400 font-medium">ID</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-300">
                            {(item.id || item._id)?.substring(0, 12)}...
                        </span>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={copyId}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-all"
                            title="Copy full ID"
                            aria-label="Copy full ID"
                        >
                            {copied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                                <Copy className="h-3.5 w-3.5" />
                            )}
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default MetaDetails;