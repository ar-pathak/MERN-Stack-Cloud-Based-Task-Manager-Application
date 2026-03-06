const {
    objectIdSchema,
    updateProfileSchema,
    searchSchema,
    mentionSearchSchema,
    userIdSchema,
    usernameParamSchema,
    preferencesSchema,
    activitySchema,
    popularUsersSchema,
    blockedUsersQuerySchema
} = require("../../src/modules/user/user.validation");

const VALID_ID = "507f1f77bcf86cd799439011";

test("objectIdSchema validates Mongo ObjectId strings", () => {
    expect(objectIdSchema.parse(VALID_ID)).toBe(VALID_ID);
    expect(() => objectIdSchema.parse("bad-id")).toThrow("Invalid ID format");
});

test("updateProfileSchema requires at least one allowed field", () => {
    expect(() => updateProfileSchema.parse({}))
        .toThrow("At least one field must be provided for update");
});

test("updateProfileSchema supports optional empty strings and url-or-empty fields", () => {
    const parsed = updateProfileSchema.parse({
        name: "Alice",
        bio: "",
        headline: "",
        location: "",
        website: "",
        avatar: "https://example.com/avatar.png",
        coverImage: "https://example.com/cover.png",
        isPrivate: true
    });

    expect(parsed).toEqual({
        name: "Alice",
        bio: "",
        headline: "",
        location: "",
        website: "",
        avatar: "https://example.com/avatar.png",
        coverImage: "https://example.com/cover.png",
        isPrivate: true
    });
});

test("searchSchema coerces pagination values and applies defaults", () => {
    expect(searchSchema.parse({ query: "alice", page: "2", limit: "15" })).toEqual({
        query: "alice",
        page: 2,
        limit: 15
    });

    expect(searchSchema.parse({ query: "bob" })).toEqual({
        query: "bob",
        page: 1,
        limit: 10
    });
});

test("mentionSearchSchema trims query and validates optional scope ids", () => {
    const parsed = mentionSearchSchema.parse({
        query: "  al  ",
        chatId: VALID_ID,
        workspaceId: VALID_ID,
        taskId: VALID_ID,
        subtaskId: VALID_ID,
        limit: "10"
    });

    expect(parsed).toEqual({
        query: "al",
        chatId: VALID_ID,
        workspaceId: VALID_ID,
        taskId: VALID_ID,
        subtaskId: VALID_ID,
        limit: 10
    });

    expect(mentionSearchSchema.parse({})).toEqual({
        query: "",
        limit: 8
    });
});

test("mentionSearchSchema rejects invalid scope id values", () => {
    expect(() => mentionSearchSchema.parse({ projectId: "bad-id" }))
        .toThrow("Invalid ID format");
});

test("userIdSchema validates route id payload", () => {
    expect(userIdSchema.parse({ id: VALID_ID })).toEqual({ id: VALID_ID });
    expect(() => userIdSchema.parse({ id: "bad-id" })).toThrow("Invalid ID format");
});

test("usernameParamSchema normalizes casing and validates pattern", () => {
    expect(usernameParamSchema.parse({ username: "alice_user" })).toEqual({
        username: "alice_user"
    });

    expect(() => usernameParamSchema.parse({ username: "ab" }))
        .toThrow("Username must be at least 3 characters");
    expect(() => usernameParamSchema.parse({ username: "ALICE_USER" }))
        .toThrow("Username must be alphanumeric or underscore");
    expect(() => usernameParamSchema.parse({ username: "Invalid-Name" }))
        .toThrow("Username must be alphanumeric or underscore");
});

test("preferencesSchema supports both root and nested payload shapes", () => {
    const root = preferencesSchema.parse({
        language: "en",
        notifications: { email: true },
        privacy: { allowMentions: false },
        workspace: { autoApproveWorkspaceInvites: true }
    });
    expect(root).toEqual({
        language: "en",
        notifications: { email: true },
        privacy: { allowMentions: false },
        workspace: { autoApproveWorkspaceInvites: true }
    });

    const nested = preferencesSchema.parse({
        preferences: {
            language: "fr",
            notifications: { push: false }
        }
    });
    expect(nested).toEqual({
        preferences: {
            language: "fr",
            notifications: { push: false }
        }
    });
});

test("preferencesSchema rejects empty payload", () => {
    expect(() => preferencesSchema.parse({}))
        .toThrow("At least one preference must be provided");
    expect(() => preferencesSchema.parse({ preferences: {} }))
        .toThrow("At least one preference must be provided");
});

test("activitySchema defaults isOnline flag to true", () => {
    expect(activitySchema.parse({})).toEqual({ isOnline: true });
    expect(activitySchema.parse({ isOnline: false })).toEqual({ isOnline: false });
});

test("popularUsersSchema enforces range and default limit", () => {
    expect(popularUsersSchema.parse({})).toEqual({ limit: 10 });
    expect(popularUsersSchema.parse({ limit: "5" })).toEqual({ limit: 5 });
    expect(() => popularUsersSchema.parse({ limit: "51" })).toThrow();
});

test("blockedUsersQuerySchema enforces pagination constraints", () => {
    expect(blockedUsersQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(blockedUsersQuerySchema.parse({ page: "3", limit: "40" })).toEqual({
        page: 3,
        limit: 40
    });
    expect(() => blockedUsersQuerySchema.parse({ page: "0" }))
        .toThrow("Page must be at least 1");
    expect(() => blockedUsersQuerySchema.parse({ limit: "100" }))
        .toThrow("Limit cannot exceed 50");
});
