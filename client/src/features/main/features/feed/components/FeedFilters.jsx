import { ChevronDown, Search } from "lucide-react";

const FeedFilters = ({
    tabs,
    activeTab,
    onTabChange,
    searchTerm,
    onSearchChange,
    sortOptions,
    sortMode,
    onSortChange
}) => {
    return (
        <>
            <div className="mb-4 grid grid-cols-1 gap-2 rounded-2xl border border-slate-800/70 bg-slate-900/45 p-2 sm:grid-cols-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={`rounded-xl px-3 py-2 text-left transition-colors ${
                            activeTab === tab.id
                                ? "bg-sky-500/20 text-sky-300"
                                : "text-slate-400 hover:bg-slate-800/70"
                        }`}
                    >
                        <p className="text-sm font-semibold">{tab.label}</p>
                        <p className="text-[11px] text-inherit/80">{tab.description}</p>
                    </button>
                ))}
            </div>

            <div className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-900/45 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Search posts, people, hashtags"
                            className="h-9 w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-600"
                        />
                    </label>

                    <div className="relative sm:w-40">
                        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
                        <select
                            value={sortMode}
                            onChange={(event) => onSortChange(event.target.value)}
                            className="h-9 w-full appearance-none rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-sm text-slate-200 outline-none"
                        >
                            {sortOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FeedFilters;
