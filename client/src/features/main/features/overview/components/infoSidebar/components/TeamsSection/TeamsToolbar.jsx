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
        <div className="mb-5 flex flex-col sm:mb-6">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 py-2 pl-9 pr-3 text-sm text-slate-200 outline-none transition-all focus:border-purple-500/50 focus:bg-slate-800/80 sm:py-2.5 sm:pl-10 sm:pr-4"
                    />
                </div>

                <div className="flex gap-2 max-[360px]:w-full">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all sm:px-4 sm:py-2.5 sm:text-sm max-[360px]:w-full ${showFilters
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
                        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-700/30 bg-slate-800/30 p-2.5 sm:p-3">
                            {['name', 'members'].map((sort) => (
                                <button
                                    key={sort}
                                    onClick={() => setSortBy(sort)}
                                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 ${sortBy === sort
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
