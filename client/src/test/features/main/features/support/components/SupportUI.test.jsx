import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import {
    StarRatingInput,
    TicketCommentNode,
} from "../../../../../../features/main/features/support/components/SupportUI.jsx";

test("TicketCommentNode renders nested replies, attachments, and admin author labels", () => {
    const onReply = vi.fn();
    const { container } = render(
        <TicketCommentNode
            node={{
                _id: "root-1",
                depth: 9,
                authorRole: "admin",
                authorModel: "AdminAccount",
                createdAt: "2026-03-16T10:00:00.000Z",
                body: "Root support reply",
                attachments: [
                    {
                        name: "Guide.pdf",
                        url: "https://example.com/guide.pdf",
                    },
                ],
                children: [
                    {
                        _id: "child-1",
                        depth: 1,
                        author: { username: "riya" },
                        createdAt: "2026-03-16T10:05:00.000Z",
                        body: "Nested reply",
                        attachments: [],
                    },
                ],
            }}
            onReply={onReply}
        />
    );

    expect(screen.getByText("Aurora Team")).toBeInTheDocument();
    expect(screen.getByText("Support Team")).toBeInTheDocument();
    expect(screen.getByText("Root support reply")).toBeInTheDocument();
    expect(screen.getByText("riya")).toBeInTheDocument();
    expect(screen.getByText("Nested reply")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /guide\.pdf/i })).toHaveAttribute(
        "href",
        "https://example.com/guide.pdf"
    );
    expect(container.firstChild).toHaveStyle({ marginLeft: "56px" });

    fireEvent.click(screen.getAllByRole("button", { name: /reply/i })[0]);

    expect(onReply).toHaveBeenCalledWith("root-1");
});

test("StarRatingInput renders five stars, highlights the active ones, and reports changes", () => {
    const onChange = vi.fn();
    const { container } = render(
        <StarRatingInput value={3} onChange={onChange} />
    );

    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(container.querySelectorAll(".fill-amber-400")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: /set rating to 4/i }));

    expect(onChange).toHaveBeenCalledWith(4);
});