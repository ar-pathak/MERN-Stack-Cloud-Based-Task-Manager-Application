const { z } = require("zod");
const mongoose = require("mongoose");

const objectIdSchema = z.string().refine(
    (value) => mongoose.Types.ObjectId.isValid(value),
    { message: "Invalid ID format" }
);

const mediaSchema = z.object({
    type: z.enum(["image", "video"]),
    url: z.string().url("Media URL must be valid"),
    thumbnail: z.string().url("Thumbnail URL must be valid").optional(),
    duration: z.coerce.number().positive().optional()
});

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
});

const createStorySchema = z.object({
    caption: z.string().max(500).optional(),
    media: mediaSchema,
    visibility: z.enum(["public", "followers"]).default("public"),
    mentions: z.array(objectIdSchema).max(30).optional(),
    hashtags: z.array(z.string().regex(/^[a-z0-9_]+$/i)).max(30).optional()
});

const storyIdParamSchema = z.object({
    id: objectIdSchema
});

const userIdParamSchema = z.object({
    userId: objectIdSchema
});

const storyReactionSchema = z.object({
    emoji: z.string().trim().min(1).max(12)
});

module.exports = {
    createStorySchema,
    storyIdParamSchema,
    userIdParamSchema,
    paginationSchema,
    storyReactionSchema
};

