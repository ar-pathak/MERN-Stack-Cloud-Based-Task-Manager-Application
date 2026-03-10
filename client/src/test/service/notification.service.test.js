import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../../config/axios", () => ({
    default: apiMock,
}));

import {
    bulkNotificationAction,
    deleteNotification,
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
    markNotificationUnread,
} from "../../service/notification.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("getNotifications prefers response.data.data, then response.data, then defaults", async () => {
    apiMock.get
        .mockResolvedValueOnce({
            data: {
                data: { notifications: ["n1"], unreadCount: 1 },
            },
        })
        .mockResolvedValueOnce({
            data: { notifications: ["n2"], unreadCount: 2 },
        })
        .mockResolvedValueOnce({});

    const first = await getNotifications({ page: 2 });
    const second = await getNotifications();
    const third = await getNotifications();

    expect(apiMock.get).toHaveBeenNthCalledWith(1, "/api/notifications", {
        params: { page: 2 },
    });
    expect(apiMock.get).toHaveBeenNthCalledWith(2, "/api/notifications", {
        params: {},
    });
    expect(apiMock.get).toHaveBeenNthCalledWith(3, "/api/notifications", {
        params: {},
    });

    expect(first).toEqual({ notifications: ["n1"], unreadCount: 1 });
    expect(second).toEqual({ notifications: ["n2"], unreadCount: 2 });
    expect(third).toEqual({ notifications: [], unreadCount: 0 });
});

test("getUnreadNotificationCount normalizes payloads and defaults to 0", async () => {
    apiMock.get
        .mockResolvedValueOnce({ data: { data: { count: "5" } } })
        .mockResolvedValueOnce({ data: { count: 2 } })
        .mockResolvedValueOnce({});

    await expect(getUnreadNotificationCount()).resolves.toBe(5);
    await expect(getUnreadNotificationCount()).resolves.toBe(2);
    await expect(getUnreadNotificationCount()).resolves.toBe(0);
});

test("notification actions call the expected endpoints", async () => {
    apiMock.patch
        .mockResolvedValueOnce({ data: { data: { ok: true } } })
        .mockResolvedValueOnce({ data: { ok: false } })
        .mockResolvedValueOnce({ data: { ok: true } })
        .mockResolvedValueOnce({ data: { data: { ok: true } } })
        .mockResolvedValueOnce({ data: { ok: false } });
    apiMock.delete.mockResolvedValueOnce({ data: { ok: true } });
    apiMock.post
        .mockResolvedValueOnce({ data: { data: { ok: true } } })
        .mockResolvedValueOnce({ data: { ok: false } });

    await expect(markNotificationRead("note-1")).resolves.toEqual({ ok: true });
    await expect(markNotificationRead("note-1b")).resolves.toEqual({ ok: false });
    await expect(markNotificationUnread("note-2")).resolves.toEqual({ ok: true });
    await expect(markAllNotificationsRead({ scope: "all" })).resolves.toEqual({
        ok: true,
    });
    await expect(markAllNotificationsRead({ scope: "teams" })).resolves.toEqual({
        ok: false,
    });
    await expect(deleteNotification("note-3")).resolves.toEqual({ ok: true });
    await expect(
        bulkNotificationAction("archive", ["note-1"])
    ).resolves.toEqual({ ok: true });
    await expect(
        bulkNotificationAction("delete", ["note-2"])
    ).resolves.toEqual({ ok: false });

    expect(apiMock.patch).toHaveBeenNthCalledWith(
        1,
        "/api/notifications/note-1/read"
    );
    expect(apiMock.patch).toHaveBeenNthCalledWith(
        2,
        "/api/notifications/note-1b/read"
    );
    expect(apiMock.patch).toHaveBeenNthCalledWith(
        3,
        "/api/notifications/note-2/unread"
    );
    expect(apiMock.patch).toHaveBeenNthCalledWith(
        4,
        "/api/notifications/read-all",
        { scope: "all" }
    );
    expect(apiMock.patch).toHaveBeenNthCalledWith(
        5,
        "/api/notifications/read-all",
        { scope: "teams" }
    );
    expect(apiMock.delete).toHaveBeenCalledWith("/api/notifications/note-3");
    expect(apiMock.post).toHaveBeenNthCalledWith(1, "/api/notifications/bulk", {
        action: "archive",
        notificationIds: ["note-1"],
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(2, "/api/notifications/bulk", {
        action: "delete",
        notificationIds: ["note-2"],
    });
});
