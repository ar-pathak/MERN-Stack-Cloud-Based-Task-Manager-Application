import { motion } from "framer-motion";
import { Plus, ChevronRight, ChevronDown, CheckSquare, Flag, Check } from 'lucide-react';
import { useDispatch } from "react-redux";
import { setIsSubtaskPopupOpen } from "../../../../../store/slice/overviewSlice";
import { usePermissions } from "../hook/usePermissions";

const TaskItem = ({ task, selectedItem, setSelectedItem, expandedItems, toggleExpand, onCreateSubtask, variant = 'child' }) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isSelected = selectedItem?.id === task.id;
    const isExpanded = expandedItems.has(task.id);
    const dispatch = useDispatch();

    const { canCreateSubtask } = usePermissions(task);

    const isTaskCompleted = task.status === 'completed';
    const isTaskHighPriority = task.isHighPriority;

    if (variant === 'global') {
        return (
            <div>
                {/* Parent Task Row */}
                <div
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-all ${isSelected ? 'bg-slate-800/80 border-l-2 border-sky-500' : ''
                        }`}
                    onClick={() => {
                        setSelectedItem(task);
                        toggleExpand(task.id)
                    }}
                >
                    {hasSubtasks ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(task.id);
                            }}
                            className="p-0.5 hover:bg-slate-700/50 rounded"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            )}
                        </button>
                    ) : (
                        <div className="w-4" />
                    )}

                    <div className={`ml-2 h-9 w-9 rounded-lg border flex items-center justify-center ${isTaskCompleted
                        ? 'bg-emerald-500/20 border-emerald-500/30'
                        : 'bg-emerald-500/10 border-emerald-500/20'
                        }`}>
                        {isTaskCompleted ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium truncate block ${isTaskCompleted ? 'text-slate-500 line-through' : 'text-slate-200'
                            }`}>
                            {task.title}
                        </span>
                        {task.assignees && task.assignees.length > 0 && (
                            <p className="text-xs text-slate-500">{task.assignees.join(', ')}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">

                        {/* High Priority Indicator */}
                        {isTaskHighPriority && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                                <Flag className="h-3 w-3 text-rose-400 fill-rose-400" />
                                <span className="text-[10px] font-medium text-rose-400">High</span>
                            </div>
                        )}

                        {/* Status Indicator */}
                        {isTaskCompleted && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span className="text-[10px] font-medium text-emerald-400">Done</span>
                            </div>
                        )}

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

                {/* Subtasks */}
                {isExpanded && hasSubtasks && (
                    <div className="ml-14 mt-1 space-y-1">
                        {task.subtasks.map(subtask => {
                            const isSubtaskSelected = selectedItem?.id === subtask.id;
                            const isSubtaskCompleted = subtask.status === 'completed' || subtask.completed;
                            const isSubtaskHighPriority = subtask.isHighPriority;

                            return (
                                <div
                                    key={subtask.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedItem(subtask);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${isSubtaskSelected
                                        ? 'bg-slate-800/80 border-l-2 border-emerald-500'
                                        : 'hover:bg-slate-800/30 border-l-2 border-transparent'
                                        }`}
                                >
                                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${isSubtaskCompleted
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : 'border-slate-600'
                                        }`}>
                                        {isSubtaskCompleted && (
                                            <Check className="h-3 w-3 text-white" />
                                        )}
                                    </div>

                                    <span className={`text-sm flex-1 ${isSubtaskCompleted ? 'text-slate-500 line-through' : 'text-slate-300'
                                        }`}>
                                        {subtask.title}
                                    </span>

                                    {/* Subtask Indicators */}
                                    <div className="flex items-center gap-1">
                                        {isSubtaskHighPriority && (
                                            <Flag className="h-3 w-3 text-rose-400 fill-rose-400" />
                                        )}
                                        {isSubtaskCompleted && (
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div>
            {/* Parent Task Row (Default View) */}
            <div
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/40 cursor-pointer transition-all ${isSelected ? 'bg-slate-800/80 border-l-2 border-emerald-500' : ''
                    }`}
                onClick={() => {
                    setSelectedItem(task);
                    toggleExpand(task.id)
                }}
            >
                {hasSubtasks ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(task.id);
                        }}
                        className="p-0.5 hover:bg-slate-700/50 rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                    </button>
                ) : (
                    <div className="w-4" />
                )}

                <div className={`ml-2 h-7 w-7 rounded-lg border flex items-center justify-center ${isTaskCompleted
                    ? 'bg-emerald-500/20 border-emerald-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                    {isTaskCompleted ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <span className={`text-sm truncate block ${isTaskCompleted ? 'text-slate-500 line-through' : 'text-slate-200'
                        }`}>
                        {task.title}
                    </span>
                    {task.assignees && task.assignees.length > 0 && (
                        <p className="text-xs text-slate-500">{task.assignees.join(', ')}</p>
                    )}
                </div>

                <div className="flex items-center gap-1.5">

                    {/* High Priority */}
                    {isTaskHighPriority && (
                        <Flag className="h-3 w-3 text-rose-400 fill-rose-400" />
                    )}

                    {/* Status Dot */}
                    <div className={`h-2 w-2 rounded-full ${isTaskCompleted
                        ? 'bg-emerald-400'
                        : task.status === 'active'
                            ? 'bg-blue-400'
                            : 'bg-slate-500'
                        }`} />

                    {canCreateSubtask && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateSubtask(task);
                                dispatch(setIsSubtaskPopupOpen(true));
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/50 rounded transition-opacity"
                            title="Add Subtask"
                        >
                            <Plus className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Subtasks */}
            {isExpanded && hasSubtasks && (
                <div className="ml-12 mt-1 space-y-1">
                    {task.subtasks.map(subtask => {
                        const isSubtaskSelected = selectedItem?.id === subtask.id;
                        const isSubtaskCompleted = subtask.status === 'completed' || subtask.completed;
                        const isSubtaskHighPriority = subtask.isHighPriority;

                        return (
                            <div
                                key={subtask.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItem(subtask);
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 ml-2 rounded-lg transition-all cursor-pointer ${isSubtaskSelected
                                    ? 'bg-slate-800/80 border-l-2 border-emerald-500'
                                    : 'hover:bg-slate-800/30 border-l-2 border-transparent'
                                    }`}
                            >
                                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${isSubtaskCompleted
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-slate-600'
                                    }`}>
                                    {isSubtaskCompleted && (
                                        <Check className="h-3 w-3 text-white" />
                                    )}
                                </div>

                                <span className={`text-sm flex-1 ${isSubtaskCompleted ? 'text-slate-500 line-through' : 'text-slate-300'
                                    }`}>
                                    {subtask.title}
                                </span>

                                <div className="flex items-center gap-1">
                                    {isSubtaskHighPriority && (
                                        <Flag className="h-3 w-3 text-rose-400 fill-rose-400" />
                                    )}
                                    {isSubtaskCompleted && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TaskItem;
