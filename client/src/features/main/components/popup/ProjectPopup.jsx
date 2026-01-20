import { motion, AnimatePresence } from "framer-motion";
import { X, FolderOpen, Briefcase, Loader2, Users, CheckSquare } from "lucide-react";
import { useProjectForm } from "../../hook/useProjectForm";
import ProjectBasicInfo from "./ProjectBasicInfo";
import ProjectColorPicker from "./ProjectColorPicker";
import ProjectMemberSelector from "./ProjectMemberSelector";

const ProjectPopup = ({
    isOpen,
    onClose,
    onSubmit,
    workspaceId = null,
    workspaceName = ""
}) => {
    const {
        formData,
        errors,
        isSubmitting,
        isLoadingMembers,
        availableMembers,
        availableTeams,
        handleChange,
        handleSetColor,
        handleToggle,
        handleSubmit
    } = useProjectForm(isOpen, workspaceId, onSubmit, onClose);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={!isSubmitting ? onClose : undefined}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-2xl rounded-2xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/50 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                                <FolderOpen className="h-5 w-5 text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-100">Create Project</h2>
                                <p className="text-xs text-slate-500">
                                    {workspaceName ? `in ${workspaceName}` : "Organize tasks within a project"}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={isSubmitting} className="p-2 rounded-lg hover:bg-slate-800/60">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {workspaceName && (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                                <Briefcase className="h-5 w-5 text-sky-400" />
                                <div>
                                    <p className="text-sm font-medium text-sky-300">Creating in workspace</p>
                                    <p className="text-xs text-sky-400/70">{workspaceName}</p>
                                </div>
                            </div>
                        )}

                        <ProjectBasicInfo
                            name={formData.name}
                            description={formData.description}
                            status={formData.status}
                            onChange={handleChange}
                            error={errors.name}
                            disabled={isSubmitting}
                        />

                        <ProjectColorPicker
                            selectedColor={formData.color}
                            onSelect={handleSetColor}
                            disabled={isSubmitting}
                        />

                        <ProjectMemberSelector
                            members={availableMembers}
                            selectedIds={formData.members}
                            isLoading={isLoadingMembers}
                            onToggle={handleToggle}
                            disabled={isSubmitting}
                        />

                        {availableTeams.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Assign Teams
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableTeams.map(team => (
                                        <button
                                            key={team.id}
                                            type="button"
                                            onClick={() => handleToggle('teams', team.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border ${formData.teams.includes(team.id)
                                                    ? 'bg-violet-500/10 border-violet-500/30'
                                                    : 'bg-slate-900/40 border-slate-800/50'
                                                }`}
                                        >
                                            <Users className="h-4 w-4 text-violet-400" />
                                            <span className="text-sm text-slate-300 flex-1 text-left truncate">
                                                {team.name}
                                            </span>
                                            {formData.teams.includes(team.id) && (
                                                <CheckSquare className="h-4 w-4 text-violet-400" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(errors.fetch || errors.submit) && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <p className="text-sm text-rose-400">{errors.fetch || errors.submit}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 border-t border-slate-800/50 px-6 py-4">
                        <button onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800/60">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 text-white flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
                            {isSubmitting ? "Creating..." : "Create Project"}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ProjectPopup;
