const mongoose = require("mongoose");
const SupportTicket = require("../../src/models/supportTicket");

const newId = () => new mongoose.Types.ObjectId();

const createTicket = (overrides = {}) => new SupportTicket({
    ticketNumber: "tkt-1001",
    requester: newId(),
    subject: "Need help",
    category: "security",
    description: "Details",
    ...overrides
});

const getSupportTicketPreSaveHook = () => SupportTicket.schema.s.hooks._pres.get("save")
    .find((entry) => String(entry.fn).includes("this.isModified(\"status\")"))
    .fn;

afterEach(() => {
    jest.restoreAllMocks();
});

test("pre-save hook updates closed timestamps and latest admin reply metadata", () => {
    const hook = getSupportTicketPreSaveHook();
    const firstCommentAt = new Date("2026-03-01T00:00:00.000Z");
    const secondCommentAt = new Date("2026-03-02T00:00:00.000Z");
    const ticket = createTicket({
        status: "closed",
        comments: [
            { authorRole: "user", createdAt: firstCommentAt },
            { authorRole: "admin", createdAt: secondCommentAt }
        ]
    });

    ticket.isModified = jest.fn().mockImplementation((field) => field === "status");

    hook.call(ticket);

    expect(ticket.closedAt).toBeInstanceOf(Date);
    expect(ticket.lastRepliedAt).toEqual(secondCommentAt);
    expect(ticket.lastAdminReplyAt).toEqual(secondCommentAt);
});

test("pre-save hook reopens closed tickets and falls back when comments lack timestamps", () => {
    const hook = getSupportTicketPreSaveHook();
    const existingAdminReplyAt = new Date("2026-03-01T12:00:00.000Z");
    const ticket = createTicket({
        status: "open",
        comments: [{ authorRole: "user" }],
        lastAdminReplyAt: existingAdminReplyAt
    });

    ticket.isModified = jest.fn().mockImplementation((field) => field === "status");

    hook.call(ticket);

    expect(ticket.closedAt).toBeNull();
    expect(ticket.lastRepliedAt).toBeInstanceOf(Date);
    expect(ticket.lastAdminReplyAt).toEqual(existingAdminReplyAt);
});

test("pre-save hook skips reply metadata updates when comments are absent", () => {
    const hook = getSupportTicketPreSaveHook();
    const ticket = createTicket({
        status: "open",
        comments: null,
        closedAt: null,
        lastRepliedAt: null,
        lastAdminReplyAt: null
    });

    ticket.isModified = jest.fn().mockReturnValue(false);

    hook.call(ticket);

    expect(ticket.closedAt).toBeNull();
    expect(ticket.lastRepliedAt).toBeNull();
    expect(ticket.lastAdminReplyAt).toBeNull();
});
