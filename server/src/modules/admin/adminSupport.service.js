const mongoose = require("mongoose");

const SupportTicket = require("../../models/supportTicket");
const SupportFeedback = require("../../models/supportFeedback");
const AdminAccount = require("../../models/adminAccount");
const {
    SUPPORT_CATEGORIES,
    TICKET_PRIORITIES,
    TICKET_STATUSES
} = require("../support/support.constants");

const TICKET_SOURCES = ["ticket", "contact"];
const ACTIVE_STATUS_SET = new Set(["open", "in_progress"]);

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const escapeRegex = (value = "") =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toIdString = (value) => String(value?._id || value || "");

const toObjectId = (value) => {
    const id = toIdString(value);
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return new mongoose.Types.ObjectId(id);
};

const toPagination = ({ page = 1, limit = 20, total = 0, count = 0 }) => {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 20);
    const safeTotal = Math.max(0, Number(total) || 0);
    const safeCount = Math.max(0, Number(count) || 0);

    return {
        page: safePage,
        limit: safeLimit,
        total: safeTotal,
        totalPages: Math.max(1, Math.ceil(safeTotal / safeLimit)),
        hasMore: (safePage - 1) * safeLimit + safeCount < safeTotal
    };
};

const normalizeAttachments = (attachments = []) => {
    if (!Array.isArray(attachments)) return [];

    return attachments
        .map((attachment) => ({
            url: String(attachment?.url || "").trim(),
            name: String(attachment?.name || "").trim(),
            type: String(attachment?.type || "").trim(),
            size: Math.max(0, Number(attachment?.size || 0))
        }))
        .filter((attachment) => Boolean(attachment.url))
        .slice(0, 5);
};

const buildCountMap = (rows = []) => new Map(
    rows.map((row) => [String(row?._id || ""), Number(row?.count || 0)])
);

const buildStatusSummary = (rows = []) => {
    const map = buildCountMap(rows);
    return TICKET_STATUSES.map((status) => ({
        key: status,
        count: map.get(status) || 0
    }));
};

const buildPrioritySummary = (rows = []) => {
    const map = buildCountMap(rows);
    return TICKET_PRIORITIES.map((priority) => ({
        key: priority,
        count: map.get(priority) || 0
    }));
};

const buildCategorySummary = (rows = []) => {
    const map = buildCountMap(rows);
    return SUPPORT_CATEGORIES.map((category) => ({
        key: category,
        count: map.get(category) || 0
    }));
};

const isTicketOverdue = (ticket) => {
    const status = String(ticket?.status || "");
    if (!ACTIVE_STATUS_SET.has(status)) return false;
    const updatedAt = new Date(ticket?.updatedAt || 0).getTime();
    if (!updatedAt) return false;
    return Date.now() - updatedAt >= 48 * 60 * 60 * 1000;
};

const adminToSnapshot = (admin) => ({
    name: String(admin?.name || "").trim(),
    email: String(admin?.email || "").trim()
});

const buildTicketFilters = (admin, query = {}) => {
    const status = String(query.status || "all").trim().toLowerCase();
    const category = String(query.category || "all").trim().toLowerCase();
    const priority = String(query.priority || "all").trim().toLowerCase();
    const source = String(query.source || "all").trim().toLowerCase();
    const assignee = String(query.assignee || "all").trim().toLowerCase();
    const searchToken = String(query.search || "").trim();

    const filters = {};

    if (TICKET_STATUSES.includes(status)) {
        filters.status = status;
    }

    if (SUPPORT_CATEGORIES.includes(category)) {
        filters.category = category;
    }

    if (TICKET_PRIORITIES.includes(priority)) {
        filters.priority = priority;
    }

    if (TICKET_SOURCES.includes(source)) {
        filters.source = source;
    }

    if (assignee === "mine") {
        filters.assignee = toObjectId(admin?._id);
    } else if (assignee === "unassigned") {
        filters.assignee = null;
    }

    if (searchToken) {
        const searchRegex = new RegExp(escapeRegex(searchToken), "i");
        filters.$or = [
            { ticketNumber: searchRegex },
            { subject: searchRegex },
            { description: searchRegex },
            { "requesterSnapshot.name": searchRegex },
            { "requesterSnapshot.email": searchRegex }
        ];
    }

    return filters;
};

const mapTicketSummary = (ticket = {}) => {
    const comments = Array.isArray(ticket.comments) ? ticket.comments : [];
    const lastComment = comments.length > 0 ? comments[comments.length - 1] : null;
    const lastCommentBy = String(lastComment?.authorRole || "user");

    return {
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        source: ticket.source,
        requesterSnapshot: ticket.requesterSnapshot || {},
        assignee: ticket.assignee || null,
        assigneeSnapshot: ticket.assigneeSnapshot || {},
        updatedAt: ticket.updatedAt,
        createdAt: ticket.createdAt,
        lastRepliedAt: ticket.lastRepliedAt || null,
        lastAdminReplyAt: ticket.lastAdminReplyAt || null,
        commentsCount: comments.length,
        attachmentsCount: Array.isArray(ticket.attachments) ? ticket.attachments.length : 0,
        needsAdminResponse: Boolean(lastComment) && lastCommentBy === "user" && ACTIVE_STATUS_SET.has(ticket.status),
        isOverdue: isTicketOverdue(ticket)
    };
};

const listAgents = async () => {
    const agents = await AdminAccount.find({ accountStatus: "active" })
        .select("name email role lastSeenAt")
        .sort({ role: 1, name: 1 })
        .lean();

    return agents.map((agent) => ({
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        lastSeenAt: agent.lastSeenAt || null
    }));
};

const getDashboardSummary = async () => {
    const [statusRows, priorityRows, categoryRows, unassignedCount, overdueCount, pendingResponseCount] = await Promise.all([
        SupportTicket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        SupportTicket.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
        SupportTicket.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
        SupportTicket.countDocuments({ assignee: null, status: { $in: ["open", "in_progress"] } }),
        SupportTicket.countDocuments({
            status: { $in: ["open", "in_progress"] },
            updatedAt: { $lt: new Date(Date.now() - 48 * 60 * 60 * 1000) }
        }),
        SupportTicket.countDocuments({
            status: { $in: ["open", "in_progress"] },
            comments: {
                $elemMatch: {
                    authorRole: "user"
                }
            }
        })
    ]);

    const statusSummary = buildStatusSummary(statusRows);
    const prioritySummary = buildPrioritySummary(priorityRows);
    const categorySummary = buildCategorySummary(categoryRows);
    const totalTickets = statusSummary.reduce((sum, entry) => sum + entry.count, 0);
    const openTickets = statusSummary
        .filter((entry) => entry.key === "open" || entry.key === "in_progress")
        .reduce((sum, entry) => sum + entry.count, 0);

    return {
        totals: {
            totalTickets,
            openTickets,
            unassigned: Number(unassignedCount || 0),
            overdue: Number(overdueCount || 0),
            waitingForReply: Number(pendingResponseCount || 0)
        },
        statuses: statusSummary,
        priorities: prioritySummary,
        categories: categorySummary
    };
};

const AdminSupportService = {
    listAgents,

    getDashboardSummary,

    listTickets: async (admin, query = {}) => {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
        const skip = (page - 1) * limit;

        const filters = buildTicketFilters(admin, query);

        const [tickets, total, statusRows, summary, agents] = await Promise.all([
            SupportTicket.find(filters)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("assignee", "name email role")
                .lean(),
            SupportTicket.countDocuments(filters),
            SupportTicket.aggregate([
                { $match: filters },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),
            getDashboardSummary(),
            listAgents()
        ]);

        const mapped = tickets.map(mapTicketSummary);

        return {
            tickets: mapped,
            statuses: buildStatusSummary(statusRows),
            pagination: toPagination({ page, limit, total, count: mapped.length }),
            summary,
            agents
        };
    },

    getTicketById: async (ticketId) => {
        const ticket = await SupportTicket.findById(ticketId)
            .populate("comments.author", "name username avatar email role")
            .populate("assignee", "name email role")
            .lean();

        if (!ticket) {
            throw createError("Support ticket not found", 404);
        }

        const comments = Array.isArray(ticket.comments)
            ? [...ticket.comments].sort(
                (a, b) => new Date(a?.createdAt).getTime() - new Date(b?.createdAt).getTime()
            )
            : [];

        return {
            ...ticket,
            comments,
            isOverdue: isTicketOverdue(ticket)
        };
    },

    updateTicketStatus: async (admin, ticketId, status) => {
        const adminId = toObjectId(admin?._id);
        if (!adminId) {
            throw createError("Invalid admin", 400);
        }

        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            throw createError("Support ticket not found", 404);
        }

        ticket.status = status;

        if (!ticket.assignee && status === "in_progress") {
            ticket.assignee = adminId;
            ticket.assigneeSnapshot = adminToSnapshot(admin);
        }

        await ticket.save();

        return ticket.toObject();
    },

    assignTicket: async (ticketId, assigneeId) => {
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            throw createError("Support ticket not found", 404);
        }

        const normalizedAssigneeId = String(assigneeId || "").trim();

        if (!normalizedAssigneeId) {
            ticket.assignee = null;
            ticket.assigneeSnapshot = { name: "", email: "" };
            await ticket.save();
            return ticket.toObject();
        }

        const assignee = await AdminAccount.findOne({
            _id: normalizedAssigneeId,
            accountStatus: "active"
        });

        if (!assignee) {
            throw createError("Assignee admin not found", 404);
        }

        ticket.assignee = assignee._id;
        ticket.assigneeSnapshot = adminToSnapshot(assignee);
        await ticket.save();

        return ticket.toObject();
    },

    addReply: async (admin, ticketId, payload = {}) => {
        const adminId = toObjectId(admin?._id);
        if (!adminId) {
            throw createError("Invalid admin", 400);
        }

        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            throw createError("Support ticket not found", 404);
        }

        const parentCommentId = payload.parentCommentId
            ? toObjectId(payload.parentCommentId)
            : null;

        if (payload.parentCommentId && !parentCommentId) {
            throw createError("Invalid parent comment ID", 400);
        }

        if (parentCommentId) {
            const parentExists = ticket.comments.some(
                (comment) => toIdString(comment._id) === toIdString(parentCommentId)
            );
            if (!parentExists) {
                throw createError("Parent comment not found", 404);
            }
        }

        const now = new Date();
        const internalNote = Boolean(payload.internalNote);

        ticket.comments.push({
            author: adminId,
            authorModel: "AdminAccount",
            authorRole: "admin",
            authorName: String(admin?.name || "Aurora Team").trim(),
            body: String(payload.body || "").trim(),
            attachments: normalizeAttachments(payload.attachments),
            parentCommentId: parentCommentId || null,
            visibleToRequester: !internalNote,
            internalNote,
            createdAt: now,
            updatedAt: now
        });

        if (ticket.status === "open") {
            ticket.status = "in_progress";
        }

        if (!ticket.assignee) {
            ticket.assignee = adminId;
            ticket.assigneeSnapshot = adminToSnapshot(admin);
        }

        ticket.lastAdminReplyAt = now;
        await ticket.save();

        const inserted = ticket.comments[ticket.comments.length - 1];

        return {
            comment: {
                ...(inserted?.toObject ? inserted.toObject() : inserted),
                author: {
                    _id: admin?._id || adminId,
                    name: admin?.name || "Aurora Team",
                    email: admin?.email || "",
                    role: admin?.role || "support_agent"
                }
            },
            status: ticket.status,
            ticketId: ticket._id
        };
    },

    listFeedback: async (query = {}) => {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const type = String(query.type || "all").trim();
        const category = String(query.category || "all").trim();
        const searchToken = String(query.search || "").trim();

        const filters = {};
        if (type !== "all") {
            filters.type = type;
        }
        if (category !== "all") {
            filters.category = category;
        }
        if (searchToken) {
            const regex = new RegExp(escapeRegex(searchToken), "i");
            filters.$or = [
                { title: regex },
                { message: regex }
            ];
        }

        const [feedback, total, ratingRows] = await Promise.all([
            SupportFeedback.find(filters)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("user", "name username email avatar")
                .lean(),
            SupportFeedback.countDocuments(filters),
            SupportFeedback.aggregate([
                { $match: filters },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" },
                        total: { $sum: 1 }
                    }
                }
            ])
        ]);

        const summary = ratingRows[0] || {};

        return {
            feedback,
            summary: {
                averageRating: Number(Number(summary.averageRating || 0).toFixed(2)),
                total: Number(summary.total || 0)
            },
            pagination: toPagination({ page, limit, total, count: feedback.length })
        };
    }
};

module.exports = AdminSupportService;
