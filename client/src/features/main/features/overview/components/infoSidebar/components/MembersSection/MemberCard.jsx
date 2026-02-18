import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { Crown, Shield, Users, Eye, MoreVertical, Copy, CheckCircle2, UserMinus, Loader2 } from "lucide-react";

const toIdString = (value) => String(value?._id || value?.id || value || "");

const MemberCard = ({ item, member, canManageMembers, onRemove, onUpdateRole, presenceByUserId = {} }) => {
    const navigate = useNavigate();
    const [isSelected, setIsSelected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const memberId = toIdString(member?.user || member);
    const removedId = memberId;
    const memberName = member.user?.name || member?.name || "Unknown";
    const memberEmail = member.user?.email || member?.email || "";
    const liveStatus = presenceByUserId[memberId]?.isOnline;
    const isOnline = typeof liveStatus === "boolean"
        ? liveStatus
        : Boolean(member?.user?.isOnline || member?.isOnline || member?.online);

    const getRoleBadge = (role) => {
        const badges = {
            owner: { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            admin: { icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
            member: { icon: Users, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
            viewer: { icon: Eye, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
        };
        if (item.type === "task" || item.type === "subtask") {
            return badges.member;
        }
        return badges[role] || badges.viewer;
    };

    const getAvatarGradient = (id) => {
        const gradients = ["from-rose-500 to-pink-600", "from-violet-500 to-purple-600", "from-sky-500 to-blue-600", "from-emerald-500 to-teal-600"];
        const hash = id?.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
        return gradients[hash % gradients.length];
    };

    const badge = getRoleBadge(member.role);
    const BadgeIcon = badge.icon;

    const handleAction = async (action) => {
        setIsLoading(true);
        await action();
        setIsLoading(false);
        setIsSelected(false);
    };

    const openProfile = () => {
        if (!memberId) return;
        navigate(`/profile/${memberId}`);
    };

    const handleCopyEmail = () => {
        if (!memberEmail) return;
        navigator.clipboard.writeText(memberEmail);
    };

    return (
        <motion.div layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="relative">
            <div className={`flex flex-wrap items-start gap-3 rounded-xl border p-3 transition-all sm:p-4 ${isSelected ? "border-slate-700 bg-slate-800/80 ring-2 ring-sky-500/20" : "border-slate-800/50 bg-slate-800/40 hover:bg-slate-800/60"}`}>

                <button type="button" onClick={openProfile} className="relative flex-shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(memberId)} text-sm font-bold text-white shadow-lg sm:h-12 sm:w-12`}>
                        {memberName.substring(0, 2).toUpperCase()}
                    </div>
                    {isOnline && (
                        <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-slate-900 bg-emerald-500 sm:h-4 sm:w-4">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        </div>
                    )}
                </button>

                <div className="min-w-0 flex-1 basis-[140px]">
                    <button type="button" onClick={openProfile} className="truncate text-left text-sm font-semibold text-slate-200 hover:text-sky-300">
                        {memberName}
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="truncate text-xs text-slate-500">{memberEmail}</p>
                        {memberEmail ? (
                            <button onClick={handleCopyEmail} className="text-slate-600 hover:text-slate-400 max-[340px]:hidden">
                                <Copy className="h-3 w-3" />
                            </button>
                        ) : null}
                        <span className={`text-[11px] ${isOnline ? "text-emerald-400" : "text-slate-500"}`}>
                            {isOnline ? "Online" : "Offline"}
                        </span>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-2 max-[420px]:w-full max-[420px]:justify-between">
                    <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] sm:px-3 sm:py-1.5 ${badge.bg} ${badge.border}`}>
                        <BadgeIcon className={`h-3.5 w-3.5 ${badge.color}`} />
                        <span className={`text-xs font-semibold uppercase tracking-wide ${badge.color}`}>{member.role}</span>
                    </div>

                    {canManageMembers && member.role !== "owner" && (
                        <div className="relative">
                            <motion.button onClick={() => setIsSelected(!isSelected)} disabled={isLoading} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-700/50 sm:p-2">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                            </motion.button>

                            <AnimatePresence>
                                {isSelected && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsSelected(false)} />
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
                                            {(item.type !== "task" && item.type !== "subtask") && ["viewer", "member", "admin"].map((role) => (
                                                <button key={role} disabled={member.role === role} onClick={() => handleAction(() => onUpdateRole(memberId, role))} className="flex w-full justify-between px-3 py-2 text-left text-xs capitalize text-slate-300 hover:bg-slate-800">
                                                    {role} {member.role === role && <CheckCircle2 className="h-3 w-3" />}
                                                </button>
                                            ))}
                                            <div className="my-1 h-px bg-slate-800" />
                                            <button onClick={() => handleAction(() => onRemove(removedId))} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10">
                                                <UserMinus className="h-3.5 w-3.5" /> Remove Member
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default MemberCard;
