const { z } = require("zod");
const mongoose = require("mongoose");

const objectId = z.string().refine(
    (value) => mongoose.Types.ObjectId.isValid(value),
    { message: "Invalid ObjectId" }
);

const listNotificationsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    read: z.enum(["true", "false"]).optional(),
    category: z.string().trim().optional(),
    type: z.string().trim().optional(),
    priority: z.string().trim().optional(),
    entityType: z.string().trim().optional(),
    search: z.string().trim().max(120).optional()
});

const notificationParamSchema = z.object({
    notificationId: objectId
});

const markAllReadSchema = z.object({
    category: z.string().trim().optional(),
    type: z.string().trim().optional(),
    entityType: z.string().trim().optional()
});

const bulkActionSchema = z.object({
    action: z.enum(["read", "unread", "delete"]),
    notificationIds: z.array(objectId).min(1).max(100)
});

module.exports = {
    listNotificationsQuerySchema,
    notificationParamSchema,
    markAllReadSchema,
    bulkActionSchema
};
