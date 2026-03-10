import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";

const forgotPasswordMock = vi.fn();
const resetPasswordMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("framer-motion", () => ({
    AnimatePresence: ({ children }) => children,
    motion: new Proxy({}, {
        get: () => ({ children, ...props }) => <div {...props}>{children}</div>,
    }),
}));

vi.mock("sonner", () => ({
    toast: {
        success: (...args) => toastSuccessMock(...args),
        error: (...args) => toastErrorMock(...args),
    },
}));

vi.mock("../../../service/auth.service", async () => {
    const actual = await vi.importActual("../../../service/auth.service");
    return {
        ...actual,
        forgotPassword: (...args) => forgotPasswordMock(...args),
        resetPassword: (...args) => resetPasswordMock(...args),
    };
});

import { AuthContext } from "../../../context/AuthContext";
import AuthPage from "./AuthPage.jsx";

const renderAuthPage = ({ initialEntry, authValue, routePath = "/home/auth" }) => render(
    <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path={routePath} element={<AuthPage />} />
                <Route path="/main" element={<div>Main Dashboard</div>} />
                <Route path="/main/feed" element={<div>Feed Dashboard</div>} />
            </Routes>
        </MemoryRouter>
    </AuthContext.Provider>
);

beforeEach(() => {
    forgotPasswordMock.mockReset();
    resetPasswordMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
});

