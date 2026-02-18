import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { Crown, MoreVertical, Shield, Trash2 } from "lucide-react";

const TeamMemberItem = ({ member, canManage, onRoleChange, onRemove, presenceByUserId = {} }) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    const userId = String(member?.user?._id || member?._id || member?.id || "");
    const userName = member?.user?.name || member?.name || "Unknown";
    const userEmail = member?.user?.email || member?.email || "";
    const userRole = member?.role || "member";
    const liveStatus = presenceByUserId[userId]?.isOnline;
    const isOnline = typeof liveStatus === "boolean"
        ? liveStatus
        : Boolean(member?.user?.isOnline || member?.isOnline || member?.online);

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case "lead":
                return "bg-amber-500/20 text-amber-400 border-amber-500/30";
            case "member":
                return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            default:
                return "bg-slate-500/20 text-slate-400 border-slate-500/30";
        }
    };

    const openProfile = () => {
        if (!userId) return;
        navigate(`/profile/${userId}`);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="group/member relative flex flex-wrap items-start gap-2.5 rounded-xl bg-slate-700/30 p-2.5 transition-all hover:bg-slate-700/50 sm:p-3"
        >
            <button type="button" onClick={openProfile} className="relative h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-sm font-bold text-white sm:h-10 sm:w-10">
                <span className="flex h-full w-full items-center justify-center">{userName.charAt(0).toUpperCase()}</span>
                {userRole === "lead" && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-800 bg-amber-500 sm:h-5 sm:w-5">
                        <Crown className="h-3 w-3 text-white" />
                    </div>
                )}
                {isOnline && (
                    <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-800 bg-emerald-500" />
                )}
            </button>

            <div className="min-w-0 flex-1 basis-[130px]">
                <button type="button" onClick={openProfile} className="truncate text-left text-xs font-medium text-slate-200 hover:text-sky-300 sm:text-sm">
                    {userName}
                </button>
                <p className="truncate text-xs text-slate-500">{userEmail}</p>
                <p className={`text-[10px] ${isOnline ? "text-emerald-400" : "text-slate-500"}`}>
                    {isOnline ? "Online" : "Offline"}
                </p>
            </div>

            <div className="ml-auto flex items-center gap-1.5 max-[360px]:w-full max-[360px]:justify-between">
                <span className={`rounded-full border px-2 py-1 text-[11px] font-medium sm:px-2.5 sm:text-xs ${getRoleBadgeColor(userRole)}`}>
                    {userRole}
                </span>

                {canManage && (
                    <div className="relative">
                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="rounded-lg p-1.5 opacity-100 transition-colors hover:bg-slate-600/50 sm:opacity-0 sm:group-hover/member:opacity-100"
                        >
                            <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                        </button>

                        <AnimatePresence>
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-slate-800 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-xl"
                                    >
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onRoleChange(userId, userRole);
                                                setShowMenu(false);
                                            }}
                                            className="group/item flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800/60"
                                        >
                                            <Shield className="h-3.5 w-3.5 text-slate-500 group-hover/item:text-amber-400" />
                                            {userRole === "lead" ? "Make Member" : "Make Lead"}
                                        </button>
                                        <div className="my-1 h-px bg-slate-800/50" />
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onRemove(userId);
                                                setShowMenu(false);
                                            }}
                                            className="group/item flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Remove Member
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default TeamMemberItem;
