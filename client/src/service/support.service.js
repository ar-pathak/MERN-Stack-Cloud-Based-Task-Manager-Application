import api from "../config/axios";

const BASE = "/api/support";

const normalizePagination = (pagination = {}) => ({
    page: Number(pagination?.page || 1),
    limit: Number(pagination?.limit || 20),
    total: Number(pagination?.total || 0),
    totalPages: Number(pagination?.totalPages || 0),
    hasMore: Boolean(pagination?.hasMore)
});

export const getSupportArticles = async (params = {}) => {
    const response = await api.get(`${BASE}/articles`, { params });
    const payload = response.data?.data || response.data || {};

    return {
        articles: Array.isArray(payload?.articles) ? payload.articles : [],
        categories: Array.isArray(payload?.categories) ? payload.categories : [],
        pagination: normalizePagination(payload?.pagination)
    };
};

export const getSupportArticle = async (slug) => {
    const response = await api.get(`${BASE}/articles/${slug}`);
    const payload = response.data?.data || response.data || {};

    return {
        article: payload?.article || null,
        related: Array.isArray(payload?.related) ? payload.related : []
    };
};

export const getSupportFaqs = async (params = {}) => {
    const response = await api.get(`${BASE}/faqs`, { params });
    const payload = response.data?.data || response.data || {};

    return {
        faqs: Array.isArray(payload?.faqs) ? payload.faqs : [],
        categories: Array.isArray(payload?.categories) ? payload.categories : []
    };
};

export const createSupportTicket = async (ticketData) => {
    const response = await api.post(`${BASE}/tickets`, ticketData);
    return response.data?.data || response.data || null;
};

export const getSupportTickets = async (params = {}) => {
    const response = await api.get(`${BASE}/tickets`, { params });
    const payload = response.data?.data || response.data || {};

    return {
        tickets: Array.isArray(payload?.tickets) ? payload.tickets : [],
        statuses: Array.isArray(payload?.statuses) ? payload.statuses : [],
        pagination: normalizePagination(payload?.pagination)
    };
};

export const getSupportTicketById = async (ticketId) => {
    const response = await api.get(`${BASE}/tickets/${ticketId}`);
    return response.data?.data || response.data || null;
};

export const addSupportTicketComment = async (ticketId, payload) => {
    const response = await api.post(`${BASE}/tickets/${ticketId}/comments`, payload);
    return response.data?.data || response.data || null;
};

export const submitContactSupport = async (payload) => {
    const response = await api.post(`${BASE}/contact`, payload);
    return response.data?.data || response.data || null;
};

export const submitSupportFeedback = async (payload) => {
    const response = await api.post(`${BASE}/feedback`, payload);
    return response.data?.data || response.data || null;
};

export const getMySupportFeedback = async (params = {}) => {
    const response = await api.get(`${BASE}/feedback`, { params });
    const payload = response.data?.data || response.data || {};

    return {
        feedback: Array.isArray(payload?.feedback) ? payload.feedback : [],
        summary: payload?.summary || { averageRating: 0, total: 0 },
        pagination: normalizePagination(payload?.pagination)
    };
};
