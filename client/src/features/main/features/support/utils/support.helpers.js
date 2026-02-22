export const toIdString = (value) => String(value?._id || value?.id || value || "");

export const normalizeErrorMessage = (error, fallback) => {
    const responseData = error?.response?.data || {};
    const validationErrors = Array.isArray(responseData?.errors)
        ? responseData.errors
        : [];

    if (validationErrors.length > 0) {
        const firstError = validationErrors[0] || {};
        const field = String(firstError?.field || "").trim();
        const message = String(firstError?.message || "").trim();

        if (field && message) {
            return `${field}: ${message}`;
        }
        if (message) {
            return message;
        }
    }

    return responseData?.message || error?.message || fallback;
};

export const formatRelativeTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
};

export const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
};

export const buildCommentTree = (comments = []) => {
    const normalizedComments = Array.isArray(comments) ? comments : [];
    const commentIds = new Set(
        normalizedComments.map((comment) => toIdString(comment?._id))
    );

    const parentMap = new Map();
    normalizedComments
        .slice()
        .sort((a, b) => new Date(a?.createdAt).getTime() - new Date(b?.createdAt).getTime())
        .forEach((comment) => {
            const parentId = toIdString(comment?.parentCommentId);
            const key = parentId && commentIds.has(parentId) ? parentId : "root";
            if (!parentMap.has(key)) {
                parentMap.set(key, []);
            }
            parentMap.get(key).push(comment);
        });

    const build = (parentId = "root", depth = 0) =>
        (parentMap.get(parentId) || []).map((comment) => ({
            ...comment,
            depth,
            children: build(toIdString(comment?._id), depth + 1)
        }));

    return build("root", 0);
};
