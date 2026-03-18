import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

const { formatDateTimeMock, formatRelativeTimeMock, toIdStringMock } = vi.hoisted(
    () => ({
        formatDateTimeMock: vi.fn(() => "Mar 16, 2026, 10:00 AM"),
        formatRelativeTimeMock: vi.fn(() => "1h ago"),
        toIdStringMock: vi.fn((value) => String(value?._id || value || "")),
    })
);

vi.mock(
    "../../../../../../features/main/features/support/utils/support.helpers.js",
    () => ({
        formatDateTime: formatDateTimeMock,
        formatRelativeTime: formatRelativeTimeMock,
        toIdString: toIdStringMock,
    })
);

vi.mock(
    "../../../../../../features/main/features/support/components/SupportUI.jsx",
    () => ({
        TicketCommentNode: ({ node, onReply }) => (
            <button
                type="button"
                data-testid={`comment-node-${node?._id}`}
                onClick={() => onReply(node?._id)}
            >
                {node?.body}
            </button>
        ),
    })
);

import TicketsSection from "../../../../../../features/main/features/support/components/TicketsSection.jsx";

const createProps = (overrides = {}) => ({
    ticketForm: {
        subject: "",
        category: "account",
        priority: "medium",
        description: "",
    },
    setTicketForm: vi.fn(),
    ticketFiles: [{ name: "ticket-shot.png" }],
    handleFileSelection: vi.fn(),
    ticketSubmitting: false,
    handleCreateTicket: vi.fn((event) => event.preventDefault()),
    ticketStatusFilter: "all",
    setTicketStatusFilter: vi.fn(),
    ticketStatuses: [{ key: "open", count: 1 }],
    ticketsLoading: false,
    ticketsError: "",
    tickets: [
        {
            _id: "ticket-1",
            ticketNumber: "TIC-1",
            subject: "Login issue",
            status: "open",
            updatedAt: "2026-03-16T09:00:00.000Z",
        },
    ],
    selectedTicketId: "ticket-1",
    setSelectedTicketId: vi.fn(),
    ticketDetailLoading: false,
    ticketDetailError: "",
    ticketDetail: {
        ticketNumber: "TIC-1",
        subject: "Login issue",
        description: "Cannot login to the dashboard",
        status: "open",
        priority: "high",
        category: "account",
        updatedAt: "2026-03-16T10:00:00.000Z",
    },
    commentTree: [{ _id: "comment-1", body: "Please reset your password." }],
    setCommentReplyParentId: vi.fn(),
    replyingToComment: { body: "Prior support reply" },
    commentBody: "",
    setCommentBody: vi.fn(),
    commentFiles: [{ name: "comment-shot.png" }],
    commentSubmitting: false,
    handleAddComment: vi.fn((event) => event.preventDefault()),
    ...overrides,
});

