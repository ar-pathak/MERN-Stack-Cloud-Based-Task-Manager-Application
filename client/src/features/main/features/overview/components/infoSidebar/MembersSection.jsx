import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, UserPlus, Shield, Crown, Eye,
    MoreVertical, UserMinus, Edit2, Search,
    Mail, Copy, CheckCircle2, AlertCircle, X, Filter, ChevronDown
} from "lucide-react";
import { useWorkspace } from "../../hook/useWorkspace";

const MembersSection = ({ item }) => {
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [selectedMember, setSelectedMember] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [copiedLink, setCopiedLink] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMemberName, setNewMemberName] = useState("");
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberRole, setNewMemberRole] = useState("member");
    const [addByUsername, setAddByUsername] = useState("");
    const [hoveredMember, setHoveredMember] = useState(null);
    const [removingMember, setRemovingMember] = useState(null);
    const [members, setMembers] = useState([]);
    const { fetchMembers, addMember } = useWorkspace();


    useEffect(() => {
        async function fetchMember() {
            const memberData = await fetchMembers(item.id)
            setMembers(memberData.data)
            console.log("memberData ", memberData.data)
        }
        fetchMember()
    }, [fetchMembers, item])



    const filteredMembers = members.filter(member => {
        const matchesSearch = member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === "all" || member.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const roleStats = {
        all: members.length,
        owner: members.filter(m => m.role === "owner").length,
        admin: members.filter(m => m.role === "admin").length,
        member: members.filter(m => m.role === "member").length,
        viewer: members.filter(m => m.role === "viewer").length,
    };

    const handleAddMember = async () => {

        const result = await addMember({ userName: addByUsername, role: newMemberRole });
        console.log(result);
        setInviteSuccess(true);
        setNewMemberName("");
        setNewMemberEmail("");
        setAddByUsername("");
        setTimeout(() => {
            setInviteSuccess(false);
            setShowAddMember(false);
        }, 2000);
    };

    const handleRemoveMember = (memberId) => {
        setRemovingMember(memberId);
        setTimeout(() => {
            // Here you would actually remove the member from the list
            setRemovingMember(null);
            setHoveredMember(null);
        }, 300);
    };

    const handleInvite = () => {
        setInviteSuccess(true);
        setInviteEmail("");
        setTimeout(() => {
            setInviteSuccess(false);
            setShowInvite(false);
        }, 2000);
    };

    const handleCopyInviteLink = () => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const getRoleBadge = (role) => {
        const badges = {
            owner: {
                icon: Crown,
                color: "purple",
                bg: "bg-purple-500/10",
                border: "border-purple-500/20",
                text: "text-purple-400"
            },
            admin: {
                icon: Shield,
                color: "amber",
                bg: "bg-amber-500/10",
                border: "border-amber-500/20",
                text: "text-amber-400"
            },
            viewer: {
                icon: Eye,
                color: "slate",
                bg: "bg-slate-800/40",
                border: "border-slate-700",
                text: "text-slate-400"
            },
            member: {
                icon: Users,
                color: "sky",
                bg: "bg-sky-500/10",
                border: "border-sky-500/20",
                text: "text-sky-400"
            }
        };
        return badges[role] || badges.member;
    };

    const getAvatarGradient = (id) => {
        const gradients = [
            "from-indigo-500 to-violet-600",
            "from-emerald-500 to-teal-600",
            "from-orange-500 to-pink-600",
            "from-blue-500 to-cyan-600",
            "from-purple-500 to-fuchsia-600"
        ];
        return gradients[id % gradients.length];
    };

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-sky-500/10 to-blue-600/10 border border-sky-500/20 rounded-lg">
                        <Users className="h-4 w-4 text-sky-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-200">Team Members</h3>
                        <p className="text-xs text-slate-500">{members.length} total • {members.filter(m => m.online).length} online</p>
                    </div>
                </div>
                {item?.type === 'workspace' && (
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowAddMember(!showAddMember)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
                        >
                            <UserPlus className="h-3.5 w-3.5" />
                            Add Member
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowInvite(!showInvite)}
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-sky-500/20"
                        >
                            <Mail className="h-3.5 w-3.5" />
                            Invite
                        </motion.button>
                    </div>
                )}
            </div>

            {/* Add Member Form */}
            <AnimatePresence>
                {showAddMember && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 border border-slate-800/50 rounded-xl p-4 space-y-3 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                    <UserPlus className="h-4 w-4 text-sky-400" />
                                    Add New Member
                                </h4>
                                <button
                                    onClick={() => setShowAddMember(false)}
                                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {inviteSuccess ? (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                                >
                                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                    <span className="text-sm text-emerald-400 font-medium">Member added successfully!</span>
                                </motion.div>
                            ) : (
                                <>
                                    {/* Add by Username */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-400">Add by Username</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">@</span>
                                                <input
                                                    type="text"
                                                    value={addByUsername}
                                                    onChange={(e) => setAddByUsername(e.target.value)}
                                                    placeholder="username"
                                                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all"
                                                />
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleAddMember}
                                                disabled={!addByUsername}
                                                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-medium transition-all"
                                            >
                                                Add
                                            </motion.button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-400">Role & Permissions</label>
                                        <select
                                            value={newMemberRole}
                                            onChange={(e) => setNewMemberRole(e.target.value)}
                                            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all"
                                        >
                                            <option value="viewer">👁️ Viewer - Can view only</option>
                                            <option value="member">✏️ Member - Can view and edit</option>
                                            <option value="admin">🛡️ Admin - Full access & management</option>
                                            <option value="owner">👑 Owner - Complete control</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleAddMember}
                                            disabled={!addByUsername}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-sky-500/20 disabled:shadow-none"
                                        >
                                            <UserPlus className="h-3.5 w-3.5" />
                                            Add Member
                                        </motion.button>
                                        <button
                                            onClick={() => setShowAddMember(false)}
                                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Invite Form */}
            <AnimatePresence>
                {showInvite && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 border border-slate-800/50 rounded-xl p-4 space-y-3 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-sky-400" />
                                    Invite Team Member
                                </h4>
                                <button
                                    onClick={() => setShowInvite(false)}
                                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {inviteSuccess ? (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                                >
                                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                    <span className="text-sm text-emerald-400 font-medium">Invitation sent successfully!</span>
                                </motion.div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-400">Email Address</label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="colleague@company.com"
                                            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-400">Role & Permissions</label>
                                        <select
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value)}
                                            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all"
                                        >
                                            <option value="viewer">👁️ Viewer - Can view only</option>
                                            <option value="member">✏️ Member - Can view and edit</option>
                                            <option value="admin">🛡️ Admin - Full access & management</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleInvite}
                                            disabled={!inviteEmail}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-sky-500/20 disabled:shadow-none"
                                        >
                                            <Mail className="h-3.5 w-3.5" />
                                            Send Invitation
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleCopyInviteLink}
                                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                                        >
                                            {copiedLink ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                            {copiedLink ? "Copied!" : "Copy Link"}
                                        </motion.button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search and Filters */}
            <div className="space-y-2">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search members..."
                            className="w-full bg-slate-900/40 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all"
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${showFilters
                            ? 'bg-sky-500/20 border border-sky-500/30 text-sky-400'
                            : 'bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        Filter
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
                                {Object.entries(roleStats).map(([role, count]) => (
                                    <button
                                        key={role}
                                        onClick={() => setFilterRole(role)}
                                        className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${filterRole === role
                                            ? 'bg-sky-500/20 border border-sky-500/30 text-sky-400'
                                            : 'bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-300'
                                            }`}
                                    >
                                        <span className="capitalize">{role}</span>
                                        <span className="ml-1.5 text-[10px] opacity-70">({count})</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Members List */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {filteredMembers.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-8 text-center"
                        >
                            <AlertCircle className="h-8 w-8 text-slate-600 mb-2" />
                            <p className="text-sm text-slate-400">No members found</p>
                            <p className="text-xs text-slate-600 mt-1">Try adjusting your search or filters</p>
                        </motion.div>
                    ) : (
                        filteredMembers.map((member, i) => {
                            const badge = getRoleBadge(member.role);
                            const BadgeIcon = badge.icon;

                            return (
                                <motion.div
                                    key={member.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="group relative"
                                >
                                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-900/60 border border-transparent hover:border-slate-800/50 transition-all cursor-pointer">
                                        <div className="relative">
                                            <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${getAvatarGradient(member.id)} flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
                                                {member.user.name.substring(0, 10).toUpperCase()}
                                            </div>
                                            {member.online && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full"
                                                >
                                                    <motion.div
                                                        animate={{ scale: [1, 1.2, 1] }}
                                                        transition={{ repeat: Infinity, duration: 2 }}
                                                        className="h-full w-full bg-emerald-400 rounded-full opacity-75"
                                                    />
                                                </motion.div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-200 truncate">{member.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-slate-500 truncate">{member.email}</p>
                                                <span className="text-slate-700">•</span>
                                                <p className="text-xs text-slate-600">{member.lastActive}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 ${badge.bg} border ${badge.border} rounded-lg`}
                                            >
                                                <BadgeIcon className={`h-3 w-3 ${badge.text}`} />
                                                <span className={`text-[10px] font-semibold ${badge.text} uppercase tracking-wide`}>
                                                    {member.role}
                                                </span>
                                            </motion.div>

                                            {item?.type === 'workspace' && member.role !== 'owner' && (
                                                <motion.button
                                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedMember(selectedMember === i ? null : i);
                                                    }}
                                                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-800 rounded-lg transition-all"
                                                >
                                                    <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Member Actions Dropdown */}
                                    <AnimatePresence>
                                        {selectedMember === i && item?.type === 'workspace' && (
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setSelectedMember(null)}
                                                    className="fixed inset-0 z-10"
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    className="absolute right-0 top-full mt-2 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden min-w-[180px] backdrop-blur-xl"
                                                >
                                                    <div className="p-1">
                                                        <button className="w-full px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-2.5 group/item">
                                                            <Edit2 className="h-3.5 w-3.5 text-slate-500 group-hover/item:text-sky-400 transition-colors" />
                                                            <span className="font-medium">Change Role</span>
                                                        </button>
                                                        <div className="my-1 h-px bg-slate-800/50" />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveMember(member.id);
                                                                setSelectedMember(null);
                                                            }}
                                                            className="w-full px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-2.5 group/item"
                                                        >
                                                            <UserMinus className="h-3.5 w-3.5 group-hover/item:scale-110 transition-transform" />
                                                            <span className="font-medium">Remove Member</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
};

export default MembersSection;