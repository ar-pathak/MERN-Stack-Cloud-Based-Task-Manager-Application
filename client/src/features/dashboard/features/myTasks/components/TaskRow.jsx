import { motion } from "framer-motion";
import { Calendar, MoreHorizontal, Tag } from "lucide-react";
import { statusColors } from "../utils/myTaskPageData";

export default function TaskRow({ task, isActive, onClick }) {
    return (
        <motion.button
            onClick={onClick}
            className={`flex w-full flex-col gap-2 px-3 py-3 text-left transition md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_120px_120px_70px] md:items-center md:gap-2 md:px-4 md:py-2.5 ${isActive
                ? "bg-cyan-500/8"
                : "hover:bg-slate-800/70 focus-visible:bg-slate-800/70"
                }`}
            variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0 },
            }}
        >
            {/* Task title + meta */}
            <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-50">
                        {task.title}
                    </p>
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
                        aria-label="More options"
                        className="rounded-full border border-slate-600/70 bg-slate-900/80 p-1 hover:border-cyan-400/80 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    >
                        <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">
                        <Tag className="h-3 w-3 text-slate-400" />
                        {task.project}
                    </span>
                    {task.tags.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-full bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-400"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Project (for desktop) */}
            <div className="hidden text-xs text-slate-300 md:block">
                {task.project}
            </div>

            {/* Status pill */}
            <div className="flex items-center gap-2">
                <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${statusColors[task.status]}`}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {task.status}
                </span>
            </div>

            {/* Due date */}
            <div className="flex items-center gap-1 text-xs text-slate-300">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {task.dueDate}
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between gap-2 md:justify-end">
                <div className="relative h-1.5 w-full max-w-[90px] overflow-hidden rounded-full bg-slate-800/80">
                    <motion.div
                        className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400"
                        style={{ width: `${task.progress}%` }}
                        layout
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                    />
                </div>
                <span className="text-[11px] text-slate-400">
                    {task.progress}%
                </span>
            </div>
        </motion.button>
    );
}