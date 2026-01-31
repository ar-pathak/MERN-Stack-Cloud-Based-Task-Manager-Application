import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // Navigation ke liye
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, LogOut, Loader2 } from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";

import { useWorkspace } from "../../../../hook/useWorkspace";
import { useProject } from "../../../../hook/useProject";
import { useTeam } from "../../../../hook/useTeam";
import { useSubtask } from "../../../../hook/useSubtask";

const DangerZoneSection = ({ item, onLeave: parentOnLeave, resourceName }) => {
    const navigate = useNavigate();
    
    // ========== Hooks Initialization ==========
    const { deleteWorkspace, leaveWorkspace } = useWorkspace();
    const { deleteProject } = useProject();
    const { removeTeam } = useTeam();
    const { deleteSubtask } = useSubtask();

    // ========== State ==========
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // ========== Helper: Get Workspace ID ==========
    const getWorkspaceId = useCallback(() => {
        if (item?.type === 'workspace') return item._id || item.id;
        if (typeof item?.workspace === 'object') return item?.workspace?._id;
        return item?.workspace;
    }, [item]);

    // ========== Role Logic ==========
    const userRole = item?.permissions?.role;
    // Owner ya Creator ke paas Delete permission hai
    const isOwner = ['owner', 'creator'].includes(userRole);
    // Resource Name Fallback
    const typeName = resourceName || item?.type || "item";


    // ========== Internal Actions Handlers ==========

    // 1. DELETE Handler (Internalized)
    const performDelete = async () => {
        const id = item._id || item.id;
        let success = false;

        switch (item.type) {
            case 'workspace':
                success = await deleteWorkspace(id);
                if (success) navigate('/main');
                break;
            
            case 'project':
                success = await deleteProject(id);
                break;
            
            case 'team':
                const wsId = getWorkspaceId();
                if (wsId) {
                    const res = await removeTeam(wsId, id);
                    success = res.success;
                    // Note: Teams usually modal ke andar hote hain, isliye navigation shayad na chahiye ho, 
                    // lekin agar dedicated page hai to navigate karein.
                    if (success && window.location.pathname.includes(id)) {
                        navigate(`/workspace/${wsId}`);
                    }
                }
                break;

            case 'subtask':
                success = await deleteSubtask(id);
                // Subtask delete hone par parent task par navigate kar sakte hain ya sirf refresh
                break;

            default:
                console.warn("Unknown item type for deletion:", item.type);
        }

        return success;
    };

    // 2. LEAVE Handler (Internalized where possible)
    const performLeave = async () => {
        const id = item._id || item.id;
        let success = false;

        if (item.type === 'workspace') {
            // Workspace ke liye hamare paas direct hook function hai
            success = await leaveWorkspace(id);
            if (success) navigate('/dashboard');
        } else {
            // Project/Team ke liye agar parent ne onLeave function diya hai to use karein
            // (Kyunki hooks me direct leaveProject bina userId ke shayad available na ho)
            if (parentOnLeave) {
                await parentOnLeave();
                success = true; // Assume success if function runs
            } else {
                console.error("No leave handler provided for this item type");
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
            modalMessage: `Are you absolutely sure you want to delete "${item?.name || 'this item'}"? This action cannot be undone.`,
            handler: performDelete
        }
        : {
            // Member Settings (Leave)
            actionType: 'LEAVE',
            title: `Leave this ${typeName}`,
            description: `Revoke your access to this ${typeName}. You will lose access to all tasks, chats, and files. You will need to be re-invited to join again.`,
            buttonText: `Leave ${typeName}`,
            buttonIcon: LogOut,
            btnClass: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20",
            modalTitle: `Leave ${typeName}?`,
            modalMessage: `Are you sure you want to leave "${item?.name || 'this item'}"? You will lose access immediately.`,
            handler: performLeave
        };

    const Icon = config.buttonIcon;


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
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isOwner 
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