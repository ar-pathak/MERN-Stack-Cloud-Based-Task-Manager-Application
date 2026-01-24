import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Briefcase, FolderOpen, CheckSquare,
    Users, Settings, Link as LinkIcon, Image as ImageIcon,
    Activity, BarChart3, ListTodo
} from "lucide-react";

import QuickStatsSection from "./QuickStatsSection";
import ProgressSection from "./ProgressSection";
import StatusControl from "./StatusControl";
import QuickActions from "./QuickActions";
import Description from "./Description";
import MetaDetails from "./MetaDetails";
import MembersSection from "./MembersSection";
import TeamsSection from "./TeamsSection";
import { SettingsSection } from "./SettingsSection";
import DangerZoneSection from "./DangerZoneSection";
import AnalyticsSection from "./AnalyticsSection";

const InfoSidebar = ({ item, overview, onClose }) => {
    const [activeTab, setActiveTab] = useState("overview");

    const tabs = [
        { id: "overview", label: "Overview", icon: Activity },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "members", label: "Members", icon: Users },
        { id: "settings", label: "Settings", icon: Settings }
    ];

    // FIX: Helper function to handle colors cleanly including subtask
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

                <h2 className="text-xl font-bold text-slate-100 leading-tight mb-2 line-clamp-2">
                    {item.name || item.title}
                </h2>

                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">
                    <span>{item.type}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-slate-900/40 rounded-lg border border-slate-800/50">
                    {tabs.map(tab => (
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

                            {/* FIX: Show StatusControl for both 'task' AND 'subtask' */}
                            {(item.type === 'task' || item.type === 'subtask') && <StatusControl item={item} />}

                            <QuickActions item={item} />
                            <Description item={item} />
                            <MetaDetails item={item} />
                        </motion.div>
                    )}

                    {activeTab === "analytics" && (
                        <motion.div
                            key="analytics"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 pb-6"
                        >
                            <AnalyticsSection item={item} overview={overview} />
                        </motion.div>
                    )}

                    {activeTab === "members" && (
                        <motion.div
                            key="members"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 pb-6"
                        >
                            <MembersSection item={item} />
                            {item.type === 'workspace' && <TeamsSection item={item} />}
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
                            <SettingsSection item={item} />
                            <DangerZoneSection item={item} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
        </motion.div>
    );
};

export default InfoSidebar;