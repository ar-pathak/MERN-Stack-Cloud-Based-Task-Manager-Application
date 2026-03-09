import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";

const verifyEmailMock = vi.fn();

vi.mock("../../../service/auth.service", () => ({
    verifyEmail: (...args) => verifyEmailMock(...args),
}));

import { AuthContext } from "../../../context/AuthContext";
import VerifyEmailPage from "./VerifyEmailPage.jsx";

const renderVerifyPage = ({
    initialEntry,
    authValue,
    routePath,
}) => render(
    <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path={routePath} element={<VerifyEmailPage />} />
                <Route path="/main/settings" element={<div>Settings Page</div>} />
                <Route path="/home/auth" element={<div>Login Page</div>} />
            </Routes>
        </MemoryRouter>
    </AuthContext.Provider>
);

beforeEach(() => {
    verifyEmailMock.mockReset();
});

test("shows an immediate error when the verification token is missing", async () => {
    const user = userEvent.setup();

    renderVerifyPage({
        initialEntry: "/email-verification",
        routePath: "/email-verification",
        authValue: {
            isAuthenticated: false,
            refreshUser: vi.fn(),
        },
    });

    expect(await screen.findByText("Invalid verification link.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /go to login/i }));

    expect(screen.getByText("Login Page")).toBeInTheDocument();
});

test("verifies email successfully, refreshes the session, and routes authenticated users to settings", async () => {
    const user = userEvent.setup();
    const refreshUserMock = vi.fn().mockResolvedValue(undefined);
    verifyEmailMock.mockResolvedValue({ message: "Email verified successfully." });

    renderVerifyPage({
        initialEntry: "/email-verification/verify-token",
        routePath: "/email-verification/:token",
        authValue: {
            isAuthenticated: true,
            refreshUser: refreshUserMock,
        },
    });

    expect(await screen.findByText("Email verified successfully.")).toBeInTheDocument();
    expect(verifyEmailMock).toHaveBeenCalledWith("verify-token");
    expect(refreshUserMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /go to settings/i }));

    expect(screen.getByText("Settings Page")).toBeInTheDocument();
});

test("surfaces verification failures and routes unauthenticated users back to login", async () => {
    const user = userEvent.setup();
    verifyEmailMock.mockRejectedValue({ message: "Verification link expired." });

    renderVerifyPage({
        initialEntry: "/email-verification/expired-token",
        routePath: "/email-verification/:token",
        authValue: {
            isAuthenticated: false,
            refreshUser: vi.fn(),
        },
    });

    await waitFor(() => {
        expect(screen.getByText("Verification link expired.")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /go to login/i }));

    expect(screen.getByText("Login Page")).toBeInTheDocument();
});
