import { motion } from "framer-motion";
import { Plus, ChevronRight, ChevronDown, CheckSquare, Flag, Check, MessageSquare, AtSign } from 'lucide-react';
import { useDispatch } from "react-redux";
import { setIsSubtaskPopupOpen } from "../../../../../store/slice/overviewSlice";
import { usePermissions } from "../hook/usePermissions";
import { useAuth } from "../../../../../context/AuthContext";

// Helper for time formatting
const formatActivityTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const TaskItem = ({
    task,
    selectedItem,
    setSelectedItem,
    expandedItems,
    toggleExpand,
    onCreateSubtask,
    variant = 'child',
    isMobile = false,
    onOpenChat
}) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isSelected = selectedItem?.id === task.id;
    const isExpanded = expandedItems.has(task.id);
    const dispatch = useDispatch();
    const { user } = useAuth();

    const { canCreateSubtask } = usePermissions(task);

    const isTaskCompleted = task.status === 'completed';
    const isTaskHighPriority = task.isHighPriority;
    const activeCallCount = (task.activeCallCount || 0) + (task.deepActiveCallCount || 0);
    const taskMentionCount = task.mentionUnreadCount || 0;
    const hasTaskMention = taskMentionCount > 0;
    const hasTaskChildMention = !hasTaskMention && task.hasChildMentionUnread;

    const lastMsg = task.lastMessage;
    const senderName = user.username === lastMsg?.sender?.username ? 'You' : lastMsg?.sender?.username?.split(' ')[0] || 'User';

    const openTaskChat = () => {
        setSelectedItem(task);
        onOpenChat?.(task);
    };

    const handleTaskClick = () => {
        if (isMobile) {
            if (hasSubtasks && !isExpanded) {
                toggleExpand(task.id);
                return;
            }
            openTaskChat();
            return;
        }

        setSelectedItem(task);
        toggleExpand(task.id);
    };

    // GLOBAL VARIANT
    if (variant === 'global') {
        return (
            <div className="mb-1">
                <div
                    className={`group flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-all ${isSelected ? 'bg-slate-800/80 border-l-2 border-sky-500' : 'border-l-2 border-transparent'
                        }`}
                    onClick={handleTaskClick}
                >
                    <div className="flex items-start gap-1">
                        <div className="mt-3">
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
                                <div className="w-4.5" />
                            )}
                        </div>

                        {/* GLOBAL TASK ICON WITH INDICATOR */}
                        <div className="relative flex-shrink-0">
                            <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${isTaskCompleted
                                ? 'bg-emerald-500/20 border-emerald-500/30'
                                : 'bg-emerald-500/10 border-emerald-500/20'
                                }`}>
                                {isTaskCompleted ? (
                                    <Check className="h-5 w-5 text-emerald-400" />
                                ) : (
                                    <CheckSquare className="h-5 w-5 text-emerald-400" />
                                )}
                            </div>

                            {/* Unread & Child Indicators */}
                            {task.unreadCount > 0 ? (
                                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-sky-500 border-2 border-slate-900 flex items-center justify-center">
                                    <span className="text-[9px] font-bold text-white">{task.unreadCount}</span>
                                </div>
                            ) : task.hasChildUnread ? (
                                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-sky-500 border-2 border-slate-900"></div>
                            ) : null}

                            {hasTaskMention ? (
                                <div className="absolute -bottom-1 -left-1 min-h-4 min-w-4 px-1 rounded-full bg-fuchsia-500 border border-slate-900 flex items-center justify-center shadow-sm">
                                    <span className="text-[8px] font-bold text-white flex items-center gap-0.5">
                                        <AtSign className="h-2 w-2" />
                                        {taskMentionCount > 9 ? "9+" : taskMentionCount}
                                    </span>
                                </div>
                            ) : hasTaskChildMention ? (
                                <div className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-amber-400 border border-slate-900 shadow-sm" />
                            ) : null}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex justify-between items-start mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`text-sm font-medium truncate block ${isTaskCompleted ? 'text-slate-500 line-through' : 'text-slate-200'
                                    }`}>
                                    {task.title}
                                </span>
                                {activeCallCount > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
                                        Live {activeCallCount}
                                    </span>
                                )}
                            </div>
                            {(lastMsg || task.updatedAt) && (
                                <span className="text-[10px] text-slate-500 ml-2 whitespace-nowrap">
                                    {formatActivityTime(lastMsg?.createdAt || task.updatedAt)}
                                </span>
                            )}
                        </div>

                        {lastMsg ? (
                            <div className="flex items-center gap-1.5">
                                <MessageSquare className="h-3 w-3 text-slate-600" />
                                <p className="text-xs text-slate-400 truncate">
                                    <span className="text-sky-500/90 font-medium">{senderName}:</span> {lastMsg.content}
                                </p>
                            </div>
                        ) : (
                            task.assignees && task.assignees.length > 0 && (
                                <p className="text-xs text-slate-500">Assigned to: {task.assignees.join(', ')}</p>
                            )
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                        {isTaskHighPriority && (
                            <Flag className="h-3 w-3 text-rose-400 fill-rose-400" />
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

                {isExpanded && hasSubtasks && (
                    <div className="ml-9 mt-1 space-y-1 border-l border-slate-700/50 pl-4">
                        {task.subtasks.map(subtask => {
                            const isSubtaskSelected = selectedItem?.id === subtask.id;
                            const isSubtaskCompleted = subtask.status === 'completed' || subtask.completed;
                            const subtaskMentionCount = subtask.mentionUnreadCount || 0;
                            const hasSubtaskMention = subtaskMentionCount > 0;

                            return (
                                <div
                                    key={subtask.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedItem(subtask);
                                        onOpenChat?.(subtask);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${isSubtaskSelected
                                        ? 'bg-slate-800/80 border-l-2 border-emerald-500'
                                        : 'hover:bg-slate-800/30 border-l-2 border-transparent'
                                        }`}
                                >
                                    <div className="relative">
                                        <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${isSubtaskCompleted
                                            ? 'bg-emerald-500 border-emerald-500'
                                            : 'border-slate-600'
                                            }`}>
                                            {isSubtaskCompleted && (
                                                <Check className="h-2.5 w-2.5 text-white" />
                                            )}
                                        </div>
                                        {/* Subtask direct unread indicator */}
                                        {subtask.unreadCount > 0 && (
                                            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-sky-500 border border-slate-900" />
                                        )}
                                        {hasSubtaskMention && (
                                            <div className="absolute -bottom-1 -left-1 h-2.5 min-w-2.5 px-0.5 rounded-full bg-fuchsia-500 border border-slate-900 flex items-center justify-center">
                                                <AtSign className="h-1.5 w-1.5 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <span className={`text-sm flex-1 truncate ${isSubtaskCompleted ? 'text-slate-500 line-through' : 'text-slate-300'
                                        }`}>
                                        {subtask.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // CHILD VARIANT
    return (
        <div>
            <div
                className={`group flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/40 cursor-pointer transition-all ${isSelected ? 'bg-slate-800/80 border-l-2 border-emerald-500' : 'border-l-2 border-transparent'
                    }`}
                onClick={handleTaskClick}
            >
                <div className="mt-2">
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
                        <div className="w-4.5" />
                    )}
                </div>

                {/* CHILD TASK ICON WITH INDICATOR */}
                <div className="relative flex-shrink-0">
                    <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${isTaskCompleted
                        ? 'bg-emerald-500/20 border-emerald-500/30'
                        : 'bg-emerald-500/10 border-emerald-500/20'
                        }`}>
                        {isTaskCompleted ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                        )}
                    </div>

                    {/* Unread & Child Indicators */}
                    {task.unreadCount > 0 ? (
                        <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-sky-500 border-2 border-slate-900 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white">{task.unreadCount}</span>
                        </div>
                    ) : task.hasChildUnread ? (
                        <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-sky-500 border-2 border-slate-900"></div>
                    ) : null}

                    {hasTaskMention ? (
                        <div className="absolute -bottom-1 -left-1 min-h-3.5 min-w-3.5 px-0.5 rounded-full bg-fuchsia-500 border border-slate-900 flex items-center justify-center shadow-sm">
                            <span className="text-[7px] font-bold text-white flex items-center gap-0.5">
                                <AtSign className="h-2 w-2" />
                                {taskMentionCount > 9 ? "9+" : taskMentionCount}
                            </span>
                        </div>
                    ) : hasTaskChildMention ? (
                        <div className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full bg-amber-400 border border-slate-900 shadow-sm" />
                    ) : null}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-sm font-medium truncate block ${isTaskCompleted ? 'text-slate-500 line-through' : 'text-slate-200'
                                }`}>
                                {task.title}
                            </span>
                            {activeCallCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
                                    Live {activeCallCount}
                                </span>
                            )}
                        </div>
                        {(lastMsg) && (
                            <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                                {formatActivityTime(lastMsg.createdAt)}
                            </span>
                        )}
                    </div>

                    {lastMsg ? (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                            <span className="text-emerald-500/80">{senderName}:</span> {lastMsg.content}
                        </p>
                    ) : (
                        task.assignees && task.assignees.length > 0 && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{task.assignees.join(', ')}</p>
                        )
                    )}
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                    {isTaskHighPriority && (
                        <Flag className="h-3 w-3 text-rose-400 fill-rose-400" />
                    )}

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

            {/* Subtasks (Child View) */}
            {isExpanded && hasSubtasks && (
                <div className="ml-8 mt-1 space-y-1 border-l border-slate-700/30 pl-3">
                    {task.subtasks.map(subtask => {
                        const isSubtaskSelected = selectedItem?.id === subtask.id;
                        const isSubtaskCompleted = subtask.status === 'completed' || subtask.completed;
                        const subtaskMentionCount = subtask.mentionUnreadCount || 0;
                        const hasSubtaskMention = subtaskMentionCount > 0;

                        return (
                            <div
                                key={subtask.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItem(subtask);
                                    onOpenChat?.(subtask);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${isSubtaskSelected
                                    ? 'bg-slate-800/80 border-l-2 border-emerald-500'
                                    : 'hover:bg-slate-800/30 border-l-2 border-transparent'
                                    }`}
                            >
                                <div className="relative">
                                    <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${isSubtaskCompleted
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : 'border-slate-600'
                                        }`}>
                                        {isSubtaskCompleted && (
                                            <Check className="h-2.5 w-2.5 text-white" />
                                        )}
                                    </div>
                                    {/* Subtask unread dot */}
                                    {subtask.unreadCount > 0 && (
                                        <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-sky-500 border border-slate-900" />
                                    )}
                                    {hasSubtaskMention && (
                                        <div className="absolute -bottom-1 -left-1 h-2.5 min-w-2.5 px-0.5 rounded-full bg-fuchsia-500 border border-slate-900 flex items-center justify-center">
                                            <AtSign className="h-1.5 w-1.5 text-white" />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-sm flex-1 truncate ${isSubtaskCompleted ? 'text-slate-500 line-through' : 'text-slate-300'
                                    }`}>
                                    {subtask.title}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TaskItem;
