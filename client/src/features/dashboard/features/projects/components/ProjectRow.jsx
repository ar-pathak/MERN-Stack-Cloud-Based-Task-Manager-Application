import { Calendar, Folder, MoreHorizontal } from "lucide-react";
import { cardVariants } from "../utils/cardVariants";
import { motion } from "framer-motion";
export default function ProjectRow({ project, index }) {
    const {
        name,
        code,
        status,
        progress,
        dueDate,
        tasksDone,
        tasksTotal,
        priority,
        tag,
    } = project;

    return (
        <motion.div
            custom={index}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.95)]"
        >
            {/* Left colored strip */}
            <div className="h-10 w-1.5 rounded-full bg-gradient-to-b from-cyan-400 via-sky-400 to-indigo-400" />

            <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex flex-1 items-center gap-3">
                    <div className="hidden h-8 w-8 items-center justify-center rounded-xl bg-slate-900/80 text-cyan-300 sm:flex">
                        <Folder className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                                {code}
                            </span>
                            <p className="text-sm font-semibold text-slate-50">{name}</p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                            <span className="inline-flex items-center">
                                <Calendar className="mr-1 h-3 w-3 text-slate-500" />
                                Due {dueDate}
                            </span>
                            <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-cyan-300">
                                {tag}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Middle: progress */}
                <div className="flex w-full flex-col gap-1 sm:w-64">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{status}</span>
                        <span className="font-medium text-slate-100">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400"
                            initial={{ width: 0 }}
                            animate={{
                                width: `${progress}%`,
                                transition: { duration: 0.4, ease: "easeOut" },
                            }}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400">
                        {tasksDone}/{tasksTotal} tasks done
                    </p>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3">
                    <span
                        className={`hidden rounded-full px-2 py-0.5 text-[10px] sm:inline-flex ${priority === "High"
                            ? "bg-rose-500/10 text-rose-300"
                            : priority === "Medium"
                                ? "bg-amber-500/10 text-amber-300"
                                : "bg-slate-500/10 text-slate-300"
                            }`}
                    >
                        {priority}
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
                        className="rounded-full p-1.5 text-slate-500 hover:bg-slate-900/90 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}