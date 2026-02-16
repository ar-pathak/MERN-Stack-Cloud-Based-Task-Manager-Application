const { z } = require("zod");
const mongoose = require("mongoose");
const {
    SUPPORT_CATEGORIES,
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    FEEDBACK_TYPES
} = require("./support.constants");

const objectIdSchema = z.string().refine(
    (value) => mongoose.Types.ObjectId.isValid(value),
    { message: "Invalid ID format" }
);

const categorySchema = z.enum(SUPPORT_CATEGORIES);
const categoryWithAllSchema = z.enum(["all", ...SUPPORT_CATEGORIES]);
const ticketPrioritySchema = z.enum(TICKET_PRIORITIES);
const ticketStatusSchema = z.enum(TICKET_STATUSES);
const ticketStatusWithAllSchema = z.enum(["all", ...TICKET_STATUSES]);
const feedbackTypeSchema = z.enum(FEEDBACK_TYPES);

const attachmentSchema = z.object({
    url: z.string().url("Attachment URL must be valid"),
    name: z.string().trim().min(1).max(180).optional(),
    type: z.string().trim().min(1).max(120).optional(),
    size: z.coerce.number().int().min(0).max(20 * 1024 * 1024).optional()
});

const listArticlesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    search: z.string().trim().max(120).optional(),
    category: categoryWithAllSchema.optional()
});

const articleSlugParamSchema = z.object({
    slug: z
        .string()
        .trim()
        .min(3)
        .max(140)
        .regex(/^[a-z0-9-]+$/, "Invalid article slug")
});

const listFaqQuerySchema = z.object({
    search: z.string().trim().max(120).optional(),
    category: categoryWithAllSchema.optional()
});

const createTicketSchema = z.object({
    subject: z.string().trim().min(3).max(200),
    category: categorySchema,
    description: z.string().trim().min(10).max(5000),
    priority: ticketPrioritySchema.default("medium").optional(),
    attachments: z.array(attachmentSchema).max(5).default([]).optional()
});

const listTicketQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: ticketStatusWithAllSchema.optional(),
    category: categoryWithAllSchema.optional(),
    search: z.string().trim().max(120).optional()
});

const ticketParamSchema = z.object({
    ticketId: objectIdSchema
});

const updateTicketStatusSchema = z.object({
    status: ticketStatusSchema
});

const addTicketCommentSchema = z.object({
    body: z.string().trim().min(1).max(3000),
    parentCommentId: objectIdSchema.optional(),
    attachments: z.array(attachmentSchema).max(5).default([]).optional()
});

const contactSupportSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180),
    message: z.string().trim().min(10).max(5000)
});

const submitFeedbackSchema = z.object({
    type: feedbackTypeSchema,
    category: categorySchema.default("account").optional(),
    title: z.string().trim().max(140).optional(),
    message: z.string().trim().min(10).max(4000),
    rating: z.coerce.number().int().min(1).max(5)
});

const listFeedbackQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional()
});

module.exports = {
    listArticlesQuerySchema,
    articleSlugParamSchema,
    listFaqQuerySchema,
    createTicketSchema,
    listTicketQuerySchema,
    ticketParamSchema,
    updateTicketStatusSchema,
    addTicketCommentSchema,
    contactSupportSchema,
    submitFeedbackSchema,
    listFeedbackQuerySchema
};
