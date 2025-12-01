import { motion } from "framer-motion";
import { Plus } from "lucide-react";
const TaskColumns = () => {
    const columns = [
        {
            title: "Today",
            accent: "border-sky-500/70",
            dot: "bg-sky-400",
            tasks: [
                {
                    title: "Design dashboard layout",
                    tag: "UI/UX",
                    priority: "High",
                    status: "In progress",
                    eta: "2h left",
                },
                {
                    title: "Sync tasks with cloud",
                    tag: "Infra",
                    priority: "Medium",
                    status: "Queued",
                    eta: "Today",
                },
            ],
        },
        {
            title: "Upcoming",
            accent: "border-amber-400/70",
            dot: "bg-amber-400",
            tasks: [
                {
                    title: "Integrate real-time updates",
                    tag: "Backend",
                    priority: "High",
                    status: "Planned",
                    eta: "Tomorrow",
                },
                {
                    title: "Add team workspaces",
                    tag: "Product",
                    priority: "Medium",
                    status: "Planned",
                    eta: "In 3 days",
                },
            ],
        },
        {
            title: "Backlog",
            accent: "border-slate-700/80",
            dot: "bg-slate-500",
            tasks: [
                {
                    title: "Dark / light theme",
                    tag: "UI",
                    priority: "Low",
                    status: "Backlog",
                    eta: "Later",
                },
                {
                    title: "Mobile offline sync",
                    tag: "Mobile",
                    priority: "Low",
                    status: "Backlog",
                    eta: "Later",
                },
            ],
        },
    ];

    return (
        <div className="grid gap-3 md:grid-cols-3">
            {columns.map((col, colIndex) => (
                <motion.div
                    key={col.title}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + colIndex * 0.06, duration: 0.4 }}
                    className="flex flex-col rounded-2xl border border-slate-800/70 bg-slate-950/70 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.9)]"
                >
                    <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span
                                className={`h-6 w-1.5 rounded-full ${col.accent} bg-slate-800/80`}
                            />
                            <p className="text-xs font-medium tracking-tight">
                                {col.title}
                            </p>
                        </div>
                        <button className="rounded-xl border border-slate-800/70 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-300 hover:border-sky-500/70 hover:text-sky-100">
                            View all
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {col.tasks.map((task, idx) => (
                            <motion.div
                                key={task.title}
                                whileHover={{ y: -2, scale: 1.01 }}
                                className="relative overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/70 p-2.5"
                            >
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-slate-100/5 to-transparent" />
                                <div className="relative flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <p className="text-xs font-medium leading-tight">
                                            {task.title}
                                        </p>
                                        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                            <span
                                                className={`inline-flex h-1.5 w-1.5 rounded-full ${col.dot
                                                    }`}
                                            />
                                            {task.tag}
                                            <span className="mx-1 text-slate-600">•</span>
                                            <span>{task.status}</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[9px] ${task.priority === "High"
                                                ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
                                                : task.priority === "Medium"
                                                    ? "bg-amber-500/15 text-amber-200 border border-amber-400/40"
                                                    : "bg-slate-700/60 text-slate-200 border border-slate-500/60"
                                                }`}
                                        >
                                            {task.priority}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {task.eta}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <button className="mt-3 inline-flex items-center justify-center gap-1 rounded-xl border border-dashed border-slate-700/80 bg-slate-900/40 px-2 py-1.5 text-[11px] text-slate-300 hover:border-sky-500/70 hover:text-sky-100">
                        <Plus className="h-3 w-3" />
                        New task
                    </button>
                </motion.div>
            ))}
        </div>
    );
};

export default TaskColumns;