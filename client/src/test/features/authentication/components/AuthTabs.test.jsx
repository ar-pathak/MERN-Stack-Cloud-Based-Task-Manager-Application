import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import AuthTabs from "../../../../features/authentication/components/AuthTabs.jsx";
import { views } from "../../../../features/authentication/utils/view.js";

test("renders both auth tabs and switches to signup on click", async () => {
    const user = userEvent.setup();
    const setActiveView = vi.fn();

    render(<AuthTabs activeView={views.LOGIN} setActiveView={setActiveView} />);

    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(setActiveView).toHaveBeenCalledWith(views.SIGNUP);
});
