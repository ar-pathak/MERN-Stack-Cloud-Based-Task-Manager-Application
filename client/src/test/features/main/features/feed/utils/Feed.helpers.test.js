import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
    extractTopHashtags,
    formatRelativeTime,
    getInitial,
    getStoryStats,
    mergeUniquePosts,
    normalizePagination,
    postMatchesQuery,
    scorePost,
} from "../../../../../../features/main/features/feed/utils/feed.helpers.js";

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));
});

afterEach(() => {
    vi.useRealTimers();
});

test("normalizePagination uses explicit values and falls back when fields are missing", () => {
    expect(
        normalizePagination({ page: "2", pages: "5", total: "9", hasMore: false }, 4, 12)
    ).toEqual({
        page: 2,
        pages: 5,
        total: 9,
        hasMore: false,
    });

    expect(normalizePagination({}, 3, 7)).toEqual({
        page: 3,
        pages: 1,
        total: 7,
        hasMore: false,
    });
});

test("feed helpers merge posts, score engagement, and resolve initials", () => {
    expect(
        mergeUniquePosts([
            { _id: "p1", title: "first" },
            { _id: "p2", title: "second" },
            { _id: "p1", title: "updated" },
            { title: "ignored" },
        ])
    ).toEqual([
        { _id: "p1", title: "updated" },
        { _id: "p2", title: "second" },
    ]);

    expect(
        scorePost({
            likesCount: 10,
            commentsCount: 4,
            repostsCount: 2,
            sharesCount: 3,
            viewsCount: 101,
        })
    ).toBe(35);

    expect(getInitial({ name: "aurora" })).toBe("A");
    expect(getInitial({ username: "nebula" })).toBe("N");
    expect(getInitial(null)).toBe("U");
});

test("formatRelativeTime returns compact feed timestamps", () => {
    expect(formatRelativeTime("")).toBe("");
    expect(formatRelativeTime("2026-03-16T11:59:50.000Z")).toBe("now");
    expect(formatRelativeTime("2026-03-16T11:15:00.000Z")).toBe("45m");
    expect(formatRelativeTime("2026-03-16T09:00:00.000Z")).toBe("3h");
    expect(formatRelativeTime("2026-03-12T12:00:00.000Z")).toBe("4d");

    const olderDate = "2026-03-01T12:00:00.000Z";
    expect(formatRelativeTime(olderDate)).toBe(
        new Date(olderDate).toLocaleDateString()
    );
});

test("postMatchesQuery checks author, content, hashtags, and empty queries", () => {
    const post = {
        author: { name: "Arjun Pathak", username: "arjun_dev" },
        content: "Shipping the collaboration dashboard today",
        hashtags: ["Launch", "ProductOps"],
    };

    expect(postMatchesQuery(post, "")).toBe(true);
    expect(postMatchesQuery(post, "arjun")).toBe(true);
    expect(postMatchesQuery(post, "dashboard")).toBe(true);
    expect(postMatchesQuery(post, "productops")).toBe(true);
    expect(postMatchesQuery(post, "finance")).toBe(false);
});

test("feed helpers summarize hashtags and story counts", () => {
    expect(
        extractTopHashtags([
            { hashtags: [" Launch ", "alpha"] },
            { hashtags: ["launch", "beta"] },
            { hashtags: ["launch", "beta", "gamma"] },
            { hashtags: ["delta", "", "epsilon"] },
            { hashtags: ["zeta", "eta", "theta", "iota"] },
        ])
    ).toEqual([
        ["launch", 3],
        ["beta", 2],
        ["alpha", 1],
        ["gamma", 1],
        ["delta", 1],
        ["epsilon", 1],
        ["zeta", 1],
    ]);

    expect(
        getStoryStats([
            {
                stories: [{ id: "s1" }, { id: "s2" }],
                unseenCount: 1,
            },
            {
                stories: [{ id: "s3" }],
                unseenCount: 4,
            },
            {
                unseenCount: 0,
            },
        ])
    ).toEqual({
        totalStories: 3,
        unseen: 5,
    });
});