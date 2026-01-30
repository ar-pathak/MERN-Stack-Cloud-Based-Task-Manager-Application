import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Shield, Users, Eye, MoreVertical, Copy, CheckCircle2, UserMinus, Loader2 } from "lucide-react";

const MemberCard = ({ item, member, canManageMembers, onRemove, onUpdateRole }) => {
    console.log("Rendering MemberCard for member:", member);
    const [isSelected, setIsSelected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const removedId = member?.user?._id || member?._id;

    const getRoleBadge = (role) => {
        const badges = {
            owner: { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            admin: { icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
            member: { icon: Users, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
            viewer: { icon: Eye, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
        };
        if (item.type === 'task' || item.type == 'subtask') {
            return badges.member
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

    return (
        <motion.div layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="relative">
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isSelected ? "bg-slate-800/80 border-slate-700 ring-2 ring-sky-500/20" : "bg-slate-800/40 border-slate-800/50 hover:bg-slate-800/60"}`}>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(member._id)} flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
                        {member.user?.name ? member.user.name.substring(0, 2).toUpperCase() : member?.name ? member.name.substring(0, 2).toUpperCase() : "??"}
                    </div>
                    {member.online && <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center"><div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" /></div>}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-200 truncate">{member.user?.name || member?.name || "Unknown"}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500 truncate">{member.user?.email || member?.email}</p>
                        <button onClick={() => navigator.clipboard.writeText(member.user.email || member?.email)} className="text-slate-600 hover:text-slate-400"><Copy className="h-3 w-3" /></button>
                    </div>
                </div>

                {/* Badge & Menu */}
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 ${badge.bg} border ${badge.border} rounded-lg`}>
                        <BadgeIcon className={`h-3.5 w-3.5 ${badge.color}`} />
                        <span className={`text-xs font-semibold ${badge.color} uppercase tracking-wide`}>{member.role}</span>
                    </div>

                    {canManageMembers && member.role !== 'owner' && (
                        <div className="relative">
                            <motion.button onClick={() => setIsSelected(!isSelected)} disabled={isLoading} className="p-2 rounded-lg text-slate-500 hover:bg-slate-700/50">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                            </motion.button>

                            <AnimatePresence>
                                {isSelected && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsSelected(false)} />
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-20 w-48 overflow-hidden">
                                            {(item.type !== 'task' && item.type !== 'subtask') && ["viewer", "member", "admin"].map((role) => (
                                                <button key={role} disabled={member.role === role} onClick={() => handleAction(() => onUpdateRole(member.user._id, role))} className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 flex justify-between capitalize">
                                                    {role} {member.role === role && <CheckCircle2 className="h-3 w-3" />}
                                                </button>
                                            ))}
                                            <div className="my-1 h-px bg-slate-800" />
                                            <button onClick={() => handleAction(() => onRemove(removedId))} className="w-full px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2">
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