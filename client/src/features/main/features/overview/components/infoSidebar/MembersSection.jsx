import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, UserPlus, Shield, Crown, Eye, Link as LinkIcon,
    MoreVertical, UserMinus, Edit2, Image as ImageIcon,
} from "lucide-react";

const MembersSection = ({ item }) => {
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [selectedMember, setSelectedMember] = useState(null);

    const members = item.members || [
        { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "admin", online: true },
        { id: 2, name: "Bob Smith", email: "bob@example.com", role: "member", online: false },
        { id: 3, name: "Carol White", email: "carol@example.com", role: "viewer", online: true }
    ];

    return (
        <section>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Team Members</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
                        {members.length}
                    </span>
                    {item.type === 'workspace' && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowInvite(!showInvite)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-sky-400 transition-colors"
                            title="Invite member"
                        >
                            <UserPlus className="h-4 w-4" />
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Invite Form */}
            <AnimatePresence>
                {showInvite && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                    >
                        <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-800/50 rounded-xl p-4 space-y-3">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Email address"
                                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
                            />
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
                            >
                                <option value="viewer">Viewer - Can view only</option>
                                <option value="member">Member - Can edit</option>
                                <option value="admin">Admin - Full access</option>
                            </select>
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={!inviteEmail}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-sky-500/20 disabled:shadow-none"
                                >
                                    Send Invite
                                </motion.button>
                                <button
                                    onClick={() => setShowInvite(false)}
                                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Members List */}
            <div className="space-y-2">
                {members.map((member, i) => (
                    <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative"
                    >
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-900/40 border border-transparent hover:border-slate-800/50 transition-all">
                            <div className="relative">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                                    {member.name.substring(0, 2).toUpperCase()}
                                </div>
                                {member.online && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-slate-950 rounded-full"
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
                                <p className="text-sm font-medium text-slate-200 truncate">{member.name}</p>
                                <p className="text-xs text-slate-500 truncate">{member.email}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {member.role === 'admin' && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                        <Crown className="h-3 w-3 text-amber-400" />
                                        <span className="text-[10px] font-medium text-amber-400">Admin</span>
                                    </div>
                                )}
                                {member.role === 'viewer' && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/40 border border-slate-700 rounded-md">
                                        <Eye className="h-3 w-3 text-slate-400" />
                                        <span className="text-[10px] font-medium text-slate-400">Viewer</span>
                                    </div>
                                )}
                                {member.role === 'member' && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-sky-500/10 border border-sky-500/20 rounded-md">
                                        <Users className="h-3 w-3 text-sky-400" />
                                        <span className="text-[10px] font-medium text-sky-400">Member</span>
                                    </div>
                                )}

                                {item.type === 'workspace' && member.role !== 'owner' && (
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setSelectedMember(selectedMember === i ? null : i)}
                                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded transition-all"
                                    >
                                        <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                                    </motion.button>
                                )}
                            </div>
                        </div>

                        {/* Member Actions Dropdown */}
                        <AnimatePresence>
                            {selectedMember === i && item.type === 'workspace' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-0 top-full mt-1 bg-slate-900/95 border border-slate-800 rounded-lg shadow-2xl z-10 overflow-hidden min-w-[160px] backdrop-blur-xl"
                                >
                                    <button className="w-full px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2">
                                        <Shield className="h-3.5 w-3.5" />
                                        {member.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                    </button>
                                    <button className="w-full px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2 border-t border-slate-800/50">
                                        <Edit2 className="h-3.5 w-3.5" />
                                        Change Role
                                    </button>
                                    <button className="w-full px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 border-t border-slate-800/50">
                                        <UserMinus className="h-3.5 w-3.5" />
                                        Remove Member
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};


export default MembersSection