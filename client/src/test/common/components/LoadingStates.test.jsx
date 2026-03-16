import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import LazyLoader from "../../../common/components/LazyLoader.jsx";
import LoadingPage from "../../../common/components/LoadingPage.jsx";

test("LazyLoader renders the compact loading state", () => {
    const { container } = render(<LazyLoader />);

    expect(screen.getByText("Loading component...")).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
});

test("LoadingPage renders the full-page loading shell", () => {
    const { container } = render(<LoadingPage />);

    expect(
        screen.getByRole("heading", { name: /loading your experience/i })
    ).toBeInTheDocument();
    expect(
        screen.getByText(/preparing your workspace\. this usually takes a moment\./i)
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".blur-3xl")).toHaveLength(2);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
});