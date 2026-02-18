import { motion } from "framer-motion";
import { Search, X, Users, Shield, Crown, Eye } from "lucide-react";
import { useRef } from "react";

const MemberFilters = ({searchQuery, setSearchQuery, filterRole, setFilterRole, roleStats }) => {
    const searchInputRef = useRef(null);

    const getRoleIcon = (role) => {
        const icons = { owner: Crown, admin: Shield, member: Users, viewer: Eye, all: Users };
        return icons[role] || Users;
    };

    return (
        <div className="space-y-3 sm:space-y-4">
            {/* Stats Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {Object.entries(roleStats).map(([role, count]) => {
                    const BadgeIcon = getRoleIcon(role);
                    const isActive = filterRole === role;
                    return (
                        <motion.button
                            key={role}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setFilterRole(isActive ? "all" : role)}
                            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all sm:gap-2 sm:px-3.5 sm:py-2 ${isActive ? "bg-slate-700 border-sky-500/50 text-sky-400" : "bg-slate-800/50 border-slate-700/50 text-slate-400"}`}
                        >
                            <BadgeIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span className="capitalize">{role}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isActive ? "bg-white/10" : "bg-slate-700"}`}>{count}</span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search members..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-2 pl-9 pr-9 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 sm:py-2.5 sm:pl-10 sm:pr-10"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
};
export default MemberFilters;
