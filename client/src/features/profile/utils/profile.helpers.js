export const MOBILE_BREAKPOINT = 768;
export const POSTS_PAGE_SIZE = 15;
export const FOLLOW_LIST_PAGE_SIZE = 20;

export const PROFILE_TABS = [
    { id: "posts", label: "Posts" },
    { id: "media", label: "Media" },
    { id: "about", label: "About" },
    { id: "connections", label: "Connections" }
];

export const toId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object" && value._id && value._id !== value) return toId(value._id);
    if (typeof value === "object" && typeof value.id === "string") return value.id;
    if (typeof value?.toHexString === "function") return value.toHexString();
    if (typeof value?.toString === "function") {
        const normalized = value.toString();
        return normalized && normalized !== "[object Object]" ? normalized : "";
    }
    return "";
};

export const toDisplayName = (value) => value?.name || value?.username || "User";

export const normalizePagination = (value = {}, fallbackPage = 1, fallbackLimit = FOLLOW_LIST_PAGE_SIZE) => ({
    page: Number(value?.page || fallbackPage),
    limit: Number(value?.limit || fallbackLimit),
    total: Number(value?.total || 0),
    pages: Number(value?.pages || 1),
    hasMore: Boolean(value?.hasMore)
});

export const normalizeConnection = (entry = {}) => ({
    _id: toId(entry),
    name: entry?.name || entry?.username || "User",
    username: entry?.username || "",
    avatar: entry?.avatar || "",
    isVerified: Boolean(entry?.isVerified),
    followersCount: Number(entry?.followersCount || 0),
    followingCount: Number(entry?.followingCount || 0),
    isFollowing: Boolean(entry?.isFollowing),
    isPending: Boolean(entry?.isPending),
    isFollowedBy: Boolean(entry?.isFollowedBy),
    blockedByMe: Boolean(entry?.blockedByMe),
    blockedMe: Boolean(entry?.blockedMe),
    requestId: entry?.requestId ? toId(entry.requestId) : ""
});

export const mergeConnections = (previous = [], incoming = []) => {
    const map = new Map(previous.map((entry) => [toId(entry), entry]));
    incoming.forEach((entry) => {
        const key = toId(entry);
        if (!key) return;
        map.set(key, { ...(map.get(key) || {}), ...entry });
    });
    return Array.from(map.values());
};

export const getFollowButtonState = (relationship = {}) => {
    if (relationship?.isFollowing) return { label: "Following", tone: "following" };
    if (relationship?.isPending) return { label: "Requested", tone: "pending" };
    if (relationship?.isFollowedBy) return { label: "Follow back", tone: "default" };
    return { label: "Follow", tone: "default" };
};

export const getJoinedLabel = (value) => {
    if (!value) return "";
    try {
        return new Date(value).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short"
        });
    } catch {
        return "";
    }
};
