import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../../config/axios", () => ({
    default: apiMock,
}));

import {
    blockUser,
    checkUsernameAvailability,
    deactivateAccount,
    getBlockedUsers,
    getMyProfile,
    getPopularUsers,
    getUserById,
    getUserStats,
    searchMentionCandidates,
    searchUsers,
    unblockUser,
    updateActivity,
    updatePreferences,
    updateProfile,
} from "../../service/user.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("user service returns payloads and defaults", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: { user: { id: "u1" } } } });
    await expect(getMyProfile()).resolves.toEqual({ id: "u1" });

    apiMock.put.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(updateProfile({ name: "Aurora" })).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { preferences: { theme: "dark" } } } });
    await expect(updatePreferences({ theme: "dark" })).resolves.toEqual({ theme: "dark" });

    apiMock.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(updateActivity()).resolves.toEqual({ ok: true });
    expect(apiMock.post).toHaveBeenCalledWith("/api/user/me/activity", { isOnline: true });

    apiMock.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(deactivateAccount()).resolves.toEqual({ ok: true });

    const signal = { aborted: false };
    apiMock.get.mockResolvedValueOnce({ data: { data: { users: [] } } });
    await expect(searchUsers("aurora", { page: 2 }, { signal, headers: { "x-test": "1" } })).resolves.toEqual({
        users: [],
    });
    expect(apiMock.get).toHaveBeenLastCalledWith("/api/user/search", {
        signal,
        headers: { "x-test": "1" },
        params: { query: "aurora", page: 2 },
    });

    apiMock.get.mockResolvedValueOnce({ data: { data: { users: [{ id: "u2" }] } } });
    await expect(searchMentionCandidates("au")).resolves.toEqual([{ id: "u2" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: { results: [{ id: "u3" }] } } });
    await expect(searchMentionCandidates("ur")).resolves.toEqual([{ id: "u3" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(searchMentionCandidates("none")).resolves.toEqual([]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "b1" }] } });
    await expect(getBlockedUsers()).resolves.toEqual([{ id: "b1" }]);

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(blockUser("user-1")).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(unblockUser("user-1")).resolves.toEqual({ ok: true });

    apiMock.get.mockResolvedValueOnce({ data: { data: { users: [{ id: "p1" }] } } });
    await expect(getPopularUsers()).resolves.toEqual([{ id: "p1" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: { available: true } } });
    await expect(checkUsernameAvailability("aurora")).resolves.toEqual({ available: true });

    apiMock.get.mockResolvedValueOnce({ data: { data: { user: { id: "u4" } } } });
    await expect(getUserById("u4")).resolves.toEqual({ id: "u4" });

    apiMock.get.mockResolvedValueOnce({ data: { data: { stats: { posts: 2 } } } });
    await expect(getUserStats("u4")).resolves.toEqual({ posts: 2 });
});

test("updateActivity returns null on errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    apiMock.post.mockRejectedValueOnce(new Error("boom"));

    await expect(updateActivity()).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
});

test("user service errors prefer response messages", async () => {
    const error = { response: { data: { message: "User error" }, status: 500 } };

    const getCalls = [
        () => getMyProfile(),
        () => searchUsers("aurora"),
        () => searchMentionCandidates("au"),
        () => getBlockedUsers(),
        () => getPopularUsers(),
        () => checkUsernameAvailability("aurora"),
        () => getUserById("u1"),
        () => getUserStats("u1"),
    ];
    getCalls.forEach(() => apiMock.get.mockRejectedValueOnce(error));
    for (const call of getCalls) {
        await expect(call()).rejects.toEqual({ message: "User error", status: 500 });
    }

    apiMock.put.mockRejectedValueOnce(error);
    await expect(updateProfile({ name: "Aurora" })).rejects.toEqual({ message: "User error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(updatePreferences({ theme: "dark" })).rejects.toEqual({ message: "User error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(deactivateAccount()).rejects.toEqual({ message: "User error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(blockUser("user-1")).rejects.toEqual({ message: "User error", status: 500 });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(unblockUser("user-1")).rejects.toEqual({ message: "User error", status: 500 });
});

test("user service errors fall back to defaults", async () => {
    const getCases = [
        { fn: () => getMyProfile(), message: "Failed to load profile" },
        { fn: () => searchUsers("aurora"), message: "Search failed" },
        { fn: () => searchMentionCandidates("au"), message: "Failed to search mention candidates" },
        { fn: () => getBlockedUsers(), message: "Failed to load blocked users" },
        { fn: () => getPopularUsers(), message: "Failed to load popular users" },
        { fn: () => checkUsernameAvailability("aurora"), message: "Failed to check username" },
        { fn: () => getUserById("u1"), message: "Failed to load user" },
        { fn: () => getUserStats("u1"), message: "Failed to load stats" },
    ];
    getCases.forEach(() => apiMock.get.mockRejectedValueOnce({}));
    for (const { fn, message } of getCases) {
        await expect(fn()).rejects.toEqual({ message, status: undefined });
    }

    apiMock.put.mockRejectedValueOnce({});
    await expect(updateProfile({ name: "Aurora" })).rejects.toEqual({
        message: "Failed to update profile",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(updatePreferences({ theme: "dark" })).rejects.toEqual({
        message: "Failed to update preferences",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(deactivateAccount()).rejects.toEqual({
        message: "Failed to deactivate account",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(blockUser("user-1")).rejects.toEqual({
        message: "Failed to block user",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(unblockUser("user-1")).rejects.toEqual({
        message: "Failed to unblock user",
        status: undefined,
    });
});