test("TicketsSection updates forms, delegates actions, and renders ticket details", () => {
    const ticketState = {
        subject: "",
        category: "account",
        priority: "medium",
        description: "",
    };

    const setTicketForm = vi.fn((updater) => {
        const next = typeof updater === "function" ? updater(ticketState) : updater;
        Object.assign(ticketState, next);
    });

    const props = createProps({
        ticketForm: ticketState,
        setTicketForm,
    });

    render(<TicketsSection {...props} />);

    fireEvent.change(screen.getByPlaceholderText("Subject"), {
        target: { value: "Updated subject" },
    });
    expect(setTicketForm).toHaveBeenCalledTimes(1);
    expect(ticketState.subject).toBe("Updated subject");

    fireEvent.change(screen.getAllByRole("combobox")[0], {
        target: { value: "billing" },
    });
    expect(setTicketForm).toHaveBeenCalledTimes(2);
    expect(ticketState.category).toBe("billing");

    fireEvent.change(screen.getAllByRole("combobox")[1], {
        target: { value: "urgent" },
    });
    expect(setTicketForm).toHaveBeenCalledTimes(3);
    expect(ticketState.priority).toBe("urgent");

    fireEvent.change(screen.getByPlaceholderText(/describe the issue clearly/i), {
        target: { value: "Updated description" },
    });
    expect(setTicketForm).toHaveBeenCalledTimes(4);
    expect(ticketState.description).toBe("Updated description");

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const file = new File(["file-content"], "capture.png", {
        type: "image/png",
    });
    fireEvent.change(fileInputs[0], { target: { files: [file] } });
    fireEvent.change(fileInputs[1], { target: { files: [file] } });
    expect(props.handleFileSelection).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        "ticket"
    );
    expect(props.handleFileSelection).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        "comment"
    );

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(props.setTicketStatusFilter).toHaveBeenCalledWith("all");

    fireEvent.click(screen.getByRole("button", { name: /open \(1\)/i }));
    expect(props.setTicketStatusFilter).toHaveBeenCalledWith("open");

    const ticketButton = screen
        .getAllByText("Login issue")
        .map((element) => element.closest("button"))
        .find(Boolean);
    expect(ticketButton).not.toBeNull();
    fireEvent.click(ticketButton);
    expect(props.setSelectedTicketId).toHaveBeenCalledWith("ticket-1");

    fireEvent.click(screen.getByTestId("comment-node-comment-1"));
    expect(props.setCommentReplyParentId).toHaveBeenCalledWith("comment-1");

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(props.setCommentReplyParentId).toHaveBeenCalledWith("");

    fireEvent.change(screen.getByPlaceholderText(/write a reply/i), {
        target: { value: "Will do" },
    });
    expect(props.setCommentBody).toHaveBeenCalledWith("Will do");

    const createTicketForm = screen
        .getByRole("button", { name: /create ticket/i })
        .closest("form");
    expect(createTicketForm).not.toBeNull();
    fireEvent.submit(createTicketForm);
    expect(props.handleCreateTicket).toHaveBeenCalledTimes(1);

    const replyForm = screen
        .getByRole("button", { name: /send reply/i })
        .closest("form");
    expect(replyForm).not.toBeNull();
    fireEvent.submit(replyForm);
    expect(props.handleAddComment).toHaveBeenCalledTimes(1);

    expect(screen.getByText(/last update:/i)).toHaveTextContent(
        "Last update: Mar 16, 2026, 10:00 AM"
    );
    expect(screen.getByText("ticket-shot.png")).toBeInTheDocument();
    expect(screen.getByText("comment-shot.png")).toBeInTheDocument();

    expect(formatRelativeTimeMock).toHaveBeenCalledWith("2026-03-16T09:00:00.000Z");
    expect(formatDateTimeMock).toHaveBeenCalledWith("2026-03-16T10:00:00.000Z");
});

test("TicketsSection handles loading, errors, and empty states", () => {
    const { rerender } = render(
        <TicketsSection
            {...createProps({
                ticketsLoading: true,
                ticketDetailLoading: true,
                ticketDetail: null,
                commentTree: [],
                replyingToComment: null,
                ticketFiles: [],
                commentFiles: [],
            })}
        />
    );

    expect(screen.getByText(/loading tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/loading ticket details/i)).toBeInTheDocument();

    rerender(
        <TicketsSection
            {...createProps({
                ticketsLoading: false,
                ticketsError: "Ticket list failed",
                ticketDetailLoading: false,
                ticketDetailError: "Detail failed",
                ticketDetail: null,
                tickets: [],
                commentTree: [],
                replyingToComment: null,
                ticketFiles: [],
                commentFiles: [],
            })}
        />
    );

    expect(screen.getByText("Ticket list failed")).toBeInTheDocument();
    expect(screen.getByText("Detail failed")).toBeInTheDocument();

    rerender(
        <TicketsSection
            {...createProps({
                ticketsLoading: false,
                ticketsError: "",
                tickets: [],
                ticketDetailLoading: false,
                ticketDetailError: "",
                ticketDetail: null,
                commentTree: [],
                replyingToComment: null,
                ticketFiles: [],
                commentFiles: [],
            })}
        />
    );

    expect(screen.getByText(/no tickets for this filter/i)).toBeInTheDocument();
    expect(
        screen.getByText(/select a ticket to view conversation/i)
    ).toBeInTheDocument();
});

