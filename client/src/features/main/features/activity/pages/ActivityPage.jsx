import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
    Activity,
    ArrowLeft,
    Clock3,
    Heart,
    Loader2,
    MessageCircle,
    RefreshCcw,
    Repeat2,
    Search,
    ShieldCheck
} from "lucide-react";

import { useAuth } from "../../../../../context/AuthContext";
import {
    getActivityDashboard,
    getMyActivities
} from "../../../../../service/activity.service";

const MOBILE_BREAKPOINT = 1024;
const PAGE_SIZE = 25;

const LEVEL_OPTIONS = [
    { value: "all", label: "All levels" },
    { value: "workspace", label: "Workspace" },
    { value: "project", label: "Project" },
    { value: "task", label: "Task" },
    { value: "subtask", label: "Subtask" },
    { value: "system", label: "System" }
];

const formatRelativeTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
};

const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
};

const toIdString = (value) => String(value?._id || value?.id || value || "");

const getEntityLabel = (activity) => {
    const entity = activity?.entity || {};
    if (entity?.name) return entity.name;

    const subtaskTitle = activity?.subtask?.title;
    if (subtaskTitle) return subtaskTitle;

    const taskTitle = activity?.task?.title;
    if (taskTitle) return taskTitle;

    const projectName = activity?.project?.name;
    if (projectName) return projectName;

    const workspaceName = activity?.workspace?.name;
    if (workspaceName) return workspaceName;

    const chatName = activity?.chatId?.name;
    if (chatName) return chatName;

    return "";
};

const levelPillClasses = {
    workspace: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    project: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    task: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    subtask: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    system: "border-slate-600 bg-slate-700/40 text-slate-300"
};

const levelLabel = (level) => {
    const token = String(level || "system");
    return token.charAt(0).toUpperCase() + token.slice(1);
};

const mergeById = (previous = [], incoming = []) => {
    const map = new Map();
    [...previous, ...incoming].forEach((item) => {
        map.set(toIdString(item?._id), item);
    });
    return Array.from(map.values());
};

const ActivityPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const profileId = user?._id || user?.id || "";

    const [isMobileViewport, setIsMobileViewport] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
    );

    const [selectedLevel, setSelectedLevel] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const [activities, setActivities] = useState([]);
    const [dashboard, setDashboard] = useState({
        likes: { count: 0, items: [] },
        comments: { count: 0, items: [] },
        reposts: { count: 0, items: [] },
        timeSpent: null,
        accountHistory: { summary: null, events: [] }
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 0,
        hasMore: false
    });
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const loadActivities = useCallback(
        async ({ page = 1, append = false, silent = false } = {}) => {
            if (append) {
                setLoadingMore(true);
            } else if (!silent) {
                setLoading(true);
            }

            setError("");

            try {
                const params = {
                    page,
                    limit: PAGE_SIZE
                };

                if (selectedLevel !== "all") {
                    params.level = selectedLevel;
                }

                const trimmedSearch = String(searchTerm || "").trim();
                if (trimmedSearch) {
                    params.search = trimmedSearch;
                }

                const result = await getMyActivities(params);
                const nextActivities = Array.isArray(result?.activities) ? result.activities : [];
                const nextPagination = result?.pagination || {
                    page,
                    limit: PAGE_SIZE,
                    total: nextActivities.length,
                    totalPages: 1,
                    hasMore: false
                };

                setActivities((previous) =>
                    append ? mergeById(previous, nextActivities) : nextActivities
                );
                setPagination(nextPagination);
            } catch (requestError) {
                setError(requestError?.message || "Failed to load activity");
                if (!append) {
                    setActivities([]);
                    setPagination({
                        page: 1,
                        limit: PAGE_SIZE,
                        total: 0,
                        totalPages: 0,
                        hasMore: false
                    });
                }
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [searchTerm, selectedLevel]
    );

    const loadDashboard = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setDashboardLoading(true);
        }
        setDashboardError("");

        try {
            const result = await getActivityDashboard({ limit: 6 });
            setDashboard({
                likes: {
                    count: Number(result?.likes?.count || 0),
                    items: Array.isArray(result?.likes?.items) ? result.likes.items : []
                },
                comments: {
                    count: Number(result?.comments?.count || 0),
                    items: Array.isArray(result?.comments?.items)
                        ? result.comments.items
                        : []
                },
                reposts: {
                    count: Number(result?.reposts?.count || 0),
                    items: Array.isArray(result?.reposts?.items) ? result.reposts.items : []
                },
                timeSpent: result?.timeSpent || null,
                accountHistory: result?.accountHistory || { summary: null, events: [] }
            });
        } catch (requestError) {
            setDashboardError(requestError?.message || "Failed to load insights");
            setDashboard({
                likes: { count: 0, items: [] },
                comments: { count: 0, items: [] },
                reposts: { count: 0, items: [] },
                timeSpent: null,
                accountHistory: { summary: null, events: [] }
            });
        } finally {
            setDashboardLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadActivities({ page: 1, append: false });
        }, 260);

        return () => clearTimeout(timer);
    }, [loadActivities]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            await Promise.all([
                loadActivities({ page: 1, append: false, silent: true }),
                loadDashboard({ silent: true })
            ]);
        } finally {
            setRefreshing(false);
        }
    };

    const handleLoadMore = async () => {
        if (loadingMore || !pagination?.hasMore) return;
        await loadActivities({
            page: Number(pagination?.page || 1) + 1,
            append: true
        });
    };

    const shouldShowBottomNav = isMobileViewport && Boolean(profileId);
    const hasFilters = useMemo(
        () => selectedLevel !== "all" || Boolean(String(searchTerm || "").trim()),
        [searchTerm, selectedLevel]
    );

    const accountSummary = dashboard?.accountHistory?.summary || null;
    const accountEvents = Array.isArray(dashboard?.accountHistory?.events)
        ? dashboard.accountHistory.events
        : [];
    const timeSpent = dashboard?.timeSpent || null;
    const timeBreakdown = Array.isArray(timeSpent?.dailyBreakdownLast7)
        ? timeSpent.dailyBreakdownLast7
        : [];
    const timeBreakdownMax = Math.max(
        1,
        ...timeBreakdown.map((entry) => Number(entry?.minutes || 0))
    );
    const timeSourceBreakdown = timeSpent?.sourceBreakdown || {};
    const timeSourceItems = [
        { key: "planner", label: "Planner", value: Number(timeSourceBreakdown?.planner || 0) },
        { key: "likes", label: "Likes", value: Number(timeSourceBreakdown?.likes || 0) },
        { key: "comments", label: "Comments", value: Number(timeSourceBreakdown?.comments || 0) },
        { key: "reposts", label: "Reposts", value: Number(timeSourceBreakdown?.reposts || 0) },
        { key: "presence", label: "Presence", value: Number(timeSourceBreakdown?.presence || 0) }
    ].filter((item) => item.value > 0);

    const renderEmptySection = (message) => (
        <p className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-3 text-xs text-slate-500">
            {message}
        </p>
    );

    return (
        <div className={`min-h-full bg-slate-950 ${shouldShowBottomNav ? "pb-[5.25rem]" : "pb-8"}`}>
            <div className="mx-auto w-full max-w-4xl px-3 pt-3 sm:px-4 sm:pt-4">
                <div className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-900/55 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back
                            </button>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Activity
                            </p>
                            <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                                <Activity className="h-5 w-5 text-emerald-400" />
                                Recent Activity
                            </h1>
                            <p className="mt-1 text-xs text-slate-400">
                                {pagination?.total || 0} records
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={refreshing || loading}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {refreshing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RefreshCcw className="h-3.5 w-3.5" />
                            )}
                            Refresh
                        </button>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
                        <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-slate-300">
                            <Search className="h-4 w-4 text-slate-500" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search by message or action"
                                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                            />
                        </label>

                        <select
                            value={selectedLevel}
                            onChange={(event) => setSelectedLevel(event.target.value)}
                            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500/60"
                        >
                            {LEVEL_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mb-4 grid gap-3 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-sky-400" />
                            <h2 className="text-sm font-semibold text-slate-100">Time Spent</h2>
                        </div>

                        {dashboardLoading && (
                            <p className="text-sm text-slate-400">Loading time stats...</p>
                        )}

                        {!dashboardLoading && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-2.5">
                                        <p className="text-[11px] text-slate-500">Today</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-100">
                                            {timeSpent?.todayLabel || "0h 0m"}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-2.5">
                                        <p className="text-[11px] text-slate-500">7 Days</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-100">
                                            {timeSpent?.last7DaysLabel || "0h 0m"}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-2.5">
                                        <p className="text-[11px] text-slate-500">30 Days</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-100">
                                            {timeSpent?.last30DaysLabel || "0h 0m"}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-2.5">
                                        <p className="text-[11px] text-slate-500">Avg / Day</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-100">
                                            {timeSpent?.averageDailyLabel || "0h 0m"}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-2.5">
                                        <p className="text-[11px] text-slate-500">Active Days</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-100">
                                            {Number(timeSpent?.activeDaysLast30 || 0)}
                                        </p>
                                    </div>
                                </div>

                                {timeBreakdown.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                                            Last 7 Days Trend
                                        </p>
                                        <div className="space-y-1.5">
                                            {timeBreakdown.map((entry) => {
                                                const minutes = Number(entry?.minutes || 0);
                                                const widthPercent =
                                                    minutes > 0
                                                        ? Math.max(
                                                            8,
                                                            Math.round((minutes / timeBreakdownMax) * 100)
                                                        )
                                                        : 0;

                                                return (
                                                    <div key={entry?.date} className="space-y-1">
                                                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                            <span>{entry?.label || entry?.day || "Day"}</span>
                                                            <span>{minutes}m</span>
                                                        </div>
                                                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                                                            <div
                                                                className="h-full rounded-full bg-sky-400/80"
                                                                style={{ width: `${widthPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {timeSourceItems.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {timeSourceItems.map((item) => (
                                            <span
                                                key={item.key}
                                                className="inline-flex rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[11px] text-slate-400"
                                            >
                                                {item.label}: {item.value}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="text-xs text-slate-500">
                                    {timeSpent?.note || "Time tracking data is not available yet."}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <h2 className="text-sm font-semibold text-slate-100">Account History</h2>
                        </div>

                        {dashboardLoading && (
                            <p className="text-sm text-slate-400">Loading account history...</p>
                        )}

                        {!dashboardLoading && accountSummary && (
                            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-2.5">
                                    <p className="text-slate-500">Status</p>
                                    <p className="mt-1 font-semibold capitalize text-slate-100">
                                        {accountSummary?.accountStatus || "active"}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-2.5">
                                    <p className="text-slate-500">Email</p>
                                    <p className="mt-1 font-semibold text-slate-100">
                                        {accountSummary?.emailVerified ? "Verified" : "Not verified"}
                                    </p>
                                </div>
                            </div>
                        )}

                        {!dashboardLoading && accountEvents.length > 0 && (
                            <div className="space-y-2">
                                {accountEvents.slice(0, 4).map((event) => (
                                    <div
                                        key={`${event?.type}:${event?.at}`}
                                        className="rounded-xl border border-slate-800/70 bg-slate-900/50 px-3 py-2"
                                    >
                                        <p className="text-xs font-semibold text-slate-200">
                                            {event?.title || "Account event"}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                            {event?.description || ""}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            {formatDateTime(event?.at)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!dashboardLoading && accountEvents.length === 0 && (
                            <p className="text-sm text-slate-500">No account history available yet.</p>
                        )}
                    </section>
                </div>

                {dashboardError && (
                    <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
                        {dashboardError}
                    </div>
                )}

                <section className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                            <Heart className="h-4 w-4 text-rose-400" />
                            Liked Posts
                        </h2>
                        <span className="text-xs text-slate-500">
                            {dashboard?.likes?.count || 0} total
                        </span>
                    </div>

                    {dashboardLoading && (
                        <p className="text-sm text-slate-400">Loading liked posts...</p>
                    )}

                    {!dashboardLoading && dashboard?.likes?.items?.length === 0 &&
                        renderEmptySection("You have not liked any post yet.")}

                    {!dashboardLoading && dashboard?.likes?.items?.length > 0 && (
                        <div className="space-y-2">
                            {dashboard.likes.items.map((item) => {
                                const postId = toIdString(item?.post?._id);
                                return (
                                    <button
                                        key={toIdString(item?._id)}
                                        type="button"
                                        onClick={() => postId && navigate(`/post/${postId}`)}
                                        className="w-full rounded-xl border border-slate-800/70 bg-slate-900/50 px-3 py-2.5 text-left hover:border-slate-700 hover:bg-slate-900/70"
                                    >
                                        <p className="text-xs text-slate-500">
                                            Liked {formatRelativeTime(item?.likedAt)}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-200 line-clamp-2">
                                            {item?.post?.contentPreview || "View post"}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                            <MessageCircle className="h-4 w-4 text-amber-400" />
                            Commented Posts
                        </h2>
                        <span className="text-xs text-slate-500">
                            {dashboard?.comments?.count || 0} total
                        </span>
                    </div>

                    {dashboardLoading && (
                        <p className="text-sm text-slate-400">Loading commented posts...</p>
                    )}

                    {!dashboardLoading && dashboard?.comments?.items?.length === 0 &&
                        renderEmptySection("You have not commented on any post yet.")}

                    {!dashboardLoading && dashboard?.comments?.items?.length > 0 && (
                        <div className="space-y-2">
                            {dashboard.comments.items.map((item) => {
                                const postId = toIdString(item?.post?._id);
                                return (
                                    <button
                                        key={toIdString(item?._id)}
                                        type="button"
                                        onClick={() => postId && navigate(`/post/${postId}`)}
                                        className="w-full rounded-xl border border-slate-800/70 bg-slate-900/50 px-3 py-2.5 text-left hover:border-slate-700 hover:bg-slate-900/70"
                                    >
                                        <p className="text-xs text-slate-500">
                                            Commented {formatRelativeTime(item?.commentedAt)}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-300 line-clamp-2">
                                            "{item?.contentPreview || "Comment"}"
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                                            On: {item?.post?.contentPreview || "View post"}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                            <Repeat2 className="h-4 w-4 text-violet-400" />
                            Repost Items
                        </h2>
                        <span className="text-xs text-slate-500">
                            {dashboard?.reposts?.count || 0} total
                        </span>
                    </div>

                    {dashboardLoading && (
                        <p className="text-sm text-slate-400">Loading reposts...</p>
                    )}

                    {!dashboardLoading && dashboard?.reposts?.items?.length === 0 &&
                        renderEmptySection("You have not reposted anything yet.")}

                    {!dashboardLoading && dashboard?.reposts?.items?.length > 0 && (
                        <div className="space-y-2">
                            {dashboard.reposts.items.map((item) => {
                                const postId = toIdString(item?.post?._id || item?._id);
                                return (
                                    <button
                                        key={toIdString(item?._id)}
                                        type="button"
                                        onClick={() => postId && navigate(`/post/${postId}`)}
                                        className="w-full rounded-xl border border-slate-800/70 bg-slate-900/50 px-3 py-2.5 text-left hover:border-slate-700 hover:bg-slate-900/70"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] capitalize text-violet-300">
                                                {item?.mode || "repost"}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {formatRelativeTime(item?.repostedAt)}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-300 line-clamp-2">
                                            {item?.contentPreview || "Repost item"}
                                        </p>
                                        {item?.originalPost?.contentPreview && (
                                            <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                                                Original: {item.originalPost.contentPreview}
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-100">Detailed Activity Log</h2>
                    <span className="text-xs text-slate-500">{pagination?.total || 0} records</span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/55">
                    {loading && (
                        <div className="px-4 py-4 text-sm text-slate-400">Loading activity...</div>
                    )}

                    {!loading && error && (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-rose-300">{error}</p>
                            <button
                                type="button"
                                onClick={() => loadActivities({ page: 1, append: false })}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && activities.length === 0 && (
                        <div className="px-4 py-10 text-center">
                            <p className="text-sm font-medium text-slate-300">
                                {hasFilters ? "No matching activity found" : "No activity yet"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {hasFilters
                                    ? "Try changing filters or search terms."
                                    : "Your recent actions will appear here."}
                            </p>
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        activities.map((item) => {
                            const itemId = toIdString(item?._id);
                            const entityLabel = getEntityLabel(item);
                            const level = String(item?.level || "system");
                            const action = String(item?.action || "").trim();

                            return (
                                <article
                                    key={itemId}
                                    className="border-b border-slate-800/45 px-4 py-3 last:border-b-0"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-100">
                                                {item?.message || "Activity update"}
                                            </p>

                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <span
                                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                                        levelPillClasses[level] ||
                                                        levelPillClasses.system
                                                    }`}
                                                >
                                                    {levelLabel(level)}
                                                </span>

                                                {entityLabel && (
                                                    <span className="inline-flex rounded-full border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-300">
                                                        {entityLabel}
                                                    </span>
                                                )}

                                                {action && (
                                                    <span className="inline-flex rounded-full border border-slate-700 bg-slate-800/30 px-2 py-0.5 text-[11px] text-slate-400">
                                                        {action}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-xs font-medium text-slate-300">
                                                {formatRelativeTime(item?.createdAt)}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                {formatDateTime(item?.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                </div>

                {!loading && !error && pagination?.hasMore && (
                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                            Load more
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityPage;
