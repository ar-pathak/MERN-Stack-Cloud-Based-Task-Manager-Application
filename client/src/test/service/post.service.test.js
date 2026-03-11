import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../../config/axios", () => ({
    default: apiMock,
}));

import {
    addComment,
    createPost,
    deleteComment,
    deletePost,
    getBookmarkedPosts,
    getCommentReplies,
    getExploreFeed,
    getHashtagPosts,
    getLikedPosts,
    getPostById,
    getPostComments,
    getPostLikes,
    getTrendingPosts,
    getUserFeed,
    getUserPosts,
    likeComment,
    likePost,
    repostPost,
    savePost,
    searchPosts,
    sharePost,
    unlikeComment,
    unlikePost,
    unsavePost,
    updateComment,
    updatePost,
} from "../../service/post.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("post service returns payloads and defaults", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "e1" }] } });
    await expect(getExploreFeed({ page: 1 })).resolves.toEqual([{ id: "e1" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "t1" }] } });
    await expect(getTrendingPosts()).resolves.toEqual([{ id: "t1" }]);

    const signal = { aborted: false };
    apiMock.get.mockResolvedValueOnce({ data: { data: { hits: [] } } });
    await expect(
        searchPosts("alpha", { page: 2 }, { signal, headers: { "x-test": "1" } })
    ).resolves.toEqual({ hits: [] });
    expect(apiMock.get).toHaveBeenLastCalledWith("/api/posts/search", {
        signal,
        headers: { "x-test": "1" },
        params: { query: "alpha", page: 2 },
    });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "h1" }] } });
    await expect(getHashtagPosts("#news", { page: 1 })).resolves.toEqual([{ id: "h1" }]);
    expect(apiMock.get).toHaveBeenLastCalledWith("/api/posts/hashtag/news", { params: { page: 1 } });

    apiMock.get.mockResolvedValueOnce({ data: { data: { post: { id: "p1" } } } });
    await expect(getPostById("p1")).resolves.toEqual({ id: "p1" });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "u1" }] } });
    await expect(getUserPosts("u1")).resolves.toEqual([{ id: "u1" }]);

    apiMock.post.mockResolvedValueOnce({ data: { data: { post: { id: "c1" } } } });
    await expect(createPost({ content: "Hello" })).resolves.toEqual({ id: "c1" });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "f1" }] } });
    await expect(getUserFeed()).resolves.toEqual([{ id: "f1" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "l1" }] } });
    await expect(getLikedPosts()).resolves.toEqual([{ id: "l1" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "b1" }] } });
    await expect(getBookmarkedPosts()).resolves.toEqual([{ id: "b1" }]);

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(savePost("p1")).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(unsavePost("p1")).resolves.toEqual({ ok: true });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(sharePost("p1")).resolves.toEqual({ ok: true });
    expect(apiMock.post).toHaveBeenLastCalledWith("/api/posts/p1/share", { channel: "copy_link" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { post: { id: "r1" } } } });
    await expect(repostPost("p1", { mode: "repost" })).resolves.toEqual({ id: "r1" });

    apiMock.put.mockResolvedValueOnce({ data: { data: { post: { id: "u2" } } } });
    await expect(updatePost("p1", { content: "Updated" })).resolves.toEqual({ id: "u2" });

    apiMock.delete.mockResolvedValueOnce({ data: { ok: true } });
    await expect(deletePost("p1")).resolves.toEqual({ ok: true });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(likePost("p1")).resolves.toEqual({ ok: true });
    expect(apiMock.post).toHaveBeenLastCalledWith("/api/posts/p1/like", { reactionType: "like" });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(unlikePost("p1")).resolves.toEqual({ ok: true });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "pl1" }] } });
    await expect(getPostLikes("p1")).resolves.toEqual([{ id: "pl1" }]);

    apiMock.post.mockResolvedValueOnce({ data: { data: { comment: { id: "c1" } } } });
    await expect(addComment("p1", { content: "Nice" })).resolves.toEqual({ id: "c1" });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "pc1" }] } });
    await expect(getPostComments("p1")).resolves.toEqual([{ id: "pc1" }]);

    apiMock.put.mockResolvedValueOnce({ data: { data: { comment: { id: "uc1" } } } });
    await expect(updateComment("c1", "Edited")).resolves.toEqual({ id: "uc1" });

    apiMock.delete.mockResolvedValueOnce({ data: { ok: true } });
    await expect(deleteComment("c1")).resolves.toEqual({ ok: true });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "r1" }] } });
    await expect(getCommentReplies("c1")).resolves.toEqual([{ id: "r1" }]);

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(likeComment("c1")).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(unlikeComment("c1")).resolves.toEqual({ ok: true });
});

