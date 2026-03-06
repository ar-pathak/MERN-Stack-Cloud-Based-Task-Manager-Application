jest.mock("../../src/modules/support/support.service", () => ({
    listHelpArticles: jest.fn(),
    getHelpArticleBySlug: jest.fn(),
    listFaqs: jest.fn(),
    createSupportTicket: jest.fn(),
    listTickets: jest.fn(),
    getTicketById: jest.fn(),
    updateTicketStatus: jest.fn(),
    addTicketComment: jest.fn(),
    contactSupport: jest.fn(),
    submitFeedback: jest.fn(),
    listMyFeedback: jest.fn()
}));

jest.mock("../../src/helpers/responseHelper", () => ({
    sendSuccess: jest.fn((res, data = null, message = "Success", statusCode = 200) => (
        res.status(statusCode).json({
            success: true,
            message,
            ...(data !== null ? { data } : {})
        })
    )),
    handleError: jest.fn((error, res) => (
        res.status(error?.statusCode || 500).json({
            success: false,
            message: error?.message || "Internal server error"
        })
    ))
}));

const supportService = require("../../src/modules/support/support.service");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const supportController = require("../../src/modules/support/support.controller");

const createResponse = () => {
    const res = {
        statusCode: null,
        body: null
    };

    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });

    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
});

test("listHelpArticles returns service payload with default query fallback", async () => {
    supportService.listHelpArticles.mockResolvedValue({ articles: [] });
    const req = {};
    const res = createResponse();

    await supportController.listHelpArticles(req, res);

    expect(supportService.listHelpArticles).toHaveBeenCalledWith({});
    expect(sendSuccess).toHaveBeenCalledWith(res, { articles: [] });
    expect(res.statusCode).toBe(200);
});

test("getHelpArticleBySlug delegates slug from params", async () => {
    supportService.getHelpArticleBySlug.mockResolvedValue({ article: { slug: "test" } });
    const req = { params: { slug: "test" } };
    const res = createResponse();

    await supportController.getHelpArticleBySlug(req, res);

    expect(supportService.getHelpArticleBySlug).toHaveBeenCalledWith("test");
    expect(res.statusCode).toBe(200);
});

test("listFaqs uses query fallback and returns success payload", async () => {
    supportService.listFaqs.mockResolvedValue({ faqs: [] });
    const req = {};
    const res = createResponse();

    await supportController.listFaqs(req, res);

    expect(supportService.listFaqs).toHaveBeenCalledWith({});
    expect(res.statusCode).toBe(200);
});

test("createTicket sends custom success message with 201", async () => {
    supportService.createSupportTicket.mockResolvedValue({ _id: "t1" });
    const req = {
        user: { _id: "u1" },
        body: { subject: "Need help" }
    };
    const res = createResponse();

    await supportController.createTicket(req, res);

    expect(supportService.createSupportTicket).toHaveBeenCalledWith(req.user, req.body);
    expect(sendSuccess).toHaveBeenCalledWith(res, { _id: "t1" }, "Support ticket created", 201);
    expect(res.statusCode).toBe(201);
});

test("createTicket falls back to empty body payload when body is missing", async () => {
    supportService.createSupportTicket.mockResolvedValue({ _id: "t1" });
    const req = {
        user: { _id: "u1" }
    };
    const res = createResponse();

    await supportController.createTicket(req, res);

    expect(supportService.createSupportTicket).toHaveBeenCalledWith(req.user, {});
    expect(res.statusCode).toBe(201);
});

test("listTickets delegates user id and query", async () => {
    supportService.listTickets.mockResolvedValue({ tickets: [] });
    const req = {
        user: { _id: "u1" },
        query: { status: "open" }
    };
    const res = createResponse();

    await supportController.listTickets(req, res);

    expect(supportService.listTickets).toHaveBeenCalledWith("u1", req.query);
    expect(res.statusCode).toBe(200);
});

test("listTickets falls back to empty query when query is missing", async () => {
    supportService.listTickets.mockResolvedValue({ tickets: [] });
    const req = {
        user: { _id: "u1" }
    };
    const res = createResponse();

    await supportController.listTickets(req, res);

    expect(supportService.listTickets).toHaveBeenCalledWith("u1", {});
    expect(res.statusCode).toBe(200);
});

test("getTicketById delegates route ticket id", async () => {
    supportService.getTicketById.mockResolvedValue({ _id: "t1" });
    const req = {
        user: { _id: "u1" },
        params: { ticketId: "t1" }
    };
    const res = createResponse();

    await supportController.getTicketById(req, res);

    expect(supportService.getTicketById).toHaveBeenCalledWith("u1", "t1");
    expect(res.statusCode).toBe(200);
});

