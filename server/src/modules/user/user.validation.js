const { z } = require("zod");
const mongoose = require("mongoose");

/**
 * Custom ObjectId validator
 */
const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: "Invalid ID format" }
);

/**
 * Username validation regex
 */
const usernameRegex = /^[a-z0-9_]{3,20}$/;

/**
 * URL validation with optional empty string
 */
const urlOrEmpty = z.string().refine(
    (val) => val === "" || /^https?:\/\/.+/.test(val),
    { message: "Must be a valid URL or empty string" }
);

/**
 * Update Profile Schema
 */
const updateProfileSchema = z.object({
    name: z.string()
        .min(1, "Name is required")
        .max(50, "Name cannot exceed 50 characters")
        .optional(),
    bio: z.string()
        .max(160, "Bio cannot exceed 160 characters")
        .optional()
        .or(z.literal("")),
    headline: z.string()
        .max(80, "Headline cannot exceed 80 characters")
        .optional()
        .or(z.literal("")),
    location: z.string()
        .max(80, "Location cannot exceed 80 characters")
        .optional()
        .or(z.literal("")),
    website: urlOrEmpty.optional(),
    avatar: urlOrEmpty.optional(),
    coverImage: urlOrEmpty.optional(),
    isPrivate: z.boolean().optional()
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided for update" }
);

/**
 * Search Schema
 */
const searchSchema = z.object({
    query: z.string()
        .min(1, "Search query is required")
        .max(50, "Search query too long"),
    page: z.coerce
        .number()
        .int()
        .min(1, "Page must be at least 1")
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1, "Limit must be at least 1")
        .max(50, "Limit cannot exceed 50")
        .default(10)
});

/**
 * Mention search schema (for @mention suggestions)
 */
const mentionSearchSchema = z.object({
    query: z.string()
        .trim()
        .max(20, "Mention query too long")
        .default(""),
    chatId: objectIdSchema.optional(),
    workspaceId: objectIdSchema.optional(),
    projectId: objectIdSchema.optional(),
    taskId: objectIdSchema.optional(),
    subtaskId: objectIdSchema.optional(),
    limit: z.coerce
        .number()
        .int()
        .min(1, "Limit must be at least 1")
        .max(20, "Limit cannot exceed 20")
        .default(8)
});
/**
 * User ID Parameter Schema
 */
const userIdSchema = z.object({
    id: objectIdSchema
});

/**
 * Username Parameter Schema
 */
const usernameParamSchema = z.object({
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(20, "Username cannot exceed 20 characters")
        .regex(usernameRegex, "Username must be alphanumeric or underscore")
        .toLowerCase()
});

/**
 * Preferences Schema
 */
const notificationPreferencesSchema = z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    follows: z.boolean().optional(),
    comments: z.boolean().optional(),
    likes: z.boolean().optional()
});

const privacyPreferencesSchema = z.object({
    showEmail: z.boolean().optional(),
    showOnlineStatus: z.boolean().optional(),
    allowTagging: z.boolean().optional(),
    allowMentions: z.boolean().optional(),
    disablePublicMessages: z.boolean().optional()
});

const preferenceFieldsSchema = z.object({
    language: z.string().optional(),
    notifications: notificationPreferencesSchema.optional(),
    privacy: privacyPreferencesSchema.optional()
});

const preferencesSchema = preferenceFieldsSchema.extend({
    preferences: preferenceFieldsSchema.optional()
}).refine(
    (data) => {
        const hasRootPayload =
            data.language !== undefined
            || data.notifications !== undefined
            || data.privacy !== undefined;

        const nested = data.preferences;
        const hasNestedPayload = Boolean(
            nested
            && (
                nested.language !== undefined
                || nested.notifications !== undefined
                || nested.privacy !== undefined
            )
        );

        return hasRootPayload || hasNestedPayload;
    },
    { message: "At least one preference must be provided" }
);

/**
 * Activity Update Schema
 */
const activitySchema = z.object({
    isOnline: z.boolean().default(true)
});

/**
 * Popular Users Query Schema
 */
const popularUsersSchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
});

/**
 * Blocked users list query schema
 */
const blockedUsersQuerySchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1, "Page must be at least 1")
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1, "Limit must be at least 1")
        .max(50, "Limit cannot exceed 50")
        .default(20)
});



module.exports = {
    // Schemas
    objectIdSchema,
    updateProfileSchema,
    searchSchema,
    mentionSearchSchema,
    userIdSchema,
    usernameParamSchema,
    preferencesSchema,
    activitySchema,
    popularUsersSchema,
    blockedUsersQuerySchema,


};



