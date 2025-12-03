import { motion } from "framer-motion";
import { Filter, LayoutGrid, List, Search } from "lucide-react";


export default function Toolbar({
    filters,
    activeFilter,
    setActiveFilter,
    viewMode,
    setViewMode,
    search,
    setSearch,
}) {
    return (
        <motion.div
            className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.95)] backdrop-blur"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects, tags or codes…"
                        className="h-9 w-full rounded-xl border border-slate-700/70 bg-slate-900/60 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/70 focus:outline-none focus:ring-1 focus:ring-cyan-400/60"
                    />
                </div>

                {/* Right controls */}
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:border-cyan-400/50 hover:text-slate-50">
                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                        Filters
                    </button>

                    <div className="inline-flex overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/80 p-0.5 text-[11px]">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 transition ${viewMode === "grid"
                                ? "bg-slate-800/80 text-slate-50"
                                : "text-slate-400 hover:text-slate-100"
                                }`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 transition ${viewMode === "list"
                                ? "bg-slate-800/80 text-slate-50"
                                : "text-slate-400 hover:text-slate-100"
                                }`}
                        >
                            <List className="h-3.5 w-3.5" />
                            List
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
                {filters.map((f) => {
                    const active = activeFilter === f;
                    return (
                        <motion.button
                            key={f}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setActiveFilter(f)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition ${active
                                ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-200 shadow-[0_0_0_1px_rgba(8,47,73,0.4)]"
                                : "border-slate-700/80 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                                }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${active ? "bg-cyan-400" : "bg-slate-500"
                                    }`}
                            />
                            {f}
                        </motion.button>
                    );
                })}
            </div>
        </motion.div>
    );
}