test("addTicketComment sends comment-specific success message", async () => {
    supportService.addTicketComment.mockResolvedValue({ comment: { _id: "c1" } });
    const req = {
        user: { _id: "u1" },
        params: { ticketId: "t1" },
        body: { body: "reply" }
    };
    const res = createResponse();

    await supportController.addTicketComment(req, res);

    expect(supportService.addTicketComment).toHaveBeenCalledWith(req.user, "t1", req.body);
    expect(sendSuccess).toHaveBeenCalledWith(
        res,
        { comment: { _id: "c1" } },
        "Comment added to ticket"
    );
    expect(res.statusCode).toBe(200);
});

test("addTicketComment falls back to empty body when body is missing", async () => {
    supportService.addTicketComment.mockResolvedValue({ comment: { _id: "c1" } });
    const req = {
        user: { _id: "u1" },
        params: { ticketId: "t1" }
    };
    const res = createResponse();

    await supportController.addTicketComment(req, res);

    expect(supportService.addTicketComment).toHaveBeenCalledWith(req.user, "t1", {});
    expect(res.statusCode).toBe(200);
});

test("contactSupport sends contact-specific success message with 201", async () => {
    supportService.contactSupport.mockResolvedValue({ _id: "t1" });
    const req = {
        user: { _id: "u1" },
        body: { message: "hello" }
    };
    const res = createResponse();

    await supportController.contactSupport(req, res);

    expect(supportService.contactSupport).toHaveBeenCalledWith(req.user, req.body);
    expect(sendSuccess).toHaveBeenCalledWith(res, { _id: "t1" }, "Contact request submitted", 201);
    expect(res.statusCode).toBe(201);
});

test("contactSupport falls back to empty body when body is missing", async () => {
    supportService.contactSupport.mockResolvedValue({ _id: "t1" });
    const req = {
        user: { _id: "u1" }
    };
    const res = createResponse();

    await supportController.contactSupport(req, res);

    expect(supportService.contactSupport).toHaveBeenCalledWith(req.user, {});
    expect(res.statusCode).toBe(201);
});

test("submitFeedback sends feedback-specific success message with 201", async () => {
    supportService.submitFeedback.mockResolvedValue({ _id: "f1" });
    const req = {
        user: { _id: "u1" },
        body: { type: "bug_report" }
    };
    const res = createResponse();

    await supportController.submitFeedback(req, res);

    expect(supportService.submitFeedback).toHaveBeenCalledWith(req.user, req.body);
    expect(sendSuccess).toHaveBeenCalledWith(res, { _id: "f1" }, "Feedback submitted", 201);
    expect(res.statusCode).toBe(201);
});

test("submitFeedback falls back to empty body when body is missing", async () => {
    supportService.submitFeedback.mockResolvedValue({ _id: "f1" });
    const req = {
        user: { _id: "u1" }
    };
    const res = createResponse();

    await supportController.submitFeedback(req, res);

    expect(supportService.submitFeedback).toHaveBeenCalledWith(req.user, {});
    expect(res.statusCode).toBe(201);
});

test("listFeedback delegates requester id and query", async () => {
    supportService.listMyFeedback.mockResolvedValue({ feedback: [] });
    const req = {
        user: { _id: "u1" },
        query: { page: "2" }
    };
    const res = createResponse();

    await supportController.listFeedback(req, res);

    expect(supportService.listMyFeedback).toHaveBeenCalledWith("u1", req.query);
    expect(res.statusCode).toBe(200);
});

test("listFeedback falls back to empty query when query is missing", async () => {
    supportService.listMyFeedback.mockResolvedValue({ feedback: [] });
    const req = {
        user: { _id: "u1" }
    };
    const res = createResponse();

    await supportController.listFeedback(req, res);

    expect(supportService.listMyFeedback).toHaveBeenCalledWith("u1", {});
    expect(res.statusCode).toBe(200);
});

test.each([
    ["listHelpArticles", "listHelpArticles", { query: {} }],
    ["getHelpArticleBySlug", "getHelpArticleBySlug", { params: { slug: "test" } }],
    ["listFaqs", "listFaqs", { query: {} }],
    ["createTicket", "createSupportTicket", { user: { _id: "u1" }, body: {} }],
    ["listTickets", "listTickets", { user: { _id: "u1" }, query: {} }],
    ["getTicketById", "getTicketById", { user: { _id: "u1" }, params: { ticketId: "t1" } }],
    ["addTicketComment", "addTicketComment", { user: { _id: "u1" }, params: { ticketId: "t1" }, body: {} }],
    ["contactSupport", "contactSupport", { user: { _id: "u1" }, body: {} }],
    ["submitFeedback", "submitFeedback", { user: { _id: "u1" }, body: {} }],
    ["listFeedback", "listMyFeedback", { user: { _id: "u1" }, query: {} }]
])("%s forwards service failures to handleError", async (controllerMethod, serviceMethod, req) => {
    const error = new Error(`${controllerMethod} failed`);
    error.statusCode = 422;
    supportService[serviceMethod].mockRejectedValue(error);
    const res = createResponse();

    await supportController[controllerMethod](req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(422);
});
