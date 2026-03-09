import { DRAFT_STORAGE_KEY } from "../constants/dashboard.constants.js";

export const toNumber = (value, fallback = 0) => {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
};

export const formatNumber = (value) => toNumber(value).toLocaleString();

export const formatPercent = (value) => `${toNumber(value).toFixed(2)}%`;

export const formatDateTime = (value) => {
    const dateValue = new Date(value);
    return Number.isNaN(dateValue.getTime()) ? "" : dateValue.toLocaleString();
};

export const toLocalInputDateTime = (value) => {
    const dateValue = new Date(value || Date.now() + 30 * 60 * 1000);
    if (Number.isNaN(dateValue.getTime())) return "";
    const pad = (numberValue) => String(numberValue).padStart(2, "0");
    return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())}T${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}`;
};

export const readLocalDrafts = () => {
    if (typeof window === "undefined") return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const startOfToday = () => {
    const dateValue = new Date();
    dateValue.setHours(0, 0, 0, 0);
    return dateValue;
};

export const isPostWithinDateFilter = (value, dateFilter = "all") => {
    if (dateFilter === "all") return true;

    const createdAt = new Date(value);
    if (Number.isNaN(createdAt.getTime())) return false;

    const today = startOfToday();
    if (dateFilter === "today") return createdAt >= today;

    const threshold = new Date(today);
    if (dateFilter === "last7") threshold.setDate(threshold.getDate() - 6);
    else if (dateFilter === "last30") threshold.setDate(threshold.getDate() - 29);

    return createdAt >= threshold;
};

const interactionKindLabelMap = {
    post_like: "liked your post",
    post_comment: "commented on your post",
    post_share: "shared your post",
    comment_reply: "replied to your comment"
};

export const toInteractionEntry = (notification) => {
    const kind = String(notification?.metadata?.kind || "");
    const actorName = notification?.actor?.name || notification?.actor?.username || "Someone";
    const fallbackMessage = `${actorName} ${interactionKindLabelMap[kind] || "interacted with your post"}`;

    return {
        id: String(notification?._id || `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`),
        kind,
        postId: String(notification?.metadata?.postId || ""),
        actorName,
        title: String(notification?.title || "New interaction"),
        message: String(notification?.message || fallbackMessage),
        createdAt: notification?.createdAt || new Date().toISOString()
    };
};
