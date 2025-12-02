import { motion } from "framer-motion";
import { AlertCircle, Calendar, CheckCircle2, ChevronRight, Clock, CloudIcon, MoreHorizontal } from "lucide-react";
import { priorityColors, statusColors } from "../utils/myTaskPageData";
import ChecklistItem from "./ChecklistItem";



export default function SelectedTaskPanel({ task }) {
    if (!task) return null;

    return (
        <motion.div
            className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/75 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.95)] backdrop-blur-xl"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.32 }}
        >
            {/* Water-ish overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className="absolute -right-8 top-0 h-32 w-32 rounded-full bg-cyan-500/25 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-indigo-500/30 blur-3xl" />
            </div>

            <div className="relative z-10 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-50">
                            {task.title}
                            <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">
                                {task.project}
                            </span>
                        </h2>
                        <p className="mt-1 text-[11px] text-slate-300/90">
                            Focus view for the selected task. Plan steps, adjust priority,
                            and keep everything synced in the cloud.
                        </p>
                    </div>
                    <button className="rounded-full border border-slate-600/80 bg-slate-950/80 p-1.5 text-slate-400 hover:border-cyan-400/80 hover:text-cyan-200">
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${statusColors[task.status]}`}
                    >
                        <Clock className="h-3 w-3 opacity-70" />
                        {task.status}
                    </span>
                    <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${priorityColors[task.priority]}`}
                    >
                        <AlertCircle className="h-3 w-3 opacity-80" />
                        {task.priority} priority
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-300">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {task.dueDate}
                    </span>
                </div>

                {/* Progress and checklist */}
                <div className="space-y-2 rounded-xl border border-slate-700/70 bg-slate-950/40 p-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Progress</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            Auto-sync enabled
                        </span>
                    </div>
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90">
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400"
                            style={{ width: `${task.progress}%` }}
                            layout
                            transition={{ type: "spring", stiffness: 260, damping: 28 }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(248,250,252,0)_0%,rgba(248,250,252,0.3)_50%,rgba(248,250,252,0)_100%)] opacity-70 mix-blend-screen" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                        This task is{" "}
                        <span className="font-semibold text-slate-200">
                            {task.progress}% complete
                        </span>
                        . Add sub-tasks and notes to finish the remaining work.
                    </p>
                </div>

                {/* Simple checklist mock */}
                <div className="space-y-1.5 rounded-xl border border-slate-700/70 bg-slate-950/50 p-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Checklist</span>
                        <button className="text-[11px] text-cyan-300 hover:text-cyan-100">
                            + Add item
                        </button>
                    </div>
                    
                    <ChecklistItem label="Define acceptance criteria" checked />
                    <ChecklistItem label="Wireframe the UI flow" checked />
                    <ChecklistItem label="Connect to live API" checked={false} />
                    <ChecklistItem label="Run end-to-end tests" checked={false} />
                </div>

                <button className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-indigo-500/20 px-3 py-2 text-xs text-cyan-50 border border-cyan-400/40 hover:from-cyan-500/25 hover:via-sky-500/20 hover:to-indigo-500/25 transition shadow-[0_0_25px_rgba(34,211,238,0.4)]">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/80">
                            <CloudIcon />
                        </span>
                        <div className="text-left">
                            <p className="text-[11px] font-medium">
                                Sync to all connected devices
                            </p>
                            <p className="text-[10px] text-cyan-100/80">
                                Changes will reflect in team dashboards instantly.
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-cyan-100" />
                </button>
            </div>
        </motion.div>
    );
}