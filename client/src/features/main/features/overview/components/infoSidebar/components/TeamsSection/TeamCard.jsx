import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Users, MoreVertical, Trash2, Calendar, Crown, ChevronDown, 
    UserPlus, X, Plus 
} from "lucide-react";
import TeamMemberItem from "./TeamMemberItem";

const TeamCard = ({ 
    team, 
    members = [], 
    workspaceMembers = [], 
    canManage, 
    onDelete, 
    onAddMember, 
    onRemoveMember, 
    onRoleChange 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const teamId = team._id || team.id;
    const leadMembers = members.filter(m => (m?.role || "member") === "lead");

    // Calculate members not yet in this team
    const getAvailableMembers = () => {
        const currentMemberIds = members.map(m => m?.user?._id || m?._id || m?.id);
        return workspaceMembers.filter(wm => !currentMemberIds.includes(wm?.user?._id || wm?._id || wm?.id));
    };

    const availableMembers = getAvailableMembers();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all duration-300">
                {/* Card Header & Stats */}
                <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-base font-bold text-white truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-all">
                                    {team.name}
                                </h4>
                                {leadMembers.length > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                        <Crown className="h-3 w-3 text-amber-400" />
                                        <span className="text-xs text-amber-400 font-medium">{leadMembers.length}</span>
                                    </div>
                                )}
                            </div>
                            {team.description && (
                                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{team.description}</p>
                            )}
                        </div>

                        {canManage && (
                            <div className="relative ml-2">
                                <button
                                    onClick={() => setShowActions(!showActions)}
                                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                                >
                                    <MoreVertical className="h-4 w-4 text-slate-400" />
                                </button>
                                <AnimatePresence>
                                    {showActions && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                className="absolute right-0 top-full mt-2 bg-slate-900/95 border border-slate-800 rounded-xl shadow-xl z-20 min-w-[180px] p-1"
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(teamId, team.name);
                                                    }}
                                                    className="w-full px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2.5 group/item"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Delete Team
                                                </button>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-400" />
                            <span className="text-slate-300 font-medium">{members.length}</span> members
                        </div>
                        {team.createdAt && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(team.createdAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 flex items-center justify-center gap-2"
                        >
                            <Users className="h-3.5 w-3.5" />
                            {isExpanded ? 'Hide' : 'View'} Members
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {canManage && (
                            <button
                                onClick={() => setShowAddMenu(!showAddMenu)}
                                className={`px-3 py-2 border rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${showAddMenu ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-slate-700/30 border-transparent hover:bg-slate-700/50'}`}
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Add Member Area */}
                <AnimatePresence>
                    {showAddMenu && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-700/50 bg-slate-800/30"
                        >
                            <div className="p-4 max-h-48 overflow-y-auto">
                                <div className="flex justify-between mb-3">
                                    <h5 className="text-xs font-semibold text-slate-300">Add Member</h5>
                                    <button onClick={() => setShowAddMenu(false)}><X className="h-4 w-4 text-slate-500" /></button>
                                </div>
                                <div className="space-y-2">
                                    {availableMembers.length === 0 ? (
                                        <p className="text-xs text-slate-500 text-center py-3">No eligible members found.</p>
                                    ) : (
                                        availableMembers.map(wm => (
                                            <button
                                                key={wm?.user?._id || wm?._id}
                                                onClick={() => {
                                                    onAddMember(teamId, wm?.user?._id || wm?._id);
                                                    setShowAddMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg group/add"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                                    {(wm?.user?.name || wm?.name || "?").charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="text-xs font-medium text-slate-200 truncate">{wm?.user?.name || wm?.name}</p>
                                                </div>
                                                <Plus className="h-4 w-4 text-slate-500 group-hover/add:text-purple-400" />
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Members List Area */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-700/50 bg-slate-800/30"
                        >
                            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                                {members.length === 0 ? (
                                    <p className="text-center text-xs text-slate-500 py-4">No members yet</p>
                                ) : (
                                    members.map(member => (
                                        <TeamMemberItem
                                            key={member?.user?._id || member?._id || member?.id}
                                            member={member}
                                            canManage={canManage}
                                            onRoleChange={(uid, role) => onRoleChange(teamId, uid, role)}
                                            onRemove={(uid) => onRemoveMember(teamId, uid)}
                                        />
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default TeamCard;