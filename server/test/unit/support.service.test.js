jest.mock("../../src/models/supportArticle", () => ({
    bulkWrite: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/supportTicket", () => ({
    exists: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/supportFeedback", () => ({
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

const mongoose = require("mongoose");
const SupportArticle = require("../../src/models/supportArticle");
const SupportTicket = require("../../src/models/supportTicket");
const SupportFeedback = require("../../src/models/supportFeedback");
const SupportService = require("../../src/modules/support/support.service");

const USER_ID = "507f1f77bcf86cd799439011";
const TICKET_ID = "507f1f77bcf86cd799439022";

const makeListQuery = (value) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

beforeEach(() => {
    jest.clearAllMocks();
    SupportArticle.bulkWrite.mockResolvedValue({});
    SupportTicket.exists.mockResolvedValue(null);
});

test("listHelpArticles returns paginated published articles and category summary", async () => {
    SupportArticle.find.mockReturnValue(makeListQuery([
        {
            _id: "a1",
            title: "Security Checklist",
            slug: "security-checklist",
            category: "security",
            summary: "..."
        }
    ]));
    SupportArticle.countDocuments.mockResolvedValue(1);
    SupportArticle.aggregate.mockResolvedValue([
        { _id: "security", count: 1 }
    ]);

    const result = await SupportService.listHelpArticles({
        page: 2,
        limit: 1,
        category: "security",
        search: "security"
    });

    expect(SupportArticle.bulkWrite).toHaveBeenCalledTimes(1);
    expect(SupportArticle.find).toHaveBeenCalledWith(expect.objectContaining({
        published: true,
        category: "security",
        $or: expect.any(Array)
    }));
    expect(result.articles).toHaveLength(1);
    expect(result.categories).toEqual(expect.arrayContaining([
        expect.objectContaining({
            key: "security",
            count: 1
        })
    ]));
    expect(result.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 1,
        totalPages: 1,
        hasMore: false
    });
});

test("getHelpArticleBySlug throws 404 when article does not exist", async () => {
    SupportArticle.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
    });

    await expect(SupportService.getHelpArticleBySlug("missing-article"))
        .rejects
        .toMatchObject({
            statusCode: 404,
            message: "Help article not found"
        });
});

test("getHelpArticleBySlug returns article with related list", async () => {
    SupportArticle.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
            _id: "a1",
            slug: "security-checklist",
            category: "security"
        })
    });
    SupportArticle.find.mockReturnValue(makeListQuery([
        { slug: "permissions-guide", category: "security" }
    ]));

    const result = await SupportService.getHelpArticleBySlug("security-checklist");

    expect(result).toEqual({
        article: expect.objectContaining({
            slug: "security-checklist"
        }),
        related: [
            { slug: "permissions-guide", category: "security" }
        ]
    });
});

test("listFaqs filters by category and search token", async () => {
    const result = await SupportService.listFaqs({
        category: "security",
        search: "messages"
    });

    expect(result.faqs.length).toBeGreaterThan(0);
    expect(result.faqs.every((faq) => faq.category === "security")).toBe(true);
    expect(result.categories).toEqual(expect.arrayContaining([
        expect.objectContaining({
            key: "security"
        })
    ]));
});

test("createSupportTicket rejects invalid user", async () => {
    await expect(SupportService.createSupportTicket("invalid-user-id", {
        subject: "Need help",
        category: "account",
        description: "Unable to login to workspace"
    })).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid user"
    });
});

test("createSupportTicket creates ticket with normalized attachments", async () => {
    SupportTicket.create.mockResolvedValue({
        toObject: () => ({
            _id: TICKET_ID,
            ticketNumber: "SUP-20260303-1001",
            source: "ticket"
        })
    });

    const result = await SupportService.createSupportTicket(
        {
            _id: USER_ID,
            name: "Alice",
            email: "alice@example.com"
        },
        {
            subject: " Login issue ",
            category: "account",
            description: "  Unable to login after password reset  ",
            attachments: [
                {
                    url: "https://example.com/screenshot.png",
                    name: " screenshot ",
                    type: " image/png ",
                    size: -100
                },
                {
                    url: "",
                    name: "invalid"
                }
            ]
        }
    );

    expect(SupportTicket.exists).toHaveBeenCalled();
    expect(SupportTicket.create).toHaveBeenCalledWith(expect.objectContaining({
        requester: expect.any(mongoose.Types.ObjectId),
        subject: "Login issue",
        description: "Unable to login after password reset",
        attachments: [
            {
                url: "https://example.com/screenshot.png",
                name: "screenshot",
                type: "image/png",
                size: 0
            }
        ]
    }));
    expect(result).toEqual(expect.objectContaining({
        _id: TICKET_ID,
        source: "ticket"
    }));
});

