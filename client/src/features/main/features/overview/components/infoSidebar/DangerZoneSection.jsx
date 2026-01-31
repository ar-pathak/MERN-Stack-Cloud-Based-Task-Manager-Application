import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, LogOut, Loader2 } from "lucide-react";
import ConfirmationModal from "./components/TeamsSection/ConfirmationModal";

// Hooks Import
import { useWorkspace } from "../../hook/useWorkspace";
import { useProject } from "../../hook/useProject";
import { useTeam } from "../../hook/useTeam";
import { useTask } from "../../hook/useTask";
import { useSubtask } from "../../hook/useSubtask";

const DangerZoneSection = ({ item, onLeave: parentOnLeave, resourceName, onClose }) => {
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
        ['owner', 'creator'].includes(userRole) || item?.permissions?.canDelete === true ||
        (item?.createdBy?._id && item?.createdBy?._id === item?.currentUserId) || // Fallback if currentUserId is passed in item
        item?.isOwner; // Fallback if isOwner boolean is passed

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
                    // Only navigate if we are on the specific team page, otherwise just close modal
                    if (success && window.location.pathname.includes(id)) {
                        navigate(`/main`);
                    }
                }
                break;

            case 'task':
                success = await hardDeleteTask(id);
                // Tasks usually displayed in a list/modal, navigation might not be needed
                // If displayed in a full page view:
                if (success && onClose) onClose();
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
                if (success) navigate('/dashboard');
                break;

            case 'project':
                // Requires workspaceId and projectId
                success = await leaveProject(wsId, id);
                if (success) navigate(`/workspace/${wsId}`);
                break;

            case 'team':
                // Requires workspaceId and teamId
                if (wsId) {
                    // Note: useTeam hook's leaveTeam returns { success: true/false } directly or via promise
                    const res = await leaveTeam(wsId, id);
                    success = res?.success || res === true; // Handle variation in return type
                    if (success && window.location.pathname.includes(id)) {
                        navigate(`/workspace/${wsId}`);
                    }
                }
                break;

            case 'task':
                success = await leaveTask(id);
                if (success && onClose) onClose();
                break;

            case 'subtask':
                success = await leaveSubtask(id);
                break;

            default:
                // Fallback to parent prop if provided
                if (parentOnLeave) {
                    await parentOnLeave();
                    success = true;
                } else {
                    console.error("No leave handler defined for type:", item.type);
                }
        }
        return success;
    };


    // ========== Dynamic Configuration ==========

    const config = isOwner
        ? {
            // Owner Settings (Delete)
            actionType: 'DELETE',
            title: `Delete this ${typeName}`,
            description: `Once you delete a ${typeName}, there is no going back. Please be certain. All associated data will be permanently removed.`,
            buttonText: `Delete ${typeName}`,
            buttonIcon: Trash2,
            btnClass: "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20",
            modalTitle: `Delete ${typeName}?`,
            modalMessage: `Are you absolutely sure you want to delete "${item?.name || item?.title || 'this item'}"? This action cannot be undone.`,
            handler: performDelete
        }
        : {
            // Member Settings (Leave)
            actionType: 'LEAVE',
            title: `Leave this ${typeName}`,
            description: `Revoke your access to this ${typeName}. You will lose access to all tasks, chats, and files.`,
            buttonText: `Leave ${typeName}`,
            buttonIcon: LogOut,
            btnClass: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20",
            modalTitle: `Leave ${typeName}?`,
            modalMessage: `Are you sure you want to leave "${item?.name || item?.title || 'this item'}"? You will lose access immediately.`,
            handler: performLeave
        };

    const Icon = config.buttonIcon;

    // Safety check
    if (!item) return null;

    // ========== Execution ==========

    const handleConfirmAction = async () => {
        try {
            setIsProcessing(true);
            await config.handler();
        } catch (error) {
            console.error("Action failed", error);
        } finally {
            setIsProcessing(false);
            setIsModalOpen(false);
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
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsModalOpen(true)}
                    className={`flex-shrink-0 px-4 py-2.5 text-white text-xs font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${config.btnClass}`}
                >
                    <Icon className="h-4 w-4" />
                    {config.buttonText}
                </motion.button>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <ConfirmationModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
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