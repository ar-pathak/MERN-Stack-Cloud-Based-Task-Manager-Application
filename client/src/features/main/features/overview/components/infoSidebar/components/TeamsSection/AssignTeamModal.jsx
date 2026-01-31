import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, X, Plus, Loader2, Search, CheckCircle, CheckSquare } from "lucide-react";
import { useTeam } from "../../../../hook/useTeam";
import { useProject } from "../../../../hook/useProject";

const AssignTeamModal = ({
    item,
    taskData,
    onClose,
    onAssign,
    submitting,
    workspaceId,
    currentTeamIds = []
}) => {
    const [availableTeams, setAvailableTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [error, setError] = useState(null);

    const { fetchTeams } = useTeam();
    const { fetchProjectTeams } = useProject();

    console.log("AssignTeamModal item:", item);

    // ========== Load Available Teams ==========
    useEffect(() => {
        const loadWorkspaceTeams = async () => {
            if (!workspaceId && item.type === 'project') {
                setError("No workspace ID provided");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                if (item.type === 'project') {
                    const res = await fetchTeams(workspaceId);
                    if (res?.data) {
                        // Filter out already assigned teams
                        const notAssigned = res.data.filter(
                            t => !currentTeamIds.includes(t._id || t.id)
                        );
                        setAvailableTeams(notAssigned);
                    }
                } else if (item.type === 'task' && taskData?.project) {
                    const res = await fetchProjectTeams(taskData.workspace._id, taskData.project._id);
                    console.log("Fetched project teams:", res?.data?.data);
                    if (res?.data?.data) {
                        // Filter out already assigned teams
                        const notAssigned = res.data.data.filter(
                            t => !currentTeamIds.includes(t._id || t.id)
                        );
                        setAvailableTeams(notAssigned);
                    }

                } else if (item.type === 'task' && taskData?.workspace) {
                    const res = await fetchTeams(taskData.workspace._id);
                    if (res?.data) {
                        // Filter out already assigned teams
                        const notAssigned = res.data.filter(
                            t => !currentTeamIds.includes(t._id || t.id)
                        );
                        setAvailableTeams(notAssigned);
                    }
                } else {
                    setAvailableTeams([]);
                }
            } catch (error) {
                console.error("Failed to load workspace teams:", error);
                setError(error.message || "Failed to load teams");
                setAvailableTeams([]);
            } finally {
                setLoading(false);
            }
        };

        loadWorkspaceTeams();
    }, [workspaceId, fetchTeams, currentTeamIds]);

    // ========== Event Handlers ==========

    const handleToggle = useCallback((teamId) => {
        setSelectedTeams(prev =>
            prev.includes(teamId)
                ? prev.filter(id => id !== teamId)
                : [...prev, teamId]
        );
    }, []);

    const handleSelectAll = useCallback(() => {
        const filteredIds = filteredList.map(t => t._id || t.id);
        const allSelected = filteredIds.every(id => selectedTeams.includes(id));

        if (allSelected) {
            // Deselect all visible
            setSelectedTeams(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            // Select all visible
            setSelectedTeams(prev => {
                const uniqueIds = new Set([...prev, ...filteredIds]);
                return Array.from(uniqueIds);
            });
        }
    }, [selectedTeams]); // filteredList will be defined below

    const handleAssign = useCallback(() => {
        if (selectedTeams.length === 0) return;
        onAssign(selectedTeams);
    }, [selectedTeams, onAssign]);

    const handleClose = useCallback(() => {
        if (!submitting) {
            onClose();
        }
    }, [submitting, onClose]);

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);

    // ========== Memoized Values ==========

    const filteredList = useMemo(() => {
        if (!searchQuery.trim()) return availableTeams;

        const searchLower = searchQuery.toLowerCase();
        return availableTeams.filter(t =>
            t.name?.toLowerCase().includes(searchLower) ||
            t.description?.toLowerCase().includes(searchLower)
        );
    }, [availableTeams, searchQuery]);

    const allFilteredSelected = useMemo(() => {
        if (filteredList.length === 0) return false;
        return filteredList.every(t => selectedTeams.includes(t._id || t.id));
    }, [filteredList, selectedTeams]);

    const hasAvailableTeams = availableTeams.length > 0;
    const hasFilteredTeams = filteredList.length > 0;

    // ========== Render Helpers ==========

    const renderLoadingState = () => (
        <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
        </div>
    );

    const renderErrorState = () => (
        <div className="text-center py-10 flex flex-col items-center">
            <div className="p-4 bg-rose-500/10 rounded-full mb-3">
                <X className="h-8 w-8 text-rose-400" />
            </div>
            <p className="text-slate-400 text-sm mb-1">Failed to load teams</p>
            <p className="text-slate-600 text-xs">{error}</p>
        </div>
    );

    const renderEmptyState = () => (
        <div className="text-center py-10 flex flex-col items-center">
            <Users className="h-10 w-10 text-slate-600 mb-3" />
            <p className="text-slate-500 text-sm">No other teams available</p>
            <p className="text-slate-600 text-xs mt-1">
                Create more teams in Workspace settings
            </p>
        </div>
    );

    const renderNoResultsState = () => (
        <div className="text-center py-8 text-slate-500 text-sm">
            No teams match "{searchQuery}"
        </div>
    );

    const renderTeamItem = (team) => {
        const teamId = team._id || team.id;
        const isSelected = selectedTeams.includes(teamId);
        const memberCount = team.members?.length || 0;

        return (
            <div
                key={teamId}
                onClick={() => handleToggle(teamId)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                    ? "bg-purple-500/10 border-purple-500/50"
                    : "bg-slate-800/30 border-slate-800 hover:bg-slate-800"
                    }`}
            >
                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium truncate ${isSelected ? "text-purple-400" : "text-slate-200"
                        }`}>
                        {team.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                        {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </p>
                </div>
                {isSelected ? (
                    <CheckCircle className="h-5 w-5 text-purple-500 flex-shrink-0 ml-2" />
                ) : (
                    <div className="h-5 w-5 rounded-full border border-slate-600 flex-shrink-0 ml-2" />
                )}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[80vh]"
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50 flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-white">Assign Teams</h3>
                        <p className="text-xs text-slate-400">
                            Select teams to work on this item
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={submitting}
                        className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5 text-slate-400 hover:text-white" />
                    </button>
                </div>

                {/* Search & Select All */}
                <div className="px-6 py-4 bg-slate-900 space-y-3 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search available teams..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            disabled={loading || !hasAvailableTeams}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        />
                    </div>

                    {hasFilteredTeams && (
                        <button
                            onClick={handleSelectAll}
                            disabled={loading || submitting}
                            className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1.5 ml-1 transition-colors disabled:opacity-50"
                        >
                            <CheckSquare className="h-3.5 w-3.5" />
                            {allFilteredSelected ? "Deselect All" : "Select All Visible"}
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2 min-h-0">
                    {loading ? (
                        renderLoadingState()
                    ) : error ? (
                        renderErrorState()
                    ) : !hasAvailableTeams ? (
                        renderEmptyState()
                    ) : !hasFilteredTeams ? (
                        renderNoResultsState()
                    ) : (
                        filteredList.map(renderTeamItem)
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center flex-shrink-0">
                    <span className="text-xs text-slate-500">
                        {selectedTeams.length} selected
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            disabled={submitting}
                            className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={submitting || selectedTeams.length === 0}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    Assign {selectedTeams.length > 0 ? `(${selectedTeams.length})` : ''}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default AssignTeamModal;