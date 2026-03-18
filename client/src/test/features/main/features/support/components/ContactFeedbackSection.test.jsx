import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const { formatDateTimeMock, toIdStringMock } = vi.hoisted(() => ({
    formatDateTimeMock: vi.fn(() => "Mar 16, 2026, 10:00 AM"),
    toIdStringMock: vi.fn((value) => String(value?._id || value || "")),
}));

vi.mock(
    "../../../../../../features/main/features/support/utils/support.helpers.js",
    () => ({
        formatDateTime: formatDateTimeMock,
        toIdString: toIdStringMock,
    })
);

vi.mock(
    "../../../../../../features/main/features/support/components/SupportUI.jsx",
    () => ({
        StarRatingInput: ({ value, onChange }) => (
            <button
                type="button"
                data-testid="star-rating-input"
                onClick={() => onChange(4)}
            >
                Rating: {value}
            </button>
        ),
    })
);

import ContactFeedbackSection from "../../../../../../features/main/features/support/components/ContactFeedbackSection.jsx";

const createProps = (overrides = {}) => ({
    contactForm: {
        name: "",
        email: "",
        message: "",
    },
    setContactForm: vi.fn(),
    contactSubmitting: false,
    handleSubmitContact: vi.fn((event) => event.preventDefault()),
    feedbackForm: {
        type: "feature_request",
        category: "account",
        title: "",
        message: "",
        rating: 5,
    },
    setFeedbackForm: vi.fn(),
    feedbackSubmitting: false,
    handleSubmitFeedback: vi.fn((event) => event.preventDefault()),
    feedbackLoading: false,
    feedbackError: "",
    feedbackItems: [],
    feedbackSummary: { averageRating: 0 },
    ...overrides,
});

beforeEach(() => {
    formatDateTimeMock.mockClear();
    toIdStringMock.mockClear();
});

test("ContactFeedbackSection updates forms, submits actions, and renders feedback items", () => {
    const contactState = {
        name: "",
        email: "",
        message: "",
    };
    const feedbackState = {
        type: "feature_request",
        category: "account",
        title: "",
        message: "",
        rating: 5,
    };

    const setContactForm = vi.fn((updater) => {
        const next = typeof updater === "function" ? updater(contactState) : updater;
        Object.assign(contactState, next);
    });
    const setFeedbackForm = vi.fn((updater) => {
        const next = typeof updater === "function" ? updater(feedbackState) : updater;
        Object.assign(feedbackState, next);
    });

    const props = createProps({
        contactForm: contactState,
        setContactForm,
        feedbackForm: feedbackState,
        setFeedbackForm,
        feedbackSummary: { averageRating: 4.2 },
        feedbackItems: [
            {
                _id: "fb-1",
                type: "bug_report",
                rating: 3,
                title: "Crash on dashboard",
                message: "Please check the latest deploy.",
                createdAt: "2026-03-16T10:00:00.000Z",
            },
        ],
    });

    render(<ContactFeedbackSection {...props} />);

    fireEvent.change(screen.getByPlaceholderText("Name"), {
        target: { value: "Riya" },
    });
    expect(setContactForm).toHaveBeenCalledTimes(1);
    expect(contactState.name).toBe("Riya");

    fireEvent.change(screen.getAllByRole("combobox")[0], {
        target: { value: "bug_report" },
    });
    expect(setFeedbackForm).toHaveBeenCalledTimes(1);
    expect(feedbackState.type).toBe("bug_report");

    fireEvent.click(screen.getByTestId("star-rating-input"));
    expect(setFeedbackForm).toHaveBeenCalledTimes(2);
    expect(feedbackState.rating).toBe(4);

    const contactFormElement = screen
        .getByRole("button", { name: /submit contact request/i })
        .closest("form");
    expect(contactFormElement).not.toBeNull();
    fireEvent.submit(contactFormElement);
    expect(props.handleSubmitContact).toHaveBeenCalledTimes(1);

    const feedbackFormElement = screen
        .getByRole("button", { name: /submit feedback/i })
        .closest("form");
    expect(feedbackFormElement).not.toBeNull();
    fireEvent.submit(feedbackFormElement);
    expect(props.handleSubmitFeedback).toHaveBeenCalledTimes(1);

    expect(screen.getByText(/avg rating: 4\.20/i)).toBeInTheDocument();
    expect(screen.getByText("Bug report")).toBeInTheDocument();
    expect(screen.getByText("Crash on dashboard")).toBeInTheDocument();
    expect(screen.getByText("Please check the latest deploy.")).toBeInTheDocument();
    expect(screen.getByText("Mar 16, 2026, 10:00 AM")).toBeInTheDocument();

    expect(formatDateTimeMock).toHaveBeenCalledWith("2026-03-16T10:00:00.000Z");
    expect(toIdStringMock).toHaveBeenCalledWith("fb-1");
});

test("ContactFeedbackSection handles loading, error, and empty feedback states", () => {
    const props = createProps({ feedbackLoading: true });
    const { rerender } = render(<ContactFeedbackSection {...props} />);

    expect(screen.getByText(/loading feedback/i)).toBeInTheDocument();

    rerender(
        <ContactFeedbackSection
            {...createProps({
                feedbackLoading: false,
                feedbackError: "Feedback failed",
            })}
        />
    );
    expect(screen.getByText("Feedback failed")).toBeInTheDocument();

    rerender(
        <ContactFeedbackSection
            {...createProps({
                feedbackLoading: false,
                feedbackError: "",
                feedbackItems: [],
            })}
        />
    );
    expect(screen.getByText(/no feedback submitted yet/i)).toBeInTheDocument();
});

