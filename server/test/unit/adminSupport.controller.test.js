jest.mock("../../src/modules/admin/adminSupport.service", () => ({
    listAgents: jest.fn(),
    getDashboardSummary: jest.fn(),
    listTickets: jest.fn(),
    getTicketById: jest.fn(),
    updateTicketStatus: jest.fn(),
    assignTicket: jest.fn(),
    addReply: jest.fn(),
    listFeedback: jest.fn()
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

const AdminSupportService = require("../../src/modules/admin/adminSupport.service");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const AdminSupportController = require("../../src/modules/admin/adminSupport.controller");

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

test("listAgents returns normalized agent payload", async () => {
    AdminSupportService.listAgents.mockResolvedValue([
        {
            _id: "admin-1",
            name: "Agent One"
        }
    ]);
    const req = {};
    const res = createResponse();

    await AdminSupportController.listAgents(req, res);

    expect(AdminSupportService.listAgents).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
        success: true,
        message: "Success",
        data: {
            agents: [
                {
                    _id: "admin-1",
                    name: "Agent One"
                }
            ]
        }
    });
});

test("getDashboardSummary forwards summary response", async () => {
    AdminSupportService.getDashboardSummary.mockResolvedValue({
        totals: {
            totalTickets: 3
        }
    });
    const req = {};
    const res = createResponse();

    await AdminSupportController.getDashboardSummary(req, res);

    expect(AdminSupportService.getDashboardSummary).toHaveBeenCalledTimes(1);
    expect(sendSuccess).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
});

test("listTickets calls service with req.admin and req.query", async () => {
    AdminSupportService.listTickets.mockResolvedValue({
        tickets: []
    });
    const req = {
        admin: { _id: "admin-1" },
        query: { status: "open", page: "1" }
    };
    const res = createResponse();

    await AdminSupportController.listTickets(req, res);

    expect(AdminSupportService.listTickets).toHaveBeenCalledWith(
        req.admin,
        req.query
    );
    expect(res.statusCode).toBe(200);
});

test("getTicketById delegates ticket id from params", async () => {
    AdminSupportService.getTicketById.mockResolvedValue({
        _id: "ticket-1"
    });
    const req = {
        params: {
            ticketId: "ticket-1"
        }
    };
    const res = createResponse();

    await AdminSupportController.getTicketById(req, res);

    expect(AdminSupportService.getTicketById).toHaveBeenCalledWith("ticket-1");
    expect(res.statusCode).toBe(200);
});

test("updateTicketStatus delegates admin, ticket id and status", async () => {
    AdminSupportService.updateTicketStatus.mockResolvedValue({
        _id: "ticket-1",
        status: "resolved"
    });
    const req = {
        admin: { _id: "admin-1" },
        params: { ticketId: "ticket-1" },
        body: { status: "resolved" }
    };
    const res = createResponse();

    await AdminSupportController.updateTicketStatus(req, res);

    expect(AdminSupportService.updateTicketStatus).toHaveBeenCalledWith(
        req.admin,
        "ticket-1",
        "resolved"
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
        success: true,
        message: "Ticket status updated"
    }));
});

test("assignTicket delegates assignment payload and returns message", async () => {
    AdminSupportService.assignTicket.mockResolvedValue({
        _id: "ticket-1"
    });
    const req = {
        params: { ticketId: "ticket-1" },
        body: { assigneeId: "admin-2" }
    };
    const res = createResponse();

    await AdminSupportController.assignTicket(req, res);

    expect(AdminSupportService.assignTicket).toHaveBeenCalledWith("ticket-1", "admin-2");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
        success: true,
        message: "Ticket assignment updated"
    }));
});

test("addReply delegates reply payload and returns success message", async () => {
    AdminSupportService.addReply.mockResolvedValue({
        ticketId: "ticket-1"
    });
    const req = {
        admin: { _id: "admin-1" },
        params: { ticketId: "ticket-1" },
        body: { body: "reply" }
    };
    const res = createResponse();

    await AdminSupportController.addReply(req, res);

    expect(AdminSupportService.addReply).toHaveBeenCalledWith(
        req.admin,
        "ticket-1",
        { body: "reply" }
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
        success: true,
        message: "Reply posted"
    }));
});

test("listFeedback delegates query payload", async () => {
    AdminSupportService.listFeedback.mockResolvedValue({
        feedback: []
    });
    const req = {
        query: { type: "bug_report" }
    };
    const res = createResponse();

    await AdminSupportController.listFeedback(req, res);

    expect(AdminSupportService.listFeedback).toHaveBeenCalledWith({ type: "bug_report" });
    expect(res.statusCode).toBe(200);
});

test("controller forwards service errors to handleError", async () => {
    const error = new Error("summary failed");
    error.statusCode = 503;
    AdminSupportService.getDashboardSummary.mockRejectedValue(error);

    const req = {};
    const res = createResponse();

    await AdminSupportController.getDashboardSummary(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(503);
});

test.each([
    ["listAgents", "listAgents", { req: {} }],
    ["listTickets", "listTickets", { req: { admin: { _id: "admin-1" }, query: {} } }],
    ["getTicketById", "getTicketById", { req: { params: { ticketId: "ticket-1" } } }],
    ["updateTicketStatus", "updateTicketStatus", { req: { admin: { _id: "admin-1" }, params: { ticketId: "ticket-1" }, body: { status: "open" } } }],
    ["assignTicket", "assignTicket", { req: { params: { ticketId: "ticket-1" }, body: { assigneeId: "admin-2" } } }],
    ["addReply", "addReply", { req: { admin: { _id: "admin-1" }, params: { ticketId: "ticket-1" }, body: { body: "reply" } } }],
    ["listFeedback", "listFeedback", { req: { query: {} } }]
])("%s delegates failures to handleError", async (handlerName, serviceMethod, fixture) => {
    const error = new Error(`${handlerName} failed`);
    error.statusCode = 422;
    AdminSupportService[serviceMethod].mockRejectedValue(error);

    const res = createResponse();
    await AdminSupportController[handlerName](fixture.req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(422);
});

test("listTickets/addReply/listFeedback pass fallback empty objects when payload is missing", async () => {
    const res = createResponse();

    AdminSupportService.listTickets.mockResolvedValue({ tickets: [] });
    await AdminSupportController.listTickets({ admin: { _id: "admin-1" } }, res);
    expect(AdminSupportService.listTickets).toHaveBeenCalledWith(
        { _id: "admin-1" },
        {}
    );

    AdminSupportService.addReply.mockResolvedValue({ ok: true });
    await AdminSupportController.addReply({
        admin: { _id: "admin-1" },
        params: { ticketId: "ticket-1" }
    }, res);
    expect(AdminSupportService.addReply).toHaveBeenCalledWith(
        { _id: "admin-1" },
        "ticket-1",
        {}
    );

    AdminSupportService.listFeedback.mockResolvedValue({ feedback: [] });
    await AdminSupportController.listFeedback({}, res);
    expect(AdminSupportService.listFeedback).toHaveBeenCalledWith({});
});
