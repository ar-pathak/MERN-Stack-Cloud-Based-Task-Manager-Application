import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Plus, Loader2, AlertCircle, CheckCircle
} from "lucide-react";
import {
    getTeamsByWorkspace,
    createTeam,
    getTeamMembers,
    deleteTeam
} from "../../../../../../service/team.service";
import { useSelector } from "react-redux";

const TeamsSection = ({ item, onRefresh }) => {
    const [showCreate, setShowCreate] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamDesc, setNewTeamDesc] = useState("");
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState({});

    const currentUser = useSelector((state) => state.auth.user);

    useEffect(() => {
        if (item.type === 'workspace' && item.id) {
            fetchTeams();
        }
    }, [item.id, item.type]);

    const fetchTeams = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getTeamsByWorkspace(item.id);
            setTeams(data);

            // Fetch member count for each team
            const membersData = {};
            for (const team of data) {
                try {
                    const members = await getTeamMembers(item.id, team._id || team.id);
                    membersData[team._id || team.id] = members.length;
                } catch (err) {
                    console.error(`Failed to fetch members for team ${team._id}:`, err);
                    membersData[team._id || team.id] = 0;
                }
            }
            setTeamMembers(membersData);
        } catch (err) {
            setError(err.message || "Failed to load teams");
            console.error("Failed to fetch teams:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            setError("Team name is required");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            await createTeam(item.id, {
                name: newTeamName.trim(),
                description: newTeamDesc.trim() || undefined
            });

            setSuccess("Team created successfully!");
            setNewTeamName("");
            setNewTeamDesc("");
            setShowCreate(false);
            await fetchTeams();

            setTimeout(() => setSuccess(null), 3000);
            if (onRefresh) onRefresh();
        } catch (err) {
            setError(err.message || "Failed to create team");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTeam = async (teamId, teamName) => {
        if (!confirm(`Are you sure you want to delete "${teamName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            await deleteTeam(item.id, teamId);

            setSuccess("Team deleted successfully");
            await fetchTeams();

            setTimeout(() => setSuccess(null), 3000);
            if (onRefresh) onRefresh();
        } catch (err) {
            setError(err.message || "Failed to delete team");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Teams</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
                        {teams.length}
                    </span>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCreate(!showCreate)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-purple-400 transition-colors"
                        title="Create team"
                        disabled={submitting}
                    >
                        <Plus className="h-4 w-4" />
                    </motion.button>
                </div>
            </div>

            {/* Error/Success Messages */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2"
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
                        className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2"
                    >
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <p className="text-xs text-emerald-400">{success}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Team Form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                    >
                        <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
                            <input
                                type="text"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                placeholder="Team name"
                                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                                disabled={submitting}
                                maxLength={100}
                            />
                            <textarea
                                value={newTeamDesc}
                                onChange={(e) => setNewTeamDesc(e.target.value)}
                                placeholder="Description (optional)"
                                rows={2}
                                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none"
                                disabled={submitting}
                                maxLength={500}
                            />
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCreateTeam}
                                    disabled={!newTeamName.trim() || submitting}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Team'
                                    )}
                                </motion.button>
                                <button
                                    onClick={() => {
                                        setShowCreate(false);
                                        setNewTeamName("");
                                        setNewTeamDesc("");
                                        setError(null);
                                    }}
                                    disabled={submitting}
                                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
                </div>
            )}

            {/* Teams List */}
            {!loading && (
                <div className="space-y-2">
                    {teams.map((team, i) => (
                        <motion.div
                            key={team._id || team.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ scale: 1.01 }}
                            className="p-3 rounded-xl bg-gradient-to-br from-slate-900/40 to-slate-800/20 border border-slate-800/50 hover:border-purple-500/30 transition-all cursor-pointer group relative"
                            onClick={() => setSelectedTeam(selectedTeam === i ? null : i)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-slate-200 group-hover:text-purple-300 transition-colors">
                                    {team.name}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-800/60 px-2 py-1 rounded-md">
                                    <Users className="h-3 w-3" />
                                    {teamMembers[team._id || team.id] || 0}
                                </div>
                            </div>
                            {team.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                                    {team.description}
                                </p>
                            )}

                            {/* Team Actions */}
                            <AnimatePresence>
                                {selectedTeam === i && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="border-t border-slate-700/50 pt-2 mt-2 space-y-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            className="w-full text-left text-xs text-slate-400 hover:text-purple-400 py-1 transition-colors"
                                            onClick={() => {
                                                // Handle view team details
                                                console.log('View team:', team);
                                            }}
                                        >
                                            View Details
                                        </button>
                                        <button
                                            className="w-full text-left text-xs text-slate-400 hover:text-sky-400 py-1 transition-colors"
                                            onClick={() => {
                                                // Handle manage members
                                                console.log('Manage members:', team);
                                            }}
                                        >
                                            Manage Members
                                        </button>
                                        <button
                                            className="w-full text-left text-xs text-rose-400 hover:text-rose-300 py-1 transition-colors"
                                            onClick={() => handleDeleteTeam(team._id || team.id, team.name)}
                                            disabled={submitting}
                                        >
                                            Delete Team
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}

            {!loading && teams.length === 0 && (
                <div className="text-center py-8">
                    <Users className="h-12 w-12 text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No teams yet</p>
                    <p className="text-xs text-slate-600 mt-1">Create a team to organize your workspace</p>
                </div>
            )}
        </section>
    );
};

export default TeamsSection;