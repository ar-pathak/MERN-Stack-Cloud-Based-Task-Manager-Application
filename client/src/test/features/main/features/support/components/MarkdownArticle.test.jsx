import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import MarkdownArticle from "../../../../../../features/main/features/support/components/MarkdownArticle.jsx";

test("MarkdownArticle renders headings, inline markdown, lists, quotes, and paragraphs", () => {
    const markdown = `
# Support Guide
Start here with [docs](https://example.com/docs), \`cli\`, **bold text**, and *notes*.
This paragraph continues on the next line.

- First bullet
* Second bullet

1. Step one
2. Step two

> Remember to save your work
> before refreshing
`;

    const { container } = render(
        <MarkdownArticle markdown={markdown} className="article-shell" />
    );

    expect(
        screen.getByRole("heading", { name: /support guide/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute(
        "href",
        "https://example.com/docs"
    );
    expect(screen.getByText("cli").tagName).toBe("CODE");
    expect(screen.getByText("bold text").tagName).toBe("STRONG");
    expect(screen.getByText("notes").tagName).toBe("EM");
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
    expect(container.querySelectorAll("ol li")).toHaveLength(2);
    expect(container.querySelector("blockquote")).toHaveTextContent(
        "Remember to save your work before refreshing"
    );
    expect(screen.getByText(/this paragraph continues on the next line\./i)).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("article-shell");
});

test("MarkdownArticle breaks paragraphs when a heading, list, ordered list, or quote starts immediately after", () => {
    const markdown = `Paragraph before heading
## Subheading
Paragraph before bullets
- Bullet item
Paragraph before steps
1. Ordered item
Paragraph before quote
> Quoted item`;

    render(<MarkdownArticle markdown={markdown} />);

    expect(screen.getByRole("heading", { name: "Subheading" })).toBeInTheDocument();
    expect(screen.getByText("Paragraph before heading")).toBeInTheDocument();
    expect(screen.getByText("Paragraph before bullets")).toBeInTheDocument();
    expect(screen.getByText("Bullet item")).toBeInTheDocument();
    expect(screen.getByText("Paragraph before steps")).toBeInTheDocument();
    expect(screen.getByText("Ordered item")).toBeInTheDocument();
    expect(screen.getByText("Paragraph before quote")).toBeInTheDocument();
    expect(screen.getByText("Quoted item")).toBeInTheDocument();
});

test("MarkdownArticle falls back when the source has no content", () => {
    render(<MarkdownArticle markdown={"  \n\n  "} />);

    expect(
        screen.getByText(/no article content available/i)
    ).toBeInTheDocument();
});