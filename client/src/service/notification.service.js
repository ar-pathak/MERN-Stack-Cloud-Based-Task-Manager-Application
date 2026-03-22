import api from "../config/axios";

const BASE = "/api/notifications";
// 🔥 NEW: Cache for Notifications
const pendingNotifReqs = new Map();

export const getNotifications = async (params = {}) => {
    const cacheKey = `notifs_${JSON.stringify(params)}`;

    if (pendingNotifReqs.has(cacheKey)) {
        return pendingNotifReqs.get(cacheKey);
    }

    const requestPromise = api.get("/api/notifications", { params })
        .then(response => response.data?.data || response.data || { notifications: [], unreadCount: 0 })
        .finally(() => {
            // 🔥 2-Second Cooldown Lock
            setTimeout(() => pendingNotifReqs.delete(cacheKey), 2000);
        });

    pendingNotifReqs.set(cacheKey, requestPromise);
    return requestPromise;
};

export const getUnreadNotificationCount = async () => {
    const response = await api.get(`${BASE}/unread-count`);
    const payload = response.data?.data || response.data || {};
    return Number(payload.count || 0);
};

export const markNotificationRead = async (notificationId) => {
    const response = await api.patch(`${BASE}/${notificationId}/read`);
    return response.data?.data || response.data;
};

export const markNotificationUnread = async (notificationId) => {
    const response = await api.patch(`${BASE}/${notificationId}/unread`);
    return response.data?.data || response.data;
};

export const markAllNotificationsRead = async (filters = {}) => {
    const response = await api.patch(`${BASE}/read-all`, filters);
    return response.data?.data || response.data;
};

export const deleteNotification = async (notificationId) => {
    const response = await api.delete(`${BASE}/${notificationId}`);
    return response.data?.data || response.data;
};

export const bulkNotificationAction = async (action, notificationIds) => {
    const response = await api.post(`${BASE}/bulk`, { action, notificationIds });
    return response.data?.data || response.data;
};
