import { motion } from "framer-motion";
import { Plus, ChevronRight, ChevronDown, CheckSquare } from 'lucide-react';
import { useDispatch } from "react-redux";
import { setIsSubtaskPopupOpen } from "../../../../../store/slice/overviewSlice";
import { usePermissions } from "../hook/usePermissions"; // IMPORT ADDED

const TaskItem = ({ task, selectedItem, setSelectedItem, expandedItems, toggleExpand, onCreateSubtask, variant = 'child' }) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isSelected = selectedItem?.id === task.id;
    const isExpanded = expandedItems.has(task.id);
    const dispatch = useDispatch();

    // FIX: Get permissions
    const { canCreateSubtask } = usePermissions(task);

    if (variant === 'global') {
        return (
            <div>
                <div
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-all ${isSelected ? 'bg-slate-800/80 border-l-2 border-sky-500' : ''}`}
                    onClick={() => setSelectedItem(task)}
                >
                    {hasSubtasks ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(task.id);
                            }}
                            className="p-0.5 hover:bg-slate-700/50 rounded"
                        >
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                        </button>
                    ) : <div className="w-4" />}

                    <div className="ml-2 h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckSquare className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-200 truncate block">{task.title}</span>
                        {task.assignees && task.assignees.length > 0 && (
                            <p className="text-xs text-slate-500">{task.assignees.join(', ')}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {task.isHighPriority && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-400">High</span>
                        )}

                        {/* FIX: Conditional Rendering for Add Button */}
                        {canCreateSubtask && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCreateSubtask(task);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/50 rounded transition-opacity"
                                title="Add Subtask"
                            >
                                <Plus className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                        )}
                    </div>
                </div>

                {isExpanded && hasSubtasks && (
                    <div className="ml-14 mt-1 space-y-1">
                        {task.subtasks.map(subtask => (
                            <div key={subtask.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800/30 transition-colors">
                                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${subtask.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                                    {subtask.completed && <span className="text-white text-xs">✓</span>}
                                </div>
                                <span className={`text-sm ${subtask.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                    {subtask.title}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div>
            <div
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/40 cursor-pointer transition-all ${isSelected ? 'bg-slate-800/80 border-l-2 border-emerald-500' : ''}`}
                onClick={() => setSelectedItem(task)}
            >
                {hasSubtasks ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(task.id);
                        }}
                        className="p-0.5 hover:bg-slate-700/50 rounded"
                    >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                    </button>
                ) : <div className="w-4" />}

                <div className="ml-2 h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-200 truncate block">{task.title}</span>
                    {task.assignees && task.assignees.length > 0 && (
                        <p className="text-xs text-slate-500">{task.assignees.join(', ')}</p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {task.isHighPriority && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-400">High</span>
                    )}
                    <div className={`h-2 w-2 rounded-full ${task.status === 'completed' ? 'bg-emerald-400' : task.status === 'active' ? 'bg-blue-400' : 'bg-slate-500'}`} />

                    {/* FIX: Conditional Rendering for Add Button */}
                    {canCreateSubtask && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateSubtask(task);
                                dispatch(setIsSubtaskPopupOpen(true))
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/50 rounded transition-opacity"
                            title="Add Subtask"
                        >
                            <Plus className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && hasSubtasks && (
                <div className="ml-12 mt-1 space-y-1">
                    {task.subtasks.map(subtask => (
                        <div key={subtask.id} className="flex items-center gap-2 px-3 py-1.5 ml-2 rounded-lg hover:bg-slate-800/30 transition-colors">
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${subtask.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                                {subtask.completed && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className={`text-sm ${subtask.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                {subtask.title}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TaskItem;