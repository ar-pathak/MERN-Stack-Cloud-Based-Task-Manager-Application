import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, test, expect } from "vitest";

import { GhostButton, PrimaryButton } from "./Buttons.jsx";

test("PrimaryButton shows loading state and disables interaction", () => {
    render(<PrimaryButton loading>Submit</PrimaryButton>);

    expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();
    expect(screen.queryByText("Submit")).not.toBeInTheDocument();
});

test("GhostButton forwards clicks", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<GhostButton onClick={handleClick}>Cancel</GhostButton>);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
});