test("post service errors prefer response messages", async () => {
    const error = { response: { data: { message: "Post error" }, status: 500 } };

    const getCalls = [
        () => getExploreFeed(),
        () => getTrendingPosts(),
        () => searchPosts("alpha"),
        () => getHashtagPosts("news"),
        () => getPostById("p1"),
        () => getUserPosts("u1"),
        () => getUserFeed(),
        () => getLikedPosts(),
        () => getBookmarkedPosts(),
        () => getPostLikes("p1"),
        () => getPostComments("p1"),
        () => getCommentReplies("c1"),
    ];
    getCalls.forEach(() => apiMock.get.mockRejectedValueOnce(error));
    for (const call of getCalls) {
        await expect(call()).rejects.toEqual({ message: "Post error", status: 500 });
    }

    const postCalls = [
        () => createPost({ content: "Hello" }),
        () => savePost("p1"),
        () => sharePost("p1"),
        () => repostPost("p1", {}),
        () => likePost("p1"),
        () => addComment("p1", { content: "Nice" }),
        () => likeComment("c1"),
    ];
    postCalls.forEach(() => apiMock.post.mockRejectedValueOnce(error));
    for (const call of postCalls) {
        await expect(call()).rejects.toEqual({ message: "Post error", status: 500 });
    }

    const putCalls = [
        () => updatePost("p1", { content: "Updated" }),
        () => updateComment("c1", "Edited"),
    ];
    putCalls.forEach(() => apiMock.put.mockRejectedValueOnce(error));
    for (const call of putCalls) {
        await expect(call()).rejects.toEqual({ message: "Post error", status: 500 });
    }

    const deleteCalls = [
        () => unsavePost("p1"),
        () => deletePost("p1"),
        () => unlikePost("p1"),
        () => deleteComment("c1"),
        () => unlikeComment("c1"),
    ];
    deleteCalls.forEach(() => apiMock.delete.mockRejectedValueOnce(error));
    for (const call of deleteCalls) {
        await expect(call()).rejects.toEqual({ message: "Post error", status: 500 });
    }
});

test("post service errors fall back to defaults", async () => {
    const getCases = [
        { fn: () => getExploreFeed(), message: "Failed to load explore feed" },
        { fn: () => getTrendingPosts(), message: "Failed to load trending posts" },
        { fn: () => searchPosts("alpha"), message: "Search failed" },
        { fn: () => getHashtagPosts("news"), message: "Failed to load hashtag posts" },
        { fn: () => getPostById("p1"), message: "Failed to load post" },
        { fn: () => getUserPosts("u1"), message: "Failed to load user posts" },
        { fn: () => getUserFeed(), message: "Failed to load feed" },
        { fn: () => getLikedPosts(), message: "Failed to load liked posts" },
        { fn: () => getBookmarkedPosts(), message: "Failed to load bookmarked posts" },
        { fn: () => getPostLikes("p1"), message: "Failed to load likes" },
        { fn: () => getPostComments("p1"), message: "Failed to load comments" },
        { fn: () => getCommentReplies("c1"), message: "Failed to load replies" },
    ];
    getCases.forEach(() => apiMock.get.mockRejectedValueOnce({}));
    for (const { fn, message } of getCases) {
        await expect(fn()).rejects.toEqual({ message, status: undefined });
    }

    const postCases = [
        { fn: () => createPost({ content: "Hello" }), message: "Failed to create post" },
        { fn: () => savePost("p1"), message: "Failed to save post" },
        { fn: () => sharePost("p1"), message: "Failed to share post" },
        { fn: () => repostPost("p1", {}), message: "Failed to repost" },
        { fn: () => likePost("p1"), message: "Failed to like post" },
        { fn: () => addComment("p1", { content: "Nice" }), message: "Failed to add comment" },
        { fn: () => likeComment("c1"), message: "Failed to like comment" },
    ];
    postCases.forEach(() => apiMock.post.mockRejectedValueOnce({}));
    for (const { fn, message } of postCases) {
        await expect(fn()).rejects.toEqual({ message, status: undefined });
    }

    const putCases = [
        { fn: () => updatePost("p1", { content: "Updated" }), message: "Failed to update post" },
        { fn: () => updateComment("c1", "Edited"), message: "Failed to update comment" },
    ];
    putCases.forEach(() => apiMock.put.mockRejectedValueOnce({}));
    for (const { fn, message } of putCases) {
        await expect(fn()).rejects.toEqual({ message, status: undefined });
    }

    const deleteCases = [
        { fn: () => unsavePost("p1"), message: "Failed to remove saved post" },
        { fn: () => deletePost("p1"), message: "Failed to delete post" },
        { fn: () => unlikePost("p1"), message: "Failed to unlike post" },
        { fn: () => deleteComment("c1"), message: "Failed to delete comment" },
        { fn: () => unlikeComment("c1"), message: "Failed to unlike comment" },
    ];
    deleteCases.forEach(() => apiMock.delete.mockRejectedValueOnce({}));
    for (const { fn, message } of deleteCases) {
        await expect(fn()).rejects.toEqual({ message, status: undefined });
    }
});
