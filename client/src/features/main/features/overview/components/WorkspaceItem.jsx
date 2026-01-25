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

    return (
        <div key={workspaceId} className="mb-2">
            {/* Workspace Row */}
            <div
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-all ${selectedItem?.id === workspaceId ? 'bg-slate-800/80 border-l-2 border-sky-500' : ''
                    }`}
                onClick={() => {
                    setSelectedItem(workspace);
                    toggleExpand(workspaceId);
                }}
            >
                {(workspace.tasks?.length > 0 || workspace.projects?.length > 0) ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(workspaceId);
                        }}
                        className="p-0.5 hover:bg-slate-700/50 rounded"
                    >
                        {expandedItems.has(workspaceId) ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                    </button>
                ) : (
                    <div className="w-5 h-5" />
                )}

                <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-sky-400" />
                    </div>
                    {workspace.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-sky-500 border-2 border-slate-900 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white">{workspace.unreadCount}</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-200 truncate">{workspace.name}</span>
                        {workspace.starred && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                        {workspace.pinned && <Pin className="h-3 w-3 text-slate-500" />}
                        {workspace.muted && <BellOff className="h-3 w-3 text-slate-500" />}
                    </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
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
                <div className="ml-6 mt-1 space-y-1">
                    {/* Projects */}
                    {workspace.projects?.map(project => {
                        const canCreateTaskInProject = project.permissions?.canCreateTask;
                        const isProjectCompleted = project.status === 'completed';
                        const isProjectHighPriority = project.isHighPriority;

                        return (
                            <div key={project.id}>
                                <div
                                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800/40 cursor-pointer transition-all ${selectedItem?.id === project.id ? 'bg-slate-800/80 border-l-2 border-purple-500' : ''
                                        }`}
                                    onClick={() => {
                                        toggleExpand(project.id);
                                        setSelectedItem(project);
                                    }}
                                >
                                    {(project.tasks?.length > 0) ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpand(project.id);
                                            }}
                                            className="p-0.5 hover:bg-slate-700/50 rounded"
                                        >
                                            {expandedItems.has(project.id) ? (
                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-slate-400" />
                                            )}
                                        </button>
                                    ) : (
                                        <div className="w-5 h-5" />
                                    )}

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

                                    <span className={`text-sm font-medium flex-1 truncate ${isProjectCompleted ? 'text-slate-500 line-through' : 'text-slate-200'
                                        }`}>
                                        {project.name}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        {/* High Priority */}
                                        {isProjectHighPriority && (
                                            <Flag className="h-3 w-3 text-rose-400 fill-rose-400" />
                                        )}

                                        {/* Completion Status */}
                                        {isProjectCompleted && (
                                            <div className="h-2 w-2 rounded-full bg-emerald-400" />
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
                                    <div key={task.id} className="ml-6">
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
                        <div>
                            {workspace.tasks.map(task => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    selectedItem={selectedItem}
                                    setSelectedItem={setSelectedItem}
                                    expandedItems={expandedItems}
                                    toggleExpand={toggleExpand}
                                    onCreateSubtask={(task) => handleCreate(workspace, 'subtask', 'task', null, task)}
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