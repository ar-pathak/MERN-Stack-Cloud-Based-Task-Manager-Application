import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const {
    useAuthMock,
    toastSuccessMock,
    toastErrorMock,
    uploadMultipleFilesMock,
    getSupportArticlesMock,
    getSupportArticleMock,
    getSupportFaqsMock,
    createSupportTicketMock,
    getSupportTicketsMock,
    getSupportTicketByIdMock,
    addSupportTicketCommentMock,
    submitContactSupportMock,
    submitSupportFeedbackMock,
    getMySupportFeedbackMock,
} = vi.hoisted(() => ({
    useAuthMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    uploadMultipleFilesMock: vi.fn(),
    getSupportArticlesMock: vi.fn(),
    getSupportArticleMock: vi.fn(),
    getSupportFaqsMock: vi.fn(),
    createSupportTicketMock: vi.fn(),
    getSupportTicketsMock: vi.fn(),
    getSupportTicketByIdMock: vi.fn(),
    addSupportTicketCommentMock: vi.fn(),
    submitContactSupportMock: vi.fn(),
    submitSupportFeedbackMock: vi.fn(),
    getMySupportFeedbackMock: vi.fn(),
}));

vi.mock("../../../../../../context/AuthContext", () => ({
    useAuth: useAuthMock,
}));

vi.mock("sonner", () => ({
    toast: {
        success: toastSuccessMock,
        error: toastErrorMock,
    },
}));

vi.mock("../../../../../../service/upload.service", () => ({
    uploadService: {
        uploadMultipleFiles: uploadMultipleFilesMock,
    },
}));

vi.mock("../../../../../../service/support.service", () => ({
    getSupportArticles: getSupportArticlesMock,
    getSupportArticle: getSupportArticleMock,
    getSupportFaqs: getSupportFaqsMock,
    createSupportTicket: createSupportTicketMock,
    getSupportTickets: getSupportTicketsMock,
    getSupportTicketById: getSupportTicketByIdMock,
    addSupportTicketComment: addSupportTicketCommentMock,
    submitContactSupport: submitContactSupportMock,
    submitSupportFeedback: submitSupportFeedbackMock,
    getMySupportFeedback: getMySupportFeedbackMock,
}));

import useHelpSupportController from "../../../../../../features/main/features/support/hooks/useHelpSupportController.js";

const createImageFile = (name = "image.png") =>
    new File(["binary"], name, { type: "image/png" });

const waitForPrimaryLoads = async () => {
    await waitFor(() => expect(getSupportArticlesMock).toHaveBeenCalled());
    await waitFor(() => expect(getSupportFaqsMock).toHaveBeenCalled());
    await waitFor(() => expect(getSupportTicketsMock).toHaveBeenCalled());
    await waitFor(() => expect(getMySupportFeedbackMock).toHaveBeenCalled());
    await waitFor(() =>
        expect(getSupportArticleMock).toHaveBeenCalledWith("getting-started")
    );
    await waitFor(() =>
        expect(getSupportTicketByIdMock).toHaveBeenCalledWith("ticket-1")
    );
};

