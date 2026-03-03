const {
    createStorySchema,
    storyIdParamSchema,
    userIdParamSchema,
    paginationSchema,
    storyReactionSchema
} = require("../../src/modules/stories/story.validation");

const VALID_ID = "507f1f77bcf86cd799439011";

test("createStorySchema validates media payload and defaults visibility", () => {
    const parsed = createStorySchema.parse({
        media: {
            type: "image",
            url: "https://cdn.example.com/story.jpg"
        },
        mentions: [VALID_ID],
        hashtags: ["release"]
    });

    expect(parsed.visibility).toBe("public");
    expect(parsed.mentions).toEqual([VALID_ID]);
});

test("createStorySchema rejects invalid hashtag format", () => {
    expect(() => createStorySchema.parse({
        media: {
            type: "video",
            url: "https://cdn.example.com/story.mp4",
            duration: 10
        },
        hashtags: ["bad-tag!"]
    })).toThrow();
});

test("story id and user id param schemas validate object ids", () => {
    expect(storyIdParamSchema.parse({ id: VALID_ID })).toEqual({ id: VALID_ID });
    expect(userIdParamSchema.parse({ userId: VALID_ID })).toEqual({ userId: VALID_ID });
});

test("paginationSchema and storyReactionSchema normalize request input", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(storyReactionSchema.parse({ emoji: "  fire  " })).toEqual({ emoji: "fire" });
});
