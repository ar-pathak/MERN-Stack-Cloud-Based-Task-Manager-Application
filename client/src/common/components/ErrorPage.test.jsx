import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, test, expect } from "vitest";

const navigateMock = vi.fn();

vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

import ErrorPage from "./ErrorPage.jsx";

beforeEach(() => {
    navigateMock.mockReset();
});

test("renders the 404 state and navigates home", async () => {
    const user = userEvent.setup();

    render(<ErrorPage code={404} message="Missing route" />);

    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByText("Missing route")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /go home/i }));

    expect(navigateMock).toHaveBeenCalledWith("/");
});

test("renders the server-error fallback copy", () => {
    render(<ErrorPage code={500} />);

    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/we could not complete your request right now/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
});