beforeEach(() => {
    vi.clearAllMocks();

    window.innerWidth = 1280;

    useAuthMock.mockReturnValue({
        user: {
            _id: "user-1",
            name: "Riya",
            email: "riya@example.com",
        },
    });

    getSupportArticlesMock.mockResolvedValue({
        articles: [{ slug: "getting-started", title: "Getting Started" }],
        categories: [{ key: "all", label: "All", count: 1 }],
    });

    getSupportArticleMock.mockResolvedValue({
        article: {
            slug: "getting-started",
            title: "Getting Started",
            contentMarkdown: "Welcome",
        },
        related: [{ slug: "billing", title: "Billing" }],
    });

    getSupportFaqsMock.mockResolvedValue({
        faqs: [{ id: "faq-1", question: "How?", answerMarkdown: "Use settings" }],
    });

    getSupportTicketsMock.mockResolvedValue({
        tickets: [
            {
                _id: "ticket-1",
                ticketNumber: "TCK-1",
                subject: "Need help",
                status: "open",
                updatedAt: "2026-03-16T10:00:00.000Z",
            },
        ],
        statuses: [{ key: "open", count: 1 }],
    });

    getSupportTicketByIdMock.mockResolvedValue({
        _id: "ticket-1",
        ticketNumber: "TCK-1",
        comments: [
            {
                _id: "comment-1",
                body: "Root",
                createdAt: "2026-03-16T10:00:00.000Z",
            },
            {
                _id: "comment-2",
                parentCommentId: "comment-1",
                body: "Child",
                createdAt: "2026-03-16T10:01:00.000Z",
            },
        ],
    });

    getMySupportFeedbackMock.mockResolvedValue({
        feedback: [{ _id: "fb-1", message: "Great support", rating: 4 }],
        summary: { averageRating: 4, total: 1 },
    });

    uploadMultipleFilesMock.mockResolvedValue([
        {
            url: "https://cdn.example.com/image.png",
            name: "image.png",
            type: "image/png",
            size: 200,
        },
    ]);

    createSupportTicketMock.mockResolvedValue({ _id: "ticket-2" });
    addSupportTicketCommentMock.mockResolvedValue({ _id: "comment-new" });
    submitContactSupportMock.mockResolvedValue({ _id: "ticket-3" });
    submitSupportFeedbackMock.mockResolvedValue({ _id: "feedback-1" });
});

test("loads support datasets and exposes normalized view model data", async () => {
    const { result } = renderHook(() => useHelpSupportController());

    await waitForPrimaryLoads();

    expect(result.current.profileId).toBe("user-1");
    expect(result.current.shouldShowBottomNav).toBe(false);

    expect(result.current.helpCenterProps.articles).toHaveLength(1);
    expect(result.current.helpCenterProps.selectedArticleSlug).toBe("getting-started");
    expect(result.current.helpCenterProps.selectedArticle).toMatchObject({
        slug: "getting-started",
    });
    expect(result.current.helpCenterProps.relatedArticles).toHaveLength(1);

    expect(result.current.ticketsProps.selectedTicketId).toBe("ticket-1");
    expect(result.current.ticketsProps.ticketDetail).toMatchObject({ _id: "ticket-1" });
    expect(result.current.ticketsProps.commentTree).toHaveLength(1);
    expect(result.current.ticketsProps.commentTree[0].children).toHaveLength(1);

    expect(result.current.contactFeedbackProps.contactForm).toMatchObject({
        name: "Riya",
        email: "riya@example.com",
    });
    expect(result.current.contactFeedbackProps.feedbackSummary).toEqual({
        averageRating: 4,
        total: 1,
    });
});

test("updates mobile-nav visibility when viewport changes", async () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useHelpSupportController());

    await waitFor(() => {
        expect(result.current.shouldShowBottomNav).toBe(true);
    });

    act(() => {
        window.innerWidth = 1400;
        window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
        expect(result.current.shouldShowBottomNav).toBe(false);
    });
});

test("validates attachment selection and enforces file limits", async () => {
    const { result } = renderHook(() => useHelpSupportController());
    await waitForPrimaryLoads();

    const invalidEvent = {
        target: {
            files: [new File(["text"], "note.txt", { type: "text/plain" })],
            value: "x",
        },
    };

    act(() => {
        result.current.ticketsProps.handleFileSelection(invalidEvent, "ticket");
    });

    expect(toastErrorMock).toHaveBeenCalledWith("Only image files are allowed.");
    expect(result.current.ticketsProps.ticketFiles).toHaveLength(0);

    const ticketEvent = {
        target: {
            files: [
                createImageFile("1.png"),
                createImageFile("2.png"),
                createImageFile("3.png"),
                createImageFile("4.png"),
                createImageFile("5.png"),
                createImageFile("6.png"),
            ],
            value: "x",
        },
    };

    act(() => {
        result.current.ticketsProps.handleFileSelection(ticketEvent, "ticket");
    });

    expect(ticketEvent.target.value).toBe("");
    expect(result.current.ticketsProps.ticketFiles).toHaveLength(5);

    const commentEvent = {
        target: {
            files: [createImageFile("reply.png")],
            value: "x",
        },
    };

    act(() => {
        result.current.ticketsProps.handleFileSelection(commentEvent, "comment");
    });

    expect(result.current.ticketsProps.commentFiles).toHaveLength(1);
});