test("createSupportTicket fails after repeated duplicate ticket numbers", async () => {
    SupportTicket.exists.mockResolvedValue(true);

    await expect(SupportService.createSupportTicket(
        { _id: USER_ID, name: "Alice" },
        {
            subject: "Need help",
            category: "account",
            description: "Unable to login from mobile app"
        }
    )).rejects.toMatchObject({
        statusCode: 500,
        message: "Could not generate a unique ticket number"
    });
});

test("listTickets validates requester id and returns normalized summaries", async () => {
    SupportTicket.find.mockReturnValue(makeListQuery([
        {
            _id: TICKET_ID,
            ticketNumber: "SUP-20260303-1001",
            subject: "Security issue",
            category: "security",
            priority: "high",
            status: "open",
            source: "ticket",
            requesterSnapshot: { name: "Alice", email: "alice@example.com" },
            createdAt: new Date("2026-03-01T00:00:00.000Z"),
            updatedAt: new Date("2026-03-02T00:00:00.000Z"),
            lastRepliedAt: null,
            attachments: [{ url: "https://example.com/one.png" }],
            comments: [
                {
                    _id: "c0",
                    body: "hidden",
                    visibleToRequester: false,
                    createdAt: new Date("2026-03-01T08:00:00.000Z")
                },
                {
                    _id: "c1",
                    body: "First visible comment",
                    createdAt: new Date("2026-03-01T09:00:00.000Z")
                },
                {
                    _id: "c2",
                    body: "Latest visible reply",
                    internalNote: false,
                    createdAt: new Date("2026-03-01T10:00:00.000Z")
                }
            ]
        }
    ]));
    SupportTicket.countDocuments.mockResolvedValue(1);
    SupportTicket.aggregate.mockResolvedValue([
        { _id: "open", count: 1 }
    ]);

    const result = await SupportService.listTickets(USER_ID, {
        page: 1,
        limit: 10,
        status: "open",
        category: "security",
        search: "issue"
    });

    expect(SupportTicket.find).toHaveBeenCalledWith(expect.objectContaining({
        requester: expect.any(mongoose.Types.ObjectId),
        status: "open",
        category: "security",
        $or: expect.any(Array)
    }));
    expect(result.tickets[0]).toEqual(expect.objectContaining({
        ticketNumber: "SUP-20260303-1001",
        commentCount: 2,
        attachmentsCount: 1,
        lastCommentPreview: "Latest visible reply"
    }));
    expect(result.statuses).toEqual(expect.arrayContaining([
        expect.objectContaining({
            key: "open",
            count: 1
        })
    ]));
});

test("getTicketById returns only requester-visible comments in chronological order", async () => {
    SupportTicket.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
            _id: TICKET_ID,
            comments: [
                {
                    _id: "late",
                    body: "Later comment",
                    createdAt: new Date("2026-03-01T12:00:00.000Z")
                },
                {
                    _id: "internal",
                    body: "Internal",
                    internalNote: true,
                    createdAt: new Date("2026-03-01T11:00:00.000Z")
                },
                {
                    _id: "early",
                    body: "Early comment",
                    createdAt: new Date("2026-03-01T10:00:00.000Z")
                }
            ]
        })
    });

    const result = await SupportService.getTicketById(USER_ID, TICKET_ID);

    expect(result.comments.map((entry) => entry._id)).toEqual(["early", "late"]);
});

test("updateTicketStatus throws 404 when user does not own ticket", async () => {
    SupportTicket.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
    });

    await expect(SupportService.updateTicketStatus(USER_ID, TICKET_ID, "closed"))
        .rejects
        .toMatchObject({
            statusCode: 404,
            message: "Support ticket not found"
        });
});

