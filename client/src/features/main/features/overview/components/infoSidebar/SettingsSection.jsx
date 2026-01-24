import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield, Download, Settings, Crown, Loader2, AlertCircle, CheckCircle
} from "lucide-react";
import {
    updateWorkspace,
    transferOwnership,
    getWorkspaceMembers
} from "../../../../../../service/workspace.service";
import { useSelector } from "react-redux";

export const SettingsSection = ({ item, onRefresh }) => {
    const [notifications, setNotifications] = useState(true);
    const [emailUpdates, setEmailUpdates] = useState(false);
    const [autoArchive, setAutoArchive] = useState(true);

    // Workspace-specific settings
    const [workspaceName, setWorkspaceName] = useState(item.name || "");
    const [workspaceDesc, setWorkspaceDesc] = useState(item.description || "");
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Transfer ownership
    const [showTransfer, setShowTransfer] = useState(false);
    const [selectedNewOwner, setSelectedNewOwner] = useState("");
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    const currentUser = useSelector((state) => state.auth.user);
    const currentUserId = currentUser?._id || currentUser?.id;

    useEffect(() => {
        if (item.type === 'workspace' && item.id) {
            setWorkspaceName(item.name || "");
            setWorkspaceDesc(item.description || "");

            if (item.userRole === 'owner') {
                fetchMembers();
            }
        }
    }, [item]);

    const fetchMembers = async () => {
        try {
            setLoadingMembers(true);
            const data = await getWorkspaceMembers(item.id);
            // Filter out current owner
            setMembers(data.filter(m =>
                m.role !== 'owner' &&
                (m.user._id || m.user.id) !== currentUserId
            ));
        } catch (err) {
            console.error("Failed to fetch members:", err);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleUpdateWorkspace = async () => {
        if (!workspaceName.trim()) {
            setError("Workspace name is required");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            await updateWorkspace(item.id, {
                name: workspaceName.trim(),
                description: workspaceDesc.trim() || undefined
            });

            setSuccess("Workspace updated successfully!");
            setIsEditing(false);

            setTimeout(() => setSuccess(null), 3000);
            if (onRefresh) onRefresh();
        } catch (err) {
            setError(err.message || "Failed to update workspace");
        } finally {
            setSubmitting(false);
        }
    };

    const handleTransferOwnership = async () => {
        if (!selectedNewOwner) {
            setError("Please select a new owner");
            return;
        }

        const newOwner = members.find(m =>
            (m.user._id || m.user.id) === selectedNewOwner
        );

        if (!confirm(
            `Are you sure you want to transfer ownership to ${newOwner?.user.name}? ` +
            `You will be demoted to admin and this action cannot be undone.`
        )) {
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            await transferOwnership({
                workspaceId: item.id,
                newOwnerId: selectedNewOwner
            });

            setSuccess("Ownership transferred successfully!");
            setShowTransfer(false);
            setSelectedNewOwner("");

            setTimeout(() => setSuccess(null), 3000);
            if (onRefresh) onRefresh();
        } catch (err) {
            setError(err.message || "Failed to transfer ownership");
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportData = async () => {
        try {
            // TODO: Implement data export
            alert("Data export feature coming soon!");
        } catch (err) {
            setError("Failed to export data");
        }
    };

    return (
        <div className="space-y-6">
            {/* Error/Success Messages */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2"
                    >
                        <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-400">{error}</p>
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2"
                    >
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <p className="text-xs text-emerald-400">{success}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Workspace Details (Only for workspace type) */}
            {item.type === 'workspace' && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Settings className="h-4 w-4 text-slate-500" />
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Workspace Details
                        </h3>
                    </div>

                    {isEditing ? (
                        <div className="space-y-3 p-4 bg-slate-900/40 border border-slate-800/50 rounded-xl">
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block">Name</label>
                                <input
                                    type="text"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
                                    disabled={submitting}
                                    maxLength={50}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block">Description</label>
                                <textarea
                                    value={workspaceDesc}
                                    onChange={(e) => setWorkspaceDesc(e.target.value)}
                                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 resize-none"
                                    rows={3}
                                    disabled={submitting}
                                    maxLength={200}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUpdateWorkspace}
                                    disabled={submitting}
                                    className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setWorkspaceName(item.name || "");
                                        setWorkspaceDesc(item.description || "");
                                        setIsEditing(false);
                                        setError(null);
                                    }}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">Name</p>
                                <p className="text-sm text-slate-200">{item.name}</p>
                            </div>
                            {item.description && (
                                <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl">
                                    <p className="text-xs text-slate-400 mb-1">Description</p>
                                    <p className="text-sm text-slate-200">{item.description}</p>
                                </div>
                            )}
                            {['owner', 'admin'].includes(item.userRole) && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                                >
                                    Edit Details
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Preferences */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Preferences</h3>
                </div>

                <div className="space-y-3">
                    <SettingToggle
                        label="Push Notifications"
                        description="Receive push notifications for updates"
                        checked={notifications}
                        onChange={setNotifications}
                    />
                    <SettingToggle
                        label="Email Updates"
                        description="Get email summaries of activity"
                        checked={emailUpdates}
                        onChange={setEmailUpdates}
                    />
                    <SettingToggle
                        label="Auto Archive"
                        description="Automatically archive completed tasks"
                        checked={autoArchive}
                        onChange={setAutoArchive}
                    />
                </div>
            </div>

            {/* Transfer Ownership (Workspace owners only) */}
            {item.type === 'workspace' && item.userRole === 'owner' && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Crown className="h-4 w-4 text-amber-400" />
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Ownership
                        </h3>
                    </div>

                    {!showTransfer ? (
                        <button
                            onClick={() => setShowTransfer(true)}
                            className="w-full p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-left hover:bg-amber-500/10 transition-colors group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-amber-400 group-hover:text-amber-300">
                                    Transfer Ownership
                                </span>
                                <Crown className="h-4 w-4 text-amber-400 group-hover:text-amber-300" />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Transfer workspace ownership to another admin
                            </p>
                        </button>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl"
                        >
                            <p className="text-sm text-amber-400 font-medium">Transfer Ownership</p>
                            <p className="text-xs text-slate-400">
                                Select a member to become the new workspace owner. You will be demoted to admin.
                            </p>

                            {loadingMembers ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                                </div>
                            ) : members.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-4">
                                    No eligible members. Add members first.
                                </p>
                            ) : (
                                <>
                                    <select
                                        value={selectedNewOwner}
                                        onChange={(e) => setSelectedNewOwner(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                                        disabled={submitting}
                                    >
                                        <option value="">Select new owner...</option>
                                        {members.map((member) => (
                                            <option
                                                key={member._id || member.user._id}
                                                value={member.user._id || member.user.id}
                                            >
                                                {member.user.name} ({member.user.email})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleTransferOwnership}
                                            disabled={!selectedNewOwner || submitting}
                                            className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Transferring...
                                                </>
                                            ) : (
                                                'Transfer Ownership'
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowTransfer(false);
                                                setSelectedNewOwner("");
                                                setError(null);
                                            }}
                                            disabled={submitting}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </div>
            )}

            {/* Privacy & Data */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Privacy & Data</h3>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={handleExportData}
                        className="w-full p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl text-left hover:bg-slate-800/60 transition-colors group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-300 group-hover:text-slate-100">Export Data</span>
                            <Download className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                        </div>
                    </button>

                    <button className="w-full p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl text-left hover:bg-slate-800/60 transition-colors group">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-300 group-hover:text-slate-100">Manage Permissions</span>
                            <Shield className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Setting Toggle Component
export const SettingToggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl hover:border-slate-700/50 transition-colors">
        <div className="flex-1">
            <p className="text-sm text-slate-300 font-medium mb-0.5">{label}</p>
            <p className="text-xs text-slate-500">{description}</p>
        </div>
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-sky-500' : 'bg-slate-700'
                }`}
        >
            <motion.div
                animate={{ x: checked ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
            />
        </motion.button>
    </div>
);