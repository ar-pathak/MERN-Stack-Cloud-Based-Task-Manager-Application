// modules/chat/chat.validation.js (ENHANCED VERSION)
const { z } = require("zod");
const mongoose = require("mongoose");

// ---------------------------------------------------------------------------
// Reusable helpers
// ---------------------------------------------------------------------------
const objectId = z.string().refine(
    (v) => mongoose.Types.ObjectId.isValid(v),
    { message: "Invalid ObjectId" }
);

// ---------------------------------------------------------------------------
// Private chat — POST /private
// ---------------------------------------------------------------------------
const privateChatSchema = z.object({
    userId: objectId
});

// ---------------------------------------------------------------------------
// Group chat — POST /group
// ---------------------------------------------------------------------------
const groupChatSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Group name must be at least 2 characters")
        .max(100, "Group name cannot exceed 100 characters"),

    members: z
        .array(objectId)
        .min(2, "A group chat requires at least 2 other members")
        .max(50, "A group chat cannot have more than 50 members")
});

// ---------------------------------------------------------------------------
// Update group — PATCH /:chatId
// ---------------------------------------------------------------------------
const updateGroupSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Group name must be at least 2 characters")
        .max(100, "Group name cannot exceed 100 characters")
        .optional(),

    avatar: z
        .string()
        .url("Invalid avatar URL")
        .optional()
});

// ---------------------------------------------------------------------------
// Add members — POST /:chatId/members
// ---------------------------------------------------------------------------
const addMembersSchema = z.object({
    members: z
        .array(objectId)
        .min(1, "At least one member required")
        .max(10, "Cannot add more than 10 members at once")
});

// ---------------------------------------------------------------------------
// Remove member — DELETE /:chatId/members
// ---------------------------------------------------------------------------
const removeMemberSchema = z.object({
    userId: objectId
});

// ---------------------------------------------------------------------------
// Send message — POST /message
// ---------------------------------------------------------------------------
const sendMessageSchema = z.object({
    chatId: objectId,

    // 1. Remove .min(1) so empty strings are allowed
    content: z
        .string()
        .trim()
        .max(5000, "Message cannot exceed 5,000 characters")
        .optional()
        .default(""), // Ensure it defaults to empty string if missing

    attachments: z
        .array(z.object({
            url: z.string().url(),
            type: z.string(),
            name: z.string(),
            size: z.number().optional()
        }))
        .max(10, "Cannot attach more than 10 files")
        .optional()
        .default([]), // Ensure it defaults to empty array

    replyTo: objectId.optional()
}).refine((data) => {
    // 2. Add custom logic: Content OR Attachments must exist
    const hasContent = data.content && data.content.length > 0;
    const hasAttachments = data.attachments && data.attachments.length > 0;

    return hasContent || hasAttachments;
}, {
    message: "Message must contain text or at least one attachment",
    path: ["content"] // Attach the error to the content field
});

// ---------------------------------------------------------------------------
// Edit message — PATCH /message/:messageId
// ---------------------------------------------------------------------------
const editMessageSchema = z.object({
    chatId: objectId,
    content: z
        .string()
        .trim()
        .min(1, "Message cannot be empty")
        .max(5000, "Message cannot exceed 5,000 characters")
});

// ---------------------------------------------------------------------------
// Message action (pin/delete) — needs chatId in body
// ---------------------------------------------------------------------------
const messageActionSchema = z.object({
    chatId: objectId
});

// ---------------------------------------------------------------------------
// Reaction — POST/DELETE /message/:messageId/reaction
// ---------------------------------------------------------------------------
const reactionSchema = z.object({
    chatId: objectId,
    emoji: z
        .string()
        .min(1, "Emoji required")
        .max(10, "Invalid emoji")
});

// ---------------------------------------------------------------------------
// Pagination — GET /:chatId/messages?page=&limit=
// ---------------------------------------------------------------------------
const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
});

// ---------------------------------------------------------------------------
// Search — GET /:chatId/messages/search?q=&limit=
// ---------------------------------------------------------------------------
const searchSchema = z.object({
    q: z
        .string()
        .min(1, "Search query required")
        .max(100, "Query too long"),
    limit: z.coerce.number().int().min(1).max(50).default(20)
});

// ---------------------------------------------------------------------------
// Chat-ID URL param — GET /:chatId/messages
// ---------------------------------------------------------------------------
const chatIdParamSchema = z.object({
    chatId: objectId
});

// ---------------------------------------------------------------------------
// Message-ID URL param — PATCH/DELETE /message/:messageId
// ---------------------------------------------------------------------------
const messageIdParamSchema = z.object({
    messageId: objectId
});

// ---------------------------------------------------------------------------
module.exports = {
    privateChatSchema,
    groupChatSchema,
    updateGroupSchema,
    addMembersSchema,
    removeMemberSchema,
    sendMessageSchema,
    editMessageSchema,
    messageActionSchema,
    reactionSchema,
    paginationSchema,
    searchSchema,
    chatIdParamSchema,
    messageIdParamSchema
};