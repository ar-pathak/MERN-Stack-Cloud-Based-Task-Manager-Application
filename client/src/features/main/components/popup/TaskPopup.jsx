import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Briefcase, Globe, Loader2, CheckSquare, AlertCircle } from "lucide-react";
import ScrollBar from "../../../../common/components/ScrollBar";
import { useTaskForm } from "../../hook/useTaskForm"; // Import the hook
import {
    TaskHeader, BasicInputs, ContextSelectors,
    TaskSettings, AssigneeGrid
} from "./TaskPopupComponents"; // Import sub-components

const TaskPopup = (props) => {
    const { isOpen, workspaces = [], level = "global" } = props;

    // Initialize Logic Hook
    const {
        formData, uiState, data, handlers, flags
    } = useTaskForm(props);

    // Level Display Info Helper
    const getLevelInfo = () => {
        if (flags.isProject) return { icon: FolderOpen, color: "purple", label: "Project Task", description: "Create a task within this project" };
        if (flags.isWorkspace) return { icon: Briefcase, color: "sky", label: "Workspace Task", description: "Create a task within this workspace" };
        return { icon: Globe, color: "green", label: "Global Task", description: "Create a personal task" };
    };

    const levelInfo = getLevelInfo();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <ScrollBar />

                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handlers.handleClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-2xl rounded-2xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-[90vh] flex flex-col"
                >
                    <TaskHeader
                        levelInfo={levelInfo}
                        onClose={handlers.handleClose}
                        disabled={uiState.isSubmitting}
                    />

                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        <BasicInputs
                            formData={formData}
                            handleChange={handlers.handleChange}
                            errors={uiState.errors}
                            disabled={uiState.isSubmitting}
                        />

                        <ContextSelectors
                            flags={flags}
                            workspaces={workspaces}
                            filteredProjects={data.filteredProjects}
                            formData={formData}
                            handleChange={handlers.handleChange}
                            disabled={uiState.isSubmitting}
                        />

                        <TaskSettings
                            formData={formData}
                            handleChange={handlers.handleChange}
                            disabled={uiState.isSubmitting}
                        />

                        {!flags.isGlobal && (
                            <>
                                <AssigneeGrid
                                    title="Assign to Members"
                                    items={data.availableMembers}
                                    selected={formData.assignees}
                                    onToggle={handlers.handleToggle}
                                    isLoading={uiState.isLoadingMembers}
                                    type="member"
                                    disabled={uiState.isSubmitting}
                                />

                                <AssigneeGrid
                                    title="Assign to Teams"
                                    items={data.availableTeams}
                                    selected={formData.assigneesTeams}
                                    onToggle={handlers.handleToggle}
                                    isLoading={uiState.isLoadingTeams}
                                    type="team"
                                    disabled={uiState.isSubmitting}
                                />

                                {data.availableMembers.length === 0 && !uiState.isLoadingMembers && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                        <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-amber-400">No members found</p>
                                            <p className="text-xs text-amber-400/70">Add members to this {flags.isProject ? 'project' : 'workspace'} to assign tasks</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Error Messages */}
                        {(uiState.errors.fetch || uiState.errors.submit) && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <p className="text-sm text-rose-400">{uiState.errors.fetch || uiState.errors.submit}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 flex items-center gap-3 border-t border-slate-800/50 px-6 py-4">
                        <button
                            onClick={handlers.handleClose}
                            disabled={uiState.isSubmitting}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800/60 bg-slate-900/60 text-slate-300 text-sm font-medium hover:bg-slate-800/60 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlers.handleSubmit}
                            disabled={uiState.isSubmitting}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {uiState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                            {uiState.isSubmitting ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TaskPopup;