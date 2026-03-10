import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock("../../config/axios", () => ({
    default: apiMock,
}));

import {
    addSupportTicketComment,
    createSupportTicket,
    getMySupportFeedback,
    getSupportArticle,
    getSupportArticles,
    getSupportFaqs,
    getSupportTicketById,
    getSupportTickets,
    submitContactSupport,
    submitSupportFeedback,
} from "../../service/support.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("support articles normalize arrays and pagination", async () => {
    apiMock.get
        .mockResolvedValueOnce({
            data: {
                data: {
                    articles: [{ id: "a1" }],
                    categories: ["general"],
                    pagination: {
                        page: 2,
                        limit: 5,
                        total: 10,
                        totalPages: 2,
                        hasMore: true,
                    },
                },
            },
        })
        .mockResolvedValueOnce({
            data: {
                articles: "invalid",
                categories: null,
            },
        })
        .mockResolvedValueOnce({});

    const full = await getSupportArticles({ page: 2 });
    const empty = await getSupportArticles();
    const fallback = await getSupportArticles();

    expect(apiMock.get).toHaveBeenNthCalledWith(
        1,
        "/api/support/articles",
        { params: { page: 2 } }
    );
    expect(full).toEqual({
        articles: [{ id: "a1" }],
        categories: ["general"],
        pagination: {
            page: 2,
            limit: 5,
            total: 10,
            totalPages: 2,
            hasMore: true,
        },
    });
    expect(empty).toEqual({
        articles: [],
        categories: [],
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
        },
    });
    expect(fallback).toEqual({
        articles: [],
        categories: [],
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
        },
    });
});

test("support articles and FAQs unwrap payloads", async () => {
    apiMock.get
        .mockResolvedValueOnce({
            data: {
                data: {
                    article: { id: "art-1" },
                    related: [{ id: "rel-1" }],
                },
            },
        })
        .mockResolvedValueOnce({
            data: {
                article: null,
                related: "invalid",
            },
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
            data: {
                faqs: ["faq-1"],
                categories: ["setup"],
            },
        })
        .mockResolvedValueOnce({});

    const article = await getSupportArticle("intro");
    const emptyArticle = await getSupportArticle("missing");
    const fallbackArticle = await getSupportArticle("fallback");
    const faqs = await getSupportFaqs();
    const emptyFaqs = await getSupportFaqs();

    expect(apiMock.get).toHaveBeenNthCalledWith(
        1,
        "/api/support/articles/intro"
    );
    expect(article).toEqual({
        article: { id: "art-1" },
        related: [{ id: "rel-1" }],
    });
    expect(emptyArticle).toEqual({
        article: null,
        related: [],
    });
    expect(fallbackArticle).toEqual({
        article: null,
        related: [],
    });
    expect(faqs).toEqual({
        faqs: ["faq-1"],
        categories: ["setup"],
    });
    expect(emptyFaqs).toEqual({ faqs: [], categories: [] });
});

test("support tickets normalize lists and pagination", async () => {
    apiMock.get
        .mockResolvedValueOnce({
            data: {
                data: {
                    tickets: [{ id: "t1" }],
                    statuses: ["open"],
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
                tickets: null,
                statuses: undefined,
            },
        })
        .mockResolvedValueOnce({});

    const full = await getSupportTickets({ page: 2 });
    const empty = await getSupportTickets();
    const fallback = await getSupportTickets();

    expect(full).toEqual({
        tickets: [{ id: "t1" }],
        statuses: ["open"],
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
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
        },
    });
    expect(fallback).toEqual({
        tickets: [],
        statuses: [],
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
        },
    });
});

test("support feedback normalizes payloads and defaults", async () => {
    apiMock.get
        .mockResolvedValueOnce({
            data: {
                data: {
                    feedback: [{ id: "f1" }],
                    summary: { averageRating: 4, total: 10 },
                    pagination: {
                        page: 2,
                        limit: 10,
                        total: 10,
                        totalPages: 1,
                        hasMore: true,
                    },
                },
            },
        })
        .mockResolvedValueOnce({
            data: {
                feedback: null,
            },
        })
        .mockResolvedValueOnce({});

    const full = await getMySupportFeedback({ page: 2 });
    const empty = await getMySupportFeedback();
    const fallback = await getMySupportFeedback();

    expect(full).toEqual({
        feedback: [{ id: "f1" }],
        summary: { averageRating: 4, total: 10 },
        pagination: {
            page: 2,
            limit: 10,
            total: 10,
            totalPages: 1,
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
    expect(fallback).toEqual({
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

test("support ticket creation and updates unwrap response data", async () => {
    apiMock.post
        .mockResolvedValueOnce({ data: { data: { id: "t2" } } })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ data: { ok: true } })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ data: { data: { ok: true } } })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ data: { ok: true } })
        .mockResolvedValueOnce({});
    apiMock.get
        .mockResolvedValueOnce({ data: { ticket: { id: "t2" } } })
        .mockResolvedValueOnce({});

    const created = await createSupportTicket({ subject: "Help" });
    const createdFallback = await createSupportTicket({ subject: "Missing" });
    const ticket = await getSupportTicketById("t2");
    const ticketFallback = await getSupportTicketById("missing");
    const comment = await addSupportTicketComment("t2", { message: "hi" });
    const commentFallback = await addSupportTicketComment("t2", { message: "missing" });
    const contact = await submitContactSupport({ message: "contact" });
    const contactFallback = await submitContactSupport({ message: "missing" });
    const feedback = await submitSupportFeedback({ rating: 5 });
    const feedbackFallback = await submitSupportFeedback({ rating: 1 });

    expect(created).toEqual({ id: "t2" });
    expect(createdFallback).toBeNull();
    expect(ticket).toEqual({ ticket: { id: "t2" } });
    expect(ticketFallback).toBeNull();
    expect(comment).toEqual({ ok: true });
    expect(commentFallback).toBeNull();
    expect(contact).toEqual({ ok: true });
    expect(contactFallback).toBeNull();
    expect(feedback).toEqual({ ok: true });
    expect(feedbackFallback).toBeNull();

    expect(apiMock.post).toHaveBeenNthCalledWith(
        1,
        "/api/support/tickets",
        { subject: "Help" }
    );
    expect(apiMock.post).toHaveBeenNthCalledWith(
        2,
        "/api/support/tickets",
        { subject: "Missing" }
    );
    expect(apiMock.get).toHaveBeenNthCalledWith(1, "/api/support/tickets/t2");
    expect(apiMock.get).toHaveBeenNthCalledWith(2, "/api/support/tickets/missing");
    expect(apiMock.post).toHaveBeenNthCalledWith(
        3,
        "/api/support/tickets/t2/comments",
        { message: "hi" }
    );
    expect(apiMock.post).toHaveBeenNthCalledWith(
        4,
        "/api/support/tickets/t2/comments",
        { message: "missing" }
    );
    expect(apiMock.post).toHaveBeenNthCalledWith(
        5,
        "/api/support/contact",
        { message: "contact" }
    );
    expect(apiMock.post).toHaveBeenNthCalledWith(
        6,
        "/api/support/contact",
        { message: "missing" }
    );
    expect(apiMock.post).toHaveBeenNthCalledWith(
        7,
        "/api/support/feedback",
        { rating: 5 }
    );
    expect(apiMock.post).toHaveBeenNthCalledWith(
        8,
        "/api/support/feedback",
        { rating: 1 }
    );
});
