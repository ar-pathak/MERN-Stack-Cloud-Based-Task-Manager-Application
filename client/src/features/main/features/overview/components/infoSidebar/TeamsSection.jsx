import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Plus, Loader2, AlertCircle, CheckCircle, Search, Filter,
    ChevronDown, MoreVertical, Edit2, Trash2, UserPlus, Settings,
    Eye, Crown, Shield, X, Info
} from "lucide-react";

const TeamsSection = ({ item = { type: 'workspace', id: 'demo-workspace' }, onRefresh }) => {
    // Mock data for demonstration
    const mockTeams = [
        {
            _id: "team-1",
            name: "Engineering",
            description: "Core product development team working on platform features and infrastructure",
            createdAt: "2024-01-15T10:00:00Z"
        },
        {
            _id: "team-2",
            name: "Design",
            description: "UI/UX design team creating beautiful and intuitive user experiences",
            createdAt: "2024-01-20T10:00:00Z"
        },
        {
            _id: "team-3",
            name: "Marketing",
            description: "Growth and marketing team driving user acquisition and engagement",
            createdAt: "2024-02-01T10:00:00Z"
        },
        {
            _id: "team-4",
            name: "Sales",
            description: "Sales team building relationships and closing deals",
            createdAt: "2024-02-10T10:00:00Z"
        },
        {
            _id: "team-5",
            name: "Product",
            description: "Product management team defining roadmap and priorities",
            createdAt: "2024-02-15T10:00:00Z"
        },
        {
            _id: "team-6",
            name: "Customer Success",
            description: "Ensuring customers get maximum value from our platform",
            createdAt: "2024-03-01T10:00:00Z"
        }
    ];

    const mockTeamMembers = {
        "team-1": 12,
        "team-2": 8,
        "team-3": 6,
        "team-4": 10,
        "team-5": 5,
        "team-6": 7
    };

    const [showCreate, setShowCreate] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamDesc, setNewTeamDesc] = useState("");
    const [teams, setTeams] = useState(mockTeams);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState(mockTeamMembers);
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState("name");
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [showAddMember, setShowAddMember] = useState(null);
    const [selectedMemberMenu, setSelectedMemberMenu] = useState(null);

    const currentUser = { name: "Demo User", id: "demo-user" };

    // Mock workspace members
    const workspaceMembers = [
        { id: "user-1", name: "Alice Johnson", email: "alice@company.com", avatar: null },
        { id: "user-2", name: "Bob Smith", email: "bob@company.com", avatar: null },
        { id: "user-3", name: "Carol White", email: "carol@company.com", avatar: null },
        { id: "user-4", name: "David Chen", email: "david@company.com", avatar: null },
        { id: "user-5", name: "Emma Davis", email: "emma@company.com", avatar: null },
        { id: "user-6", name: "Frank Wilson", email: "frank@company.com", avatar: null },
        { id: "user-7", name: "Grace Lee", email: "grace@company.com", avatar: null },
        { id: "user-8", name: "Henry Brown", email: "henry@company.com", avatar: null }
    ];

    // Mock team members with roles
    const [allTeamMembers, setAllTeamMembers] = useState({
        "team-1": [
            { id: "user-1", name: "Alice Johnson", email: "alice@company.com", role: "lead" },
            { id: "user-2", name: "Bob Smith", email: "bob@company.com", role: "member" },
            { id: "user-3", name: "Carol White", email: "carol@company.com", role: "member" }
        ],
        "team-2": [
            { id: "user-4", name: "David Chen", email: "david@company.com", role: "lead" },
            { id: "user-5", name: "Emma Davis", email: "emma@company.com", role: "member" }
        ],
        "team-3": [
            { id: "user-6", name: "Frank Wilson", email: "frank@company.com", role: "lead" },
            { id: "user-7", name: "Grace Lee", email: "grace@company.com", role: "member" }
        ],
        "team-4": [
            { id: "user-8", name: "Henry Brown", email: "henry@company.com", role: "lead" }
        ],
        "team-5": [],
        "team-6": []
    });

    useEffect(() => {
        if (item.type === 'workspace' && item.id) {
            // Simulate loading for demo
            setLoading(true);
            setTimeout(() => {
                setLoading(false);
            }, 800);
        }
    }, [item.id, item.type]);

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            setError("Team name is required");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newTeam = {
                _id: `team-${Date.now()}`,
                name: newTeamName.trim(),
                description: newTeamDesc.trim() || "",
                createdAt: new Date().toISOString()
            };

            setTeams([...teams, newTeam]);
            setTeamMembers({
                ...teamMembers,
                [newTeam._id]: 0
            });

            setSuccess("Team created successfully!");
            setNewTeamName("");
            setNewTeamDesc("");
            setShowCreate(false);

            setTimeout(() => setSuccess(null), 3000);
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

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));

            setTeams(teams.filter(t => t._id !== teamId));
            const newTeamMembers = { ...teamMembers };
            delete newTeamMembers[teamId];
            setTeamMembers(newTeamMembers);

            setSuccess("Team deleted successfully");
            setSelectedTeam(null);
            setExpandedTeam(null);

            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message || "Failed to delete team");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddMemberToTeam = (teamId, userId) => {
        const member = workspaceMembers.find(m => m.id === userId);
        if (!member) return;

        const teamMembersList = allTeamMembers[teamId] || [];

        // Check if already member
        if (teamMembersList.find(m => m.id === userId)) {
            setError("User is already a member of this team");
            setTimeout(() => setError(null), 3000);
            return;
        }

        const newMember = {
            ...member,
            role: "member"
        };

        setAllTeamMembers({
            ...allTeamMembers,
            [teamId]: [...teamMembersList, newMember]
        });

        setTeamMembers({
            ...teamMembers,
            [teamId]: (teamMembers[teamId] || 0) + 1
        });

        setShowAddMember(null);
        setSuccess("Member added successfully!");
        setTimeout(() => setSuccess(null), 3000);
    };

    const handleRemoveMemberFromTeam = (teamId, userId) => {
        const teamMembersList = allTeamMembers[teamId] || [];
        const updatedMembers = teamMembersList.filter(m => m.id !== userId);

        setAllTeamMembers({
            ...allTeamMembers,
            [teamId]: updatedMembers
        });

        setTeamMembers({
            ...teamMembers,
            [teamId]: Math.max(0, (teamMembers[teamId] || 0) - 1)
        });

        setSelectedMemberMenu(null);
        setSuccess("Member removed successfully!");
        setTimeout(() => setSuccess(null), 3000);
    };

    const handleChangeRole = (teamId, userId, currentRole) => {
        const teamMembersList = allTeamMembers[teamId] || [];
        const newRole = currentRole === "lead" ? "member" : "lead";

        const updatedMembers = teamMembersList.map(m =>
            m.id === userId ? { ...m, role: newRole } : m
        );

        setAllTeamMembers({
            ...allTeamMembers,
            [teamId]: updatedMembers
        });

        setSelectedMemberMenu(null);
        setSuccess(`Role changed to ${newRole}!`);
        setTimeout(() => setSuccess(null), 3000);
    };

    const filteredTeams = teams
        .filter(team =>
            team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortBy === "name") return a.name.localeCompare(b.name);
            if (sortBy === "members") return (teamMembers[b._id] || 0) - (teamMembers[a._id] || 0);
            return 0;
        });

    const getTeamGradient = (index) => {
        const gradients = [
            "from-purple-500 to-pink-600",
            "from-blue-500 to-cyan-600",
            "from-emerald-500 to-teal-600",
            "from-orange-500 to-red-600",
            "from-indigo-500 to-violet-600"
        ];
        return gradients[index % gradients.length];
    };

    const getMemberGradient = (id) => {
        const gradients = [
            "from-indigo-500 to-violet-600",
            "from-emerald-500 to-teal-600",
            "from-orange-500 to-pink-600",
            "from-blue-500 to-cyan-600",
            "from-purple-500 to-fuchsia-600"
        ];
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return gradients[hash % gradients.length];
    };

    const getAvailableMembers = (teamId) => {
        const teamMembersList = allTeamMembers[teamId] || [];
        const teamMemberIds = teamMembersList.map(m => m.id);
        return workspaceMembers.filter(m => !teamMemberIds.includes(m.id));
    };

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/20 rounded-lg">
                        <Users className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-200">Teams</h3>
                        <p className="text-xs text-slate-500">{teams.length} total teams</p>
                    </div>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-purple-500/20"
                    disabled={submitting}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Create Team
                </motion.button>
            </div>

            {/* Error/Success Messages */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-rose-400">{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                            <p className="text-xs text-emerald-400 flex-1">{success}</p>
                        </div>
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
                        className="overflow-hidden"
                    >
                        <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-purple-400" />
                                    Create New Team
                                </h4>
                                <button
                                    onClick={() => {
                                        setShowCreate(false);
                                        setNewTeamName("");
                                        setNewTeamDesc("");
                                        setError(null);
                                    }}
                                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400">Team Name</label>
                                <input
                                    type="text"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    placeholder="Engineering, Marketing, Design..."
                                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    disabled={submitting}
                                    maxLength={100}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400">Description (Optional)</label>
                                <textarea
                                    value={newTeamDesc}
                                    onChange={(e) => setNewTeamDesc(e.target.value)}
                                    placeholder="What does this team work on?"
                                    rows={3}
                                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none transition-all"
                                    disabled={submitting}
                                    maxLength={500}
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
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
                                        <>
                                            <Plus className="h-3.5 w-3.5" />
                                            Create Team
                                        </>
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

            {/* Search and Sort */}
            {teams.length > 0 && (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search teams..."
                                className="w-full bg-slate-900/40 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                            />
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${showFilters
                                    ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                                    : 'bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Sort
                            <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </motion.button>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="flex gap-2 p-2 bg-slate-900/40 border border-slate-800 rounded-lg">
                                    <button
                                        onClick={() => setSortBy("name")}
                                        className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${sortBy === "name"
                                                ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                                                : 'bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-300'
                                            }`}
                                    >
                                        Name A-Z
                                    </button>
                                    <button
                                        onClick={() => setSortBy("members")}
                                        className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${sortBy === "members"
                                                ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                                                : 'bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-300'
                                            }`}
                                    >
                                        Most Members
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-purple-400 animate-spin mb-3" />
                    <p className="text-xs text-slate-500">Loading teams...</p>
                </div>
            )}

            {/* Teams List */}
            {!loading && (
                <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                        {filteredTeams.length === 0 && searchQuery ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-8"
                            >
                                <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">No teams found</p>
                                <p className="text-xs text-slate-600 mt-1">Try adjusting your search</p>
                            </motion.div>
                        ) : (
                            filteredTeams.map((team, i) => (
                                <motion.div
                                    key={team._id || team.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="group relative"
                                >
                                    <div
                                        onClick={() => setExpandedTeam(expandedTeam === team._id ? null : team._id)}
                                        className="p-4 rounded-xl bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-800/50 hover:border-purple-500/30 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${getTeamGradient(i)} shadow-lg flex-shrink-0`}>
                                                    <Users className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-semibold text-slate-200 group-hover:text-purple-300 transition-colors truncate">
                                                        {team.name}
                                                    </h4>
                                                    {team.description && (
                                                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                                            {team.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 ml-2">
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700">
                                                    <Users className="h-3 w-3" />
                                                    <span className="font-medium">{(allTeamMembers[team._id] || []).length}</span>
                                                </div>

                                                <motion.button
                                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTeam(selectedTeam === i ? null : i);
                                                    }}
                                                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-800 rounded-lg transition-all"
                                                >
                                                    <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                                                </motion.button>

                                                <motion.div
                                                    animate={{ rotate: expandedTeam === team._id ? 180 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="text-slate-500"
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </motion.div>
                                            </div>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="flex items-center gap-3 text-[10px] text-slate-600">
                                            <div className="flex items-center gap-1">
                                                <Info className="h-3 w-3" />
                                                <span>Created {new Date(team.createdAt || Date.now()).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Team Members */}
                                    <AnimatePresence>
                                        {expandedTeam === team._id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-2 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 space-y-3">
                                                    {/* Add Member Button */}
                                                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
                                                        <h5 className="text-xs font-semibold text-slate-300">Team Members</h5>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowAddMember(showAddMember === team._id ? null : team._id);
                                                            }}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 rounded-lg text-xs font-medium transition-all"
                                                        >
                                                            <UserPlus className="h-3 w-3" />
                                                            Add Member
                                                        </motion.button>
                                                    </div>

                                                    {/* Add Member Dropdown */}
                                                    <AnimatePresence>
                                                        {showAddMember === team._id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1 max-h-48 overflow-y-auto">
                                                                    {getAvailableMembers(team._id).length === 0 ? (
                                                                        <p className="text-xs text-slate-500 text-center py-2">All workspace members are already in this team</p>
                                                                    ) : (
                                                                        getAvailableMembers(team._id).map((member) => (
                                                                            <motion.button
                                                                                key={member.id}
                                                                                whileHover={{ scale: 1.02 }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleAddMemberToTeam(team._id, member.id);
                                                                                }}
                                                                                className="w-full flex items-center gap-2 p-2 hover:bg-slate-800/60 rounded-lg transition-colors text-left"
                                                                            >
                                                                                <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${getMemberGradient(member.id)} flex items-center justify-center text-xs font-bold text-white`}>
                                                                                    {member.name.substring(0, 2).toUpperCase()}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-xs font-medium text-slate-300 truncate">{member.name}</p>
                                                                                    <p className="text-[10px] text-slate-500 truncate">{member.email}</p>
                                                                                </div>
                                                                            </motion.button>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    {/* Members List */}
                                                    <div className="space-y-2">
                                                        {(allTeamMembers[team._id] || []).length === 0 ? (
                                                            <div className="text-center py-4">
                                                                <Users className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                                                                <p className="text-xs text-slate-500">No members yet</p>
                                                            </div>
                                                        ) : (
                                                            (allTeamMembers[team._id] || []).map((member, idx) => (
                                                                <motion.div
                                                                    key={member.id}
                                                                    initial={{ opacity: 0, x: -10 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: idx * 0.05 }}
                                                                    className="group/member relative flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/40 transition-all"
                                                                >
                                                                    <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${getMemberGradient(member.id)} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
                                                                        {member.name.substring(0, 2).toUpperCase()}
                                                                    </div>

                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-medium text-slate-200 truncate">{member.name}</p>
                                                                        <p className="text-[10px] text-slate-500 truncate">{member.email}</p>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        {member.role === "lead" ? (
                                                                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                                                                <Crown className="h-3 w-3 text-amber-400" />
                                                                                <span className="text-[10px] font-semibold text-amber-400 uppercase">Lead</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-1 px-2 py-1 bg-sky-500/10 border border-sky-500/20 rounded-md">
                                                                                <Users className="h-3 w-3 text-sky-400" />
                                                                                <span className="text-[10px] font-semibold text-sky-400 uppercase">Member</span>
                                                                            </div>
                                                                        )}

                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedMemberMenu(selectedMemberMenu === `${team._id}-${member.id}` ? null : `${team._id}-${member.id}`);
                                                                            }}
                                                                            className="p-1.5 opacity-0 group-hover/member:opacity-100 hover:bg-slate-700 rounded transition-all"
                                                                        >
                                                                            <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                                                                        </motion.button>
                                                                    </div>

                                                                    {/* Member Actions Dropdown */}
                                                                    <AnimatePresence>
                                                                        {selectedMemberMenu === `${team._id}-${member.id}` && (
                                                                            <>
                                                                                <motion.div
                                                                                    initial={{ opacity: 0 }}
                                                                                    animate={{ opacity: 1 }}
                                                                                    exit={{ opacity: 0 }}
                                                                                    onClick={() => setSelectedMemberMenu(null)}
                                                                                    className="fixed inset-0 z-10"
                                                                                />
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                                    className="absolute right-0 top-full mt-1 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden min-w-[160px] backdrop-blur-xl"
                                                                                >
                                                                                    <div className="p-1">
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleChangeRole(team._id, member.id, member.role);
                                                                                            }}
                                                                                            className="w-full px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-2.5 group/item"
                                                                                        >
                                                                                            <Shield className="h-3.5 w-3.5 text-slate-500 group-hover/item:text-amber-400 transition-colors" />
                                                                                            <span className="font-medium">
                                                                                                {member.role === "lead" ? "Make Member" : "Make Lead"}
                                                                                            </span>
                                                                                        </button>
                                                                                        <div className="my-1 h-px bg-slate-800/50" />
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleRemoveMemberFromTeam(team._id, member.id);
                                                                                            }}
                                                                                            className="w-full px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-2.5 group/item"
                                                                                        >
                                                                                            <Trash2 className="h-3.5 w-3.5 group-hover/item:scale-110 transition-transform" />
                                                                                            <span className="font-medium">Remove Member</span>
                                                                                        </button>
                                                                                    </div>
                                                                                </motion.div>
                                                                            </>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </motion.div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Team Actions Dropdown */}
                                    <AnimatePresence>
                                        {selectedTeam === i && (
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setSelectedTeam(null)}
                                                    className="fixed inset-0 z-10"
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    className="absolute right-0 top-12 mt-2 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden min-w-[180px] backdrop-blur-xl"
                                                >
                                                    <div className="p-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteTeam(team._id || team.id, team.name);
                                                            }}
                                                            disabled={submitting}
                                                            className="w-full px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-2.5 group/item disabled:opacity-50"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 group-hover/item:scale-110 transition-transform" />
                                                            <span className="font-medium">Delete Team</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Empty State */}
            {!loading && teams.length === 0 && !searchQuery && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                >
                    <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full"></div>
                        <Users className="h-16 w-16 text-slate-700 mx-auto relative" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-1">No teams yet</h4>
                    <p className="text-xs text-slate-500 mb-4">Create a team to organize your workspace</p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-purple-500/20"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Create Your First Team
                    </motion.button>
                </motion.div>
            )}
        </section>
    );
};

export default TeamsSection;