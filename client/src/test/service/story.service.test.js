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
    createStory,
    deleteStory,
    getStoryById,
    getStoryFeed,
    getUserStories,
    markStoryViewed,
    reactToStory,
} from "../../service/story.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("story service returns payload variants", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "s1" }] } });
    await expect(getStoryFeed()).resolves.toEqual([{ id: "s1" }]);

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "s2" }] });
    await expect(getStoryFeed()).resolves.toEqual([{ id: "s2" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "u1" }] } });
    await expect(getUserStories("user-1")).resolves.toEqual([{ id: "u1" }]);

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "u2" }] });
    await expect(getUserStories("user-2")).resolves.toEqual([{ id: "u2" }]);

    apiMock.get.mockResolvedValueOnce({ data: { data: { story: { id: "s3" } } } });
    await expect(getStoryById("s3")).resolves.toEqual({ id: "s3" });

    apiMock.get.mockResolvedValueOnce({ data: { data: { id: "s4" } } });
    await expect(getStoryById("s4")).resolves.toEqual({ id: "s4" });

    apiMock.get.mockResolvedValueOnce({ data: { id: "s5" } });
    await expect(getStoryById("s5")).resolves.toEqual({ id: "s5" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { story: { id: "s6" } } } });
    await expect(createStory({ content: "hello" })).resolves.toEqual({ id: "s6" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "s7" } } });
    await expect(createStory({ content: "world" })).resolves.toEqual({ id: "s7" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { story: { id: "s8" } } } });
    await expect(markStoryViewed("s8")).resolves.toEqual({ id: "s8" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "s9" } } });
    await expect(markStoryViewed("s9")).resolves.toEqual({ id: "s9" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { story: { id: "s10" } } } });
    await expect(reactToStory("s10", "🔥")).resolves.toEqual({ id: "s10" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "s11" } } });
    await expect(reactToStory("s11", "💫")).resolves.toEqual({ id: "s11" });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(deleteStory("s12")).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { ok: false } });
    await expect(deleteStory("s13")).resolves.toEqual({ ok: false });
});

test("story service errors prefer response messages", async () => {
    const error = { response: { data: { message: "Story error" }, status: 500 } };

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getStoryFeed()).rejects.toEqual({ message: "Story error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getUserStories("user-1")).rejects.toEqual({ message: "Story error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getStoryById("s1")).rejects.toEqual({ message: "Story error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(createStory({})).rejects.toEqual({ message: "Story error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(markStoryViewed("s1")).rejects.toEqual({ message: "Story error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(reactToStory("s1", "🔥")).rejects.toEqual({ message: "Story error", status: 500 });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(deleteStory("s1")).rejects.toEqual({ message: "Story error", status: 500 });
});

test("story service errors fall back to defaults", async () => {
    apiMock.get.mockRejectedValueOnce({});
    await expect(getStoryFeed()).rejects.toEqual({ message: "Failed to load stories", status: undefined });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getUserStories("user-1")).rejects.toEqual({
        message: "Failed to load user stories",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getStoryById("s1")).rejects.toEqual({
        message: "Failed to load story details",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(createStory({})).rejects.toEqual({ message: "Failed to create story", status: undefined });

    apiMock.post.mockRejectedValueOnce({});
    await expect(markStoryViewed("s1")).rejects.toEqual({
        message: "Failed to mark story as viewed",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(reactToStory("s1", "🔥")).rejects.toEqual({
        message: "Failed to react to story",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(deleteStory("s1")).rejects.toEqual({ message: "Failed to delete story", status: undefined });
});
