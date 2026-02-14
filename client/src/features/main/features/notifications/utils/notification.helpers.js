export const toIdString = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object" && value._id) return toIdString(value._id);
    if (typeof value === "object" && value.id) return toIdString(value.id);
    if (typeof value?.toString === "function") {
        const normalized = value.toString();
        return normalized && normalized !== "[object Object]" ? normalized : "";
    }
    return "";
};

export const formatRelativeTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString();
};

const normalizePath = (path) => {
    const value = String(path || "").trim();
    if (!value) return "/main";
    if (value.startsWith("http://") || value.startsWith("https://")) return "/main";
    return value.startsWith("/") ? value : `/${value}`;
};

const FOLLOW_KINDS = new Set([
    "follow_request",
    "followed_you",
    "follow_request_accepted",
    "follow_request_rejected",
    "follow_request_cancelled"
]);

export const resolveNotificationPath = (notification) => {
    const metadata = notification?.metadata || {};
    const kind = String(metadata?.kind || "").toLowerCase();
    const actorId = toIdString(metadata?.actorId || notification?.actor?._id);
    const entityType = String(notification?.entityType || "").toLowerCase();
    const entityId = toIdString(notification?.entityId);
    const postId = toIdString(metadata?.postId);

    if (postId) {
        return `/post/${postId}`;
    }

    if (FOLLOW_KINDS.has(kind)) {
        const targetId = actorId || entityId;
        if (targetId) return `/profile/${targetId}`;
    }

    if (entityType === "user" && entityId) {
        return `/profile/${entityId}`;
    }

    const fallbackLink = normalizePath(notification?.link);
    return fallbackLink || "/main";
};
