import { AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Search, Plus, Filter, Briefcase, CheckSquare } from "lucide-react";
import { useDispatch } from "react-redux";
import WorkspacePopup from "../../../components/popup/WorkspacePopup";
import TaskPopup from "../../../components/popup/TaskPopup";

import { setOverviewData } from "../../../../../store/slice/overviewSlice";
import { getOverviewActivity } from "../../../../../service/overview.service";
import { createWorkspace } from "../../../../../service/workspace.service";

const SidebarHeader = ({ searchQuery, setSearchQuery, filterType, setFilterType }) => {

    const dispatch = useDispatch();
    const [open, setOpen] = useState(false);
    const [isTaskOpen, setIsTaskOpen] = useState(false);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const menuRef = useRef(null);

    const filters = [
        { id: "all", label: "All" },
        { id: "unread", label: "Unread" },
        { id: "starred", label: "Starred" }
    ];

    // close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);


    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 2500);
    };

    const refreshTimeline = async () => {
        try {
            const timelineData = await getOverviewActivity();

            const normalized = (timelineData || []).map(item => ({
                ...item,
                id: item.id || item._id,
                name: item.name || item.title,
                hasChildren: item.type !== "task"
            }));

            dispatch(setOverviewData({ timeline: normalized }));
        } catch (err) {
            console.error("Failed to refresh timeline", err);
            showToast("Something went wrong while refreshing");
        }
    };


    return (
        <div className="flex-shrink-0 p-4 border-b border-slate-800/50">
            <div className="flex items-center gap-2 mb-3 relative" ref={menuRef}>
                <h2 className="text-lg font-bold text-slate-100">Conversations</h2>

                <button
                    onClick={() => setOpen(v => !v)}
                    className="ml-auto p-2 rounded-lg hover:bg-slate-800/60 transition-colors group"
                >
                    <Plus className="h-4 w-4 text-slate-400 group-hover:text-slate-300" />
                </button>

                {open && (
                    <div className="absolute right-0 top-10 w-52 rounded-xl bg-slate-900 border border-slate-800 shadow-xl z-50 overflow-hidden">
                        <button
                            onClick={() => {
                                setOpen(false);
                                setIsWorkspaceOpen(true)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
                        >
                            <Briefcase className="h-4 w-4 text-sky-400" />
                            Create Workspace
                        </button>

                        <button
                            onClick={() => {
                                setOpen(false);
                                setIsTaskOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
                        >
                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                            Create Task
                        </button>
                    </div>
                )}

                <button className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors group">
                    <Filter className="h-4 w-4 text-slate-400 group-hover:text-slate-300" />
                </button>
            </div>

            <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-800/60 rounded-lg text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-slate-700/80 transition-colors"
                />
            </div>

            <div className="flex gap-2">
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setFilterType(filter.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === filter.id
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : "bg-slate-800/40 text-slate-400 hover:bg-slate-800/60"
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
            <TaskPopup
                isOpen={isTaskOpen}
                onClose={() => setIsTaskOpen(false)}
                onSubmit={async () => {
                    await refreshTimeline();
                    showToast("Task created successfully");
                }}
            />

            <WorkspacePopup
                isOpen={isWorkspaceOpen}
                onClose={() => setIsWorkspaceOpen(false)}
                onSubmit={async (data) => {
                    await createWorkspace(data);
                    await refreshTimeline();
                    showToast("Workspace created successfully");
                }}
            />
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-500/90 text-white text-sm shadow-lg"
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SidebarHeader;
