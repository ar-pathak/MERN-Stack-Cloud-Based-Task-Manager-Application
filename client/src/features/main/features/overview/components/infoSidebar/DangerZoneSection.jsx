import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, LogOut, Loader2, CheckCircle2 } from "lucide-react";
import ConfirmationModal from "./components/TeamsSection/ConfirmationModal";

// Hooks Import
import { useWorkspace } from "../../hook/useWorkspace";
import { useProject } from "../../hook/useProject";
import { useTeam } from "../../hook/useTeam";
import { useTask } from "../../hook/useTask";
import { useSubtask } from "../../hook/useSubtask";

const DangerZoneSection = ({ item, isSubtaskCreator, onLeave: parentOnLeave, resourceName, onSuccess }) => {
    const navigate = useNavigate();

    // ========== Hooks Initialization ==========
    const { deleteWorkspace, leaveWorkspace } = useWorkspace();
    const { deleteProject, leaveProject } = useProject();
    const { removeTeam, leaveTeam } = useTeam();
    const { hardDeleteTask, leaveTask } = useTask();
    const { deleteSubtask, leaveSubtask } = useSubtask();

    // ========== State ==========
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDone, setIsDone] = useState(false); // New state for success feedback

    // ========== Helper: Get Workspace ID ==========
    const getWorkspaceId = useCallback(() => {
        if (item?.type === 'workspace') return item._id || item.id;
        if (typeof item?.workspace === 'object') return item?.workspace?._id;
        return item?.workspace;
    }, [item]);

    // ========== Role & Ownership Logic ==========
    const userRole = item?.permissions?.role;

    // Determine if the user is the owner/creator based on available data
    const isOwner =
        item?.type === 'subtask'
            ? isSubtaskCreator === true
            : (
                ['owner', 'creator'].includes(userRole) ||
                item?.isOwner === true
            );

    // Fallback for resource name string
    const typeName = resourceName || item?.type || "item";

    // ========== Internal Actions Handlers ==========

    // 1. DELETE Handler
    const performDelete = async () => {
        const id = item._id || item.id;
        const wsId = getWorkspaceId();
        let success = false;

        switch (item.type) {
            case 'workspace':
                success = await deleteWorkspace(id);
                // For main layout items, we navigate immediately after
                if (success) navigate('/main');
                break;

            case 'project':
                success = await deleteProject(id);
                if (success) navigate(`/main`);
                break;

            case 'team':
                if (wsId) {
                    const res = await removeTeam(wsId, id);
                    success = res.success;
                    if (success && window.location.pathname.includes(id)) {
                        navigate(`/main`);
                    }
                }
                break;

            case 'task':
                success = await hardDeleteTask(id);
                break;

            case 'subtask':
                success = await deleteSubtask(id);
                break;

            default:
                console.warn("Unknown item type for deletion:", item.type);
        }

        return success;
    };

    // 2. LEAVE Handler
    const performLeave = async () => {
        const id = item._id || item.id;
        const wsId = getWorkspaceId();
        let success = false;

        switch (item.type) {
            case 'workspace':
                success = await leaveWorkspace(id);
                if (success) navigate('/main');
                break;

            case 'project':
                success = await leaveProject(wsId, id);
                break;

            case 'team':
                if (wsId) {
                    const res = await leaveTeam(wsId, id);
                    success = res?.success || res === true;
                }
                break;

            case 'task':
                success = await leaveTask(id);
                break;

            case 'subtask':
                success = await leaveSubtask(id);
                break;

            default:
                if (parentOnLeave) {
                    await parentOnLeave();
                    success = true;
                }
        }
        return success;
    };


    // ========== Dynamic Configuration ==========
    const config = isOwner
        ? {
            actionType: 'DELETE',
            title: `Delete this ${typeName}`,
            description: `Once you delete a ${typeName}, there is no going back. All associated data will be removed.`,
            buttonText: `Delete ${typeName}`,
            buttonIcon: Trash2,
            btnClass: "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20",
            successClass: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20",
            modalTitle: `Delete ${typeName}?`,
            modalMessage: `Are you absolutely sure you want to delete "${item?.name || item?.title || 'this item'}"? This cannot be undone.`,
            handler: performDelete
        }
        : {
            actionType: 'LEAVE',
            title: `Leave this ${typeName}`,
            description: `Revoke your access to this ${typeName}. You will lose access to all tasks and files.`,
            buttonText: `Leave ${typeName}`,
            buttonIcon: LogOut,
            btnClass: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20",
            successClass: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20",
            modalTitle: `Leave ${typeName}?`,
            modalMessage: `Are you sure you want to leave "${item?.name || item?.title || 'this item'}"?`,
            handler: performLeave
        };

    const Icon = isDone ? CheckCircle2 : config.buttonIcon;
    const currentBtnClass = isDone ? config.successClass : config.btnClass;
    const currentBtnText = isDone ? "Done" : config.buttonText;

    if (!item) return null;

    // ========== Execution ==========
    const handleConfirmAction = async () => {
        try {
            setIsProcessing(true);
            const success = await config.handler();
            
            // If the handler returned success (and didn't already navigate away)
            if (success) {
                setIsDone(true);
                setIsModalOpen(false); // Close modal to show button success state

                // Add a small delay so user sees the "Success" green button before sidebar closes
                setTimeout(() => {
                   if (onSuccess) onSuccess();
                }, 1500);
            }
        } catch (error) {
            console.error("Action failed", error);
        } finally {
            setIsProcessing(false);
            if (!isDone) setIsModalOpen(false); // Close modal if failed or cancelled
        }
    };

    // ========== Render ==========
    return (
        <section className="mt-8 pt-8 border-t border-slate-800/50">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${isOwner ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
                    <AlertTriangle className={`h-5 w-5 ${isOwner ? 'text-rose-500' : 'text-amber-500'}`} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white">Danger Zone</h3>
                    <p className="text-xs text-slate-400">
                        {isOwner ? "Irreversible and destructive actions" : "Manage your access"}
                    </p>
                </div>
            </div>

            {/* Content Card */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isOwner
                ? 'border-rose-500/20 bg-rose-500/5'
                : 'border-amber-500/20 bg-amber-500/5'
                }`}>
                <div className="space-y-1">
                    <h4 className={`text-sm font-semibold ${isOwner ? 'text-rose-200' : 'text-amber-200'}`}>
                        {config.title}
                    </h4>
                    <p className={`text-xs max-w-md leading-relaxed ${isOwner ? 'text-rose-300/70' : 'text-amber-300/70'}`}>
                        {config.description}
                    </p>
                </div>

                <motion.button
                    disabled={isProcessing || isDone}
                    whileHover={!isDone ? { scale: 1.02 } : {}}
                    whileTap={!isDone ? { scale: 0.98 } : {}}
                    onClick={() => setIsModalOpen(true)}
                    className={`flex-shrink-0 px-4 py-2.5 text-white text-xs font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${currentBtnClass}`}
                >
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Icon className="h-4 w-4" />
                    )}
                    {currentBtnText}
                </motion.button>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <ConfirmationModal
                        isOpen={isModalOpen}
                        onClose={() => !isProcessing && setIsModalOpen(false)}
                        onConfirm={handleConfirmAction}
                        loading={isProcessing}
                        title={config.modalTitle}
                        message={config.modalMessage}
                        type={isOwner ? "danger" : "warning"}
                    />
                )}
            </AnimatePresence>
        </section>
    );
};

export default DangerZoneSection;