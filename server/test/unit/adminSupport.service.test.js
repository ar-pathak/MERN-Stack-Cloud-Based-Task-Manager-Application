jest.mock("../../src/models/supportTicket", () => ({
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/supportFeedback", () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock("../../src/models/adminAccount", () => ({
    find: jest.fn(),
    findOne: jest.fn()
}));

const mongoose = require("mongoose");
const SupportTicket = require("../../src/models/supportTicket");
const SupportFeedback = require("../../src/models/supportFeedback");
const AdminAccount = require("../../src/models/adminAccount");
const AdminSupportService = require("../../src/modules/admin/adminSupport.service");

const ADMIN_ID = "507f1f77bcf86cd799439011";

const makeListQuery = (value) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

const makeFindByIdQuery = (value) => ({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("listAgents returns normalized active admin list", async () => {
    AdminAccount.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    {
                        _id: ADMIN_ID,
                        name: "Agent One",
                        email: "agent@example.com",
                        role: "support_agent",
                        lastSeenAt: new Date("2026-02-01T00:00:00.000Z")
                    }
                ])
            })
        })
    });

    const result = await AdminSupportService.listAgents();

    expect(result).toEqual([
        {
            _id: ADMIN_ID,
            name: "Agent One",
            email: "agent@example.com",
            role: "support_agent",
            lastSeenAt: new Date("2026-02-01T00:00:00.000Z")
        }
    ]);
});

test("getDashboardSummary builds totals and grouped summaries", async () => {
    SupportTicket.aggregate
        .mockResolvedValueOnce([{ _id: "open", count: 2 }, { _id: "closed", count: 1 }])
        .mockResolvedValueOnce([{ _id: "high", count: 1 }])
        .mockResolvedValueOnce([{ _id: "security", count: 3 }]);

    SupportTicket.countDocuments
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(4);

    const result = await AdminSupportService.getDashboardSummary();

    expect(result.totals).toEqual({
        totalTickets: 3,
        openTickets: 2,
        unassigned: 1,
        overdue: 2,
        waitingForReply: 4
    });
    expect(result.statuses).toEqual(expect.arrayContaining([
        { key: "open", count: 2 },
        { key: "closed", count: 1 }
    ]));
});

test("listTickets applies filters and maps ticket metadata", async () => {
    const staleDate = new Date(Date.now() - 49 * 60 * 60 * 1000);
    const ticketId = "507f1f77bcf86cd799439022";

    SupportTicket.find.mockReturnValue(makeListQuery([
        {
            _id: ticketId,
            ticketNumber: "TKT-1001",
            subject: "Security issue",
            category: "security",
            priority: "high",
            status: "open",
            source: "ticket",
            requesterSnapshot: {
                name: "Requester",
                email: "requester@example.com"
            },
            assignee: null,
            assigneeSnapshot: { name: "", email: "" },
            updatedAt: staleDate,
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
            comments: [
                {
                    _id: "c1",
                    authorRole: "user",
                    body: "Please help"
                }
            ],
            attachments: [{ url: "https://example.com/file.png" }]
        }
    ]));

    SupportTicket.countDocuments
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

    SupportTicket.aggregate
        .mockResolvedValueOnce([{ _id: "open", count: 1 }])
        .mockResolvedValueOnce([{ _id: "open", count: 1 }])
        .mockResolvedValueOnce([{ _id: "high", count: 1 }])
        .mockResolvedValueOnce([{ _id: "security", count: 1 }]);

    AdminAccount.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([])
            })
        })
    });

    const result = await AdminSupportService.listTickets(
        { _id: ADMIN_ID },
        { page: 2, limit: 1, assignee: "mine", search: "security" }
    );

    expect(SupportTicket.find).toHaveBeenCalledWith(expect.objectContaining({
        assignee: expect.any(mongoose.Types.ObjectId),
        $or: expect.any(Array)
    }));
    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0]).toEqual(expect.objectContaining({
        ticketNumber: "TKT-1001",
        commentsCount: 1,
        attachmentsCount: 1,
        needsAdminResponse: true,
        isOverdue: true
    }));
    expect(result.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 1,
        totalPages: 1,
        hasMore: false
    });
});

test("getTicketById throws 404 when ticket does not exist", async () => {
    SupportTicket.findById.mockReturnValue(makeFindByIdQuery(null));

    await expect(AdminSupportService.getTicketById("507f1f77bcf86cd799439099"))
        .rejects
        .toMatchObject({
            statusCode: 404,
            message: "Support ticket not found"
        });
});

test("getTicketById sorts comments chronologically", async () => {
    const ticketId = "507f1f77bcf86cd799439099";
    SupportTicket.findById.mockReturnValue(makeFindByIdQuery({
        _id: ticketId,
        status: "open",
        updatedAt: new Date(),
        comments: [
            { _id: "b", body: "second", createdAt: new Date("2026-02-02T00:00:00.000Z") },
            { _id: "a", body: "first", createdAt: new Date("2026-02-01T00:00:00.000Z") }
        ]
    }));

    const result = await AdminSupportService.getTicketById(ticketId);

    expect(result.comments.map((entry) => entry._id)).toEqual(["a", "b"]);
});

test("updateTicketStatus rejects invalid admin identity", async () => {
    await expect(AdminSupportService.updateTicketStatus(
        { _id: "invalid-id" },
        "507f1f77bcf86cd799439099",
        "open"
    )).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid admin"
    });
});

test("updateTicketStatus auto-assigns ticket when moving to in_progress", async () => {
    const ticketDoc = {
        _id: "507f1f77bcf86cd799439088",
        status: "open",
        assignee: null,
        assigneeSnapshot: { name: "", email: "" },
        save: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({
            _id: "507f1f77bcf86cd799439088",
            status: "in_progress"
        })
    };
    SupportTicket.findById.mockResolvedValue(ticketDoc);

    const result = await AdminSupportService.updateTicketStatus(
        { _id: ADMIN_ID, name: "Agent One", email: "agent@example.com" },
        "507f1f77bcf86cd799439088",
        "in_progress"
    );

    expect(ticketDoc.status).toBe("in_progress");
    expect(ticketDoc.assignee).toEqual(expect.any(mongoose.Types.ObjectId));
    expect(ticketDoc.assigneeSnapshot).toEqual({
        name: "Agent One",
        email: "agent@example.com"
    });
    expect(ticketDoc.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
        _id: "507f1f77bcf86cd799439088",
        status: "in_progress"
    });
});

test("assignTicket clears assignee when empty assignee id is provided", async () => {
    const ticketDoc = {
        _id: "507f1f77bcf86cd799439077",
        assignee: ADMIN_ID,
        assigneeSnapshot: {
            name: "Agent",
            email: "agent@example.com"
        },
        save: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({
            _id: "507f1f77bcf86cd799439077",
            assignee: null
        })
    };
    SupportTicket.findById.mockResolvedValue(ticketDoc);

    const result = await AdminSupportService.assignTicket(
        "507f1f77bcf86cd799439077",
        "   "
    );

    expect(ticketDoc.assignee).toBeNull();
    expect(ticketDoc.assigneeSnapshot).toEqual({ name: "", email: "" });
    expect(result).toEqual({
        _id: "507f1f77bcf86cd799439077",
        assignee: null
    });
});

test("assignTicket rejects unknown active assignee", async () => {
    SupportTicket.findById.mockResolvedValue({
        _id: "507f1f77bcf86cd799439066",
        save: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({})
    });
    AdminAccount.findOne.mockResolvedValue(null);

    await expect(AdminSupportService.assignTicket(
        "507f1f77bcf86cd799439066",
        "507f1f77bcf86cd799439012"
    )).rejects.toMatchObject({
        statusCode: 404,
        message: "Assignee admin not found"
    });
});

test("addReply rejects invalid parent comment id", async () => {
    SupportTicket.findById.mockResolvedValue({
        _id: "507f1f77bcf86cd799439055",
        comments: []
    });

    await expect(AdminSupportService.addReply(
        { _id: ADMIN_ID, name: "Agent One", email: "agent@example.com" },
        "507f1f77bcf86cd799439055",
        {
            body: "Reply",
            parentCommentId: "invalid-id"
        }
    )).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid parent comment ID"
    });
});

test("addReply throws when parent comment does not exist", async () => {
    SupportTicket.findById.mockResolvedValue({
        _id: "507f1f77bcf86cd799439044",
        comments: [
            { _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439099") }
        ]
    });

    await expect(AdminSupportService.addReply(
        { _id: ADMIN_ID, name: "Agent One", email: "agent@example.com" },
        "507f1f77bcf86cd799439044",
        {
            body: "Reply",
            parentCommentId: "507f1f77bcf86cd799439088"
        }
    )).rejects.toMatchObject({
        statusCode: 404,
        message: "Parent comment not found"
    });
});

test("addReply inserts admin reply, normalizes attachments, and updates ticket state", async () => {
    const ticketDoc = {
        _id: "507f1f77bcf86cd799439033",
        status: "open",
        assignee: null,
        assigneeSnapshot: { name: "", email: "" },
        comments: [],
        save: jest.fn().mockResolvedValue({})
    };
    SupportTicket.findById.mockResolvedValue(ticketDoc);

    const result = await AdminSupportService.addReply(
        { _id: ADMIN_ID, name: "Agent One", email: "agent@example.com", role: "support_agent" },
        "507f1f77bcf86cd799439033",
        {
            body: "  We are checking this now  ",
            internalNote: true,
            attachments: [
                {
                    url: "https://example.com/log.txt",
                    name: "  log file ",
                    size: -10
                },
                {
                    url: "",
                    name: "invalid"
                }
            ]
        }
    );

    expect(ticketDoc.status).toBe("in_progress");
    expect(ticketDoc.assignee).toEqual(expect.any(mongoose.Types.ObjectId));
    expect(ticketDoc.comments).toHaveLength(1);
    expect(ticketDoc.comments[0]).toEqual(expect.objectContaining({
        authorRole: "admin",
        body: "We are checking this now",
        visibleToRequester: false,
        internalNote: true,
        attachments: [
            expect.objectContaining({
                url: "https://example.com/log.txt",
                name: "log file",
                size: 0
            })
        ]
    }));
    expect(result.comment.author).toEqual(expect.objectContaining({
        _id: ADMIN_ID,
        name: "Agent One"
    }));
    expect(result.status).toBe("in_progress");
});

test("listFeedback returns paginated feedback and rounded summary", async () => {
    SupportFeedback.find.mockReturnValue(makeListQuery([
        {
            _id: "507f1f77bcf86cd799439123",
            type: "bug_report",
            category: "security",
            message: "Issue details",
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

    const result = await AdminSupportService.listFeedback({
        page: 1,
        limit: 10,
        type: "bug_report",
        category: "security",
        search: "issue"
    });

    expect(SupportFeedback.find).toHaveBeenCalledWith(expect.objectContaining({
        type: "bug_report",
        category: "security",
        $or: expect.any(Array)
    }));
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
