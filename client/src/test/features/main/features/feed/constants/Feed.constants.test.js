import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGINATION,
  FEED_TABS,
  MOBILE_BREAKPOINT,
  PAGE_SIZE,
  SORT_OPTIONS,
} from "../../../../../../features/main/features/feed/constants/feed.constants";

describe("feed constants", () => {
  it("defines the base feed layout values", () => {
    expect(MOBILE_BREAKPOINT).toBe(1024);
    expect(PAGE_SIZE).toBe(12);
    expect(DEFAULT_PAGINATION).toEqual({
      page: 1,
      pages: 1,
      total: 0,
      hasMore: false,
    });
  });

  it("defines the available feed tabs", () => {
    expect(FEED_TABS).toEqual([
      {
        id: "following",
        label: "Following",
        description: "People and teams you follow",
      },
      {
        id: "explore",
        label: "Explore",
        description: "Discover public posts",
      },
      {
        id: "bookmarks",
        label: "Saved",
        description: "Your bookmarked posts",
      },
    ]);
  });

  it("defines the available sort options", () => {
    expect(SORT_OPTIONS).toEqual([
      { id: "latest", label: "Latest" },
      { id: "popular", label: "Popular" },
    ]);
  });
});

