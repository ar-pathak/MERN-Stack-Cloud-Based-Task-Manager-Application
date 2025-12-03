import { Calendar, Folder, MoreHorizontal } from "lucide-react";
import { cardVariants } from "../utils/cardVariants";
import { motion } from "framer-motion";
export default function ProjectCard({ project, index }) {
    const {
        name,
        code,
        description,
        status,
        progress,
        team,
        dueDate,
        tasksDone,
        tasksTotal,
        priority,
        tag,
    } = project;

    const statusColor =
        status === "In Progress"
            ? "text-amber-300 bg-amber-500/10"
            : status === "Planning"
                ? "text-sky-300 bg-sky-500/10"
                : "text-emerald-300 bg-emerald-500/10";

    const priorityColor =
        priority === "High"
            ? "text-rose-300 bg-rose-500/10"
            : priority === "Medium"
                ? "text-amber-300 bg-amber-500/10"
                : "text-slate-300 bg-slate-500/10";

    return (
        <motion.button
            custom={index}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-950/95 via-slate-950/90 to-slate-950/80 p-4 text-left shadow-[0_24px_60px_rgba(15,23,42,0.98)] backdrop-blur"
        >
            {/* Subtle water-ish gleam */}
            <div className="pointer-events-none absolute inset-x-[-40%] top-0 h-12 bg-[radial-gradient(circle,_rgba(56,189,248,0.18)_0,_transparent_60%)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/80 shadow-inner shadow-slate-800/80">
                        <Folder className="h-4 w-4 text-cyan-300" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-400">{code}</p>
                        <h3 className="text-sm font-semibold text-slate-50">{name}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}
                    >
                        {status}
                    </span>
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
                        className="rounded-full p-1 text-slate-500 hover:bg-slate-800/80 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </div>
                </div>
            </div>

            <p className="mt-2 line-clamp-2 text-xs text-slate-400">{description}</p>

            {/* Progress */}
            <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Progress</span>
                    <span className="font-medium text-slate-200">{progress}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                    <motion.div
                        className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400"
                        initial={{ width: 0 }}
                        animate={{
                            width: `${progress}%`,
                            transition: {
                                delay: 0.15,
                                duration: 0.5,
                                ease: "easeOut",
                            },
                        }}
                    />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                    {tasksDone}/{tasksTotal} tasks completed
                </p>
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-end justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-300">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        Due {dueDate}
                    </span>
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${priorityColor}`}
                    >
                        {priority} priority
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-cyan-300">
                        {tag}
                    </span>
                </div>

                {/* Team bubbles */}
                <div className="flex -space-x-2">
                    {team.map((initials, i) => (
                        <motion.div
                            key={initials + i}
                            whileHover={{ y: -1 }}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-900 bg-slate-700/80 text-[9px] font-semibold text-slate-50 shadow-md shadow-slate-950/70"
                        >
                            {initials}
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.button>
    );
}