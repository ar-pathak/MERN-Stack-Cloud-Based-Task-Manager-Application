import { Edit3, Loader2, Trash2 } from "lucide-react";

import {
    POST_DATE_FILTER_OPTIONS,
    POST_SORT_OPTIONS,
    POST_STATUS_FILTER_OPTIONS
} from "../constants/dashboard.constants";
import {
    formatDateTime,
    formatNumber,
    formatPercent
} from "../utils/dashboard.utils";

const PostAnalyticsSection = ({
    posts = [],
    sortBy = "date_desc",
    statusFilter = "all",
    dateFilter = "all",
    busyPostId = "",
    onSortChange,
    onStatusFilterChange,
    onDateFilterChange,
    onEdit,
    onDelete
}) => (
    <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100">Post Analytics</h2>
            <div className="flex flex-wrap gap-2">
                <select
                    value={statusFilter}
                    onChange={(event) => onStatusFilterChange(event.target.value)}
                    className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none"
                >
                    {POST_STATUS_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <select
                    value={dateFilter}
                    onChange={(event) => onDateFilterChange(event.target.value)}
                    className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none"
                >
                    {POST_DATE_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <select
                    value={sortBy}
                    onChange={(event) => onSortChange(event.target.value)}
                    className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none"
                >
                    {POST_SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
                    <tr>
                        <th className="px-3 py-2 text-left">Post</th>
                        <th className="px-3 py-2 text-right">Views</th>
                        <th className="px-3 py-2 text-right">Likes</th>
                        <th className="px-3 py-2 text-right">Comments</th>
                        <th className="px-3 py-2 text-right">Shares</th>
                        <th className="px-3 py-2 text-right">Saves</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                    {!posts.length ? (
                        <tr>
                            <td className="px-3 py-6 text-center text-xs text-slate-500" colSpan={8}>
                                No posts found.
                            </td>
                        </tr>
                    ) : (
                        posts.map((post) => (
                            <tr key={String(post?._id || "")} className="transition-colors hover:bg-slate-800/30">
                                <td className="px-3 py-2">
                                    <p className="max-w-[260px] truncate text-xs">
                                        {post?.contentPreview || "Post"}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        {formatDateTime(post?.createdAt)}
                                    </p>
                                </td>
                                <td className="px-3 py-2 text-right">{formatNumber(post?.views)}</td>
                                <td className="px-3 py-2 text-right">{formatNumber(post?.likes)}</td>
                                <td className="px-3 py-2 text-right">{formatNumber(post?.comments)}</td>
                                <td className="px-3 py-2 text-right">{formatNumber(post?.shares)}</td>
                                <td className="px-3 py-2 text-right">{formatNumber(post?.saves)}</td>
                                <td className="px-3 py-2 text-right">
                                    {formatPercent(post?.engagementRate)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    <div className="inline-flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(post)}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800"
                                        >
                                            <Edit3 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(post?._id)}
                                            disabled={busyPostId === String(post?._id || "")}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-700/50 text-rose-300 transition-colors hover:border-rose-500/70 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {busyPostId === String(post?._id || "") ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </section>
);

export default PostAnalyticsSection;
