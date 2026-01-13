// components/SidebarHeader.jsx
import { Search, Plus, Filter } from "lucide-react";

const SidebarHeader = ({ searchQuery, setSearchQuery, filterType, setFilterType }) => {
    const filters = [
        { id: "all", label: "All" },
        { id: "unread", label: "Unread" },
        { id: "starred", label: "Starred" }
    ];

    return (
        <div className="flex-shrink-0 p-4 border-b border-slate-800/50">
            <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-bold text-slate-100">Conversations</h2>
                <button className="ml-auto p-2 rounded-lg hover:bg-slate-800/60 transition-colors group">
                    <Plus className="h-4 w-4 text-slate-400 group-hover:text-slate-300" />
                </button>
                <button className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors group">
                    <Filter className="h-4 w-4 text-slate-400 group-hover:text-slate-300" />
                </button>
            </div>

            <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-800/60 rounded-lg text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-slate-700/80 transition-colors"
                />
            </div>

            <div className="flex gap-2">
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setFilterType(filter.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === filter.id
                                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                : "bg-slate-800/40 text-slate-400 hover:bg-slate-800/60"
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SidebarHeader;