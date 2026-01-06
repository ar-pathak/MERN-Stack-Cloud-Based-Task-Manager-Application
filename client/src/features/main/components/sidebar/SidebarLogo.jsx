import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

export const SidebarLogo = ({ isExpanded, isMobile }) => {
    return (
        <div className={`flex items-center gap-2 border-b border-slate-800/60 transition-all duration-300 ${isExpanded || isMobile ? "px-5 py-4" : "px-3 py-4 justify-center"
            }`}>
            <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/30 to-cyan-500/20 flex-shrink-0 border border-sky-400/20">
                <motion.div
                    className="absolute inset-0 rounded-2xl bg-sky-400/40 blur-md"
                    animate={{ opacity: [0.6, 0.3, 0.6] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <Sparkles className="relative h-4 w-4 text-sky-300" />
            </div>
            <AnimatePresence>
                {(isExpanded || isMobile) && (
                    <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 overflow-hidden"
                    >
                        <p className="text-sm font-bold tracking-tight text-slate-100 whitespace-nowrap bg-gradient-to-r from-sky-200 to-cyan-200 bg-clip-text text-transparent">
                            Nimbus Tasks
                        </p>
                        <p className="text-[11px] text-slate-400 whitespace-nowrap font-medium">
                            Cloud workspace
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};