export const MOBILE_BREAKPOINT = 1024;
export const DEFAULT_DAYS = 30;
export const DRAFT_STORAGE_KEY = "advanced_dashboard_drafts_v1";
export const MAX_DRAFTS = 20;
export const LIVE_INTERACTION_LIMIT = 20;

export const CHART_COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#f97316", "#a855f7"];

export const DAY_RANGE_OPTIONS = [
    { value: 7, label: "Last 7 days" },
    { value: 14, label: "Last 14 days" },
    { value: 30, label: "Last 30 days" }
];

export const POST_STATUS_FILTER_OPTIONS = [
    { value: "all", label: "All" },
    { value: "active", label: "Published" },
    { value: "scheduled", label: "Scheduled" }
];

export const POST_SORT_OPTIONS = [
    { value: "date_desc", label: "Newest" },
    { value: "date_asc", label: "Oldest" },
    { value: "likes_desc", label: "Most liked" },
    { value: "comments_desc", label: "Most commented" }
];

export const POST_DATE_FILTER_OPTIONS = [
    { value: "all", label: "All dates" },
    { value: "today", label: "Today" },
    { value: "last7", label: "Last 7 days" },
    { value: "last30", label: "Last 30 days" }
];

export const INTERACTION_KINDS = new Set([
    "post_like",
    "post_comment",
    "post_share",
    "comment_reply"
]);

export const INTERACTION_KIND_METRIC_MAP = {
    post_like: "likes",
    post_comment: "comments",
    post_share: "shares"
};
