import { AlertCircle, LayoutGrid, ListChecks, Search } from "lucide-react";
import { tabs } from "../utils/myTaskPageData";
import PriorityDropdown from "./PriorityDropdown";
import { motion } from "framer-motion";

export default function TopBar({
    activeTab,
    setActiveTab,
    view,
    setView,
    search,
    setSearch,
    priorityFilter,
    setPriorityFilter,
}) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.9)] backdrop-blur-md md:flex-row md:items-center md:justify-between">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-2 rounded-full border border-slate-600/70 bg-slate-900/70 px-1 py-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative rounded-full px-3 py-1.5 text-xs font-medium transition ${activeTab === tab
                                ? "text-cyan-50"
                                : "text-slate-300/80 hover:text-slate-50"
                                }`}
                        >
                            {activeTab === tab && (
                                <motion.span
                                    layoutId="tab-pill"
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/60 to-indigo-500/60 shadow-[0_0_20px_rgba(56,189,248,0.7)]"
                                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                                />
                            )}
                            <span className="relative z-10">{tab}</span>
                        </button>
                    ))}
                </div>

                <button className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20">
                    <AlertCircle className="h-3 w-3" />
                    3 tasks due soon
                </button>
            </div>

            {/* Search + filters + view toggle */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-slate-600/70 bg-slate-900/80 px-2 py-1">
                    <Search className="ml-1 h-4 w-4 text-slate-500" />
                    <input
                        className="w-32 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none md:w-40 lg:w-52"
                        placeholder="Search tasks or projects..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400">
                        ⌘K
                    </span>
                </div>

                <PriorityDropdown
                    priorityFilter={priorityFilter}
                    setPriorityFilter={setPriorityFilter}
                />

                <div className="flex items-center gap-1 rounded-full bg-slate-900/80 p-1 border border-slate-700/80">
                    <button
                        onClick={() => setView("list")}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition ${view === "list"
                            ? "bg-slate-800 text-slate-50 shadow"
                            : "text-slate-400 hover:text-slate-100"
                            }`}
                    >
                        <ListChecks className="h-3.5 w-3.5" />
                        List
                    </button>
                    <button
                        onClick={() => setView("grid")}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition ${view === "grid"
                            ? "bg-slate-800 text-slate-50 shadow"
                            : "text-slate-400 hover:text-slate-100"
                            }`}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Grid
                    </button>
                </div>
            </div>
        </div>
    );
}