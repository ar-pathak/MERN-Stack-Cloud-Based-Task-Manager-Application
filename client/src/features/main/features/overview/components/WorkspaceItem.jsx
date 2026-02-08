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
    Check
} from "lucide-react";
import TaskItem from "./TaskItem";
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

const WorkspaceItem = ({
    workspaceId,
    workspace,
    handleCreate,
    selectedItem,
    setSelectedItem,
    expandedItems,
    toggleExpand
}) => {
    const canCreateProject = workspace.permissions?.canCreateProject;
    const canCreateTaskInWs = workspace.permissions?.canCreateTask;
    const wsLastMsg = workspace.lastMessage;
    const { user } = useAuth();
    return (
        <div key={workspaceId} className="mb-1">
            {/* Workspace Row */}
            <div
                className={`group flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-all ${selectedItem?.id === workspaceId ? 'bg-slate-800/80 border-l-2 border-sky-500' : 'border-l-2 border-transparent'
                    }`}
                onClick={() => {
                    setSelectedItem(workspace);
                    toggleExpand(workspaceId);
                }}
            >
                {/* 1. Leading Section: Chevron + Icon */}
                <div className="flex items-start gap-1">
                    <div className="mt-3"> {/* Aligned vertically with the center of the 40px icon */}
                        {(workspace.tasks?.length > 0 || workspace.projects?.length > 0) ? (
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
                        {/* Standardized to h-10 w-10 to match Chat Item */}
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center">
                            <Briefcase className="h-5 w-5 text-sky-400" />
                        </div>
                        {workspace.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-sky-500 border-2 border-slate-900 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-white">{workspace.unreadCount}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Content Section */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-200 truncate">{workspace.name}</span>
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

                    {/* Workspace Last Message */}
                    {wsLastMsg && (
                        <p className="text-xs text-slate-500 truncate">
                            <span className="text-sky-500/80 font-medium">
                                {user.username === wsLastMsg?.sender?.username ? 'You' : wsLastMsg?.sender?.username?.split(' ')[0] || 'User'}:
                            </span> {wsLastMsg.content}
                        </p>
                    )}
                </div>

                {/* 3. Actions (Hover) */}
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

                        return (
                            <div key={project.id}>
                                <div
                                    className={`group flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/40 cursor-pointer transition-all ${selectedItem?.id === project.id ? 'bg-slate-800/80 border-l-2 border-purple-500' : 'border-l-2 border-transparent'
                                        }`}
                                    onClick={() => {
                                        toggleExpand(project.id);
                                        setSelectedItem(project);
                                    }}
                                >
                                    <div className="mt-1">
                                        {(project.tasks?.length > 0) ? (
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

                                    <div className={`flex-shrink-0 h-8 w-8 rounded-lg border flex items-center justify-center ${isProjectCompleted
                                        ? 'bg-purple-500/20 border-purple-500/30'
                                        : 'bg-purple-500/10 border-purple-500/20'
                                        }`}>
                                        {isProjectCompleted ? (
                                            <Check className="h-4 w-4 text-purple-400" />
                                        ) : (
                                            <FolderOpen className="h-4 w-4 text-purple-400" />
                                        )}
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

                                        {/* Project Last Message */}
                                        {projLastMsg && (
                                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                                <span className="text-purple-400/80">
                                                    {user.username === projLastMsg?.sender?.username ? 'You' : projLastMsg?.sender?.username?.split(' ')[0] || 'User'}:
                                                </span> {projLastMsg.content}
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