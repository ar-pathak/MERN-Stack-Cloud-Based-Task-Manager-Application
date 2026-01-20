import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useSubtaskForm } from "../../hook/useSubtaskForm";
import {
    SubtaskHeader,
    SubtaskInputs,
    AssigneeSelector,
    ProTip
} from "./SubtaskComponents";

const SubtaskPopup = (props) => {
    const { isOpen, taskTitle } = props;

    // Initialize Hook
    const { formData, uiState, data, handlers } = useSubtaskForm(props);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                    className="relative w-full max-w-lg rounded-2xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-[90vh] flex flex-col"
                >
                    <SubtaskHeader
                        taskTitle={taskTitle}
                        onClose={handlers.handleClose}
                        disabled={uiState.isSubmitting}
                    />

                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        <SubtaskInputs
                            formData={formData}
                            handleChange={handlers.handleChange}
                            errors={uiState.errors}
                            disabled={uiState.isSubmitting}
                        />

                        <AssigneeSelector
                            assignees={data.availableAssignees}
                            selectedId={formData.assignedTo}
                            onSelect={handlers.handleAssigneeSelect}
                            isLoading={uiState.isLoadingTask}
                            disabled={uiState.isSubmitting}
                        />

                        <ProTip />

                        {uiState.errors.submit && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <p className="text-sm text-rose-400">{uiState.errors.submit}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
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
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-sm font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {uiState.isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Create Subtask
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SubtaskPopup;