test("creates tickets with uploaded attachments and resets compose state", async () => {
    const { result } = renderHook(() => useHelpSupportController());
    await waitForPrimaryLoads();

    uploadMultipleFilesMock.mockResolvedValueOnce([
        {
            url: "https://cdn.example.com/ok.png",
            name: "ok.png",
            type: "image/png",
            size: 111,
        },
        {
            url: "",
            name: "skip.png",
            type: "image/png",
            size: 100,
        },
    ]);

    act(() => {
        result.current.ticketsProps.setTicketForm((previous) => ({
            ...previous,
            subject: "Billing issue",
            category: "billing",
            priority: "high",
            description: "Need invoice support",
        }));
    });

    act(() => {
        result.current.ticketsProps.handleFileSelection(
            { target: { files: [createImageFile("ticket.png")], value: "x" } },
            "ticket"
        );
    });

    const event = { preventDefault: vi.fn() };
    await act(async () => {
        await result.current.ticketsProps.handleCreateTicket(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(uploadMultipleFilesMock).toHaveBeenCalled();
    expect(createSupportTicketMock).toHaveBeenCalledWith(
        expect.objectContaining({
            subject: "Billing issue",
            category: "billing",
            priority: "high",
            description: "Need invoice support",
            attachments: [
                {
                    url: "https://cdn.example.com/ok.png",
                    name: "ok.png",
                    type: "image/png",
                    size: 111,
                },
            ],
        })
    );
    expect(toastSuccessMock).toHaveBeenCalledWith("Support ticket created.");

    await waitFor(() => {
        expect(result.current.ticketsProps.selectedTicketId).toBe("ticket-2");
    });

    expect(result.current.ticketsProps.ticketFiles).toHaveLength(0);
    expect(result.current.ticketsProps.ticketForm.subject).toBe("");
});

test("posts ticket replies with attachments and clears reply state", async () => {
    const { result } = renderHook(() => useHelpSupportController());
    await waitForPrimaryLoads();

    act(() => {
        result.current.ticketsProps.setCommentBody("Thanks for the help.");
        result.current.ticketsProps.setCommentReplyParentId("comment-1");
    });

    act(() => {
        result.current.ticketsProps.handleFileSelection(
            { target: { files: [createImageFile("reply.png")], value: "x" } },
            "comment"
        );
    });

    const event = { preventDefault: vi.fn() };
    await act(async () => {
        await result.current.ticketsProps.handleAddComment(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(addSupportTicketCommentMock).toHaveBeenCalledWith(
        "ticket-1",
        expect.objectContaining({
            body: "Thanks for the help.",
            parentCommentId: "comment-1",
            attachments: [
                expect.objectContaining({
                    url: "https://cdn.example.com/image.png",
                }),
            ],
        })
    );
    expect(toastSuccessMock).toHaveBeenCalledWith("Reply posted.");
    expect(result.current.ticketsProps.commentBody).toBe("");
    expect(result.current.ticketsProps.replyingToComment).toBeNull();
    expect(result.current.ticketsProps.commentFiles).toHaveLength(0);
});

test("submits contact and feedback forms and resets local form state", async () => {
    const { result } = renderHook(() => useHelpSupportController());
    await waitForPrimaryLoads();

    act(() => {
        result.current.contactFeedbackProps.setContactForm((previous) => ({
            ...previous,
            message: "I need account help.",
        }));
    });

    await act(async () => {
        await result.current.contactFeedbackProps.handleSubmitContact({
            preventDefault: vi.fn(),
        });
    });

    expect(submitContactSupportMock).toHaveBeenCalledWith(
        expect.objectContaining({
            name: "Riya",
            email: "riya@example.com",
            message: "I need account help.",
        })
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
        "Contact request sent. Ticket created."
    );

    await waitFor(() => {
        expect(result.current.ticketsProps.selectedTicketId).toBe("ticket-3");
    });

    expect(result.current.contactFeedbackProps.contactForm.message).toBe("");

    act(() => {
        result.current.contactFeedbackProps.setFeedbackForm((previous) => ({
            ...previous,
            type: "bug_report",
            message: "The dashboard flickers.",
            rating: 3,
        }));
    });

    await act(async () => {
        await result.current.contactFeedbackProps.handleSubmitFeedback({
            preventDefault: vi.fn(),
        });
    });

    expect(submitSupportFeedbackMock).toHaveBeenCalledWith(
        expect.objectContaining({
            type: "bug_report",
            message: "The dashboard flickers.",
            rating: 3,
        })
    );
    expect(toastSuccessMock).toHaveBeenCalledWith("Feedback submitted.");
    expect(result.current.contactFeedbackProps.feedbackForm.message).toBe("");
    expect(result.current.contactFeedbackProps.feedbackForm.rating).toBe(5);
});

test("refreshEverything triggers silent reloads and detail refreshes", async () => {
    const { result } = renderHook(() => useHelpSupportController());
    await waitForPrimaryLoads();

    const articleCallsBefore = getSupportArticlesMock.mock.calls.length;
    const faqCallsBefore = getSupportFaqsMock.mock.calls.length;
    const ticketCallsBefore = getSupportTicketsMock.mock.calls.length;
    const feedbackCallsBefore = getMySupportFeedbackMock.mock.calls.length;
    const articleDetailCallsBefore = getSupportArticleMock.mock.calls.length;
    const ticketDetailCallsBefore = getSupportTicketByIdMock.mock.calls.length;

    await act(async () => {
        await result.current.refreshEverything();
    });

    expect(result.current.refreshing).toBe(false);
    expect(getSupportArticlesMock.mock.calls.length).toBeGreaterThan(articleCallsBefore);
    expect(getSupportFaqsMock.mock.calls.length).toBeGreaterThan(faqCallsBefore);
    expect(getSupportTicketsMock.mock.calls.length).toBeGreaterThan(ticketCallsBefore);
    expect(getMySupportFeedbackMock.mock.calls.length).toBeGreaterThan(feedbackCallsBefore);
    expect(getSupportArticleMock.mock.calls.length).toBeGreaterThan(articleDetailCallsBefore);
    expect(getSupportTicketByIdMock.mock.calls.length).toBeGreaterThan(
        ticketDetailCallsBefore
    );
});

test("surfaces loader failures with fallback states", async () => {
    getSupportArticlesMock.mockRejectedValueOnce({
        response: { data: { message: "Article fetch failed" } },
    });
    getSupportFaqsMock.mockRejectedValueOnce(new Error("faq failed"));
    getSupportTicketsMock.mockRejectedValueOnce(new Error("ticket failed"));
    getMySupportFeedbackMock.mockRejectedValueOnce(new Error("feedback failed"));

    const { result } = renderHook(() => useHelpSupportController());

    await waitFor(() => {
        expect(result.current.helpCenterProps.articlesError).toBe("Article fetch failed");
    });

    expect(result.current.helpCenterProps.articles).toEqual([]);
    expect(result.current.helpCenterProps.articleCategories).toEqual([]);
    expect(result.current.helpCenterProps.selectedArticleSlug).toBe("");
    expect(result.current.helpCenterProps.faqs).toEqual([]);

    await waitFor(() => {
        expect(result.current.ticketsProps.ticketsError).toBe("ticket failed");
    });

    expect(result.current.ticketsProps.tickets).toEqual([]);
    expect(result.current.ticketsProps.selectedTicketId).toBe("");

    await waitFor(() => {
        expect(result.current.contactFeedbackProps.feedbackError).toBe(
            "feedback failed"
        );
    });

    expect(result.current.contactFeedbackProps.feedbackItems).toEqual([]);
    expect(getSupportArticleMock).not.toHaveBeenCalled();
});