test("addTicketComment rejects invalid parent comment id", async () => {
    SupportTicket.findOne.mockResolvedValue({
        _id: TICKET_ID,
        comments: []
    });

    await expect(SupportService.addTicketComment(
        { _id: USER_ID, name: "Alice" },
        TICKET_ID,
        {
            body: "Reply",
            parentCommentId: "bad-id"
        }
    )).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid parent comment ID"
    });
});

test("addTicketComment appends requester comment and returns author payload", async () => {
    const ticketDoc = {
        _id: TICKET_ID,
        status: "open",
        comments: [
            {
                _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439033")
            }
        ],
        save: jest.fn().mockResolvedValue({})
    };
    ticketDoc.comments.push = Array.prototype.push.bind(ticketDoc.comments);

    SupportTicket.findOne.mockResolvedValue(ticketDoc);

    const result = await SupportService.addTicketComment(
        {
            _id: USER_ID,
            name: "Alice",
            username: "alice",
            avatar: "avatar.png"
        },
        TICKET_ID,
        {
            body: "  Please share update  ",
            attachments: [
                { url: "https://example.com/log.txt", name: " log ", size: -1 },
                { url: "", name: "invalid" }
            ],
            parentCommentId: "507f1f77bcf86cd799439033"
        }
    );

    expect(ticketDoc.save).toHaveBeenCalledTimes(1);
    expect(ticketDoc.comments[ticketDoc.comments.length - 1]).toEqual(expect.objectContaining({
        body: "Please share update",
        attachments: [
            expect.objectContaining({
                url: "https://example.com/log.txt",
                name: "log",
                size: 0
            })
        ],
        visibleToRequester: true,
        internalNote: false
    }));
    expect(result).toEqual(expect.objectContaining({
        status: "open",
        ticketId: TICKET_ID,
        comment: expect.objectContaining({
            author: expect.objectContaining({
                _id: USER_ID,
                name: "Alice"
            })
        })
    }));
});

test("contactSupport creates ticket with contact metadata", async () => {
    SupportTicket.create.mockResolvedValue({
        toObject: () => ({
            _id: TICKET_ID,
            source: "contact"
        })
    });

    const result = await SupportService.contactSupport(
        { _id: USER_ID, username: "alice" },
        {
            name: " Alice ",
            email: "alice@example.com",
            message: "Need account recovery help"
        }
    );

    expect(SupportTicket.create).toHaveBeenCalledWith(expect.objectContaining({
        category: "account",
        source: "contact",
        requesterSnapshot: {
            name: "Alice",
            email: "alice@example.com"
        },
        metadata: { source: "contact_form" }
    }));
    expect(result).toEqual(expect.objectContaining({
        _id: TICKET_ID
    }));
});

test("submitFeedback validates requester id and returns saved feedback", async () => {
    SupportFeedback.create.mockResolvedValue({
        toObject: () => ({
            _id: "f1",
            type: "bug_report",
            rating: 5
        })
    });

    const result = await SupportService.submitFeedback(
        { _id: USER_ID },
        {
            type: "bug_report",
            category: "security",
            title: "Issue title",
            message: "Issue details for support",
            rating: 5
        }
    );

    expect(SupportFeedback.create).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.any(mongoose.Types.ObjectId),
        type: "bug_report",
        category: "security",
        rating: 5
    }));
    expect(result).toEqual({
        _id: "f1",
        type: "bug_report",
        rating: 5
    });
});

test("listMyFeedback returns rounded summary and pagination", async () => {
    SupportFeedback.find.mockReturnValue(makeListQuery([
        {
            _id: "f1",
            rating: 4
        }
    ]));
    SupportFeedback.countDocuments.mockResolvedValue(1);
    SupportFeedback.aggregate.mockResolvedValue([
        {
            _id: null,
            averageRating: 4.256,
            total: 1
        }
    ]);

    const result = await SupportService.listMyFeedback(USER_ID, { page: 1, limit: 10 });

    expect(result.summary).toEqual({
        averageRating: 4.26,
        total: 1
    });
    expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasMore: false
    });
});
