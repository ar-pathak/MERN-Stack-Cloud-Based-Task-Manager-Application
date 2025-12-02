import { motion } from "framer-motion";
import EmptyTasksState from "./EmptyTasksState";
import TaskCard from "./TaskCard";
import TaskRow from "./TaskRow";


export default function TaskListArea({ tasks, view, selectedTask, setSelectedTask }) {
    if (tasks.length === 0) {
        return <EmptyTasksState />;
    }

    if (view === "grid") {
        return (
            <motion.div
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.04 } },
                }}
            >
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        isActive={selectedTask && selectedTask.id === task.id}
                        onClick={() => setSelectedTask(task)}
                    />
                ))}
            </motion.div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/60 shadow-[0_18px_60px_rgba(15,23,42,0.9)]">
            <div className="hidden border-b border-slate-700/70 bg-slate-900/80 px-4 py-2 text-[11px] text-slate-400 md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_120px_120px_70px] md:gap-2">
                <span>Task</span>
                <span>Project</span>
                <span>Status</span>
                <span>Due</span>
                <span className="text-right">Progress</span>
            </div>

            <motion.div
                className="divide-y divide-slate-800/70"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.035 } },
                }}
            >
                {tasks.map((task) => (
                    <TaskRow
                        key={task.id}
                        task={task}
                        isActive={selectedTask && selectedTask.id === task.id}
                        onClick={() => setSelectedTask(task)}
                    />
                ))}
            </motion.div>
        </div>
    );
}