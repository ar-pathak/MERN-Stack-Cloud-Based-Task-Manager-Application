import { motion } from "framer-motion";
import { AlertCircle, Calendar, Clock, Star, Tag } from "lucide-react";
import { priorityColors, statusColors } from "../utils/myTaskPageData";

export default function TaskCard({ task, isActive, onClick }) {
    return (
        <motion.button
            onClick={onClick}
            className={`group flex flex-col gap-2 rounded-2xl border px-3.5 py-3 text-left shadow-lg backdrop-blur-md transition ${isActive
                ? "border-cyan-400/70 bg-slate-900/80 shadow-[0_0_35px_rgba(34,211,238,0.35)]"
                : "border-slate-700/80 bg-slate-900/70 hover:border-cyan-400/70 hover:bg-slate-900/90"
                }`}
            variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
            }}
            whileHover={{ y: -2 }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-50">
                        {task.title}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                        <Tag className="h-3 w-3 text-slate-500" />
                        {task.project}
                    </p>
                </div>
                <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }}
                    aria-label="Favorite task"
                    className="rounded-full border border-slate-600/80 bg-slate-950/80 p-1.5 text-slate-400 hover:border-cyan-400/80 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                    <Star
                        className={`h-3.5 w-3.5 ${task.favorite ? "fill-yellow-400 text-yellow-300" : ""}`}
                    />
                </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
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
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {task.dueDate}
                </span>
            </div>

            <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                    <motion.div
                        className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400"
                        style={{ width: `${task.progress}%` }}
                        layout
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(248,250,252,0)_0%,rgba(248,250,252,0.4)_50%,rgba(248,250,252,0)_100%)] opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
                </div>
            </div>
        </motion.button>
    );
}