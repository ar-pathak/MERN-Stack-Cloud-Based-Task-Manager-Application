import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";

import LoginForm from "../../../../features/authentication/pages/LoginForm.jsx";
import SignupForm from "../../../../features/authentication/pages/SignupForm.jsx";
import ForgotPasswordForm from "../../../../features/authentication/pages/ForgotPasswordForm.jsx";
import ResetPasswordForm from "../../../../features/authentication/pages/ResetPasswordForm.jsx";
import EmailVerificationNotice from "../../../../features/authentication/pages/EmailVerificationNotice.jsx";
import { views } from "../../../../features/authentication/utils/view.js";

test("LoginForm validates required fields, toggles forgot flow, and submits credentials", async () => {
    const onSubmit = vi.fn();
    const onSwitch = vi.fn();

    render(<LoginForm onSwitch={onSwitch} onSubmit={onSubmit} loading={false} />);

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(screen.getByText("Email and password are required.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /remember me/i }));
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(onSubmit).toHaveBeenCalledWith({
        email: "aurora@example.com",
        password: "Str0ng@Pass1",
        remember: false,
    });

    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(onSwitch).toHaveBeenCalledWith(views.FORGOT);

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    expect(onSwitch).toHaveBeenCalledWith(views.SIGNUP);
}, 10000);

test("SignupForm validates password rules and submits valid registrations", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onSwitch = vi.fn();

    render(<SignupForm onSwitch={onSwitch} onSubmit={onSubmit} loading={false} />);

    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText("All fields are required.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: "Aurora User" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: "weakpass" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: "weakpass" },
    });
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(
        screen.getByText(/password must be 8\+ chars with uppercase/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: "Different@Pass1" },
    });
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(onSubmit).toHaveBeenCalledWith({
        name: "Aurora User",
        email: "aurora@example.com",
        password: "Str0ng@Pass1",
    });

    await user.click(screen.getByRole("button", { name: /log in/i }));
    expect(onSwitch).toHaveBeenCalledWith(views.LOGIN);
});

test("ForgotPasswordForm validates email entry and supports switching back to login", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onSwitch = vi.fn();

    render(<ForgotPasswordForm onSwitch={onSwitch} onSubmit={onSubmit} loading={false} />);

    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(screen.getByText("Email is required.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "aurora@example.com" },
    });
    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ email: "aurora@example.com" });
    });

    await user.click(screen.getByRole("button", { name: /back to login/i }));
    expect(onSwitch).toHaveBeenCalledWith(views.LOGIN);
});

test("ResetPasswordForm validates token, password strength, and successful submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onSwitch = vi.fn();

    const missingTokenView = render(
        <MemoryRouter initialEntries={["/home/auth/reset-password"]}>
            <Routes>
                <Route
                    path="/home/auth/reset-password"
                    element={<ResetPasswordForm onSwitch={onSwitch} onSubmit={onSubmit} loading={false} />}
                />
            </Routes>
        </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /update password/i }));
    expect(screen.getByText("Invalid reset link. Please request a new one.")).toBeInTheDocument();

    missingTokenView.unmount();

    render(
        <MemoryRouter initialEntries={["/home/auth/reset-password/token-1"]}>
            <Routes>
                <Route
                    path="/home/auth/reset-password/:token"
                    element={<ResetPasswordForm onSwitch={onSwitch} onSubmit={onSubmit} loading={false} />}
                />
            </Routes>
        </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /update password/i }));
    expect(screen.getByText("Both fields are required.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: "weak" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: "weak" },
    });
    await user.click(screen.getByRole("button", { name: /update password/i }));
    expect(
        screen.getByText(/password must be 8\+ chars with uppercase/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: "Different@Pass1" },
    });
    await user.click(screen.getByRole("button", { name: /update password/i }));
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: "Str0ng@Pass1" },
    });
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(onSubmit).toHaveBeenCalledWith({
        password: "Str0ng@Pass1",
        token: "token-1",
    });

    await user.click(screen.getByRole("button", { name: /back to login/i }));
    expect(onSwitch).toHaveBeenCalledWith(views.LOGIN);
});

test("EmailVerificationNotice returns users to login", async () => {
    const user = userEvent.setup();
    const onBackToLogin = vi.fn();

    render(<EmailVerificationNotice onBackToLogin={onBackToLogin} />);

    await user.click(screen.getByRole("button", { name: /back to login/i }));

    expect(onBackToLogin).toHaveBeenCalledTimes(1);
});
