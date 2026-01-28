import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, MoreVertical, Shield, Trash2 } from "lucide-react";

const TeamMemberItem = ({ member, canManage, onRoleChange, onRemove }) => {
    const [showMenu, setShowMenu] = useState(false);

    // Helpers to normalize data structure
    const userId = member?.user?._id || member?._id || member?.id;
    const userName = member?.user?.name || member?.name || "Unknown";
    const userEmail = member?.user?.email || member?.email || "";
    const userRole = member?.role || "member";
    
    const getRoleBadgeColor = (role) => {
        switch (role) {
            case "lead": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
            case "member": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-all group/member"
        >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-sm font-bold text-white relative">
                {userName.charAt(0).toUpperCase()}
                {userRole === "lead" && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-slate-800 flex items-center justify-center">
                        <Crown className="h-3 w-3 text-white" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{userName}</p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>

            <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(userRole)}`}>
                    {userRole}
                </span>

                {canManage && (
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="p-1.5 hover:bg-slate-600/50 rounded-lg transition-colors opacity-0 group-hover/member:opacity-100"
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
                                        className="absolute right-0 top-full mt-1 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl z-20 min-w-[160px] backdrop-blur-xl p-1"
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRoleChange(userId, userRole);
                                                setShowMenu(false);
                                            }}
                                            className="w-full px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800/60 rounded-lg flex items-center gap-2.5 group/item"
                                        >
                                            <Shield className="h-3.5 w-3.5 text-slate-500 group-hover/item:text-amber-400" />
                                            {userRole === "lead" ? "Make Member" : "Make Lead"}
                                        </button>
                                        <div className="my-1 h-px bg-slate-800/50" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(userId);
                                                setShowMenu(false);
                                            }}
                                            className="w-full px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2.5 group/item"
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