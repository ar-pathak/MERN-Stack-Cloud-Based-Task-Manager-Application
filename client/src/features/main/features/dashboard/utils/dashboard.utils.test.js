import { test, expect } from "vitest";

import { DRAFT_STORAGE_KEY } from "../constants/dashboard.constants.js";
import {
    formatDateTime,
    formatNumber,
    formatPercent,
    isPostWithinDateFilter,
    readLocalDrafts,
    toInteractionEntry,
    toLocalInputDateTime,
    toNumber,
} from "./dashboard.utils.js";

test("toNumber, formatNumber and formatPercent handle invalid input", () => {
    expect(toNumber("15.5")).toBe(15.5);
    expect(toNumber("bad", 8)).toBe(8);
    expect(formatNumber("12000")).toBe("12,000");
    expect(formatPercent("bad")).toBe("0.00%");
});

test("formatDateTime and toLocalInputDateTime guard invalid dates", () => {
    expect(formatDateTime("bad-date")).toBe("");
    expect(toLocalInputDateTime("bad-date")).toBe("");
    expect(toLocalInputDateTime("2026-03-09T10:15:00.000Z")).toMatch(/^2026-03-09T/);
});

test("formatDateTime formats valid dates", () => {
    expect(formatDateTime("2026-03-09T10:15:00.000Z")).toMatch(/2026/);
});

test("toLocalInputDateTime falls back to a future timestamp when value is missing", () => {
    expect(toLocalInputDateTime()).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
});

test("readLocalDrafts tolerates missing window and malformed storage", () => {
    expect(readLocalDrafts()).toEqual([]);

    window.localStorage.setItem(DRAFT_STORAGE_KEY, "{");
    expect(readLocalDrafts()).toEqual([]);

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify([{ id: 1 }]));
    expect(readLocalDrafts()).toEqual([{ id: 1 }]);
});

test("readLocalDrafts returns empty when storage is not an array", () => {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ id: 1 }));

    expect(readLocalDrafts()).toEqual([]);
});

test("readLocalDrafts returns empty when window is unavailable", () => {
    const originalWindow = globalThis.window;

    globalThis.window = undefined;
    expect(readLocalDrafts()).toEqual([]);

    globalThis.window = originalWindow;
});

test("isPostWithinDateFilter applies supported windows", () => {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    const fortyDaysAgo = new Date(now);
    fortyDaysAgo.setDate(now.getDate() - 40);

    expect(isPostWithinDateFilter(threeDaysAgo.toISOString(), "all")).toBe(true);
    expect(isPostWithinDateFilter(threeDaysAgo.toISOString(), "last7")).toBe(true);
    expect(isPostWithinDateFilter(fortyDaysAgo.toISOString(), "last30")).toBe(false);
    expect(isPostWithinDateFilter("bad", "today")).toBe(false);
});

test("isPostWithinDateFilter handles today filtering", () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    expect(isPostWithinDateFilter(now.toISOString(), "today")).toBe(true);
    expect(isPostWithinDateFilter(yesterday.toISOString(), "today")).toBe(false);
});

test("isPostWithinDateFilter accepts dates within the last 30 days", () => {
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);

    expect(isPostWithinDateFilter(tenDaysAgo.toISOString(), "last30")).toBe(true);
});

test("isPostWithinDateFilter defaults to today threshold for unknown filters", () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    expect(isPostWithinDateFilter(now.toISOString(), "unknown")).toBe(true);
    expect(isPostWithinDateFilter(yesterday.toISOString(), "unknown")).toBe(false);
});

test("toInteractionEntry builds useful fallbacks", () => {
    const entry = toInteractionEntry({
        _id: "notif-1",
        metadata: { kind: "post_comment", postId: 9 },
        actor: { username: "aurora" },
        title: "Comment",
    });

    expect(entry).toEqual({
        id: "notif-1",
        kind: "post_comment",
        postId: "9",
        actorName: "aurora",
        title: "Comment",
        message: "aurora commented on your post",
        createdAt: entry.createdAt,
    });
    expect(entry.createdAt).toBeTruthy();
});

test("toInteractionEntry falls back to default labels and ids", () => {
    const entry = toInteractionEntry({});

    expect(entry.actorName).toBe("Someone");
    expect(entry.message).toBe("Someone interacted with your post");
    expect(entry.postId).toBe("");
    expect(entry.title).toBe("New interaction");
    expect(entry.id).toEqual(expect.any(String));
});
