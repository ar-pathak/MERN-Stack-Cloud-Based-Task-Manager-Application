import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, MoreVertical, Trash2, Calendar, Crown, ChevronDown,
    UserPlus, X, Plus, UserMinus
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
    onRoleChange,
    contextType = 'workspace'
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showActions, setShowActions] = useState(false);
    console.log("TeamCard Render:", team);
    const teamId = team._id || team.id;
    const isWorkspace = contextType === 'workspace';

    // ========== Memoized Computations ==========

    // Count lead members efficiently
    const leadCount = useMemo(() =>
        members.filter(m => (m?.role || "member") === "lead").length,
        [members]
    );

    // Calculate available members (O(N) instead of O(N^2))
    const availableMembers = useMemo(() => {
        if (!isWorkspace) return [];

        // Create a Set of current member IDs for O(1) lookup
        const currentMemberIds = new Set(
            members.map(m => m?.user?._id || m?._id || m?.id)
        );

        return workspaceMembers.filter(wm => {
            const wmId = wm?.user?._id || wm?._id || wm?.id;
            return wmId && !currentMemberIds.has(wmId);
        });
    }, [isWorkspace, members, workspaceMembers]);

    // ========== Event Handlers ==========

    const handleDeleteClick = useCallback((e) => {
        e.stopPropagation();
        setShowActions(false);
        onDelete(teamId, team.name);
    }, [teamId, team.name, onDelete]);

    const handleAddMemberClick = useCallback((memberId) => {
        onAddMember(teamId, memberId);
        // Optionally close menu after adding
        // setShowAddMenu(false);
    }, [teamId, onAddMember]);

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const toggleAddMenu = useCallback((e) => {
        e.stopPropagation();
        setShowAddMenu(prev => !prev);
    }, []);

    const toggleActions = useCallback((e) => {
        e.stopPropagation();
        setShowActions(prev => !prev);
    }, []);

    // ========== Render Helpers ==========

    const renderMemberCount = () => (
        <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-400" />
            <span className="text-slate-300 font-medium">{members.length}</span>
            <span className="text-slate-500">member{members.length !== 1 ? 's' : ''}</span>
        </div>
    );

    const renderCreatedDate = () => {
        if (!team.createdAt) return null;

        return (
            <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(team.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })}
            </div>
        );
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative"
        >
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all duration-300">
                {/* Header */}
                <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                            {/* Team Name & Lead Badge */}
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-base font-bold text-white truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-all">
                                    {team.name}
                                </h4>
                                {leadCount > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full flex-shrink-0">
                                        <Crown className="h-3 w-3 text-amber-400" />
                                        <span className="text-xs text-amber-400 font-medium">{leadCount}</span>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            {team.description && (
                                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                                    {team.description}
                                </p>
                            )}
                        </div>

                        {/* Actions Menu */}
                        {canManage && (
                            <div className="relative ml-2">
                                <button
                                    onClick={toggleActions}
                                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                                    aria-label="Team actions"
                                >
                                    <MoreVertical className="h-4 w-4 text-slate-400" />
                                </button>

                                <AnimatePresence>
                                    {showActions && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setShowActions(false)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                className="absolute right-0 top-full mt-2 bg-slate-900/95 border border-slate-800 rounded-xl shadow-xl z-20 min-w-[180px] p-1 backdrop-blur-xl"
                                            >
                                                <button
                                                    onClick={handleDeleteClick}
                                                    className="w-full px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2.5 transition-colors"
                                                >
                                                    {isWorkspace ? (
                                                        <>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Delete Team
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserMinus className="h-3.5 w-3.5" />
                                                            Remove Team
                                                        </>
                                                    )}
                                                </button>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Meta Information */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
                        {renderMemberCount()}
                        {renderCreatedDate()}
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-2">
                        <button
                            onClick={toggleExpanded}
                            className="flex-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Users className="h-3.5 w-3.5" />
                            {isExpanded ? 'Hide' : 'View'} Members
                            <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''
                                    }`}
                            />
                        </button>

                        {/* Add Member Button - Only for Workspace Context */}
                        {canManage && isWorkspace && (
                            <button
                                onClick={toggleAddMenu}
                                className={`px-3 py-2 border rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${showAddMenu
                                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                    : 'bg-slate-700/30 border-transparent hover:bg-slate-700/50 text-slate-300'
                                    }`}
                                aria-label="Add member"
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Add Member Area (Workspace Only) */}
                <AnimatePresence>
                    {showAddMenu && isWorkspace && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-slate-700/50 bg-slate-800/30 overflow-hidden"
                        >
                            <div className="p-4 max-h-48 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between mb-3">
                                    <h5 className="text-xs font-semibold text-slate-300">
                                        Add Member
                                    </h5>
                                    <button
                                        onClick={() => setShowAddMenu(false)}
                                        aria-label="Close"
                                    >
                                        <X className="h-4 w-4 text-slate-500 hover:text-white transition-colors" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {availableMembers.length === 0 ? (
                                        <p className="text-xs text-slate-500 text-center py-3">
                                            No available members to add
                                        </p>
                                    ) : (
                                        availableMembers.map(wm => {
                                            const memberId = wm?.user?._id || wm?._id;
                                            const memberName = wm?.user?.name || wm?.name || "Unknown";
                                            const memberInitial = memberName.charAt(0).toUpperCase();

                                            return (
                                                <button
                                                    key={memberId}
                                                    onClick={() => handleAddMemberClick(memberId)}
                                                    className="w-full flex items-center gap-3 p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg group/add transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                                        {memberInitial}
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="text-xs font-medium text-slate-200 truncate">
                                                            {memberName}
                                                        </p>
                                                    </div>
                                                    <Plus className="h-4 w-4 text-slate-500 group-hover/add:text-purple-400 transition-colors flex-shrink-0" />
                                                </button>
                                            );
                                        })
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
                            transition={{ duration: 0.2 }}
                            className="border-t border-slate-700/50 bg-slate-800/30 overflow-hidden"
                        >
                            <div className="p-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {members.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                                        <p className="text-xs text-slate-500">
                                            No members in this team
                                        </p>
                                        {canManage && isWorkspace && (
                                            <p className="text-xs text-slate-600 mt-1">
                                                Click the + button above to add members
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    members.map(member => {
                                        const memberId = member?.user?._id || member?._id || member?.id;

                                        return (
                                            <TeamMemberItem
                                                key={memberId}
                                                member={member}
                                                canManage={canManage && isWorkspace}
                                                onRoleChange={(uid, role) => onRoleChange(teamId, uid, role)}
                                                onRemove={(uid) => onRemoveMember(teamId, uid)}
                                            />
                                        );
                                    })
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