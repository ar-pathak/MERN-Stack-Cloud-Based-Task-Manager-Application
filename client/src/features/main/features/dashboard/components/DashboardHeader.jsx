import { ArrowLeft, BarChart3, Loader2, RefreshCcw } from "lucide-react";

import { DAY_RANGE_OPTIONS } from "../constants/dashboard.constants";
import { formatDateTime, toNumber } from "../utils/dashboard.utils";

const DashboardHeader = ({
    days,
    generatedAt,
    onDaysChange,
    onRefresh,
    onBack,
    loading = false,
    refreshing = false
}) => (
    <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        {typeof onBack === "function" ? (
            <button
                type="button"
                onClick={onBack}
                className="mb-3 inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 active:translate-y-[1px]"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
            </button>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Creator Analytics
                </p>
                <h1 className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-100">
                    <BarChart3 className="h-5 w-5 text-sky-400" />
                    Advanced Dashboard
                </h1>
                <p className="mt-1 text-xs text-slate-400">
                    Last {days} days {generatedAt ? `- ${formatDateTime(generatedAt)}` : ""}
                </p>
            </div>

            <div className="flex gap-2">
                <select
                    value={days}
                    onChange={(event) => onDaysChange(toNumber(event.target.value, 30))}
                    className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none"
                >
                    {DAY_RANGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing || loading}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {refreshing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <RefreshCcw className="h-3.5 w-3.5" />
                    )}
                    Refresh
                </button>
            </div>
        </div>
    </div>
);

export default DashboardHeader;
