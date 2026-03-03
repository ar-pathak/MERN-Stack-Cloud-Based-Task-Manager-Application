const {
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
} = require("../../src/modules/support/support.validation");

const VALID_ID = "507f1f77bcf86cd799439011";

test("listArticlesQuerySchema accepts valid filters", () => {
    const parsed = listArticlesQuerySchema.parse({
        page: "2",
        limit: "10",
        search: " security ",
        category: "security"
    });

    expect(parsed).toEqual({
        page: 2,
        limit: 10,
        search: "security",
        category: "security"
    });
});

test("articleSlugParamSchema rejects invalid slug format", () => {
    expect(() => articleSlugParamSchema.parse({ slug: "Invalid Slug!" }))
        .toThrow("Invalid article slug");
});

test("listFaqQuerySchema accepts category all and optional search", () => {
    const parsed = listFaqQuerySchema.parse({
        category: "all",
        search: "messages"
    });

    expect(parsed).toEqual({
        category: "all",
        search: "messages"
    });
});

test("createTicketSchema applies defaults and validates attachments", () => {
    const parsed = createTicketSchema.parse({
        subject: "Cannot upload screenshot",
        category: "posts",
        description: "Upload fails with network timeout after retrying multiple times."
    });

    expect(parsed.priority).toBe("medium");
    expect(parsed.attachments).toEqual([]);
});

test("listTicketQuerySchema rejects unsupported status", () => {
    expect(() => listTicketQuerySchema.parse({ status: "pending" })).toThrow();
});

test("ticketParamSchema validates object id format", () => {
    expect(ticketParamSchema.parse({ ticketId: VALID_ID })).toEqual({
        ticketId: VALID_ID
    });

    expect(() => ticketParamSchema.parse({ ticketId: "bad-id" }))
        .toThrow("Invalid ID format");
});

test("updateTicketStatusSchema validates supported status enum", () => {
    expect(updateTicketStatusSchema.parse({ status: "resolved" })).toEqual({
        status: "resolved"
    });
});

test("addTicketCommentSchema supports parent id and attachment defaults", () => {
    const parsed = addTicketCommentSchema.parse({
        body: "  Here is the requested screenshot  ",
        parentCommentId: VALID_ID
    });

    expect(parsed).toEqual({
        body: "Here is the requested screenshot",
        parentCommentId: VALID_ID,
        attachments: []
    });
});

test("contactSupportSchema rejects too-short message", () => {
    expect(() => contactSupportSchema.parse({
        name: "Alice",
        email: "alice@example.com",
        message: "short"
    })).toThrow();
});

test("submitFeedbackSchema validates rating and applies default category", () => {
    const parsed = submitFeedbackSchema.parse({
        type: "bug_report",
        title: "Timeline issue",
        message: "Timeline is not showing latest activities for new tasks.",
        rating: "4"
    });

    expect(parsed).toEqual({
        type: "bug_report",
        category: "account",
        title: "Timeline issue",
        message: "Timeline is not showing latest activities for new tasks.",
        rating: 4
    });

    expect(() => submitFeedbackSchema.parse({
        type: "bug_report",
        message: "Message body with enough length",
        rating: 6
    })).toThrow();
});

test("listFeedbackQuerySchema enforces pagination boundaries", () => {
    expect(listFeedbackQuerySchema.parse({ page: "1", limit: "20" })).toEqual({
        page: 1,
        limit: 20
    });

    expect(() => listFeedbackQuerySchema.parse({ limit: "100" })).toThrow();
});