test("login success uses a sanitized redirect target", async () => {
    const loginMock = vi.fn().mockResolvedValue({ success: true });

    renderAuthPage({
        initialEntry: "/home/auth?redirect=//evil.example",
        authValue: {
            login: loginMock,
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.change(await screen.findByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
        expect(loginMock).toHaveBeenCalledWith({
            email: "aurora@example.com",
            password: "Str0ng@Pass1",
            remember: true,
        });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Login successful. Redirecting...");
    expect(
        await screen.findByText("Main Dashboard", {}, { timeout: 1500 })
    ).toBeInTheDocument();
});

test("login success defaults to /main when no redirect is provided", async () => {
    const loginMock = vi.fn().mockResolvedValue({ success: true });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: loginMock,
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.change(await screen.findByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
        expect(loginMock).toHaveBeenCalledWith({
            email: "aurora@example.com",
            password: "Str0ng@Pass1",
            remember: true,
        });
    });
    expect(
        await screen.findByText("Main Dashboard", {}, { timeout: 1500 })
    ).toBeInTheDocument();
});

test("signup success reuses the sanitized redirect target", async () => {
    const user = userEvent.setup();
    const registerMock = vi.fn().mockResolvedValue({ success: true });

    renderAuthPage({
        initialEntry: "/home/auth?redirect=/main/feed",
        authValue: {
            login: vi.fn(),
            register: registerMock,
            loading: false,
        },
    });

    await user.click(screen.getAllByRole("button", { name: /^sign up$/i })[0]);
    expect(
        await screen.findByRole("heading", { name: /create your aurora account/i })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: "Aurora User" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
        expect(registerMock).toHaveBeenCalledWith({
            name: "Aurora User",
            email: "aurora@example.com",
            password: "Str0ng@Pass1",
        });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Account created successfully. Redirecting...");
    expect(
        await screen.findByText("Feed Dashboard", {}, { timeout: 1500 })
    ).toBeInTheDocument();
});

test("forgot-password success returns the page to the login view", async () => {
    forgotPasswordMock.mockResolvedValue({ message: "Reset link sent." });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: vi.fn(),
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.click(await screen.findByRole("button", { name: /forgot password/i }));
    const sendResetLinkButton = await screen.findByRole("button", { name: /send reset link/i });
    const forgotForm = sendResetLinkButton.closest("form");
    if (!forgotForm) {
        throw new Error("Forgot password form not found");
    }
    fireEvent.change(within(forgotForm).getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.click(sendResetLinkButton);

    await waitFor(() => {
        expect(forgotPasswordMock).toHaveBeenCalledWith({ email: "aurora@example.com" });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Reset link sent.");
    expect(
        await screen.findByRole("heading", { name: /welcome back/i }, { timeout: 2500 })
    ).toBeInTheDocument();
}, 10000);

test("forgot-password success falls back to the default toast message", async () => {
    forgotPasswordMock.mockResolvedValue({ success: true });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: vi.fn(),
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.click(await screen.findByRole("button", { name: /forgot password/i }));
    const sendResetLinkButton = await screen.findByRole("button", { name: /send reset link/i });
    const forgotForm = sendResetLinkButton.closest("form");
    if (!forgotForm) {
        throw new Error("Forgot password form not found");
    }
    fireEvent.change(within(forgotForm).getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.click(sendResetLinkButton);

    await waitFor(() => {
        expect(forgotPasswordMock).toHaveBeenCalledWith({ email: "aurora@example.com" });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Password reset link sent to your email.");
});

test("reset-password routes start on the reset view and return to login after success", async () => {
    resetPasswordMock.mockResolvedValue({ message: "Password updated." });

    renderAuthPage({
        initialEntry: "/home/auth/reset-password/reset-token",
        routePath: "/home/auth/reset-password/:token",
        authValue: {
            login: vi.fn(),
            register: vi.fn(),
            loading: false,
        },
    });

    const updatePasswordButton = await screen.findByRole("button", { name: /update password/i });
    const resetForm = updatePasswordButton.closest("form");
    if (!resetForm) {
        throw new Error("Reset password form not found");
    }

    fireEvent.change(within(resetForm).getByLabelText(/new password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.change(within(resetForm).getByLabelText(/confirm password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(updatePasswordButton);

    await waitFor(() => {
        expect(resetPasswordMock).toHaveBeenCalledWith({
            password: "Str0ng@Pass1",
            token: "reset-token",
        });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Password updated.");
    expect(
        await screen.findByRole("heading", { name: /welcome back/i }, { timeout: 2500 })
    ).toBeInTheDocument();
}, 10000);

test("reset-password success falls back to the default toast message", async () => {
    resetPasswordMock.mockResolvedValue({ success: true });

    renderAuthPage({
        initialEntry: "/home/auth/reset-password/reset-token",
        routePath: "/home/auth/reset-password/:token",
        authValue: {
            login: vi.fn(),
            register: vi.fn(),
            loading: false,
        },
    });

    const updatePasswordButton = await screen.findByRole("button", { name: /update password/i });
    const resetForm = updatePasswordButton.closest("form");
    if (!resetForm) {
        throw new Error("Reset password form not found");
    }

    fireEvent.change(within(resetForm).getByLabelText(/new password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.change(within(resetForm).getByLabelText(/confirm password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(updatePasswordButton);

    await waitFor(() => {
        expect(resetPasswordMock).toHaveBeenCalledWith({
            password: "Str0ng@Pass1",
            token: "reset-token",
        });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Password reset successfully.");
});

test("login failures show a toast error", async () => {
    const loginMock = vi.fn().mockResolvedValue({ success: false, message: "Login blocked" });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: loginMock,
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.change(await screen.findByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Login blocked");
    });
});

test("login failures use the error field when provided", async () => {
    const loginMock = vi.fn().mockResolvedValue({ success: false, error: "Access denied" });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: loginMock,
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.change(await screen.findByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Access denied");
    });
});

test("login failures fall back to the default error message", async () => {
    const loginMock = vi.fn().mockResolvedValue({ success: false });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: loginMock,
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.change(await screen.findByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Login failed");
    });
});

test("signup failures show a toast error", async () => {
    const user = userEvent.setup();
    const registerMock = vi.fn().mockResolvedValue({ success: false, error: "Registration blocked" });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: vi.fn(),
            register: registerMock,
            loading: false,
        },
    });

    await user.click(screen.getAllByRole("button", { name: /^sign up$/i })[0]);

    fireEvent.change(await screen.findByLabelText(/full name/i), {
        target: { value: "Aurora User" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Registration blocked");
    });
});

test("signup failures use the message field when available", async () => {
    const user = userEvent.setup();
    const registerMock = vi.fn().mockResolvedValue({ success: false, message: "Signup delayed" });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: vi.fn(),
            register: registerMock,
            loading: false,
        },
    });

    await user.click(screen.getAllByRole("button", { name: /^sign up$/i })[0]);

    fireEvent.change(await screen.findByLabelText(/full name/i), {
        target: { value: "Aurora User" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Signup delayed");
    });
});

test("signup failures fall back to the default error message", async () => {
    const user = userEvent.setup();
    const registerMock = vi.fn().mockResolvedValue({ success: false });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: vi.fn(),
            register: registerMock,
            loading: false,
        },
    });

    await user.click(screen.getAllByRole("button", { name: /^sign up$/i })[0]);

    fireEvent.change(await screen.findByLabelText(/full name/i), {
        target: { value: "Aurora User" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Registration failed");
    });
});

test("forgot-password failures show a toast error", async () => {
    forgotPasswordMock.mockResolvedValue({ error: "Reset failed" });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: vi.fn(),
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.click(await screen.findByRole("button", { name: /forgot password/i }));
    const sendResetLinkButton = await screen.findByRole("button", { name: /send reset link/i });
    const forgotForm = sendResetLinkButton.closest("form");
    if (!forgotForm) {
        throw new Error("Forgot password form not found");
    }
    fireEvent.change(within(forgotForm).getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.click(sendResetLinkButton);

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Reset failed");
    });
});

test("forgot-password failures fall back to the default error message", async () => {
    forgotPasswordMock.mockResolvedValue({});

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: vi.fn(),
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.click(await screen.findByRole("button", { name: /forgot password/i }));
    const sendResetLinkButton = await screen.findByRole("button", { name: /send reset link/i });
    const forgotForm = sendResetLinkButton.closest("form");
    if (!forgotForm) {
        throw new Error("Forgot password form not found");
    }
    fireEvent.change(within(forgotForm).getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.click(sendResetLinkButton);

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Failed to send reset email");
    });
});

test("reset-password failures show a toast error", async () => {
    resetPasswordMock.mockResolvedValue({ error: "Token expired" });

    renderAuthPage({
        initialEntry: "/home/auth/reset-password/reset-token",
        routePath: "/home/auth/reset-password/:token",
        authValue: {
            login: vi.fn(),
            register: vi.fn(),
            loading: false,
        },
    });

    const updatePasswordButton = await screen.findByRole("button", { name: /update password/i });
    const resetForm = updatePasswordButton.closest("form");
    if (!resetForm) {
        throw new Error("Reset password form not found");
    }

    fireEvent.change(within(resetForm).getByLabelText(/new password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.change(within(resetForm).getByLabelText(/confirm password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(updatePasswordButton);

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Token expired");
    });
});

test("reset-password failures fall back to the default error message", async () => {
    resetPasswordMock.mockResolvedValue({});

    renderAuthPage({
        initialEntry: "/home/auth/reset-password/reset-token",
        routePath: "/home/auth/reset-password/:token",
        authValue: {
            login: vi.fn(),
            register: vi.fn(),
            loading: false,
        },
    });

    const updatePasswordButton = await screen.findByRole("button", { name: /update password/i });
    const resetForm = updatePasswordButton.closest("form");
    if (!resetForm) {
        throw new Error("Reset password form not found");
    }

    fireEvent.change(within(resetForm).getByLabelText(/new password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.change(within(resetForm).getByLabelText(/confirm password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(updatePasswordButton);

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Failed to reset password");
    });
});

test("handles unexpected auth errors with response messaging", async () => {
    const loginMock = vi.fn().mockRejectedValue({
        response: { data: { message: "Service unavailable" } },
    });

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: loginMock,
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.change(await screen.findByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Service unavailable");
    });
});

test("handles unexpected auth errors with direct message", async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error("Network down"));

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: loginMock,
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.change(await screen.findByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Network down");
    });
});

test("handles unexpected auth errors with the default fallback message", async () => {
    const loginMock = vi.fn().mockRejectedValue({});

    renderAuthPage({
        initialEntry: "/home/auth",
        authValue: {
            login: loginMock,
            register: vi.fn(),
            loading: false,
        },
    });

    fireEvent.change(await screen.findByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("An unexpected error occurred. Please try again.");
    });
});
