export const MOBILE_BREAKPOINT = 1024;
export const PAGE_SIZE = 12;

export const DEFAULT_PAGINATION = {
    page: 1,
    pages: 1,
    total: 0,
    hasMore: false
};

export const FEED_TABS = [
    {
        id: "following",
        label: "Following",
        description: "People and teams you follow"
    },
    {
        id: "explore",
        label: "Explore",
        description: "Discover public posts"
    },
    {
        id: "bookmarks",
        label: "Saved",
        description: "Your bookmarked posts"
    }
];

export const SORT_OPTIONS = [
    { id: "latest", label: "Latest" },
    { id: "popular", label: "Popular" }
];
