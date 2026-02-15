import { Newspaper, Plus, RefreshCcw } from "lucide-react";

const FeedTopBar = ({ onCreate, onRefresh }) => {
    return (
        <div className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-900/55 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Feed</p>
                    <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                        <Newspaper className="h-5 w-5 text-sky-400" />
                        Social Stream
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onCreate}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Create
                    </button>
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800/70"
                    >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedTopBar;
