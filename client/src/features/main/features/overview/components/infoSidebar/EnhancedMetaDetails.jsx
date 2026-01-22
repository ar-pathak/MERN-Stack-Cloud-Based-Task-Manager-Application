import { useState} from "react";
import { motion } from "framer-motion";
import {
    Calendar, Clock, Hash,
    Copy, Check, Link as LinkIcon, Info, Image as ImageIcon,
} from "lucide-react";


const EnhancedMetaDetails = ({ item }) => {
    const [copied, setCopied] = useState(false);
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'N/A';

    const copyId = () => {
        navigator.clipboard.writeText(item.id || item._id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Details</h3>
            </div>

            <div className="bg-slate-900/40 rounded-xl border border-slate-800/50 overflow-hidden divide-y divide-slate-800/50">
                {item.dueDate && (
                    <motion.div
                        whileHover={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
                        className="flex items-center justify-between p-3 transition-colors"
                    >
                        <div className="flex items-center gap-2.5">
                            <Calendar className="h-4 w-4 text-slate-600" />
                            <span className="text-xs text-slate-400 font-medium">Due Date</span>
                        </div>
                        <span className="text-xs font-medium text-sky-400">{formatDate(item.dueDate)}</span>
                    </motion.div>
                )}

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

                <motion.div
                    whileHover={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
                    className="flex items-center justify-between p-3 transition-colors group"
                >
                    <div className="flex items-center gap-2.5">
                        <Hash className="h-4 w-4 text-slate-600" />
                        <span className="text-xs text-slate-400 font-medium">ID</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-300">{(item.id || item._id)?.substring(0, 12)}...</span>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={copyId}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-all"
                            title="Copy ID"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default EnhancedMetaDetails