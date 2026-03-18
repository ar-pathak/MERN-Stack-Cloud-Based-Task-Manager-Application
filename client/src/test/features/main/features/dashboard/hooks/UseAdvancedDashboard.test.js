import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const {
    toastSuccessMock,
    toastErrorMock,
    toastMessageMock,
    toastWarningMock,
    connectSocketMock,
    onNotificationNewMock,
    getAdvancedDashboardMock,
    createPostMock,
    updatePostMock,
    deletePostMock,
} = vi.hoisted(() => ({
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    toastMessageMock: vi.fn(),
    toastWarningMock: vi.fn(),
    connectSocketMock: vi.fn(),
    onNotificationNewMock: vi.fn(),
    getAdvancedDashboardMock: vi.fn(),
    createPostMock: vi.fn(),
    updatePostMock: vi.fn(),
    deletePostMock: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: {
        success: toastSuccessMock,
        error: toastErrorMock,
        message: toastMessageMock,
        warning: toastWarningMock,
    },
}));

vi.mock("../../../../../../service/Chat.socket.service", () => ({
    connectSocket: connectSocketMock,
    onNotificationNew: onNotificationNewMock,
}));

vi.mock("../../../../../../service/activity.service", () => ({
    getAdvancedDashboard: getAdvancedDashboardMock,
}));

vi.mock("../../../../../../service/post.service", () => ({
    createPost: createPostMock,
    updatePost: updatePostMock,
    deletePost: deletePostMock,
}));

import { DRAFT_STORAGE_KEY } from "../../../../../../features/main/features/dashboard/constants/dashboard.constants.js";
import useAdvancedDashboard from "../../../../../../features/main/features/dashboard/hooks/useAdvancedDashboard.js";

const isoDaysAgo = (days) => {
    const next = new Date();
    next.setDate(next.getDate() - days);
    next.setHours(12, 0, 0, 0);
    return next.toISOString();
};

const buildDashboardPayload = () => ({
    generatedAt: "2026-03-18T09:00:00.000Z",
    creator: {
        totals: {
            posts: 14,
            followers: 120,
            likes: 9,
            comments: 6,
            shares: 2,
        },
        growth: {
            today: { posts: 1, followers: 2, likes: 3, comments: 4, shares: 5 },
            last7Days: { posts: 7, followers: 14, likes: 21, comments: 28, shares: 35 },
            last30Days: { posts: 30, followers: 60, likes: 90, comments: 120, shares: 150 },
        },
        trends: {
            followerGrowth: [{ date: "2026-03-17", followers: 3 }],
            likesCommentsTrend: [{ date: "2026-03-17", likes: 10, comments: 2 }],
            topPerformingPosts: [{ _id: "top-1", contentPreview: "Best post" }],
        },
        audience: {
            followersByCountry: [{ country: "IN", value: 80 }],
            activeTime: {
                hourlyActivity: [{ label: "09:00", averageEngagement: 12 }],
                bestPostingHour: { label: "09:00 - 10:00" },
            },
            newVsReturningUsers: { newUsers: 20, returningUsers: 10 },
        },
        management: {
            scheduledPosts: [
                {
                    _id: "scheduled-1",
                    contentPreview: "Scheduled launch",
                    scheduledFor: "2026-03-21T10:00:00.000Z",
                },
            ],
        },
        postAnalytics: {
            items: [
                {
                    _id: "post-new",
                    contentPreview: "Newest update",
                    createdAt: isoDaysAgo(0),
                    status: "active",
                    views: 20,
                    likes: 2,
                    comments: 1,
                    shares: 0,
                    saves: 0,
                    engagementRate: 15,
                },
                {
                    _id: "post-old",
                    contentPreview: "Older campaign",
                    createdAt: isoDaysAgo(10),
                    status: "scheduled",
                    views: 100,
                    likes: 7,
                    comments: 0,
                    shares: 1,
                    saves: 1,
                    engagementRate: 8,
                },
            ],
        },
    },
});

beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    getAdvancedDashboardMock.mockResolvedValue(buildDashboardPayload());
    onNotificationNewMock.mockImplementation(() => vi.fn());
    createPostMock.mockResolvedValue({ _id: "created-1" });
    updatePostMock.mockResolvedValue({ _id: "updated-1" });
    deletePostMock.mockResolvedValue({ ok: true });
});

test("loads dashboard data and exposes derived sections", async () => {
    const { result } = renderHook(() => useAdvancedDashboard({ profileId: "user-1" }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getAdvancedDashboardMock).toHaveBeenCalledWith({ days: 30 });
    expect(connectSocketMock).toHaveBeenCalledTimes(1);
    expect(onNotificationNewMock).toHaveBeenCalledTimes(1);
    expect(result.current.generatedAt).toBe("2026-03-18T09:00:00.000Z");
    expect(result.current.posts[0]._id).toBe("post-new");
    expect(result.current.growthRows).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                label: "Followers",
                today: 2,
                sevenDays: 14,
                thirtyDays: 60,
            }),
        ])
    );
    expect(result.current.countryRows).toHaveLength(1);
    expect(result.current.scheduledPosts).toHaveLength(1);
});

test("applies status/date filters and sorting for post analytics", async () => {
    const { result } = renderHook(() => useAdvancedDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
        result.current.setStatusFilter("scheduled");
    });
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts[0]._id).toBe("post-old");

    act(() => {
        result.current.setStatusFilter("all");
        result.current.setSortBy("likes_desc");
    });
    expect(result.current.posts[0]._id).toBe("post-old");

    act(() => {
        result.current.setDateFilter("last7");
    });
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts[0]._id).toBe("post-new");
});

test("handles initial load error, refresh recovery, and day-range reload", async () => {
    getAdvancedDashboardMock
        .mockRejectedValueOnce(new Error("Dashboard unavailable"))
        .mockResolvedValue(buildDashboardPayload());

    const { result } = renderHook(() => useAdvancedDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Dashboard unavailable");

    await act(async () => {
        await result.current.refresh();
    });
    await waitFor(() => expect(result.current.error).toBe(""));
    expect(getAdvancedDashboardMock).toHaveBeenLastCalledWith({ days: 30 });

    act(() => {
        result.current.setDays(14);
    });
    await waitFor(() => expect(getAdvancedDashboardMock).toHaveBeenLastCalledWith({ days: 14 }));
});

test("handles live interaction socket events and cleanup", async () => {
    const unsubscribeMock = vi.fn();
    let notificationHandler = null;
    onNotificationNewMock.mockImplementation((handler) => {
        notificationHandler = handler;
        return unsubscribeMock;
    });

    const { result, unmount } = renderHook(() => useAdvancedDashboard({ profileId: "user-1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof notificationHandler).toBe("function");

    act(() => {
        notificationHandler({
            notification: {
                _id: "notif-1",
                title: "New like",
                message: "Mia liked your post",
                actor: { name: "Mia" },
                metadata: { kind: "post_like", postId: "post-new" },
            },
        });
    });

    await waitFor(() => expect(result.current.totals.likes).toBe(10));
    expect(result.current.posts.find((post) => post._id === "post-new")?.likes).toBe(3);
    expect(toastMessageMock).toHaveBeenCalledWith("New like", {
        description: "Mia liked your post",
    });

    act(() => {
        notificationHandler({
            notification: { metadata: { kind: "workspace_invite" } },
        });
    });
    expect(toastMessageMock).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
});

test("validates composer input and creates a post", async () => {
    const { result } = renderHook(() => useAdvancedDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
        await result.current.submitComposer();
    });
    expect(result.current.composerError).toBe("Post content is required");
    expect(toastErrorMock).toHaveBeenCalledWith("Post content is required");

    act(() => {
        result.current.setComposer((previous) => ({
            ...previous,
            content: "Will fail",
            publishMode: "schedule",
            scheduledFor: "2020-01-01T00:00",
        }));
    });

    await act(async () => {
        await result.current.submitComposer();
    });
    expect(createPostMock).not.toHaveBeenCalled();
    expect(result.current.composerError).toBe("Schedule time must be in the future");

    act(() => {
        result.current.setComposer((previous) => ({
            ...previous,
            content: "  Ready now  ",
            visibility: "private",
            publishMode: "now",
        }));
    });

    await act(async () => {
        await result.current.submitComposer();
    });

    expect(createPostMock).toHaveBeenCalledWith({
        content: "Ready now",
        visibility: "private",
        postType: "text",
    });
    expect(result.current.composer.mode).toBe("create");
    expect(result.current.composer.content).toBe("");
    expect(toastSuccessMock).toHaveBeenCalledWith("Post created");
});

test("edits a post and handles delete confirmation flow", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const { result } = renderHook(() => useAdvancedDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const currentPost = result.current.posts[0];
    act(() => {
        result.current.handleEdit(currentPost);
        result.current.setComposer((previous) => ({
            ...previous,
            content: "  Updated post body  ",
            visibility: "followers",
        }));
    });

    await act(async () => {
        await result.current.submitComposer();
    });
    expect(updatePostMock).toHaveBeenCalledWith("post-new", {
        content: "Updated post body",
        visibility: "followers",
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Post updated");

    act(() => {
        result.current.handleEdit(currentPost);
    });

    confirmSpy.mockReturnValue(false);
    await act(async () => {
        await result.current.deleteOnePost("post-new");
    });
    expect(deletePostMock).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    await act(async () => {
        await result.current.deleteOnePost("post-new");
    });
    expect(deletePostMock).toHaveBeenCalledWith("post-new");
    expect(result.current.composer.mode).toBe("create");
    expect(result.current.busyPostId).toBe("");
    confirmSpy.mockRestore();
});

test("supports draft save, load, and removal with local storage sync", async () => {
    const { result } = renderHook(() => useAdvancedDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
        result.current.saveDraft();
    });
    expect(toastErrorMock).toHaveBeenCalledWith("Write something before saving draft");

    act(() => {
        result.current.setComposer((previous) => ({
            ...previous,
            content: "Draft body",
            visibility: "private",
            publishMode: "schedule",
            scheduledFor: "2030-01-01T10:00",
        }));
    });

    act(() => {
        result.current.saveDraft();
    });
    await waitFor(() => expect(result.current.drafts).toHaveLength(1));
    expect(toastSuccessMock).toHaveBeenCalledWith("Draft saved");

    await waitFor(() => {
        const serializedDrafts = window.localStorage.getItem(DRAFT_STORAGE_KEY);
        expect(serializedDrafts).toContain("Draft body");
    });

    const draft = result.current.drafts[0];
    act(() => {
        result.current.loadDraft(draft);
    });
    expect(result.current.composer.content).toBe("Draft body");
    expect(toastMessageMock).toHaveBeenCalledWith("Draft loaded");

    act(() => {
        result.current.removeDraft(draft.id);
    });
    await waitFor(() => expect(result.current.drafts).toHaveLength(0));
    expect(toastMessageMock).toHaveBeenCalledWith("Draft removed");
});

test("warns only once when draft persistence fails", async () => {
    const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
            throw new Error("Quota exceeded");
        });

    const { result } = renderHook(() => useAdvancedDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
        result.current.setComposer((previous) => ({
            ...previous,
            content: "First draft",
        }));
    });
    act(() => {
        result.current.saveDraft();
    });
    await waitFor(() => expect(result.current.drafts).toHaveLength(1));

    act(() => {
        result.current.setComposer((previous) => ({
            ...previous,
            content: "Second draft",
        }));
    });
    act(() => {
        result.current.saveDraft();
    });
    await waitFor(() => expect(result.current.drafts).toHaveLength(2));

    expect(toastWarningMock).toHaveBeenCalledTimes(1);
    setItemSpy.mockRestore();
});
