import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
    buildCommentTree,
    formatDateTime,
    formatRelativeTime,
    normalizeErrorMessage,
    toIdString,
} from "../../../../../../features/main/features/support/utils/support.helpers.js";

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));
});

afterEach(() => {
    vi.useRealTimers();
});

test("support helpers normalize identifiers and error messages", () => {
    expect(toIdString({ _id: "mongo-id" })).toBe("mongo-id");
    expect(toIdString({ id: "plain-id" })).toBe("plain-id");
    expect(toIdString(42)).toBe("42");
    expect(toIdString(null)).toBe("");

    expect(
        normalizeErrorMessage(
            {
                response: {
                    data: {
                        errors: [{ field: "email", message: "is invalid" }],
                    },
                },
            },
            "fallback"
        )
    ).toBe("email: is invalid");

    expect(
        normalizeErrorMessage(
            {
                response: {
                    data: {
                        errors: [{ message: "Body is required" }],
                    },
                },
            },
            "fallback"
        )
    ).toBe("Body is required");

    expect(
        normalizeErrorMessage(
            { response: { data: { message: "API said no" } } },
            "fallback"
        )
    ).toBe("API said no");

    expect(normalizeErrorMessage(new Error("Network down"), "fallback")).toBe(
        "Network down"
    );
    expect(normalizeErrorMessage({}, "fallback")).toBe("fallback");
});

test("support date helpers guard invalid values and format relative dates", () => {
    expect(formatRelativeTime("")).toBe("");
    expect(formatRelativeTime("invalid")).toBe("");
    expect(formatRelativeTime("2026-03-16T11:59:45.000Z")).toBe("just now");
    expect(formatRelativeTime("2026-03-16T11:20:00.000Z")).toBe("40m ago");
    expect(formatRelativeTime("2026-03-16T08:00:00.000Z")).toBe("4h ago");
    expect(formatRelativeTime("2026-03-10T12:00:00.000Z")).toBe("6d ago");

    const olderDate = "2026-03-01T12:00:00.000Z";
    expect(formatRelativeTime(olderDate)).toBe(
        new Date(olderDate).toLocaleDateString()
    );

    expect(formatDateTime("")).toBe("");
    expect(formatDateTime("bad-date")).toBe("");

    const value = "2026-03-16T10:15:00.000Z";
    expect(formatDateTime(value)).toBe(
        new Date(value).toLocaleString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        })
    );
});

test("buildCommentTree sorts roots, nests replies, and treats unknown parents as root items", () => {
    const tree = buildCommentTree([
        {
            _id: "reply-1",
            parentCommentId: "root-1",
            createdAt: "2026-03-16T12:03:00.000Z",
        },
        {
            _id: "root-2",
            createdAt: "2026-03-16T12:02:00.000Z",
        },
        {
            _id: "orphan",
            parentCommentId: "missing-parent",
            createdAt: "2026-03-16T12:00:00.000Z",
        },
        {
            _id: "root-1",
            createdAt: "2026-03-16T12:01:00.000Z",
        },
        {
            _id: "reply-2",
            parentCommentId: "reply-1",
            createdAt: "2026-03-16T12:04:00.000Z",
        },
    ]);

    expect(tree.map((node) => node._id)).toEqual(["orphan", "root-1", "root-2"]);
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children).toEqual([]);
    expect(tree[1].children).toHaveLength(1);
    expect(tree[1].children[0]).toMatchObject({
        _id: "reply-1",
        depth: 1,
    });
    expect(tree[1].children[0].children[0]).toMatchObject({
        _id: "reply-2",
        depth: 2,
    });
    expect(buildCommentTree(null)).toEqual([]);
});