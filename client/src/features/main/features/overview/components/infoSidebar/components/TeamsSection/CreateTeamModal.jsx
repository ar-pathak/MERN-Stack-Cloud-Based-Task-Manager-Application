import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, X, Plus, Loader2 } from "lucide-react";

const CreateTeamModal = ({ onClose, onCreate, submitting }) => {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");

    const handleSubmit = () => {
        if (!name.trim()) return;
        onCreate({ name: name.trim(), description: desc.trim() });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && onClose()}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
                {/* Header */}
                <div className="relative p-6 pb-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-b border-slate-700/50">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Create New Team</h3>
                                <p className="text-xs text-slate-400">Build your dream team</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Team Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Engineering"
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-purple-500 focus:bg-slate-800 transition-all outline-none"
                            disabled={submitting}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="What does this team do?"
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-purple-500 focus:bg-slate-800 transition-all outline-none resize-none"
                            disabled={submitting}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmit}
                            disabled={submitting || !name.trim()}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            {submitting ? "Creating..." : "Create Team"}
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            disabled={submitting}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all"
                        >
                            Cancel
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default CreateTeamModal;