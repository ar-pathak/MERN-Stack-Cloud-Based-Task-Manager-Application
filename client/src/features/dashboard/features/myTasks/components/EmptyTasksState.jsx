import { motion } from "framer-motion";
import { Clock, Plus } from "lucide-react";

export default function EmptyTasksState() {
    return (
        <motion.div
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/60 px-6 py-12 text-center shadow-[0_18px_60px_rgba(15,23,42,0.9)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div className="relative">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-cyan-500/30 via-sky-400/40 to-indigo-500/40 blur-md" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Clock className="h-9 w-9 text-cyan-200" />
                </div>
            </div>
            <h2 className="text-sm font-semibold text-slate-100">
                No tasks here yet
            </h2>
            <p className="max-w-sm text-xs text-slate-400">
                Create your first cloud task, attach it to a project, and watch your
                personal dashboard come alive with real-time updates.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
                <button className="inline-flex items-center gap-2 rounded-full border border-cyan-400/70 bg-cyan-500/20 px-4 py-1.5 text-xs font-medium text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.4)] hover:bg-cyan-500/30">
                    <Plus className="h-3.5 w-3.5" />
                    Add new task
                </button>
                <button className="rounded-full border border-slate-600/80 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-400">
                    Import from another tool
                </button>
            </div>
        </motion.div>
    );
}