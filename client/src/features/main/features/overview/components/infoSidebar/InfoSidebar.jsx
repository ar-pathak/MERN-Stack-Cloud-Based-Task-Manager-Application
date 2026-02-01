import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Briefcase, FolderOpen, CheckSquare,
    Users, Settings, BarChart3, ListTodo, Edit2, Check, XCircle,
    Activity
} from "lucide-react";

import QuickStatsSection from "./QuickStatsSection";
import ProgressSection from "./ProgressSection";
import StatusControl from "./StatusControl";
import QuickActions from "./QuickActions";
import Description from "./Description";
import MetaDetails from "./MetaDetails";
import DangerZoneSection from "./DangerZoneSection";
import AnalyticsSection from "./AnalyticsSection";

// Import all necessary hooks
import { useWorkspace } from "../../hook/useWorkspace";
import { useProject } from "../../hook/useProject";
import { useTask } from "../../hook/useTask";
import MembersSection from "./components/MembersSection/MembersSection";
import TeamsSection from "./components/TeamsSection/TeamsSection";
import { useAuth } from "../../../../../../context/AuthContext";
import { useMembersLogic } from "./components/MembersSection/useMembersLogic";

const InfoSidebar = ({ item: initialItem, overview, onClose }) => {
    // Local state to manage immediate UI updates
    const [item, setItem] = useState(initialItem);
    const [activeTab, setActiveTab] = useState("overview");
    const [taskData, setTaskData] = useState(null);

    // Title Editing State
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(item.name || item.title || "");
    const [isSaving, setIsSaving] = useState(false);

    // Initialize Hooks
    const { updateWorkspace } = useWorkspace();
    const { updateProject } = useProject();
    const { fetchTaskById, updateTask } = useTask();
    const { members, subtaskData } = useMembersLogic(item);
    const { user } = useAuth();


    // Determine if the current user is the creator of the subtask
    const isSubtaskCreator = subtaskData?.createdBy === user?._id;

    const tabs = [
        { id: "overview", label: "Overview", icon: Activity },
        // { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "members", label: "Members", icon: Users },
        { id: "settings", label: "Settings", icon: Settings }
    ];
    // Update local state if prop changes (e.g. user clicks a different item)
    useEffect(() => {
        setItem(initialItem);
        setTitle(initialItem.name || initialItem.title || "");
        setIsEditingTitle(false);
    }, [initialItem]);

    useEffect(() => {
        if (item.type === 'task') {
            const loadTaskData = async () => {
                const taskRes = await fetchTaskById(item.id);
                setTaskData(taskRes.data);
            }
            loadTaskData();
        }
    }, [item, fetchTaskById]);

    // CHECK ROLE: Support both nested permissions (from feed) and direct role
    const userRole = item.permissions?.role || item?.role || item?.userRole;
    const canEdit = userRole === 'owner' || userRole === 'creator';
    const userId = user?._id;

    const isMember = members.some(
        m => m.user?._id === userId
    );
    const isAssignee = members.some(
        m => m?._id === userId
    );

    const canSeeDangerZone = isMember || isAssignee || canEdit;


    const getHeaderColorClass = (type) => {
        switch (type) {
            case 'workspace':
                return 'bg-gradient-to-br from-sky-500/20 to-blue-600/20 border-sky-500/30';
            case 'project':
                return 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30';
            case 'subtask':
                return 'bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border-cyan-500/30';
            default:
                return 'bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-emerald-500/30';
        }
    };

    // Generic Update Handler
    const handleUpdateItem = async (updates) => {
        setIsSaving(true);
        let result = { success: false, data: null };
        const itemId = item.id || item._id;

        try {
            switch (item.type) {
                case 'workspace':
                    result = await updateWorkspace(itemId, updates);
                    break;

                case 'project': {
                    result = await updateProject(item?.workspace, itemId, updates);
                    break;
                }

                case 'task':
                    result = await updateTask(itemId, updates);
                    break;

                default:
                    console.warn("Unknown item type:", item.type);
            }

            if (result.success && result.data) {
                const updatedData = result.data;
                setItem(prev => ({ ...prev, ...updatedData }));

                if (updatedData.name || updatedData.title) {
                    setTitle(updatedData.name || updatedData.title);
                }
            }
        } catch (error) {
            console.error("Failed to update item", error);
        } finally {
            setIsSaving(false);
            setIsEditingTitle(false);
        }

        return result.success;
    };


    const handleTitleSave = () => {
        if (!title.trim() || title === (item.name || item.title)) {
            setIsEditingTitle(false);
            return;
        }

        // Determine field name based on type
        // Workspaces and Projects usually use 'name', Tasks and Subtasks use 'title'
        const fieldName = (item.type === 'task' || item.type === 'subtask') ? 'title' : 'name';
        handleUpdateItem({ [fieldName]: title });
    };

    return (
        <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full h-full max-h-full flex flex-col bg-slate-950/60 backdrop-blur-xl overflow-hidden min-h-0"
        >
            {/* Header - Fixed Height */}
            <div className="p-6 pb-4 border-b border-slate-800/50 flex-shrink-0">
                <div className="flex justify-between items-start mb-4">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className={`h-14 w-14 rounded-xl flex items-center justify-center border shadow-lg transition-all cursor-pointer ${getHeaderColorClass(item.type)}`}
                    >
                        {item.type === 'workspace' && <Briefcase className="h-7 w-7 text-sky-400" />}
                        {item.type === 'project' && <FolderOpen className="h-7 w-7 text-purple-400" />}
                        {item.type === 'task' && <CheckSquare className="h-7 w-7 text-emerald-400" />}
                        {item.type === 'subtask' && <ListTodo className="h-7 w-7 text-cyan-400" />}
                    </motion.div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </motion.button>
                </div>

                {/* Title Section with Edit Capability */}
                <div className="mb-2 min-h-[32px] flex items-center gap-2 group">
                    {isEditingTitle ? (
                        <div className="flex-1 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xl font-bold text-white focus:outline-none focus:border-sky-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleTitleSave();
                                    if (e.key === 'Escape') {
                                        setTitle(item.name || item.title);
                                        setIsEditingTitle(false);
                                    }
                                }}
                            />
                            <button
                                onClick={handleTitleSave}
                                disabled={isSaving}
                                className="p-1.5 bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white rounded-md transition-colors"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => {
                                    setTitle(item.name || item.title);
                                    setIsEditingTitle(false);
                                }}
                                disabled={isSaving}
                                className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
                            >
                                <XCircle className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-start justify-between gap-2">
                            <h2 className="text-xl font-bold text-slate-100 leading-tight line-clamp-2">
                                {item.name || item.title}
                            </h2>
                            {canEdit && (
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    onClick={() => setIsEditingTitle(true)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-sky-400 transition-all"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </motion.button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">
                    <span>{item.type}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-slate-900/40 rounded-lg border border-slate-800/50">
                    {tabs
                        .filter(tab => {
                            // Analytics only for workspace
                            if (tab.id === "analytics") {
                                return item.type === "workspace";
                            }
                            return true;
                        })
                        .map(tab => (
                            <motion.button
                                key={tab.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-slate-800 text-slate-100 shadow-lg'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <tab.icon className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">{tab.label}</span>
                            </motion.button>
                        ))}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 basis-0 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
                <AnimatePresence mode="wait">
                    {activeTab === "overview" && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 pb-6"
                        >
                            <QuickStatsSection item={item} overview={overview} />
                            <ProgressSection item={item} overview={overview} />

                            {(item.type === 'task' || item.type === 'subtask' || item.type == 'project') && <StatusControl item={item} />}

                            {item.type === 'workspace' && <QuickActions item={item} />}

                            {/* Pass control props to Description */}
                            <Description
                                item={item}
                                canEdit={canEdit}
                                onSave={(desc) => handleUpdateItem({ description: desc })}
                            />

                            <MetaDetails item={item} />
                        </motion.div>
                    )}

                    {/* {item.type === 'workspace' && activeTab === "analytics" && (
                        <motion.div
                            key="analytics"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 pb-6"
                        >
                            <AnalyticsSection item={item} overview={overview} />
                        </motion.div>
                    )} */}
                    {activeTab === "members" && (
                        <motion.div
                            key="members"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 pb-6"
                        >
                            <MembersSection item={item} />
                            {(
                                item.type === 'workspace' ||
                                item.type === 'project' ||
                                (item.type === 'task' && (taskData?.workspace || taskData?.project))
                            ) && (
                                    <TeamsSection item={item} taskData={taskData} />
                                )}
                        </motion.div>
                    )}

                    {activeTab === "settings" && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 pb-6"
                        >
                            {canSeeDangerZone ? (
                                <DangerZoneSection item={item} isSubtaskCreator={isSubtaskCreator} />
                            ) : (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                                    <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                            ⚠️
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-amber-800">
                                                Access restricted
                                            </p>
                                            <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                                                You are not assigned to this{" "}
                                                <span className="font-medium capitalize">
                                                    {item.type}
                                                </span>.
                                                Only assigned members or admins can perform destructive actions.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
        </motion.div>
    );
};

export default InfoSidebar;