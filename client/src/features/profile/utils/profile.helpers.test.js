import { test, expect } from "vitest";

import {
    FOLLOW_LIST_PAGE_SIZE,
    getFollowButtonState,
    getJoinedLabel,
    mergeConnections,
    normalizeConnection,
    normalizePagination,
    toId,
} from "./profile.helpers.js";

test("toId normalizes nested and object ids", () => {
    expect(toId("abc123")).toBe("abc123");
    expect(toId(42)).toBe("42");
    expect(toId({ _id: { toHexString: () => "mongo-id" } })).toBe("mongo-id");
    expect(toId({ id: "plain-id" })).toBe("plain-id");
    expect(toId({ toString: () => "custom-id" })).toBe("custom-id");
    expect(toId({})).toBe("");
});

test("normalizePagination falls back for invalid values", () => {
    expect(normalizePagination({
        page: "oops",
        limit: undefined,
        total: "12",
        pages: null,
        hasMore: 1,
    })).toEqual({
        page: 1,
        limit: FOLLOW_LIST_PAGE_SIZE,
        total: 12,
        pages: 1,
        hasMore: true,
    });
});

test("normalizeConnection coerces counts and ids safely", () => {
    expect(normalizeConnection({
        _id: { toHexString: () => "user-1" },
        username: "aurora",
        followersCount: "9",
        followingCount: "bad",
        isPending: 1,
        requestId: { id: "req-1" },
    })).toEqual({
        _id: "user-1",
        name: "aurora",
        username: "aurora",
        avatar: "",
        isVerified: false,
        followersCount: 9,
        followingCount: 0,
        isFollowing: false,
        isPending: true,
        isFollowedBy: false,
        blockedByMe: false,
        blockedMe: false,
        requestId: "req-1",
    });
});

test("mergeConnections updates existing entries and ignores empty ids", () => {
    expect(mergeConnections(
        [{ _id: "user-1", name: "Old Name", isFollowing: false }],
        [{ _id: "user-1", name: "New Name", isFollowing: true }, { name: "Missing Id" }],
    )).toEqual([{ _id: "user-1", name: "New Name", isFollowing: true }]);
});

test("getFollowButtonState resolves priority correctly", () => {
    expect(getFollowButtonState({ isFollowing: true, isPending: true })).toEqual({
        label: "Following",
        tone: "following",
    });
    expect(getFollowButtonState({ isPending: true })).toEqual({
        label: "Requested",
        tone: "pending",
    });
    expect(getFollowButtonState({ isFollowedBy: true })).toEqual({
        label: "Follow back",
        tone: "default",
    });
    expect(getFollowButtonState({})).toEqual({
        label: "Follow",
        tone: "default",
    });
});

test("getJoinedLabel returns empty string for invalid date input", () => {
    expect(getJoinedLabel("not-a-date")).toBe("");
    expect(getJoinedLabel("2026-03-09T10:00:00.000Z")).toMatch(/2026/);
});
