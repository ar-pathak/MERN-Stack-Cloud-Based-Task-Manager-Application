import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, MoreVertical, Trash2, Calendar, Crown, ChevronDown,
    UserPlus, X, Plus, UserMinus, LogOut
} from "lucide-react";
import TeamMemberItem from "./TeamMemberItem";

const TeamCard = ({
    team,
    members = [],
    workspaceMembers = [],
    presenceByUserId = {},
    canManage,
    onDelete,
    onLeave,
    onAddMember,
    onRemoveMember,
    onRoleChange,
    contextType = "workspace",
    currentUserId
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const teamId = team._id || team.id;
    const isWorkspace = contextType === "workspace";

    const resolveOnline = useCallback((member) => {
        const memberId = String(member?.user?._id || member?._id || member?.id || "");
        const liveStatus = presenceByUserId[memberId]?.isOnline;
        if (typeof liveStatus === "boolean") return liveStatus;
        return Boolean(member?.user?.isOnline || member?.isOnline || member?.online);
    }, [presenceByUserId]);

    const isMember = useMemo(() => {
        if (!currentUserId || !members) return false;
        return members.some((m) => {
            const mId = m.user?._id || m.memberId || m._id || m.id;
            return String(mId) === String(currentUserId);
        });
    }, [members, currentUserId]);

    const leadCount = useMemo(
        () => members.filter((m) => (m?.role || "member") === "lead").length,
        [members]
    );

    const onlineCount = useMemo(
        () => members.filter((member) => resolveOnline(member)).length,
        [members, resolveOnline]
    );

    const availableMembers = useMemo(() => {
        if (!isWorkspace) return [];
        const currentMemberIds = new Set(
            members.map((m) => String(m?.user?._id || m?._id || m?.id || ""))
        );
        return workspaceMembers.filter((wm) => {
            const wmId = String(wm?.user?._id || wm?._id || wm?.id || "");
            return wmId && !currentMemberIds.has(wmId);
        });
    }, [isWorkspace, members, workspaceMembers]);

    const handleDeleteClick = useCallback((e) => {
        e.stopPropagation();
        setShowActions(false);
        onDelete(teamId, team.name);
    }, [teamId, team.name, onDelete]);

    const handleAddMemberClick = useCallback((memberId) => {
        onAddMember(teamId, memberId);
    }, [teamId, onAddMember]);

    const toggleExpanded = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const toggleAddMenu = useCallback((e) => {
        e.stopPropagation();
        setShowAddMenu((prev) => !prev);
    }, []);

    const toggleActions = useCallback((e) => {
        e.stopPropagation();
        setShowActions((prev) => !prev);
    }, []);

    const renderMemberCount = () => (
        <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-400" />
            <span className="font-medium text-slate-300">{members.length}</span>
            <span className="text-slate-500">member{members.length !== 1 ? "s" : ""}</span>
            {onlineCount > 0 && (
                <span className="text-emerald-400">- {onlineCount} online</span>
            )}
        </div>
    );

    const renderCreatedDate = () => {
        if (!team.createdAt) return null;
        return (
            <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(team.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
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
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl transition-all duration-300 hover:border-purple-500/30">
                <div className="p-3.5 sm:p-5">
                    <div className="mb-4 flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center gap-2">
                                <h4 className="truncate text-sm font-bold text-white transition-all group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text group-hover:text-transparent sm:text-base">
                                    {team.name}
                                </h4>
                                {leadCount > 0 && (
                                    <div className="flex flex-shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5">
                                        <Crown className="h-3 w-3 text-amber-400" />
                                        <span className="text-xs font-medium text-amber-400">{leadCount}</span>
                                    </div>
                                )}
                            </div>
                            {team.description && (
                                <p className="mb-3 line-clamp-2 text-xs text-slate-400">
                                    {team.description}
                                </p>
                            )}
                        </div>

                        <div className="relative ml-2">
                            {(isMember || canManage) && (
                                <>
                                    <button
                                        onClick={toggleActions}
                                        className="rounded-lg p-1.5 transition-colors hover:bg-slate-700/50 sm:p-2"
                                        aria-label="Team actions"
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
                                                    className="absolute right-0 top-full z-20 mt-2 min-w-[170px] rounded-xl border border-slate-800 bg-slate-900/95 p-1 shadow-xl backdrop-blur-xl"
                                                >
                                                    {canManage && (
                                                        <button
                                                            onClick={handleDeleteClick}
                                                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-rose-400 transition-colors hover:bg-rose-500/10"
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
                                                    )}

                                                    {isMember && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowActions(false);
                                                                onLeave?.(teamId, team.name);
                                                            }}
                                                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition-colors hover:bg-slate-700/50"
                                                        >
                                                            <LogOut className="h-3.5 w-3.5" />
                                                            Leave Team
                                                        </button>
                                                    )}
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                        {renderMemberCount()}
                        {renderCreatedDate()}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={toggleExpanded}
                            className="flex min-w-[120px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700/50 px-2.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 sm:gap-2 sm:px-3"
                        >
                            <Users className="h-3.5 w-3.5" />
                            <span className="max-[340px]:hidden">{isExpanded ? "Hide" : "View"}</span>
                            Members
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>

                        {canManage && isWorkspace && (
                            <button
                                onClick={toggleAddMenu}
                                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all sm:gap-2 sm:px-3 ${showAddMenu
                                    ? "border-purple-500/30 bg-purple-500/20 text-purple-400"
                                    : "border-transparent bg-slate-700/30 text-slate-300 hover:bg-slate-700/50"
                                    }`}
                                aria-label="Add member"
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {showAddMenu && isWorkspace && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-slate-700/50 bg-slate-800/30"
                        >
                            <div className="max-h-48 overflow-y-auto p-3 custom-scrollbar sm:p-4">
                                <div className="mb-3 flex justify-between">
                                    <h5 className="text-xs font-semibold text-slate-300">Add Member</h5>
                                    <button onClick={() => setShowAddMenu(false)} aria-label="Close">
                                        <X className="h-4 w-4 text-slate-500 transition-colors hover:text-white" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {availableMembers.length === 0 ? (
                                        <p className="py-3 text-center text-xs text-slate-500">
                                            No available members to add
                                        </p>
                                    ) : (
                                        availableMembers.map((wm) => {
                                            const memberId = wm?.user?._id || wm?._id;
                                            const memberName = wm?.user?.name || wm?.name || "Unknown";
                                            const memberInitial = memberName.charAt(0).toUpperCase();
                                            const memberIsOnline = resolveOnline(wm);

                                            return (
                                                <button
                                                    key={memberId}
                                                    onClick={() => handleAddMemberClick(memberId)}
                                                    className="group/add flex w-full items-center gap-2 rounded-lg bg-slate-700/30 p-2 transition-colors hover:bg-slate-700/50"
                                                >
                                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
                                                        {memberInitial}
                                                    </div>
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <p className="truncate text-xs font-medium text-slate-200">{memberName}</p>
                                                        <p className={`text-[10px] ${memberIsOnline ? "text-emerald-400" : "text-slate-500"}`}>
                                                            {memberIsOnline ? "Online" : "Offline"}
                                                        </p>
                                                    </div>
                                                    <Plus className="h-4 w-4 flex-shrink-0 text-slate-500 transition-colors group-hover/add:text-purple-400" />
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-slate-700/50 bg-slate-800/30"
                        >
                            <div className="max-h-64 space-y-2 overflow-y-auto p-3 custom-scrollbar sm:p-4">
                                {members.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <Users className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                                        <p className="text-xs text-slate-500">No members in this team</p>
                                        {canManage && isWorkspace && (
                                            <p className="mt-1 text-xs text-slate-600">
                                                Click the + button above to add members
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    members.map((member) => {
                                        const memberId = member?.user?._id || member?._id || member?.id;
                                        return (
                                            <TeamMemberItem
                                                key={memberId}
                                                member={member}
                                                presenceByUserId={presenceByUserId}
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
