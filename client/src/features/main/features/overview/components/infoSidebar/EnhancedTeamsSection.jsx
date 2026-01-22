import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Link as LinkIcon, Plus, Image as ImageIcon,
} from "lucide-react";


const EnhancedTeamsSection = ({ item }) => {
    const [showCreate, setShowCreate] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamDesc, setNewTeamDesc] = useState("");

    const teams = [
        { id: 1, name: "Engineering", description: "Product development team", members: 12 },
        { id: 2, name: "Design", description: "UI/UX designers", members: 5 },
        { id: 3, name: "Marketing", description: "Growth and marketing", members: 8 }
    ];

    return (
        <section>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Teams</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
                        {teams.length}
                    </span>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCreate(!showCreate)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-purple-400 transition-colors"
                        title="Create team"
                    >
                        <Plus className="h-4 w-4" />
                    </motion.button>
                </div>
            </div>

            {/* Create Team Form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                    >
                        <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
                            <input
                                type="text"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                placeholder="Team name"
                                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                            />
                            <textarea
                                value={newTeamDesc}
                                onChange={(e) => setNewTeamDesc(e.target.value)}
                                placeholder="Description (optional)"
                                rows={2}
                                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none"
                            />
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={!newTeamName}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none"
                                >
                                    Create Team
                                </motion.button>
                                <button
                                    onClick={() => setShowCreate(false)}
                                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Teams List */}
            <div className="space-y-2">
                {teams.map((team, i) => (
                    <motion.div
                        key={team.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                        className="p-3 rounded-xl bg-gradient-to-br from-slate-900/40 to-slate-800/20 border border-slate-800/50 hover:border-purple-500/30 transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-slate-200 group-hover:text-purple-300 transition-colors">
                                {team.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-800/60 px-2 py-1 rounded-md">
                                <Users className="h-3 w-3" />
                                {team.members}
                            </div>
                        </div>
                        {team.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">{team.description}</p>
                        )}
                    </motion.div>
                ))}
            </div>
        </section>
    );
};



export default EnhancedTeamsSection