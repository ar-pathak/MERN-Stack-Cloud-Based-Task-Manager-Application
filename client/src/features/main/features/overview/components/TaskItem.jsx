import {motion} from "framer-motion"
import { CheckSquare } from "lucide-react";

const TaskItem = ({ task, selectedItem, onItemClick }) => {
    const isSelected = selectedItem?.id === task.id;

    return (
        <motion.button
            whileHover={{ x: 2 }}
            onClick={() => onItemClick(task, false)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${isSelected
                ? "bg-slate-800/80 border-l-2 border-green-500"
                : "hover:bg-slate-800/40"
                }`}
        >
            <div className="h-8 w-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckSquare className="h-3.5 w-3.5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
                <span className={`text-sm truncate block ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                    {task.name}
                </span>
                <p className="text-xs text-slate-500">{task.assignee}</p>
            </div>
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${task.status === "completed" ? "bg-emerald-400" :
                task.status === "in-progress" ? "bg-blue-400" :
                    "bg-slate-500"
                }`} />
        </motion.button>
    );
};

export default TaskItem