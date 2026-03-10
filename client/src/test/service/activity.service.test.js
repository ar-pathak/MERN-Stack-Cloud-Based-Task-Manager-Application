import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
    },
}));

vi.mock("../../config/axios", () => ({
    default: apiMock,
}));

import {
    getActivityDashboard,
    getAdvancedDashboard,
    getMyActivities,
} from "../../service/activity.service.js";

beforeEach(() => {
    apiMock.get.mockReset();
});

test("getMyActivities normalizes array payloads and defaults", async () => {
    apiMock.get
        .mockResolvedValueOnce({
            data: {
                data: {
                    activities: [{ id: "a1" }],
                    pagination: {
                        page: 2,
                        limit: 10,
                        total: 5,
                        totalPages: 1,
                        hasMore: true,
                    },
                },
            },
        })
        .mockResolvedValueOnce({
            data: {
                activities: "not-array",
                pagination: null,
            },
        })
        .mockResolvedValueOnce({});

    const first = await getMyActivities({ page: 2 });
    const second = await getMyActivities();
    const third = await getMyActivities();

    expect(apiMock.get).toHaveBeenNthCalledWith(1, "/api/activity/me", {
        params: { page: 2 },
    });
    expect(first.activities).toEqual([{ id: "a1" }]);
    expect(first.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 5,
        totalPages: 1,
        hasMore: true,
    });

    expect(second.activities).toEqual([]);
    expect(second.pagination).toEqual({
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
        hasMore: false,
    });

    expect(third.activities).toEqual([]);
    expect(third.pagination).toEqual({
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
        hasMore: false,
    });
});

test("getActivityDashboard returns defaults when payload is missing", async () => {
    const fullPayload = {
        likes: { count: "4", items: [{ id: "l1" }] },
        comments: { count: 2, items: ["c1"] },
        reposts: { count: 1, items: [] },
        timeSpent: { minutes: 30 },
        accountHistory: { summary: "ok", events: [1] },
        analytics: { active: true },
    };

    apiMock.get
        .mockResolvedValueOnce({ data: { data: fullPayload } })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({});

    const full = await getActivityDashboard({ scope: "full" });
    const partial = await getActivityDashboard();
    const empty = await getActivityDashboard();

    expect(apiMock.get).toHaveBeenNthCalledWith(1, "/api/activity/dashboard", {
        params: { scope: "full" },
    });
    expect(full.likes).toEqual({ count: 4, items: [{ id: "l1" }] });
    expect(full.comments).toEqual({ count: 2, items: ["c1"] });
    expect(full.reposts).toEqual({ count: 1, items: [] });
    expect(full.timeSpent).toEqual({ minutes: 30 });
    expect(full.accountHistory).toEqual({ summary: "ok", events: [1] });
    expect(full.analytics).toEqual({ active: true });

    [partial, empty].forEach((payload) => {
        expect(payload.likes).toEqual({ count: 0, items: [] });
        expect(payload.comments).toEqual({ count: 0, items: [] });
        expect(payload.reposts).toEqual({ count: 0, items: [] });
        expect(payload.timeSpent).toBeNull();
        expect(payload.accountHistory).toEqual({ summary: null, events: [] });
        expect(payload.analytics).toBeNull();
    });
});

test("getAdvancedDashboard applies defaults when fields are missing", async () => {
    const fullPayload = {
        rangeDays: 14,
        generatedAt: "2025-01-01",
        social: { totals: { likes: 5 } },
        productivity: { totals: { tasks: 3 } },
        activity: { kpis: { active: 2 } },
        creator: { totals: { posts: 9 } },
    };

    apiMock.get
        .mockResolvedValueOnce({ data: { data: fullPayload } })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({});

    const full = await getAdvancedDashboard();
    const partial = await getAdvancedDashboard();
    const empty = await getAdvancedDashboard();

    expect(full.rangeDays).toBe(14);
    expect(full.generatedAt).toBe("2025-01-01");
    expect(full.social).toEqual({ totals: { likes: 5 } });
    expect(full.productivity).toEqual({ totals: { tasks: 3 } });
    expect(full.activity).toEqual({ kpis: { active: 2 } });
    expect(full.creator).toEqual({ totals: { posts: 9 } });

    [partial, empty].forEach((payload) => {
        expect(payload.rangeDays).toBe(30);
        expect(payload.generatedAt).toBeNull();
        expect(payload.social.dailyTrend).toEqual([]);
        expect(payload.productivity.taskStatusDistribution).toEqual([]);
        expect(payload.activity.charts.dailyTrend).toEqual([]);
        expect(payload.creator.totals).toMatchObject({
            posts: 0,
            followers: 0,
            following: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0,
        });
    });
});
