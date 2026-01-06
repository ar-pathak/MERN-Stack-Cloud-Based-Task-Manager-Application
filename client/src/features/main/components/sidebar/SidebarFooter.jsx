import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export const SidebarFooter = ({ isExpanded, isMobile }) => {
    return (
        <div className={`mt-auto border-t border-slate-800/70 py-3.5 transition-all duration-300 ${isExpanded || isMobile ? "px-4" : "px-2"
            }`}>
            {(isExpanded || isMobile) ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                                <motion.div
                                    className="absolute inset-0"
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <Zap className="h-3.5 w-3.5 text-emerald-400" />
                                </motion.div>
                            </div>
                            <span className="text-[11px] text-slate-300 font-medium whitespace-nowrap">System Status</span>
                        </div>
                        <span className="text-emerald-400 font-semibold text-[11px] whitespace-nowrap">Active</span>
                    </div>
                </div>
            ) : (
                <div className="flex justify-center group relative">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Zap className="h-4 w-4 text-emerald-400" />
                    </div>
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        whileHover={{ opacity: 1, x: 0 }}
                        className="absolute left-full ml-3 px-3 py-2 bg-slate-900/95 backdrop-blur-xl text-slate-100 text-xs rounded-xl opacity-0 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 whitespace-nowrap shadow-2xl border border-slate-700/50 z-50"
                    >
                        <div className="font-semibold text-emerald-400">System Active</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">All systems operational</div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-slate-900/95" />
                    </motion.div>
                </div>
            )}
        </div>
    );
};
