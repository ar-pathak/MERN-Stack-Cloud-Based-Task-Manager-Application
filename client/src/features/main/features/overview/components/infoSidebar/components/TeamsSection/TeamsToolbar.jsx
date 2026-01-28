import { Search, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TeamsToolbar = ({
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    sortBy,
    setSortBy
}) => {
    return (
        <div className="flex flex-col mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 focus:border-purple-500/50 focus:bg-slate-800/80 outline-none transition-all"
                    />
                </div>

                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${showFilters
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                            }`}
                    >
                        <Filter className="h-4 w-4" />
                        Sort
                    </motion.button>
                </div>
            </div>

            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-3"
                    >
                        <div className="flex gap-2 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                            {['name', 'members'].map((sort) => (
                                <button
                                    key={sort}
                                    onClick={() => setSortBy(sort)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sortBy === sort
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    {sort === 'name' ? 'Name' : 'Members'}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeamsToolbar;