import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";

vi.mock("framer-motion", () => ({
    AnimatePresence: ({ children }) => children,
    motion: new Proxy({}, {
        get: () => ({ children, ...props }) => <div {...props}>{children}</div>,
    }),
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("../../../../features/authentication/utils/view", () => ({
    views: {
        LOGIN: "login",
        SIGNUP: "signup",
        FORGOT: "forgot",
        RESET: "reset",
        VERIFY: "login",
    },
}));

import { AuthContext } from "../../../../context/AuthContext";
import AuthPage from "../../../../features/authentication/pages/AuthPage.jsx";

test("email verification notice returns to login view", async () => {
    render(
        <AuthContext.Provider value={{ login: vi.fn(), register: vi.fn(), loading: false }}>
            <MemoryRouter initialEntries={["/home/auth"]}>
                <Routes>
                    <Route path="/home/auth" element={<AuthPage />} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );

    expect(await screen.findByText(/verify your email/i)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /back to login/i }));

    await waitFor(() => {
        expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    });
});
