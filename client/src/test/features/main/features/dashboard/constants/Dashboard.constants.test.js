import { expect, test } from "vitest";

import {
    CHART_COLORS,
    DAY_RANGE_OPTIONS,
    DEFAULT_DAYS,
    DRAFT_STORAGE_KEY,
    INTERACTION_KIND_METRIC_MAP,
    INTERACTION_KINDS,
    LIVE_INTERACTION_LIMIT,
    MAX_DRAFTS,
    MOBILE_BREAKPOINT,
    POST_DATE_FILTER_OPTIONS,
    POST_SORT_OPTIONS,
    POST_STATUS_FILTER_OPTIONS,
} from "../../../../../../features/main/features/dashboard/constants/dashboard.constants.js";

test("dashboard constants expose the supported breakpoints, limits, filters, and metric mappings", () => {
    expect(MOBILE_BREAKPOINT).toBe(1024);
    expect(DEFAULT_DAYS).toBe(30);
    expect(DRAFT_STORAGE_KEY).toBe("advanced_dashboard_drafts_v1");
    expect(MAX_DRAFTS).toBe(20);
    expect(LIVE_INTERACTION_LIMIT).toBe(20);
    expect(CHART_COLORS).toEqual([
        "#38bdf8",
        "#22c55e",
        "#f59e0b",
        "#f97316",
        "#a855f7",
    ]);
    expect(DAY_RANGE_OPTIONS).toEqual([
        { value: 7, label: "Last 7 days" },
        { value: 14, label: "Last 14 days" },
        { value: 30, label: "Last 30 days" },
    ]);
    expect(POST_STATUS_FILTER_OPTIONS).toEqual([
        { value: "all", label: "All" },
        { value: "active", label: "Published" },
        { value: "scheduled", label: "Scheduled" },
    ]);
    expect(POST_SORT_OPTIONS).toEqual([
        { value: "date_desc", label: "Newest" },
        { value: "date_asc", label: "Oldest" },
        { value: "likes_desc", label: "Most liked" },
        { value: "comments_desc", label: "Most commented" },
    ]);
    expect(POST_DATE_FILTER_OPTIONS).toEqual([
        { value: "all", label: "All dates" },
        { value: "today", label: "Today" },
        { value: "last7", label: "Last 7 days" },
        { value: "last30", label: "Last 30 days" },
    ]);
    expect(Array.from(INTERACTION_KINDS)).toEqual([
        "post_like",
        "post_comment",
        "post_share",
        "comment_reply",
    ]);
    expect(INTERACTION_KIND_METRIC_MAP).toEqual({
        post_like: "likes",
        post_comment: "comments",
        post_share: "shares",
    });
});