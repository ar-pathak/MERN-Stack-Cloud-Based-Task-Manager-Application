const { z } = require("zod");
const mongoose = require("mongoose");
const {
    SUPPORT_CATEGORIES,
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    FEEDBACK_TYPES
} = require("../support/support.constants");

const objectIdSchema = z.string().refine(
    (value) => mongoose.Types.ObjectId.isValid(value),
    { message: "Invalid ID format" }
);

const categoryWithAllSchema = z.enum(["all", ...SUPPORT_CATEGORIES]);
const priorityWithAllSchema = z.enum(["all", ...TICKET_PRIORITIES]);
const statusWithAllSchema = z.enum(["all", ...TICKET_STATUSES]);
const sourceWithAllSchema = z.enum(["all", "ticket", "contact"]);
const assigneeWithAllSchema = z.enum(["all", "mine", "unassigned"]);
const feedbackTypeWithAllSchema = z.enum(["all", ...FEEDBACK_TYPES]);

const attachmentSchema = z.object({
    url: z.string().url("Attachment URL must be valid"),
    name: z.string().trim().min(1).max(180).optional(),
    type: z.string().trim().min(1).max(120).optional(),
    size: z.coerce.number().int().min(0).max(20 * 1024 * 1024).optional()
});

const listTicketsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: statusWithAllSchema.optional(),
    category: categoryWithAllSchema.optional(),
    priority: priorityWithAllSchema.optional(),
    source: sourceWithAllSchema.optional(),
    assignee: assigneeWithAllSchema.optional(),
    search: z.string().trim().max(120).optional()
});

const ticketParamSchema = z.object({
    ticketId: objectIdSchema
});

const updateTicketStatusSchema = z.object({
    status: z.enum(TICKET_STATUSES)
});

const assignTicketSchema = z.object({
    assigneeId: z
        .string()
        .trim()
        .optional()
        .nullable()
        .refine(
            (value) => !value || mongoose.Types.ObjectId.isValid(value),
            { message: "Invalid assignee ID format" }
        )
});

const addReplySchema = z.object({
    body: z.string().trim().min(1).max(3000),
    parentCommentId: objectIdSchema.optional(),
    internalNote: z.boolean().optional(),
    attachments: z.array(attachmentSchema).max(5).default([]).optional()
});

const listFeedbackQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    type: feedbackTypeWithAllSchema.optional(),
    category: categoryWithAllSchema.optional(),
    search: z.string().trim().max(120).optional()
});

module.exports = {
    listTicketsQuerySchema,
    ticketParamSchema,
    updateTicketStatusSchema,
    assignTicketSchema,
    addReplySchema,
    listFeedbackQuerySchema
};
