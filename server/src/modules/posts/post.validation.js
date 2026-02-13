const { z } = require("zod");
const mongoose = require("mongoose");

/**
 * ObjectId validator
 */
const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: "Invalid ID format" }
);

/**
 * URL validation
 */
const urlSchema = z.string().url({ message: "Must be a valid URL" });

/**
 * Media item schema
 */
const mediaItemSchema = z.object({
    type: z.enum(['image', 'video', 'gif', 'document']),
    url: urlSchema,
    thumbnail: urlSchema.optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    size: z.number().positive().optional(),
    duration: z.number().positive().optional(),
    altText: z.string().max(200).optional()
});

/**
 * Poll option schema
 */
const pollOptionSchema = z.object({
    text: z.string().min(1).max(100)
});

/**
 * Poll schema
 */
const pollSchema = z.object({
    question: z.string().min(5).max(200),
    options: z.array(pollOptionSchema).min(2).max(10),
    endsAt: z.string().datetime().or(z.date()),
    allowMultiple: z.boolean().optional()
});

/**
 * Location schema
 */
const locationSchema = z.object({
    name: z.string().max(100),
    coordinates: z.object({
        type: z.literal('Point'),
        coordinates: z.tuple([
            z.number().min(-180).max(180), // longitude
            z.number().min(-90).max(90)    // latitude
        ])
    }).optional()
});

/**
 * Create Post Schema
 */
const createPostSchema = z.object({
    content: z.string()
        .min(1, "Post content is required")
        .max(5000, "Post content cannot exceed 5000 characters")
        .trim(),

    media: z.array(mediaItemSchema)
        .max(10, "Maximum 10 media items allowed")
        .optional(),

    postType: z.enum(['text', 'image', 'video', 'poll', 'repost', 'quote'])
        .default('text'),

    poll: pollSchema.optional(),

    originalPost: objectIdSchema.optional(),

    visibility: z.enum(['public', 'followers', 'private', 'unlisted'])
        .default('public'),

    mentions: z.array(objectIdSchema)
        .max(50, "Maximum 50 mentions allowed")
        .optional(),

    hashtags: z.array(z.string().regex(/^[a-z0-9_]+$/i))
        .max(30, "Maximum 30 hashtags allowed")
        .optional(),

    location: locationSchema.optional(),

    settings: z.object({
        commentsDisabled: z.boolean().optional(),
        hideLikesCount: z.boolean().optional(),
        allowDownloads: z.boolean().optional()
    }).optional()
}).refine(
    (data) => {
        // If post type is poll, poll data must be present
        if (data.postType === 'poll' && !data.poll) {
            return false;
        }
        // If post type is repost or quote, originalPost must be present
        if ((data.postType === 'repost' || data.postType === 'quote') && !data.originalPost) {
            return false;
        }
        return true;
    },
    {
        message: "Poll data required for poll posts, originalPost required for reposts/quotes"
    }
);

/**
 * Update Post Schema
 */
const updatePostSchema = z.object({
    content: z.string()
        .min(1)
        .max(5000)
        .trim()
        .optional(),

    media: z.array(mediaItemSchema)
        .max(10)
        .optional(),

    visibility: z.enum(['public', 'followers', 'private', 'unlisted']).optional(),

    settings: z.object({
        commentsDisabled: z.boolean().optional(),
        hideLikesCount: z.boolean().optional(),
        allowDownloads: z.boolean().optional()
    }).optional()
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided for update" }
);

/**
 * Post ID Parameter Schema
 */
const postIdSchema = z.object({
    id: objectIdSchema
});

/**
 * User ID Parameter Schema
 */
const userIdSchema = z.object({
    userId: objectIdSchema
});

/**
 * Comment ID Parameter Schema
 */
const commentIdSchema = z.object({
    commentId: objectIdSchema
});

/**
 * Pagination Schema
 */
const paginationSchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1, "Page must be at least 1")
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1, "Limit must be at least 1")
        .max(100, "Limit cannot exceed 100")
        .default(20)
});

/**
 * Search Schema
 */
const searchSchema = z.object({
    query: z.string()
        .min(1, "Search query is required")
        .max(100, "Search query too long"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
});

/**
 * Hashtag Parameter Schema
 */
const hashtagSchema = z.object({
    hashtag: z.string()
        .min(1)
        .max(50)
        .regex(/^[a-z0-9_]+$/i, "Invalid hashtag format")
});

/**
 * Trending Query Schema
 */
const trendingSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    timeframe: z.enum(['day', 'week', 'month']).default('day')
});

/**
 * Like Schema
 */
const likeSchema = z.object({
    reactionType: z.enum(['like', 'love', 'haha', 'wow', 'sad', 'angry'])
        .default('like')
        .optional()
});

/**
 * Share Schema
 */
const sharePostSchema = z.object({
    channel: z.enum(['copy_link', 'whatsapp', 'telegram', 'instagram', 'x', 'other'])
        .default('copy_link')
        .optional()
});

/**
 * Repost Schema
 */
const repostPostSchema = z.object({
    mode: z.enum(['repost', 'quote']).default('repost'),
    content: z.string().max(5000).optional(),
    visibility: z.enum(['public', 'followers', 'private', 'unlisted']).default('public').optional()
}).refine(
    (data) => {
        if (data.mode !== 'quote') return true;
        return Boolean(String(data.content || '').trim());
    },
    { message: 'Quote repost requires content' }
);

/**
 * Comment Schema
 */
const commentSchema = z.object({
    content: z.string()
        .min(1, "Comment content is required")
        .max(2000, "Comment cannot exceed 2000 characters")
        .trim(),

    parentCommentId: objectIdSchema.optional(),

    media: urlSchema.optional()
});

/**
 * Update Comment Schema
 */
const updateCommentSchema = z.object({
    content: z.string()
        .min(1, "Comment content is required")
        .max(2000, "Comment cannot exceed 2000 characters")
        .trim()
});

/**
 * Comment Sort Schema
 */
const commentSortSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['recent', 'popular']).default('recent')
});


module.exports = {
    // Schemas
    createPostSchema,
    updatePostSchema,
    postIdSchema,
    userIdSchema,
    commentIdSchema,
    paginationSchema,
    searchSchema,
    hashtagSchema,
    trendingSchema,
    likeSchema,
    sharePostSchema,
    repostPostSchema,
    commentSchema,
    updateCommentSchema,
    commentSortSchema,

};
