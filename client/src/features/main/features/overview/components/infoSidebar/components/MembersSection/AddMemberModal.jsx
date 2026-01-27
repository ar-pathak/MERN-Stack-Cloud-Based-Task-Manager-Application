import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Loader2 } from "lucide-react";

const AddMemberModal = ({ isOpen, onClose, onAdd, isLoading }) => {
    const [username, setUsername] = useState("");
    const [role, setRole] = useState("member");
    const inputRef = useRef(null);

    // Auto-focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!username.trim()) return;
        
        // onAdd is expected to return true on success
        const success = await onAdd(username.trim(), role);
        if (success) {
            setUsername("");
            setRole("member");
            onClose();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                            <UserPlus className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-100">Add Member</h3>
                            <p className="text-xs text-slate-400">Add existing user by username</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Username
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter username"
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                        >
                            <option value="viewer">Viewer</option>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmit}
                            disabled={isLoading || !username.trim()}
                            className="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4" />
                                    Add Member
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AddMemberModal;