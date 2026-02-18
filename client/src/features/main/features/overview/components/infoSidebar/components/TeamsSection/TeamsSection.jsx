import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useTeam } from "../../../../hook/useTeam";
import { useWorkspace } from "../../../../hook/useWorkspace";
import { useProject } from "../../../../hook/useProject";
import { useTask } from "../../../../hook/useTask";

// Import sub-components
import CreateTeamModal from "./CreateTeamModal";
import AssignTeamModal from "./AssignTeamModal";
import TeamCard from "./TeamCard";
import TeamsToolbar from "./TeamsToolbar";
import ConfirmationModal from "./ConfirmationModal";
import { useAuth } from "../../../../../../../../context/AuthContext";

const TeamsSection = ({ item, taskData, onRefresh, presenceByUserId = {} }) => {
    // ========== UI State ==========
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState("name");

    // ========== Feedback State ==========
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Modal State
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        type: null, // 'DELETE_TEAM' | 'REMOVE_MEMBER' | 'LEAVE_TEAM'
        data: null,
        title: "",
        message: ""
    });

    // ========== Data State ==========
    const [teams, setTeams] = useState([]);
    const [allTeamMembers, setAllTeamMembers] = useState({});
    const [workspaceMembers, setWorkspaceMembers] = useState([]);

    // ========== Derived State ==========
    const isWorkspace = item.type === 'workspace';
    const canManageTeams = ['owner', 'admin', 'creator'].includes(item?.permissions?.role);

    // ========== Hooks ==========
    const { user } = useAuth();

    const {
        fetchTeams,
        createNewTeam,
        removeTeam,
        fetchMembers: fetchTeamMembers,
        addMember,
        removeMember,
        updateMemberRole,
        leaveTeam // Ensure leaveTeam is destructured
    } = useTeam();

    const { addProjectTeams, removeProjectTeams, fetchProjectTeams } = useProject();
    const { fetchTaskById, assignTeams, removeAssignTeams, } = useTask();
    const { fetchMembers: fetchWorkspaceMembers } = useWorkspace();

    // ========== Helper Functions ==========
    const getWorkspaceId = useCallback(() => {
        if (item.type === 'workspace') return item.id;
        if (item.workspace && typeof item.workspace === 'object') return item.workspace._id;
        return item.workspace;
    }, [item.type, item.id, item.workspace]);

    const showMessage = useCallback((type, message) => {
        if (type === 'success') {
            setSuccess(message);
            setError(null);
        } else {
            setError(message);
            setSuccess(null);
        }
    }, []);

    // ========== Auto-dismiss Messages ==========
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(null);
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    // ========== Data Loading ==========
    const loadTeamsData = useCallback(async () => {
        if (!item.id) return;

        try {
            setLoading(true);
            const workspaceId = getWorkspaceId();

            // Parallel data fetching
            const promises = [];

            // 1. Load workspace members if needed
            if (isWorkspace) {
                promises.push(
                    fetchWorkspaceMembers(item.id)
                        .then(res => setWorkspaceMembers(res.data || []))
                        .catch(err => console.error("Failed to load workspace members:", err))
                );
            }

            // 2. Load teams based on context
            let teamsPromise;
            if (isWorkspace) {
                teamsPromise = fetchTeams(item.id);
            } else if (item.type === 'project') {
                teamsPromise = fetchProjectTeams(workspaceId, item.id);
            } else if (item.type === 'task') {
                teamsPromise = fetchTaskById(item.id)
                    .then(res => ({ data: res.data?.assigneesTeams || [] }));
            }

            promises.push(teamsPromise);

            const results = await Promise.all(promises);
            const teamsData = isWorkspace ? results[1]?.data || [] : results?.[0]?.data || [];

            setTeams(Array.isArray(teamsData) ? teamsData : []);

            // 3. Load members for each team
            if (teamsData.length > 0) {
                const memberPromises = teamsData.map(async (team) => {
                    try {
                        const teamId = team._id || team.id;
                        const membersResult = await fetchTeamMembers(workspaceId || team.workspace, teamId);
                        return { teamId, members: membersResult.data || [] };
                    } catch (error) {
                        return { teamId: team._id || team.id, members: [] };
                    }
                });

                const memberResults = await Promise.allSettled(memberPromises);
                const membersMap = {};

                memberResults.forEach(result => {
                    if (result.status === 'fulfilled') {
                        membersMap[result.value.teamId] = result.value.members;
                    }
                });

                setAllTeamMembers(membersMap);
            }

        } catch (err) {
            console.error("Failed to load teams data:", err);
            showMessage('error', "Failed to load teams data");
        } finally {
            setLoading(false);
        }
    }, [item.id, item.type, isWorkspace, getWorkspaceId, fetchWorkspaceMembers, fetchTeams, fetchProjectTeams, fetchTaskById, fetchTeamMembers, showMessage]);

    useEffect(() => {
        loadTeamsData();
    }, [loadTeamsData]);

    // ========== Refresh Team Members ==========
    const refreshTeamMembers = useCallback(async (teamId) => {
        try {
            const result = await fetchTeamMembers(getWorkspaceId(), teamId);
            setAllTeamMembers(prev => ({ ...prev, [teamId]: result.data || [] }));
        } catch (err) {
            console.error("Failed to refresh members:", err);
        }
    }, [getWorkspaceId, fetchTeamMembers]);

    // ========== Primary Action Handler (Create/Assign) ==========
    const handlePrimaryAction = useCallback(async (payload) => {
        try {
            setSubmitting(true);
            const workspaceId = getWorkspaceId();

            if (isWorkspace) {
                await createNewTeam(item.id, payload);
                showMessage('success', "Team created successfully!");
            } else {
                const teamIds = Array.isArray(payload) ? payload : [payload];

                if (item.type === 'project') {
                    await addProjectTeams(workspaceId, item.id, teamIds);
                    showMessage('success', "Teams assigned successfully!");
                } else if (item.type === 'task') {
                    await assignTeams(item.id, teamIds);
                    showMessage('success', "Teams assigned successfully!");
                }
            }

            setShowModal(false);
            await loadTeamsData();
            onRefresh?.();

        } catch (err) {
            console.error("Primary action failed:", err);
            showMessage('error', err.response?.data?.message || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    }, [isWorkspace, item.id, item.type, getWorkspaceId, createNewTeam, addProjectTeams, assignTeams, loadTeamsData, onRefresh, showMessage]);


    // ========== TRIGGERS (Open Modal Only) ==========

    const handleDeleteOrRemoveTrigger = useCallback((teamId, teamName) => {
        const actionText = isWorkspace ? "Delete" : "Remove";
        setConfirmConfig({
            isOpen: true,
            type: 'DELETE_TEAM',
            data: { teamId, teamName },
            title: `${actionText} Team?`,
            message: `Are you sure you want to ${actionText.toLowerCase()} "${teamName}"? This action cannot be undone.`
        });
    }, [isWorkspace]);

    const handleRemoveMemberTrigger = useCallback((teamId, userId) => {
        setConfirmConfig({
            isOpen: true,
            type: 'REMOVE_MEMBER',
            data: { teamId, userId },
            title: "Remove Member?",
            message: "Are you sure you want to remove this member? They will lose access to team resources."
        });
    }, []);

    const handleLeaveTrigger = useCallback((teamId, teamName) => {
        setConfirmConfig({
            isOpen: true,
            type: 'LEAVE_TEAM',
            data: { teamId, teamName },
            title: "Leave Team?",
            message: `Are you sure you want to leave "${teamName}"? You will lose access to this team's resources.`
        });
    }, []);


    // ========== EXECUTOR (Runs on Modal Confirm) ==========

    const handleConfirmAction = async () => {
        const { type, data } = confirmConfig;
        if (!type || !data) return;

        setSubmitting(true);

        try {
            const workspaceId = getWorkspaceId();

            // 1. DELETE / REMOVE TEAM
            if (type === 'DELETE_TEAM') {
                const { teamId } = data;

                if (isWorkspace) {
                    await removeTeam(item.id, teamId);
                    showMessage('success', "Team deleted successfully");
                } else if (item.type === 'project') {
                    await removeProjectTeams(workspaceId, item.id, teamId);
                    showMessage('success', "Team removed from project");
                } else if (item.type === 'task') {
                    await removeAssignTeams(item.id, teamId);
                    showMessage('success', "Team removed from task");
                }

                await loadTeamsData();
                onRefresh?.();
            }

            // 2. REMOVE MEMBER
            else if (type === 'REMOVE_MEMBER') {
                const { teamId, userId } = data;
                await removeMember(workspaceId, teamId, userId);
                await refreshTeamMembers(teamId);
                showMessage('success', "Member removed successfully");
            }

            // 3. LEAVE TEAM
            else if (type === 'LEAVE_TEAM') {
                const { teamId } = data;
                await leaveTeam(workspaceId, teamId);
                showMessage('success', "You have left the team");
                await loadTeamsData();
                onRefresh?.();
            }

            // Close Modal on success
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));

        } catch (err) {
            console.error("Action failed:", err);
            showMessage('error', err.response?.data?.message || err.message || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };


    // ========== Member Management Handlers ==========

    const handleAddMemberToTeam = useCallback(async (teamId, userId) => {
        try {
            const workspaceId = getWorkspaceId();
            await addMember(workspaceId, teamId, { memberId: userId, role: 'member' });
            await refreshTeamMembers(teamId);
            showMessage('success', "Member added successfully");
        } catch (err) {
            console.error("Failed to add member:", err);
            showMessage('error', err.response?.data?.message || "Failed to add member");
        }
    }, [getWorkspaceId, addMember, refreshTeamMembers, showMessage]);


    const handleChangeRole = useCallback(async (teamId, userId, currentRole) => {
        const newRole = currentRole === 'lead' ? 'member' : 'lead';

        try {
            const workspaceId = getWorkspaceId();
            await updateMemberRole(workspaceId, teamId, userId, newRole);
            await refreshTeamMembers(teamId);
            showMessage('success', `Role updated to ${newRole}`);
        } catch (err) {
            console.error("Failed to update role:", err);
            showMessage('error', err.response?.data?.message || "Failed to update role");
        }
    }, [getWorkspaceId, updateMemberRole, refreshTeamMembers, showMessage]);

    // ========== Memoized Values ==========
    const currentTeamIds = useMemo(() =>
        teams.map(t => t._id || t.id),
        [teams]
    );

    const filteredTeams = useMemo(() => {
        return teams
            .filter(team => {
                if (!searchQuery) return true;
                const searchLower = searchQuery.toLowerCase();
                return (
                    team.name?.toLowerCase().includes(searchLower) ||
                    team.description?.toLowerCase().includes(searchLower)
                );
            })
            .sort((a, b) => {
                if (sortBy === "name") {
                    return (a.name || '').localeCompare(b.name || '');
                }
                if (sortBy === "members") {
                    const countA = allTeamMembers[a._id || a.id]?.length || 0;
                    const countB = allTeamMembers[b._id || b.id]?.length || 0;
                    return countB - countA;
                }
                return 0;
            });
    }, [teams, searchQuery, sortBy, allTeamMembers]);

    const hasTeams = teams.length > 0;
    const hasFilteredTeams = filteredTeams.length > 0;

    // ========== Render ==========
    return (
        <section className="relative pb-8 sm:pb-10">
            {/* Header */}
            <div className="relative mb-5 sm:mb-8">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5 rounded-2xl blur-3xl"></div>

                {/* Content */}
                <div className="relative flex flex-col gap-3 rounded-2xl border border-slate-700/50 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-2 sm:p-2.5">
                                <Users className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                            </div>
                            <h2 className="text-lg font-bold text-white sm:text-2xl">Teams</h2>
                        </div>
                        <p className="text-xs text-slate-400 sm:text-sm">
                            {isWorkspace
                                ? "Organize your workspace into collaborative teams"
                                : `Teams ${item.type === 'project' ? 'working on this project' : 'assigned to this task'}`
                            }
                        </p>
                    </div>

                    {canManageTeams && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowModal(true)}
                            disabled={submitting}
                            className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 sm:px-5 sm:py-2.5 sm:text-sm max-[360px]:w-full"
                        >
                            <Plus className="h-4 w-4" />
                            {isWorkspace ? 'Create Team' : 'Assign Teams'}
                        </motion.button>
                    )}
                </div>
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
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:gap-3 sm:p-4"
                    >
                        <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        <p className="text-xs text-emerald-400 sm:text-sm">{success}</p>
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 sm:gap-3 sm:p-4"
                    >
                        <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                        <p className="text-xs text-rose-400 sm:text-sm">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-14 sm:py-20">
                    <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
                    <p className="text-slate-400 text-sm">Loading teams...</p>
                </div>
            )}

            {/* Teams List */}
            {!loading && hasFilteredTeams && (
                <div className="space-y-3 sm:space-y-4">
                    <AnimatePresence mode="popLayout">
                        {filteredTeams.map((team) => (
                            <TeamCard
                                key={team._id || team.id}
                                team={team}
                                members={allTeamMembers[team._id || team.id] || []}
                                workspaceMembers={workspaceMembers}
                                presenceByUserId={presenceByUserId}
                                canManage={canManageTeams}
                                onDelete={handleDeleteOrRemoveTrigger}
                                onLeave={handleLeaveTrigger}
                                onAddMember={handleAddMemberToTeam}
                                onRemoveMember={handleRemoveMemberTrigger}
                                onRoleChange={handleChangeRole}
                                contextType={item.type}
                                currentUserId={user?._id || user?.id}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Empty States */}
            {!loading && !hasTeams && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center px-3 py-14 sm:px-4 sm:py-20"
                >
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-2xl"></div>
                        <div className="relative p-6 bg-slate-800/50 rounded-full">
                            <Users className="h-12 w-12 text-slate-500" />
                        </div>
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-white sm:text-xl">
                        {isWorkspace ? 'No teams yet' : 'No teams assigned'}
                    </h3>
                    <p className="mb-6 max-w-md text-center text-xs text-slate-400 sm:text-sm">
                        {isWorkspace
                            ? 'Create your first team to start organizing your workspace members into collaborative groups.'
                            : `Assign teams to this ${item.type} to distribute work and improve collaboration.`
                        }
                    </p>
                    {canManageTeams && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all hover:from-purple-600 hover:to-pink-700 sm:px-6 sm:py-3 sm:text-sm"
                        >
                            <Plus className="h-4 w-4" />
                            {isWorkspace ? 'Create First Team' : 'Assign Teams'}
                        </motion.button>
                    )}
                </motion.div>
            )}

            {/* No Search Results */}
            {!loading && hasTeams && !hasFilteredTeams && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center px-3 py-12 sm:px-4 sm:py-16"
                >
                    <Users className="h-10 w-10 text-slate-600 mb-3" />
                    <p className="mb-1 text-sm text-slate-500">No teams found</p>
                    <p className="text-slate-600 text-xs">Try adjusting your search</p>
                </motion.div>
            )}

            {/* Dynamic Modals (Create / Assign) */}
            <AnimatePresence>
                {showModal && (
                    isWorkspace ? (
                        <CreateTeamModal
                            onClose={() => setShowModal(false)}
                            onCreate={handlePrimaryAction}
                            submitting={submitting}
                        />
                    ) : (
                        <AssignTeamModal
                            item={item}
                            taskData={taskData}
                            workspaceId={getWorkspaceId()}
                            currentTeamIds={currentTeamIds}
                            onClose={() => setShowModal(false)}
                            onAssign={handlePrimaryAction}
                            submitting={submitting}
                        />
                    )
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmConfig.isOpen && (
                    <ConfirmationModal
                        isOpen={confirmConfig.isOpen}
                        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                        onConfirm={handleConfirmAction}
                        title={confirmConfig.title}
                        message={confirmConfig.message}
                        loading={submitting}
                        type={confirmConfig.type === 'LEAVE_TEAM' ? 'warning' : 'danger'}
                    />
                )}
            </AnimatePresence>
        </section>
    );
};

export default TeamsSection;
