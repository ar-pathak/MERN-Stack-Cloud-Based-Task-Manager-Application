import api from "../config/axios";

const BASE = "/api/notifications";

export const getNotifications = async (params = {}) => {
    const response = await api.get(BASE, { params });
    return response.data?.data || response.data || { notifications: [], unreadCount: 0 };
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
