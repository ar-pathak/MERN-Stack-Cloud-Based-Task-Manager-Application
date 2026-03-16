import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";

const { useHelpSupportControllerMock } = vi.hoisted(() => ({
    useHelpSupportControllerMock: vi.fn(),
}));

vi.mock(
    "../../../../../../features/main/components/navigation/MobileBottomNav.jsx",
    () => ({
        default: ({ activeTab, profileId }) => (
            <div data-testid="mobile-bottom-nav">
                {activeTab}:{profileId}
            </div>
        ),
    })
);

vi.mock(
    "../../../../../../features/main/features/support/components/HelpCenterSection.jsx",
    () => ({
        default: ({ section }) => (
            <div data-testid="help-center-section">{section}</div>
        ),
    })
);

vi.mock(
    "../../../../../../features/main/features/support/components/TicketsSection.jsx",
    () => ({
        default: ({ section }) => (
            <div data-testid="tickets-section">{section}</div>
        ),
    })
);

vi.mock(
    "../../../../../../features/main/features/support/components/ContactFeedbackSection.jsx",
    () => ({
        default: ({ section }) => (
            <div data-testid="contact-feedback-section">{section}</div>
        ),
    })
);

vi.mock(
    "../../../../../../features/main/features/support/hooks/useHelpSupportController.js",
    () => ({
        default: useHelpSupportControllerMock,
    })
);

import HelpSupportPage from "../../../../../../features/main/features/support/pages/HelpSupportPage.jsx";

const renderPage = () =>
    render(
        <MemoryRouter initialEntries={["/previous", "/support"]} initialIndex={1}>
            <Routes>
                <Route path="/previous" element={<div data-testid="previous-page">Previous</div>} />
                <Route path="/support" element={<HelpSupportPage />} />
            </Routes>
        </MemoryRouter>
    );

beforeEach(() => {
    useHelpSupportControllerMock.mockReset();
    useHelpSupportControllerMock.mockReturnValue({
        profileId: "profile-7",
        shouldShowBottomNav: true,
        refreshing: false,
        refreshEverything: vi.fn(),
        helpCenterProps: { section: "help" },
        ticketsProps: { section: "tickets" },
        contactFeedbackProps: { section: "contact" },
    });
});

test("HelpSupportPage renders sections, navigates back, refreshes content, and shows mobile nav", () => {
    const refreshEverything = vi.fn();
    useHelpSupportControllerMock.mockReturnValue({
        profileId: "profile-9",
        shouldShowBottomNav: true,
        refreshing: false,
        refreshEverything,
        helpCenterProps: { section: "help-center" },
        ticketsProps: { section: "tickets-center" },
        contactFeedbackProps: { section: "contact-center" },
    });

    renderPage();

    expect(
        screen.getByRole("heading", {
            name: /help center, tickets, contact, feedback/i,
        })
    ).toBeInTheDocument();
    expect(screen.getByTestId("help-center-section")).toHaveTextContent(
        "help-center"
    );
    expect(screen.getByTestId("tickets-section")).toHaveTextContent(
        "tickets-center"
    );
    expect(screen.getByTestId("contact-feedback-section")).toHaveTextContent(
        "contact-center"
    );
    expect(screen.getByTestId("mobile-bottom-nav")).toHaveTextContent(
        "support:profile-9"
    );
    expect(
        screen.getByText(/help articles support markdown formatting/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(refreshEverything).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByTestId("previous-page")).toBeInTheDocument();
});

test("HelpSupportPage disables refresh while loading and hides the bottom nav when not needed", () => {
    useHelpSupportControllerMock.mockReturnValue({
        profileId: "profile-3",
        shouldShowBottomNav: false,
        refreshing: true,
        refreshEverything: vi.fn(),
        helpCenterProps: { section: "help" },
        ticketsProps: { section: "tickets" },
        contactFeedbackProps: { section: "contact" },
    });

    renderPage();

    expect(screen.getByRole("button", { name: /refresh/i })).toBeDisabled();
    expect(screen.queryByTestId("mobile-bottom-nav")).not.toBeInTheDocument();
});