import { beforeEach, expect, test, vi } from "vitest";

const { adminApiMock } = vi.hoisted(() => ({
    adminApiMock: {
        get: vi.fn(),
        patch: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock("../../config/adminAxios", () => ({
    default: adminApiMock,
}));

import {
    addAdminSupportReply,
    assignAdminSupportTicket,
    getAdminSupportAgents,
    getAdminSupportFeedback,
    getAdminSupportSummary,
    getAdminSupportTicketById,
    getAdminSupportTickets,
    updateAdminSupportTicketStatus,
} from "../../service/adminSupport.service.js";

beforeEach(() => {
    Object.values(adminApiMock).forEach((mockFn) => mockFn.mockReset());
});

test("admin support summary unwraps response payloads", async () => {
    adminApiMock.get.mockResolvedValueOnce({
        data: {
            data: { open: 3, closed: 2 },
        },
    });

    const summary = await getAdminSupportSummary();

    expect(adminApiMock.get).toHaveBeenCalledWith("/api/admin/support/summary");
    expect(summary).toEqual({ open: 3, closed: 2 });
});

test("admin support agents normalize array payloads", async () => {
    adminApiMock.get
        .mockResolvedValueOnce({
            data: { data: { agents: [{ id: "a1" }] } },
        })
        .mockResolvedValueOnce({
            data: { data: { agents: null } },
        });

    const first = await getAdminSupportAgents();
    const second = await getAdminSupportAgents();

    expect(first).toEqual([{ id: "a1" }]);
    expect(second).toEqual([]);
});

test("admin support tickets normalize pagination defaults", async () => {
    adminApiMock.get
        .mockResolvedValueOnce({
            data: {
                data: {
                    tickets: [{ id: "t1" }],
                    statuses: ["open"],
                    summary: { total: 1 },
                    agents: [{ id: "a1" }],
                    pagination: {
                        page: 2,
                        limit: 10,
                        total: 5,
                        totalPages: 1,
                        hasMore: true,
                    },
                },
            },
        })
        .mockResolvedValueOnce({
            data: {
                data: {
                    tickets: "invalid",
                    statuses: null,
                    agents: undefined,
                },
            },
        });

    const full = await getAdminSupportTickets({ page: 2 });
    const empty = await getAdminSupportTickets();

    expect(adminApiMock.get).toHaveBeenNthCalledWith(
        1,
        "/api/admin/support/tickets",
        { params: { page: 2 } }
    );
    expect(full).toEqual({
        tickets: [{ id: "t1" }],
        statuses: ["open"],
        summary: { total: 1 },
        agents: [{ id: "a1" }],
        pagination: {
            page: 2,
            limit: 10,
            total: 5,
            totalPages: 1,
            hasMore: true,
        },
    });

    expect(empty).toEqual({
        tickets: [],
        statuses: [],
        summary: null,
        agents: [],
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
        },
    });
});

test("admin support ticket actions unwrap response data", async () => {
    adminApiMock.get.mockResolvedValueOnce({ data: { ticket: { id: "t2" } } });
    adminApiMock.patch
        .mockResolvedValueOnce({ data: { data: { updated: true } } })
        .mockResolvedValueOnce({ data: { ok: true } });
    adminApiMock.post.mockResolvedValueOnce({});

    const ticket = await getAdminSupportTicketById("t2");
    const updated = await updateAdminSupportTicketStatus("t2", "resolved");
    const assigned = await assignAdminSupportTicket("t2");
    const reply = await addAdminSupportReply("t2", { message: "ok" });

    expect(ticket).toEqual({ ticket: { id: "t2" } });
    expect(updated).toEqual({ updated: true });
    expect(assigned).toEqual({ ok: true });
    expect(reply).toEqual({});

    expect(adminApiMock.get).toHaveBeenCalledWith("/api/admin/support/tickets/t2");
    expect(adminApiMock.patch).toHaveBeenNthCalledWith(
        1,
        "/api/admin/support/tickets/t2/status",
        { status: "resolved" }
    );
    expect(adminApiMock.patch).toHaveBeenNthCalledWith(
        2,
        "/api/admin/support/tickets/t2/assign",
        { assigneeId: "" }
    );
    expect(adminApiMock.post).toHaveBeenCalledWith(
        "/api/admin/support/tickets/t2/replies",
        { message: "ok" }
    );
});

test("admin support feedback normalizes payloads and defaults", async () => {
    adminApiMock.get
        .mockResolvedValueOnce({
            data: {
                data: {
                    feedback: [{ id: "f1" }],
                    summary: { averageRating: 4, total: 10 },
                    pagination: { page: 2, limit: 5, total: 10, totalPages: 2, hasMore: true },
                },
            },
        })
        .mockResolvedValueOnce({
            data: {
                data: {
                    feedback: null,
                },
            },
        });

    const full = await getAdminSupportFeedback({ page: 2 });
    const empty = await getAdminSupportFeedback();

    expect(full).toEqual({
        feedback: [{ id: "f1" }],
        summary: { averageRating: 4, total: 10 },
        pagination: {
            page: 2,
            limit: 5,
            total: 10,
            totalPages: 2,
            hasMore: true,
        },
    });
    expect(empty).toEqual({
        feedback: [],
        summary: { averageRating: 0, total: 0 },
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
        },
    });
});
