import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ListChecks } from "lucide-react";

export default function TaskStats({ tasks }) {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "Done").length;
    const highPriority = tasks.filter((t) => t.priority === "High").length;

    return (
        <motion.div
            className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/70 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.9)] backdrop-blur-md"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-100">
                        Task Overview
                    </h2>
                    <p className="text-[11px] text-slate-400">
                        Snapshot of your cloud workspace
                    </p>
                </div>
                <div className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-100">
                    Synced • Just now
                </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
                <div className="relative overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/80 p-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Total tasks</span>
                        <ListChecks className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="mt-1 text-xl font-semibold text-slate-50">
                        {total}
                    </p>
                    <p className="text-[11px] text-slate-400">
                        Across all projects
                    </p>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-cyan-500/15 to-transparent" />
                </div>

                <div className="relative overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/80 p-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Completed</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="mt-1 text-xl font-semibold text-emerald-300">
                        {completed}
                    </p>
                    <p className="text-[11px] text-slate-400">
                        {completed === 0
                            ? "Let’s close a few today"
                            : "Nice momentum"}
                    </p>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-emerald-500/15 to-transparent" />
                </div>

                <div className="relative overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/80 p-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>High priority</span>
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                    </div>
                    <p className="mt-1 text-xl font-semibold text-rose-300">
                        {highPriority}
                    </p>
                    <p className="text-[11px] text-slate-400">
                        Critical items in focus
                    </p>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-rose-500/18 to-transparent" />
                </div>
            </div>
        </motion.div>
    );
}