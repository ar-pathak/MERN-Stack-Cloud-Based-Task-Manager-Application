import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    PieChart, Link as LinkIcon, Image as ImageIcon,
} from "lucide-react";


// Enhanced Progress Section
const ProgressSection = ({ item, overview }) => {
    const data = useMemo(() => {
        if (item.type === 'workspace' && overview?.stats) {
            const { totalTasks = 0, completedTasks = 0, inProgressTasks = 0 } = overview.stats;
            return {
                total: totalTasks,
                completed: completedTasks,
                inProgress: inProgressTasks,
                todo: totalTasks - completedTasks - inProgressTasks,
                label: 'Workspace Progress'
            };
        }
        if (item.type === 'task') {
            const total = item.subtasks?.length || 0;
            const completed = item.subtasks?.filter(s => s.completed).length || 0;
            return { total, completed, inProgress: 0, todo: total - completed, label: 'Subtasks Progress' };
        }
        return null;
    }, [item, overview]);

    if (!data || data.total === 0) return null;

    const completedPercent = Math.round((data.completed / data.total) * 100);
    const inProgressPercent = Math.round((data.inProgress / data.total) * 100);
    const todoPercent = 100 - completedPercent - inProgressPercent;

    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <PieChart className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{data.label}</h3>
            </div>

            <div className="bg-slate-900/40 rounded-xl p-5 border border-slate-800/50 space-y-4">
                {/* Main Progress Bar */}
                <div>
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
                            {completedPercent}%
                        </span>
                        <span className="text-xs text-slate-500 mb-1">
                            {data.completed} / {data.total} completed
                        </span>
                    </div>

                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${completedPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="bg-gradient-to-r from-emerald-500 to-green-600"
                        />
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${inProgressPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                            className="bg-gradient-to-r from-amber-500 to-orange-600"
                        />
                    </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <div className="text-xs text-emerald-400 font-medium mb-1">Completed</div>
                        <div className="text-lg font-bold text-emerald-300">{data.completed}</div>
                    </div>
                    <div className="text-center p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <div className="text-xs text-amber-400 font-medium mb-1">In Progress</div>
                        <div className="text-lg font-bold text-amber-300">{data.inProgress}</div>
                    </div>
                    <div className="text-center p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
                        <div className="text-xs text-slate-400 font-medium mb-1">To Do</div>
                        <div className="text-lg font-bold text-slate-300">{data.todo}</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProgressSection