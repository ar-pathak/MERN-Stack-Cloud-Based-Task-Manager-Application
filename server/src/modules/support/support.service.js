const mongoose = require("mongoose");
const SupportArticle = require("../../models/supportArticle");
const SupportTicket = require("../../models/supportTicket");
const SupportFeedback = require("../../models/supportFeedback");
const {
    SUPPORT_CATEGORIES,
    CATEGORY_LABELS,
    TICKET_STATUSES,
    DEFAULT_HELP_ARTICLES,
    DEFAULT_FAQS
} = require("./support.constants");

let hasSeededHelpArticles = false;

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

const buildCategorySummary = (rows = []) => {
    const rowMap = new Map(
        rows.map((row) => [String(row?._id || ""), Number(row?.count || 0)])
    );

    return SUPPORT_CATEGORIES.map((category) => ({
        key: category,
        label: CATEGORY_LABELS[category] || category,
        count: rowMap.get(category) || 0
    }));
};

const buildStatusSummary = (rows = []) => {
    const rowMap = new Map(
        rows.map((row) => [String(row?._id || ""), Number(row?.count || 0)])
    );

    return TICKET_STATUSES.map((status) => ({
        key: status,
        count: rowMap.get(status) || 0
    }));
};

const ensureHelpArticlesSeeded = async () => {
    if (hasSeededHelpArticles) return;

    const existingCount = await SupportArticle.countDocuments();
    if (existingCount > 0) {
        hasSeededHelpArticles = true;
        return;
    }

    if (!DEFAULT_HELP_ARTICLES.length) {
        hasSeededHelpArticles = true;
        return;
    }

    try {
        await SupportArticle.insertMany(DEFAULT_HELP_ARTICLES, { ordered: false });
    } catch (error) {
        const hasDuplicateKey =
            error?.code === 11000 ||
            Array.isArray(error?.writeErrors);
        if (!hasDuplicateKey) {
            throw error;
        }
    }

    hasSeededHelpArticles = true;
};

const listHelpArticles = async (query = {}) => {
    await ensureHelpArticlesSeeded();

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const category = String(query.category || "all").trim().toLowerCase();
    const searchToken = String(query.search || "").trim();
    const searchRegex = searchToken
        ? new RegExp(escapeRegex(searchToken), "i")
        : null;

    const filters = { published: true };
    if (SUPPORT_CATEGORIES.includes(category)) {
        filters.category = category;
    }
    if (searchRegex) {
        filters.$or = [
            { title: searchRegex },
            { summary: searchRegex },
            { tags: searchRegex },
            { contentMarkdown: searchRegex }
        ];
    }

    const categoryCountMatch = { published: true };
    if (searchRegex) {
        categoryCountMatch.$or = [
            { title: searchRegex },
            { summary: searchRegex },
            { tags: searchRegex },
            { contentMarkdown: searchRegex }
        ];
    }

    const [articles, total, categoryRows] = await Promise.all([
        SupportArticle.find(filters)
            .sort({ featured: -1, updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("title slug summary category tags featured updatedAt createdAt")
            .lean(),
        SupportArticle.countDocuments(filters),
        SupportArticle.aggregate([
            { $match: categoryCountMatch },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ])
    ]);

    return {
        articles,
        categories: buildCategorySummary(categoryRows),
        pagination: toPagination({ page, limit, total, count: articles.length })
    };
};

const getHelpArticleBySlug = async (slug) => {
    await ensureHelpArticlesSeeded();

    const article = await SupportArticle.findOne({
        slug: String(slug || "").trim().toLowerCase(),
        published: true
    }).lean();

    if (!article) {
        throw createError("Help article not found", 404);
    }

    const related = await SupportArticle.find({
        published: true,
        category: article.category,
        slug: { $ne: article.slug }
    })
        .sort({ featured: -1, updatedAt: -1 })
        .limit(4)
        .select("title slug summary category updatedAt")
        .lean();

    return {
        article,
        related
    };
};

const listFaqs = async (query = {}) => {
    const category = String(query.category || "all").trim().toLowerCase();
    const searchToken = String(query.search || "").trim();
    const searchRegex = searchToken
        ? new RegExp(escapeRegex(searchToken), "i")
        : null;

    const searchFiltered = DEFAULT_FAQS.filter((faq) => {
        if (!searchRegex) return true;
        return (
            searchRegex.test(String(faq.question || "")) ||
            searchRegex.test(String(faq.answerMarkdown || ""))
        );
    });

    const rows = SUPPORT_CATEGORIES.map((key) => ({
        _id: key,
        count: searchFiltered.filter((faq) => faq.category === key).length
    }));

    const faqs = searchFiltered.filter((faq) => {
        if (!SUPPORT_CATEGORIES.includes(category)) return true;
        return faq.category === category;
    });

    return {
        faqs,
        categories: buildCategorySummary(rows)
    };
};

const buildTicketNumber = () => {
    const dateToken = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomToken = Math.floor(1000 + Math.random() * 9000);
    return `SUP-${dateToken}-${randomToken}`;
};

const generateUniqueTicketNumber = async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const ticketNumber = buildTicketNumber();
        const exists = await SupportTicket.exists({ ticketNumber });
        if (!exists) {
            return ticketNumber;
        }
    }

    throw createError("Could not generate a unique ticket number", 500);
};

