import api from "../config/axios";

const BASE = "/api/activity";

export const getMyActivities = async (params = {}) => {
    const response = await api.get(`${BASE}/me`, { params });
    const payload = response.data?.data || response.data || {};

    return {
        activities: Array.isArray(payload?.activities) ? payload.activities : [],
        pagination: payload?.pagination || {
            page: 1,
            limit: 25,
            total: 0,
            totalPages: 0,
            hasMore: false
        }
    };
};

export const getActivityDashboard = async (params = {}) => {
    const response = await api.get(`${BASE}/dashboard`, { params });
    const payload = response.data?.data || response.data || {};

    return {
        likes: {
            count: Number(payload?.likes?.count || 0),
            items: Array.isArray(payload?.likes?.items) ? payload.likes.items : []
        },
        comments: {
            count: Number(payload?.comments?.count || 0),
            items: Array.isArray(payload?.comments?.items) ? payload.comments.items : []
        },
        reposts: {
            count: Number(payload?.reposts?.count || 0),
            items: Array.isArray(payload?.reposts?.items) ? payload.reposts.items : []
        },
        timeSpent: payload?.timeSpent || null,
        accountHistory: payload?.accountHistory || { summary: null, events: [] }
    };
};
