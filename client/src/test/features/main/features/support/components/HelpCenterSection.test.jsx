import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const { formatDateTimeMock } = vi.hoisted(() => ({
    formatDateTimeMock: vi.fn(() => "Mar 16, 2026, 10:00 AM"),
}));

vi.mock(
    "../../../../../../features/main/features/support/utils/support.helpers.js",
    () => ({
        formatDateTime: formatDateTimeMock,
    })
);

vi.mock(
    "../../../../../../features/main/features/support/components/MarkdownArticle.jsx",
    () => ({
        default: ({ markdown }) => (
            <div data-testid="markdown-article">{markdown}</div>
        ),
    })
);

import HelpCenterSection from "../../../../../../features/main/features/support/components/HelpCenterSection.jsx";

const baseProps = {
    articleSearch: "",
    setArticleSearch: vi.fn(),
    articleCategory: "all",
    setArticleCategory: vi.fn(),
    articleCategories: [
        { key: "all", label: "All", count: 2 },
        { key: "billing", label: "Billing", count: 1 },
    ],
    categoryOptions: [
        { value: "all", label: "All categories" },
        { value: "billing", label: "Billing" },
    ],
    articles: [],
    articlesLoading: false,
    articlesError: "",
    selectedArticleSlug: "",
    setSelectedArticleSlug: vi.fn(),
    articleDetailLoading: false,
    articleDetailError: "",
    selectedArticle: null,
    relatedArticles: [],
    faqs: [],
    openFaqId: "",
    setOpenFaqId: vi.fn(),
};

beforeEach(() => {
    baseProps.setArticleSearch.mockClear();
    baseProps.setArticleCategory.mockClear();
    baseProps.setSelectedArticleSlug.mockClear();
    baseProps.setOpenFaqId.mockClear();
    formatDateTimeMock.mockClear();
});

test("HelpCenterSection updates search and category filters", () => {
    render(<HelpCenterSection {...baseProps} />);

    const searchInput = screen.getByPlaceholderText(/search help articles/i);
    fireEvent.change(searchInput, { target: { value: "billing" } });
    expect(baseProps.setArticleSearch).toHaveBeenCalledWith("billing");

    const categorySelect = screen.getByRole("combobox");
    fireEvent.change(categorySelect, { target: { value: "billing" } });
    expect(baseProps.setArticleCategory).toHaveBeenCalledWith("billing");

    fireEvent.click(screen.getByRole("button", { name: /billing/i }));
    expect(baseProps.setArticleCategory).toHaveBeenCalledWith("billing");
});

test("HelpCenterSection renders article detail, related articles, and FAQ toggles", () => {
    render(
        <HelpCenterSection
            {...baseProps}
            articles={[
                {
                    slug: "getting-started",
                    title: "Getting Started",
                    summary: "Quick intro",
                },
                {
                    slug: "billing",
                    title: "Billing FAQ",
                    summary: "Payment info",
                },
            ]}
            selectedArticleSlug="getting-started"
            selectedArticle={{
                title: "Getting Started",
                category: "General",
                updatedAt: "2026-03-16T10:00:00.000Z",
                contentMarkdown: "Welcome to Aurora",
            }}
            relatedArticles={[{ slug: "billing", title: "Billing FAQ" }]}
            faqs={[
                {
                    id: "faq-1",
                    question: "How do I reset my password?",
                    answerMarkdown: "Use the settings page.",
                },
            ]}
            openFaqId="faq-1"
        />
    );

    const billingButtons = screen.getAllByRole("button", { name: /billing faq/i });
    fireEvent.click(billingButtons[0]);
    expect(baseProps.setSelectedArticleSlug).toHaveBeenCalledWith("billing");

    expect(
        screen.getByRole("heading", { name: /getting started/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/updated/i)).toHaveTextContent(
        "Updated Mar 16, 2026, 10:00 AM"
    );
    expect(formatDateTimeMock).toHaveBeenCalledWith("2026-03-16T10:00:00.000Z");
    expect(screen.getByText("Welcome to Aurora")).toBeInTheDocument();

    fireEvent.click(billingButtons[1]);
    expect(baseProps.setSelectedArticleSlug).toHaveBeenCalledWith("billing");

    fireEvent.click(
        screen.getByRole("button", { name: /how do i reset my password/i })
    );

    const toggleFn = baseProps.setOpenFaqId.mock.calls[0][0];
    expect(toggleFn("faq-1")).toBe("");
    expect(toggleFn("")).toBe("faq-1");
    expect(screen.getByText("Use the settings page.")).toBeInTheDocument();
});
