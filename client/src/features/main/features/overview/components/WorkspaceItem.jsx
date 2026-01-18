import {
    BellOff,
    ChevronRight,
    ChevronDown,
    Pin,
    Star,
    Briefcase,
    FolderOpen,
    CheckSquare,
    Plus
} from "lucide-react";
import TaskItem from "./TaskItem";
import { useDispatch } from "react-redux";
import { setIsProjectPopupOpen, setTaskPopupOpen } from "../../../../../store/slice/overviewSlice";

const WorkspaceItem = ({ workspaceId, workspace, handleCreate, selectedItem, setSelectedItem, expandedItems, toggleExpand }) => {
    const dispatch = useDispatch();

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
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch(setTaskPopupOpen(true)); // ✅ Fixed: was missing (true)
                        }}
                        className="p-1 hover:bg-slate-700/50 rounded"
                        title="Add Task"
                    >
                        <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Projects & Tasks under Workspace */}
            {expandedItems.has(workspaceId) && (
                <div className="ml-6 mt-1 space-y-1">
                    {/* Projects */}
                    {workspace.projects?.map(project => (
                        <div key={project.id}>
                            <div
                                className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800/40 cursor-pointer transition-all ${selectedItem?.id === project.id ? 'bg-slate-800/80 border-l-2 border-purple-500' : ''
                                    }`}
                                onClick={() => setSelectedItem(project)}
                            >
                                {(project.tasks?.length > 0) ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleExpand(project.id); // ✅ Fixed: was using workspaceId instead of project.id
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

                                <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                    <FolderOpen className="h-4 w-4 text-purple-400" />
                                </div>
                                <span className="text-sm font-medium text-slate-200 flex-1 truncate">{project.name}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(setTaskPopupOpen(true));
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/50 rounded transition-opacity"
                                    title="Add Task"
                                >
                                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                                </button>
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
                                        onCreateSubtask={(task) => handleCreate(task, 'subtask', 'task')}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}

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
                                    onCreateSubtask={(task) => handleCreate(task, 'subtask', 'task')}
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