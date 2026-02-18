import { motion } from "framer-motion";
import { MessageSquare, ArrowRight } from "lucide-react";

const EmptyState = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex h-full w-full items-center justify-center px-3 py-6 sm:px-6"
        >
            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-900/50 p-4 shadow-2xl shadow-slate-950/60 backdrop-blur-xl sm:p-8">
                <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-sky-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

                <div className="relative text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-950/70 sm:h-24 sm:w-24">
                        <MessageSquare className="h-8 w-8 text-sky-400 sm:h-10 sm:w-10" />
                    </div>

                    <h3 className="mb-2 text-base font-semibold text-slate-100 sm:text-xl">
                        Start a focused conversation
                    </h3>
                    <p className="mx-auto mb-6 max-w-xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                        Select a workspace, project, task, or subtask from the left panel. The chat will open with
                        messages, mentions, and call controls ready to use.
                    </p>

                    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-300 sm:text-xs">
                        <div className="flex -space-x-2">
                            {["SC", "MR", "EW"].map((avatar) => (
                                <div
                                    key={avatar}
                                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-br from-sky-400 to-blue-500 text-[10px] font-bold text-white"
                                >
                                    {avatar}
                                </div>
                            ))}
                        </div>
                        <span>3 team members online</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default EmptyState;
