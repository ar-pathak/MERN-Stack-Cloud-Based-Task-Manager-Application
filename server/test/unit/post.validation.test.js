const {
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
    commentSortSchema
} = require("../../src/modules/posts/post.validation");

const VALID_ID = "507f1f77bcf86cd799439011";

test("createPostSchema accepts valid text posts and applies defaults", () => {
    const parsed = createPostSchema.parse({
        content: "Hello world"
    });

    expect(parsed).toEqual(expect.objectContaining({
        content: "Hello world",
        postType: "text",
        visibility: "public"
    }));
});

test("createPostSchema enforces poll/repost requirements", () => {
    expect(() => createPostSchema.parse({
        content: "Poll post",
        postType: "poll"
    })).toThrow("Poll data required for poll posts, originalPost required for reposts/quotes");

    expect(() => createPostSchema.parse({
        content: "Quote post",
        postType: "quote"
    })).toThrow("Poll data required for poll posts, originalPost required for reposts/quotes");
});

test("createPostSchema validates scheduledFor future date and hashtag format", () => {
    expect(() => createPostSchema.parse({
        content: "Scheduled post",
        scheduledFor: "2020-01-01T00:00:00.000Z"
    })).toThrow("scheduledFor must be a future date/time");

    expect(() => createPostSchema.parse({
        content: "Hashtag post",
        hashtags: ["bad-tag!"]
    })).toThrow();
});

test("createPostSchema accepts valid media, mentions, and future schedule", () => {
    const parsed = createPostSchema.parse({
        content: "Rich post",
        postType: "image",
        media: [{
            type: "image",
            url: "https://example.com/image.png",
            width: 800,
            height: 600
        }],
        mentions: [VALID_ID],
        hashtags: ["Task_Manager"],
        scheduledFor: "2099-01-01T00:00:00.000Z"
    });

    expect(parsed.media).toHaveLength(1);
    expect(parsed.mentions).toEqual([VALID_ID]);
});

test("updatePostSchema requires at least one field", () => {
    expect(() => updatePostSchema.parse({}))
        .toThrow("At least one field must be provided for update");
});

test("id schemas validate object ids", () => {
    expect(postIdSchema.parse({ id: VALID_ID })).toEqual({ id: VALID_ID });
    expect(userIdSchema.parse({ userId: VALID_ID })).toEqual({ userId: VALID_ID });
    expect(commentIdSchema.parse({ commentId: VALID_ID })).toEqual({ commentId: VALID_ID });

    expect(() => postIdSchema.parse({ id: "bad" })).toThrow("Invalid ID format");
    expect(() => userIdSchema.parse({ userId: "bad" })).toThrow("Invalid ID format");
    expect(() => commentIdSchema.parse({ commentId: "bad" })).toThrow("Invalid ID format");
});

test("pagination and search schemas coerce values and apply bounds/defaults", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(() => paginationSchema.parse({ page: 0, limit: 1 })).toThrow("Page must be at least 1");
    expect(() => paginationSchema.parse({ page: 1, limit: 101 })).toThrow("Limit cannot exceed 100");

    expect(searchSchema.parse({ query: "find me" })).toEqual({
        query: "find me",
        page: 1,
        limit: 20
    });
    expect(() => searchSchema.parse({ query: "" })).toThrow("Search query is required");
});

test("hashtag/trending/like/share schemas validate and default correctly", () => {
    expect(hashtagSchema.parse({ hashtag: "Task_1" })).toEqual({ hashtag: "Task_1" });
    expect(() => hashtagSchema.parse({ hashtag: "bad-tag!" })).toThrow("Invalid hashtag format");

    expect(trendingSchema.parse({})).toEqual({ page: 1, limit: 20, timeframe: "day" });
    expect(trendingSchema.parse({ timeframe: "week" })).toEqual({
        page: 1,
        limit: 20,
        timeframe: "week"
    });

    expect(likeSchema.parse({})).toEqual({ reactionType: "like" });
    expect(likeSchema.parse({ reactionType: "love" })).toEqual({ reactionType: "love" });
    expect(sharePostSchema.parse({})).toEqual({ channel: "copy_link" });
});

test("repostPostSchema requires content for quote mode", () => {
    expect(repostPostSchema.parse({})).toEqual({ mode: "repost", visibility: "public" });
    expect(() => repostPostSchema.parse({ mode: "quote", content: "   " }))
        .toThrow("Quote repost requires content");
    expect(repostPostSchema.parse({ mode: "quote", content: "With context" }))
        .toEqual(expect.objectContaining({ mode: "quote", content: "With context" }));
});

test("comment schemas validate comment payloads", () => {
    expect(commentSchema.parse({
        content: "This is useful",
        media: "https://example.com/asset.png"
    })).toEqual({
        content: "This is useful",
        media: "https://example.com/asset.png"
    });

    expect(() => commentSchema.parse({ content: "" })).toThrow("Comment content is required");
    expect(updateCommentSchema.parse({ content: "Updated comment" })).toEqual({
        content: "Updated comment"
    });
});

test("commentSortSchema applies defaults and enum validation", () => {
    expect(commentSortSchema.parse({})).toEqual({
        page: 1,
        limit: 20,
        sortBy: "recent"
    });
    expect(commentSortSchema.parse({ sortBy: "popular", limit: 50 })).toEqual({
        page: 1,
        limit: 50,
        sortBy: "popular"
    });
});