const createTicket = async ({
    user,
    subject,
    category,
    description,
    priority = "medium",
    attachments = [],
    source = "ticket",
    metadata = {},
    requesterSnapshot = {}
}) => {
    const requesterId = toObjectId(user?._id || user);
    if (!requesterId) {
        throw createError("Invalid user", 400);
    }

    const ticket = await SupportTicket.create({
        ticketNumber: await generateUniqueTicketNumber(),
        requester: requesterId,
        requesterSnapshot: {
            name: String(requesterSnapshot.name || user?.name || user?.username || "").trim(),
            email: String(requesterSnapshot.email || user?.email || "").trim()
        },
        subject: String(subject || "").trim(),
        category,
        description: String(description || "").trim(),
        priority,
        source,
        attachments: normalizeAttachments(attachments),
        metadata: metadata || {}
    });

    return ticket.toObject();
};

const listTickets = async (userId, query = {}) => {
    const requesterId = toObjectId(userId);
    if (!requesterId) {
        throw createError("Invalid user", 400);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const status = String(query.status || "all").trim().toLowerCase();
    const category = String(query.category || "all").trim().toLowerCase();
    const searchToken = String(query.search || "").trim();
    const searchRegex = searchToken
        ? new RegExp(escapeRegex(searchToken), "i")
        : null;

    const filters = { requester: requesterId };
    if (TICKET_STATUSES.includes(status)) {
        filters.status = status;
    }
    if (SUPPORT_CATEGORIES.includes(category)) {
        filters.category = category;
    }
    if (searchRegex) {
        filters.$or = [
            { ticketNumber: searchRegex },
            { subject: searchRegex },
            { description: searchRegex }
        ];
    }

    const statusCountMatch = { requester: requesterId };
    if (SUPPORT_CATEGORIES.includes(category)) {
        statusCountMatch.category = category;
    }
    if (searchRegex) {
        statusCountMatch.$or = [
            { ticketNumber: searchRegex },
            { subject: searchRegex },
            { description: searchRegex }
        ];
    }

    const [tickets, total, statusRows] = await Promise.all([
        SupportTicket.find(filters)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        SupportTicket.countDocuments(filters),
        SupportTicket.aggregate([
            { $match: statusCountMatch },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ])
    ]);

    const summaries = tickets.map((ticket) => {
        const comments = Array.isArray(ticket.comments) ? ticket.comments : [];
        const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : [];
        const lastComment = comments.length ? comments[comments.length - 1] : null;

        return {
            _id: ticket._id,
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            source: ticket.source,
            requesterSnapshot: ticket.requesterSnapshot || {},
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
            lastRepliedAt: ticket.lastRepliedAt || null,
            commentCount: comments.length,
            attachmentsCount: attachments.length,
            lastCommentAt: lastComment?.createdAt || ticket.lastRepliedAt || null,
            lastCommentPreview: lastComment
                ? String(lastComment.body || "").trim().slice(0, 180)
                : ""
        };
    });

    return {
        tickets: summaries,
        statuses: buildStatusSummary(statusRows),
        pagination: toPagination({ page, limit, total, count: summaries.length })
    };
};

const getTicketById = async (userId, ticketId) => {
    const requesterId = toObjectId(userId);
    if (!requesterId) {
        throw createError("Invalid user", 400);
    }

    const ticket = await SupportTicket.findOne({
        _id: ticketId,
        requester: requesterId
    })
        .populate("comments.author", "name username avatar")
        .lean();

    if (!ticket) {
        throw createError("Support ticket not found", 404);
    }

    const comments = Array.isArray(ticket.comments)
        ? [...ticket.comments].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        : [];

    return {
        ...ticket,
        comments
    };
};

const updateTicketStatus = async (userId, ticketId, status) => {
    const requesterId = toObjectId(userId);
    if (!requesterId) {
        throw createError("Invalid user", 400);
    }

    const ticket = await SupportTicket.findOneAndUpdate(
        { _id: ticketId, requester: requesterId },
        { $set: { status } },
        { new: true }
    ).lean();

    if (!ticket) {
        throw createError("Support ticket not found", 404);
    }

    return ticket;
};

const addTicketComment = async (user, ticketId, payload = {}) => {
    const requesterId = toObjectId(user?._id || user);
    if (!requesterId) {
        throw createError("Invalid user", 400);
    }

    const ticket = await SupportTicket.findOne({
        _id: ticketId,
        requester: requesterId
    });

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
    ticket.comments.push({
        author: requesterId,
        authorName: String(user?.name || user?.username || user?.email || "User").trim(),
        body: String(payload.body || "").trim(),
        attachments: normalizeAttachments(payload.attachments),
        parentCommentId: parentCommentId || null,
        createdAt: now,
        updatedAt: now
    });

    if (ticket.status === "resolved" || ticket.status === "closed") {
        ticket.status = "in_progress";
    }

    ticket.lastRepliedAt = now;
    await ticket.save();

    const inserted = ticket.comments[ticket.comments.length - 1];

    return {
        comment: {
            ...(inserted?.toObject ? inserted.toObject() : inserted),
            author: {
                _id: user?._id || user?.id || requesterId,
                name: user?.name || "",
                username: user?.username || "",
                avatar: user?.avatar || ""
            }
        },
        status: ticket.status,
        ticketId: ticket._id
    };
};

const createSupportTicket = async (user, payload = {}) => {
    return createTicket({
        user,
        subject: payload.subject,
        category: payload.category,
        description: payload.description,
        priority: payload.priority || "medium",
        attachments: payload.attachments || [],
        source: "ticket"
    });
};

const contactSupport = async (user, payload = {}) => {
    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim();
    const message = String(payload.message || "").trim();

    const subject = `Contact form request from ${name}`.slice(0, 200);
    const description = `Contact message from ${name} <${email}>.\n\n${message}`;

    return createTicket({
        user,
        subject,
        category: "account",
        description,
        priority: "medium",
        attachments: [],
        source: "contact",
        requesterSnapshot: { name, email },
        metadata: { source: "contact_form" }
    });
};

const submitFeedback = async (user, payload = {}) => {
    const requesterId = toObjectId(user?._id || user);
    if (!requesterId) {
        throw createError("Invalid user", 400);
    }

    const feedback = await SupportFeedback.create({
        user: requesterId,
        type: payload.type,
        category: payload.category || "account",
        title: String(payload.title || "").trim(),
        message: String(payload.message || "").trim(),
        rating: Number(payload.rating || 0)
    });

    return feedback.toObject();
};

const listMyFeedback = async (userId, query = {}) => {
    const requesterId = toObjectId(userId);
    if (!requesterId) {
        throw createError("Invalid user", 400);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filters = { user: requesterId };

    const [feedback, total, ratingRows] = await Promise.all([
        SupportFeedback.find(filters)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
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

    const ratingSummary = ratingRows[0] || {};

    return {
        feedback,
        summary: {
            averageRating: Number(Number(ratingSummary.averageRating || 0).toFixed(2)),
            total: Number(ratingSummary.total || 0)
        },
        pagination: toPagination({ page, limit, total, count: feedback.length })
    };
};

module.exports = {
    listHelpArticles,
    getHelpArticleBySlug,
    listFaqs,
    createSupportTicket,
    listTickets,
    getTicketById,
    updateTicketStatus,
    addTicketComment,
    contactSupport,
    submitFeedback,
    listMyFeedback
};
