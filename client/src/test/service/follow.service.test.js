import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../../config/axios", () => ({
    default: apiMock,
}));

import {
    approveFollowRequest,
    checkFollowStatus,
    followUser,
    getFollowers,
    getFollowing,
    getFollowSuggestions,
    getMutualFollowers,
    getPendingRequests,
    rejectFollowRequest,
    removeFollower,
    unfollowUser,
} from "../../service/follow.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("follow service returns payloads and defaults", async () => {
    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(followUser("user-1")).resolves.toEqual({ ok: true });
    expect(apiMock.post).toHaveBeenLastCalledWith("/api/follow/user-1/follow");

    apiMock.post.mockResolvedValueOnce({ data: { ok: false } });
    await expect(followUser("user-2")).resolves.toEqual({ ok: false });

    apiMock.get.mockResolvedValueOnce({ data: { data: { isFollowing: true } } });
    await expect(checkFollowStatus("user-1")).resolves.toEqual({ isFollowing: true });

    apiMock.get.mockResolvedValueOnce({ data: { isFollowing: false } });
    await expect(checkFollowStatus("user-2")).resolves.toEqual({ isFollowing: false });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "f1" }] } });
    await expect(getFollowers("user-1", { page: 1 })).resolves.toEqual([{ id: "f1" }]);

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "f2" }] });
    await expect(getFollowers("user-1")).resolves.toEqual([{ id: "f2" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "f3" }] } });
    await expect(getFollowing("user-1")).resolves.toEqual([{ id: "f3" }]);

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "f4" }] });
    await expect(getFollowing("user-1")).resolves.toEqual([{ id: "f4" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "m1" }] } });
    await expect(getMutualFollowers("user-1")).resolves.toEqual([{ id: "m1" }]);

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "m2" }] });
    await expect(getMutualFollowers("user-1")).resolves.toEqual([{ id: "m2" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "s1" }] } });
    await expect(getFollowSuggestions(5)).resolves.toEqual([{ id: "s1" }]);
    expect(apiMock.get).toHaveBeenLastCalledWith("/api/follow/suggestions", {
        params: { limit: 5 },
    });

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "s2" }] });
    await expect(getFollowSuggestions()).resolves.toEqual([{ id: "s2" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "r1" }] } });
    await expect(getPendingRequests({ page: 2 })).resolves.toEqual([{ id: "r1" }]);

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "r2" }] });
    await expect(getPendingRequests()).resolves.toEqual([{ id: "r2" }]);

    apiMock.delete.mockResolvedValueOnce({ data: { ok: true } });
    await expect(unfollowUser("user-1")).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { ok: true } });
    await expect(removeFollower("user-2")).resolves.toEqual({ ok: true });

    apiMock.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(approveFollowRequest("req-1")).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { ok: true } });
    await expect(rejectFollowRequest("req-1")).resolves.toEqual({ ok: true });
});

test("follow service errors prefer response messages", async () => {
    const error = { response: { data: { message: "Follow error" }, status: 500 } };

    apiMock.post.mockRejectedValueOnce(error);
    await expect(followUser("user-1")).rejects.toEqual({ message: "Follow error", status: 500 });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(unfollowUser("user-1")).rejects.toEqual({ message: "Follow error", status: 500 });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(removeFollower("user-1")).rejects.toEqual({ message: "Follow error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(checkFollowStatus("user-1")).rejects.toEqual({ message: "Follow error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getFollowers("user-1")).rejects.toEqual({ message: "Follow error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getFollowing("user-1")).rejects.toEqual({ message: "Follow error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getMutualFollowers("user-1")).rejects.toEqual({ message: "Follow error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getFollowSuggestions()).rejects.toEqual({ message: "Follow error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getPendingRequests()).rejects.toEqual({ message: "Follow error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(approveFollowRequest("req-1")).rejects.toEqual({ message: "Follow error", status: 500 });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(rejectFollowRequest("req-1")).rejects.toEqual({ message: "Follow error", status: 500 });
});

test("follow service errors fall back to defaults", async () => {
    apiMock.post.mockRejectedValueOnce({});
    await expect(followUser("user-1")).rejects.toEqual({
        message: "Failed to follow user",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(unfollowUser("user-1")).rejects.toEqual({
        message: "Failed to unfollow user",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(removeFollower("user-1")).rejects.toEqual({
        message: "Failed to remove follower",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(checkFollowStatus("user-1")).rejects.toEqual({
        message: "Failed to check follow status",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getFollowers("user-1")).rejects.toEqual({
        message: "Failed to load followers",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getFollowing("user-1")).rejects.toEqual({
        message: "Failed to load following list",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getMutualFollowers("user-1")).rejects.toEqual({
        message: "Failed to load mutual followers",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getFollowSuggestions()).rejects.toEqual({
        message: "Failed to load suggestions",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getPendingRequests()).rejects.toEqual({
        message: "Failed to load pending requests",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(approveFollowRequest("req-1")).rejects.toEqual({
        message: "Failed to approve request",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(rejectFollowRequest("req-1")).rejects.toEqual({
        message: "Failed to reject request",
        status: undefined,
    });
});
