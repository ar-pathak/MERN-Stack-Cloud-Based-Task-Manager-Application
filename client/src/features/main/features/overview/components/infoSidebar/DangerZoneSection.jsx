import { useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle, Trash2, Link as LinkIcon,
    Image as ImageIcon,
} from "lucide-react";


const DangerZoneSection = ({ item }) => {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <section className="pt-6 border-t border-slate-800/50">
            <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Danger Zone</h3>
            </div>

            {!showConfirm ? (
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-medium group"
                >
                    <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    Delete {item.type}
                </motion.button>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl"
                >
                    <p className="text-sm text-rose-300 font-medium">Are you absolutely sure?</p>
                    <p className="text-xs text-slate-400">
                        This action cannot be undone. This will permanently delete the {item.type} and all associated data.
                    </p>
                    <div className="flex gap-2">
                        <button className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition-colors">
                            Yes, Delete
                        </button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            )}

            {!showConfirm && (
                <p className="text-[10px] text-slate-600 text-center mt-2">
                    This action cannot be undone. All data will be permanently lost.
                </p>
            )}
        </section>
    );
};

export default DangerZoneSection
