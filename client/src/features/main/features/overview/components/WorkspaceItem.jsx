import {
    BellOff,
    ChevronRight,
    ChevronDown,
    Pin,
    Star,
    Briefcase,
    FolderOpen,
    CheckSquare,
    Plus,
    Flag,
    Check,
    AtSign
} from "lucide-react";
import TaskItem from "./TaskItem";
import { useAuth } from "../../../../../context/AuthContext";
import { getMessagePreviewText } from "../utils/messagePreview";

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

const WorkspaceItem = ({
    workspaceId,
    workspace,
    handleCreate,
    selectedItem,
    setSelectedItem,
    isMobile = false,
    onOpenChat,
    expandedItems,
    toggleExpand
}) => {
    const canCreateProject = workspace.permissions?.canCreateProject;
    const canCreateTaskInWs = workspace.permissions?.canCreateTask;
    const wsLastMsg = workspace.lastMessage;
    const activeCallCount = (workspace.activeCallCount || 0) + (workspace.deepActiveCallCount || 0);
    const workspaceMentionCount = workspace.mentionUnreadCount || 0;
    const hasWorkspaceMention = workspaceMentionCount > 0;
    const hasWorkspaceChildMention = !hasWorkspaceMention && workspace.hasChildMentionUnread;
    const { user } = useAuth();
    const hasWorkspaceChildren = (workspace.tasks?.length > 0) || (workspace.projects?.length > 0);
    const isWorkspaceExpanded = expandedItems.has(workspaceId);

    const handleWorkspaceClick = () => {
        if (isMobile) {
            if (hasWorkspaceChildren && !isWorkspaceExpanded) {
                toggleExpand(workspaceId);
                return;
            }
            setSelectedItem(workspace);
            onOpenChat?.(workspace);
            return;
        }

        setSelectedItem(workspace);
        toggleExpand(workspaceId);
    };

    return (
        <div key={workspaceId} className="mb-1">
            {/* Workspace Row */}
            <div
                className={`group flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-all ${selectedItem?.id === workspaceId ? 'bg-slate-800/80 border-l-2 border-sky-500' : 'border-l-2 border-transparent'
                    }`}
                onClick={handleWorkspaceClick}
            >
                {/* 1. Leading Section: Chevron + Icon */}
                <div className="flex items-start gap-1">
                    <div className="mt-3">
                        {hasWorkspaceChildren ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(workspaceId);
                                }}
                                className="p-0.5 hover:bg-slate-700/50 rounded"
                            >
                                {expandedItems.has(workspaceId) ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                )}
                            </button>
                        ) : (
                            <div className="w-4.5" />
                        )}
                    </div>

                    <div className="relative flex-shrink-0">
                        {/* Workspace Icon */}
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center">
                            <Briefcase className="h-5 w-5 text-sky-400" />
                        </div>

                        {/* UNREAD INDICATORS */}
                        {workspace.unreadCount > 0 ? (
                            // Main Badge (Count)
                            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-sky-500 border-2 border-slate-900 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-white">{workspace.unreadCount}</span>
                            </div>
                        ) : workspace.hasChildUnread ? (
                            // Child Indicator (Dot)
                            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-sky-500 border-2 border-slate-900"></div>
                        ) : null}

                        {hasWorkspaceMention ? (
                            <div className="absolute -bottom-1 -left-1 min-h-4 min-w-4 px-1 rounded-full bg-fuchsia-500 border border-slate-900 flex items-center justify-center shadow-md">
                                <span className="text-[8px] font-bold text-white flex items-center gap-0.5">
                                    <AtSign className="h-2 w-2" />
                                    {workspaceMentionCount > 9 ? "9+" : workspaceMentionCount}
                                </span>
                            </div>
                        ) : hasWorkspaceChildMention ? (
                            <div className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-amber-400 border border-slate-900 shadow-sm" />
                        ) : null}
                    </div>
                </div>

                {/* 2. Content Section */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-200 truncate">{workspace.name}</span>
                            {activeCallCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    Live {activeCallCount}
                                </span>
                            )}
                            {workspace.starred && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                            {workspace.pinned && <Pin className="h-3 w-3 text-slate-500" />}
                            {workspace.muted && <BellOff className="h-3 w-3 text-slate-500" />}
                        </div>
                        {wsLastMsg && (
                            <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                                {formatActivityTime(wsLastMsg.createdAt)}
                            </span>
                        )}
                    </div>

                    {wsLastMsg && (
                        <p className="text-xs text-slate-500 truncate">
                            <span className="text-sky-500/80 font-medium">
                                {user.username === wsLastMsg?.sender?.username ? 'You' : wsLastMsg?.sender?.username?.split(' ')[0] || 'User'}:
                            </span> {getMessagePreviewText(wsLastMsg)}
                        </p>
                    )}
                </div>

                {/* 3. Actions */}
                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity mt-0.5">
                    {canCreateProject && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCreate(workspace, 'project', 'workspace');
                            }}
                            className="p-1 hover:bg-slate-700/50 rounded"
                            title="Add Project"
                        >
                            <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                    )}

                    {canCreateTaskInWs && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCreate(workspace, 'task', 'workspace');
                            }}
                            className="p-1 hover:bg-slate-700/50 rounded"
                            title="Add Task"
                        >
                            <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Projects & Tasks under Workspace */}
            {expandedItems.has(workspaceId) && (
                <div className="ml-6 mt-1 space-y-1 border-l border-slate-800 pl-3">
                    {/* Projects */}
                    {workspace.projects?.map(project => {
                        const canCreateTaskInProject = project.permissions?.canCreateTask;
                        const isProjectCompleted = project.status === 'completed';
                        const isProjectHighPriority = project.isHighPriority;
                        const projLastMsg = project.lastMessage;
                        const hasProjectChildren = project.tasks?.length > 0;
                        const isProjectExpanded = expandedItems.has(project.id);
                        const projectMentionCount = project.mentionUnreadCount || 0;
                        const hasProjectMention = projectMentionCount > 0;
                        const hasProjectChildMention = !hasProjectMention && project.hasChildMentionUnread;

                        return (
                            <div key={project.id}>
                                <div
                                    className={`group flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/40 cursor-pointer transition-all ${selectedItem?.id === project.id ? 'bg-slate-800/80 border-l-2 border-purple-500' : 'border-l-2 border-transparent'
                                        }`}
                                    onClick={() => {
                                        if (isMobile) {
                                            if (hasProjectChildren && !isProjectExpanded) {
                                                toggleExpand(project.id);
                                                return;
                                            }
                                            setSelectedItem(project);
                                            onOpenChat?.(project);
                                            return;
                                        }

                                        toggleExpand(project.id);
                                        setSelectedItem(project);
                                    }}
                                >
                                    <div className="mt-1">
                                        {hasProjectChildren ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpand(project.id);
                                                }}
                                                className="p-0.5 hover:bg-slate-700/50 rounded"
                                            >
                                                {expandedItems.has(project.id) ? (
                                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-4.5 h-4.5" />
                                        )}
                                    </div>

                                    {/* PROJECT ICON WITH INDICATORS */}
                                    <div className="relative flex-shrink-0">
                                        <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${isProjectCompleted
                                            ? 'bg-purple-500/20 border-purple-500/30'
                                            : 'bg-purple-500/10 border-purple-500/20'
                                            }`}>
                                            {isProjectCompleted ? (
                                                <Check className="h-4 w-4 text-purple-400" />
                                            ) : (
                                                <FolderOpen className="h-4 w-4 text-purple-400" />
                                            )}
                                        </div>

                                        {/* Indicators */}
                                        {project.unreadCount > 0 ? (
                                            <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-sky-500 border-2 border-slate-900 flex items-center justify-center">
                                                <span className="text-[8px] font-bold text-white">{project.unreadCount}</span>
                                            </div>
                                        ) : project.hasChildUnread ? (
                                            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-sky-500 border-2 border-slate-900"></div>
                                        ) : null}

                                        {hasProjectMention ? (
                                            <div className="absolute -bottom-1 -left-1 min-h-3.5 min-w-3.5 px-0.5 rounded-full bg-fuchsia-500 border border-slate-900 flex items-center justify-center shadow-sm">
                                                <span className="text-[7px] font-bold text-white flex items-center gap-0.5">
                                                    <AtSign className="h-2 w-2" />
                                                    {projectMentionCount > 9 ? "9+" : projectMentionCount}
                                                </span>
                                            </div>
                                        ) : hasProjectChildMention ? (
                                            <div className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full bg-amber-400 border border-slate-900 shadow-sm" />
                                        ) : null}
                                    </div>

                                    <div className="flex-1 min-w-0 ml-1.5 pt-0.5">
                                        <div className="flex justify-between items-start">
                                            <span className={`text-sm font-medium truncate block ${isProjectCompleted ? 'text-slate-500 line-through' : 'text-slate-200'
                                                }`}>
                                                {project.name}
                                            </span>
                                            {projLastMsg && (
                                                <span className="text-[10px] text-slate-500 ml-2 whitespace-nowrap">
                                                    {formatActivityTime(projLastMsg.createdAt)}
                                                </span>
                                            )}
                                        </div>

                                        {projLastMsg && (
                                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                                <span className="text-purple-400/80">
                                                    {user.username === projLastMsg?.sender?.username ? 'You' : projLastMsg?.sender?.username?.split(' ')[0] || 'User'}:
                                                </span> {getMessagePreviewText(projLastMsg)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 mt-1">
                                        {isProjectHighPriority && (
                                            <Flag className="h-3 w-3 text-rose-400 fill-rose-400" />
                                        )}
                                        {canCreateTaskInProject && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCreate(workspace, 'task', 'project', project);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/50 rounded transition-opacity"
                                                title="Add Task"
                                            >
                                                <Plus className="h-3.5 w-3.5 text-slate-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Tasks under Project */}
                                {expandedItems.has(project.id) && project.tasks?.map(task => (
                                    <div key={task.id} className="ml-4">
                                        <TaskItem
                                            task={task}
                                            selectedItem={selectedItem}
                                            setSelectedItem={setSelectedItem}
                                            expandedItems={expandedItems}
                                            toggleExpand={toggleExpand}
                                            onCreateSubtask={(task) => handleCreate(workspace, 'subtask', 'task', null, task)}
                                            isMobile={isMobile}
                                            onOpenChat={onOpenChat}
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                    })}

                    {/* Direct Workspace Tasks */}
                    {workspace.tasks?.length > 0 && (
                        <div className="mt-1">
                            {workspace.tasks.map(task => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    selectedItem={selectedItem}
                                    setSelectedItem={setSelectedItem}
                                    expandedItems={expandedItems}
                                    toggleExpand={toggleExpand}
                                    onCreateSubtask={(task) => handleCreate(workspace, 'subtask', 'task', null, task)}
                                    variant="child"
                                    isMobile={isMobile}
                                    onOpenChat={onOpenChat}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WorkspaceItem;
