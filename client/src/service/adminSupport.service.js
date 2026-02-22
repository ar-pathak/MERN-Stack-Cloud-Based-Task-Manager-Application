import adminApi from "../config/adminAxios";

const normalizePagination = (pagination = {}) => ({
    page: Number(pagination?.page || 1),
    limit: Number(pagination?.limit || 20),
    total: Number(pagination?.total || 0),
    totalPages: Number(pagination?.totalPages || 0),
    hasMore: Boolean(pagination?.hasMore)
});

const unwrap = (response) => response?.data?.data || response?.data || {};

export const getAdminSupportSummary = async () => {
    const response = await adminApi.get("/api/admin/support/summary");
    return unwrap(response);
};

export const getAdminSupportAgents = async () => {
    const response = await adminApi.get("/api/admin/support/agents");
    const payload = unwrap(response);
    return Array.isArray(payload?.agents) ? payload.agents : [];
};

export const getAdminSupportTickets = async (params = {}) => {
    const response = await adminApi.get("/api/admin/support/tickets", { params });
    const payload = unwrap(response);

    return {
        tickets: Array.isArray(payload?.tickets) ? payload.tickets : [],
        statuses: Array.isArray(payload?.statuses) ? payload.statuses : [],
        summary: payload?.summary || null,
        agents: Array.isArray(payload?.agents) ? payload.agents : [],
        pagination: normalizePagination(payload?.pagination)
    };
};

export const getAdminSupportTicketById = async (ticketId) => {
    const response = await adminApi.get(`/api/admin/support/tickets/${ticketId}`);
    return unwrap(response);
};

export const updateAdminSupportTicketStatus = async (ticketId, status) => {
    const response = await adminApi.patch(`/api/admin/support/tickets/${ticketId}/status`, { status });
    return unwrap(response);
};

export const assignAdminSupportTicket = async (ticketId, assigneeId) => {
    const response = await adminApi.patch(`/api/admin/support/tickets/${ticketId}/assign`, {
        assigneeId: assigneeId || ""
    });
    return unwrap(response);
};

export const addAdminSupportReply = async (ticketId, payload) => {
    const response = await adminApi.post(`/api/admin/support/tickets/${ticketId}/replies`, payload);
    return unwrap(response);
};

export const getAdminSupportFeedback = async (params = {}) => {
    const response = await adminApi.get("/api/admin/support/feedback", { params });
    const payload = unwrap(response);

    return {
        feedback: Array.isArray(payload?.feedback) ? payload.feedback : [],
        summary: payload?.summary || { averageRating: 0, total: 0 },
        pagination: normalizePagination(payload?.pagination)
    };
};
