import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useTeam } from "../../../../hook/useTeam";
import { useWorkspace } from "../../../../hook/useWorkspace";

// Import sub-components
import CreateTeamModal from "./CreateTeamModal";
import TeamCard from "./TeamCard";
import TeamsToolbar from "./TeamsToolbar";

const TeamsSection = ({ item, onRefresh }) => {
    // UI State
    const [showCreate, setShowCreate] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState("name");

    // Feedback State
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Data State
    const [teams, setTeams] = useState([]);
    const [allTeamMembers, setAllTeamMembers] = useState({});
    const [workspaceMembers, setWorkspaceMembers] = useState([]);

    const canManageTeams = item?.permissions?.role === 'owner' || item?.permissions?.role === 'admin';

    // Hooks
    const { fetchTeams, createNewTeam, removeTeam, fetchMembers, addMember, removeMember, updateMemberRole } = useTeam();
    const workspaceMethod = useWorkspace();

    // Auto-dismiss messages
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(null);
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    // --- Data Loading Logic ---
    const loadTeamsData = useCallback(async () => {
        if (!item.id) return;
        try {
            setLoading(true);
            const wsMembersResult = await workspaceMethod.fetchMembers(item.id);
            setWorkspaceMembers(wsMembersResult.data || []);

            const teamsResult = await fetchTeams(item.id);
            const teamsData = teamsResult.data || [];
            setTeams(teamsData);

            const membersMap = {};
            await Promise.all(teamsData.map(async (team) => {
                try {
                    const teamId = team._id || team.id;
                    const membersResult = await fetchMembers(item.id, teamId);
                    membersMap[teamId] = membersResult.data || [];
                } catch (e) {
                    membersMap[team._id || team.id] = [];
                }
            }));
            setAllTeamMembers(membersMap);
        } catch (err) {
            console.error(err);
            setError("Failed to load teams data");
        } finally {
            setLoading(false);
        }
    }, [item.id]);

    useEffect(() => {
        if (item.type === 'workspace' && item.id) loadTeamsData();
    }, [item.id, item.type, loadTeamsData]);

    const refreshTeamMembers = async (teamId) => {
        try {
            const result = await fetchMembers(item.id, teamId);
            setAllTeamMembers(prev => ({ ...prev, [teamId]: result.data }));
        } catch (err) {
            console.error("Failed to refresh members", err);
        }
    };

    // --- Handlers ---
    const handleCreateTeam = async (teamData) => {
        try {
            setSubmitting(true);
            await createNewTeam(item.id, teamData);
            setSuccess("Team created successfully!");
            setShowCreate(false);
            await loadTeamsData();
            if (onRefresh) onRefresh();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create team");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTeam = async (teamId, teamName) => {
        if (!window.confirm(`Delete "${teamName}"? This cannot be undone.`)) return;
        try {
            setSubmitting(true);
            await removeTeam(item.id, teamId);
            setSuccess("Team deleted successfully");
            await loadTeamsData();
            if (onRefresh) onRefresh();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to delete team");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddMemberToTeam = async (teamId, memberId) => {
        try {
            await addMember(item.id, teamId, { memberId, role: "member" });
            setSuccess("Member added");
            await refreshTeamMembers(teamId);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to add member");
        }
    };

    const handleRemoveMemberFromTeam = async (teamId, userId) => {
        try {
            await removeMember(item.id, teamId, userId);
            setSuccess("Member removed");
            await refreshTeamMembers(teamId);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to remove member");
        }
    };

    const handleChangeRole = async (teamId, userId, currentRole) => {
        const newRole = currentRole === "lead" ? "member" : "lead";
        try {
            await updateMemberRole(item.id, teamId, userId, newRole);
            setSuccess(`Role updated to ${newRole}`);
            await refreshTeamMembers(teamId);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update role");
        }
    };

    // --- Derived State ---
    const filteredTeams = useMemo(() => {
        return teams
            .filter(team => {
                const searchLower = searchQuery.toLowerCase();
                return (team.name?.toLowerCase().includes(searchLower) ||
                    team.description?.toLowerCase().includes(searchLower));
            })
            .sort((a, b) => {
                if (sortBy === "name") return a.name?.localeCompare(b.name);
                if (sortBy === "members") {
                    const countA = allTeamMembers[a._id || a.id]?.length || 0;
                    const countB = allTeamMembers[b._id || b.id]?.length || 0;
                    return countB - countA;
                }
                return 0;
            });
    }, [teams, searchQuery, sortBy, allTeamMembers]);

    return (
        <section className="relative">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], opacity: [0.03, 0.05, 0.03] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-3xl"
                />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative">
                <div className="flex items-center gap-3">
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                        <Users className="h-5 w-5 text-purple-400" />
                    </motion.div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Teams</h3>
                        <p className="text-xs text-slate-400">{teams.length} teams in workspace</p>
                    </div>
                </div>
                {canManageTeams && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/25"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Create Team</span>
                    </motion.button>
                )}
            </div>

            {/* Toolbar */}
            <TeamsToolbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                sortBy={sortBy}
                setSortBy={setSortBy}
            />

            {/* Status Messages */}
            <AnimatePresence>
                {(error || success) && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-4"
                    >
                        <div className={`p-4 rounded-xl border backdrop-blur-xl flex items-center gap-3 ${error ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            }`}>
                            {error ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                            <p className="text-sm font-medium flex-1">{error || success}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-12 w-12 text-purple-400 animate-spin" />
                    <p className="text-sm text-slate-400 mt-4">Loading teams...</p>
                </div>
            )}

            {/* Teams List */}
            {!loading && (
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {filteredTeams.map((team) => (
                            <TeamCard
                                key={team._id || team.id}
                                team={team}
                                members={allTeamMembers[team._id || team.id] || []}
                                workspaceMembers={workspaceMembers}
                                canManage={canManageTeams}
                                onDelete={handleDeleteTeam}
                                onAddMember={handleAddMemberToTeam}
                                onRemoveMember={handleRemoveMemberFromTeam}
                                onRoleChange={handleChangeRole}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Empty States */}
            {!loading && teams.length > 0 && filteredTeams.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-sm font-semibold text-slate-300">No teams found</p>
                </div>
            )}

            {!loading && teams.length === 0 && (
                <div className="text-center py-16">
                    <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-slate-300">No teams yet</h4>
                    <p className="text-sm text-slate-500 mb-6">Create teams to organize your workspace.</p>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showCreate && (
                    <CreateTeamModal
                        onClose={() => setShowCreate(false)}
                        onCreate={handleCreateTeam}
                        submitting={submitting}
                    />
                )}
            </AnimatePresence>
        </section>
    );
};

export default TeamsSection;