import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";

import { AuthContext } from "../../../context/AuthContext";
import OAuthCallbackPage from "./OAuthCallbackPage.jsx";

const renderOAuthPage = ({ initialEntry, authValue }) => render(
    <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path="/home/auth/oauth/callback" element={<OAuthCallbackPage />} />
                <Route path="/main" element={<div>Main Page</div>} />
                <Route path="/main/feed" element={<div>Feed Page</div>} />
                <Route path="/home/auth" element={<div>Login Page</div>} />
            </Routes>
        </MemoryRouter>
    </AuthContext.Provider>
);

test("completes successful OAuth callbacks and redirects to the requested route", async () => {
    const refreshUserMock = vi.fn().mockResolvedValue(undefined);

    renderOAuthPage({
        initialEntry: "/home/auth/oauth/callback?status=success&provider=google&redirect=/main/feed",
        authValue: {
            refreshUser: refreshUserMock,
        },
    });

    await waitFor(() => {
        expect(refreshUserMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/signed in with google\. redirecting/i)).toBeInTheDocument();
    });

    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 400));
    });

    expect(screen.getByText("Feed Page")).toBeInTheDocument();
});

test("falls back to /main when the OAuth redirect query is unsafe", async () => {
    const refreshUserMock = vi.fn().mockResolvedValue(undefined);

    renderOAuthPage({
        initialEntry: "/home/auth/oauth/callback?status=success&provider=github&redirect=//evil.example",
        authValue: {
            refreshUser: refreshUserMock,
        },
    });

    await waitFor(() => expect(refreshUserMock).toHaveBeenCalledTimes(1));

    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 400));
    });

    expect(screen.getByText("Main Page")).toBeInTheDocument();
});

test("shows provider errors and lets the user return to login", async () => {
    const user = userEvent.setup();

    renderOAuthPage({
        initialEntry: "/home/auth/oauth/callback?status=error&provider=github&message=Access%20denied",
        authValue: {
            refreshUser: vi.fn(),
        },
    });

    expect(await screen.findByText("Access denied")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back to login/i }));

    expect(screen.getByText("Login Page")).toBeInTheDocument();
});

test("surfaces a session-loading error after OAuth success", async () => {
    const refreshUserMock = vi.fn().mockRejectedValue(new Error("load failed"));

    renderOAuthPage({
        initialEntry: "/home/auth/oauth/callback?status=success&provider=google",
        authValue: {
            refreshUser: refreshUserMock,
        },
    });

    expect(
        await screen.findByText(/authentication succeeded, but the session could not be loaded/i)
    ).toBeInTheDocument();
});

test("labels unknown providers as social", async () => {
    const refreshUserMock = vi.fn().mockResolvedValue(undefined);

    renderOAuthPage({
        initialEntry: "/home/auth/oauth/callback?status=success&provider=custom",
        authValue: {
            refreshUser: refreshUserMock,
        },
    });

    expect(
        await screen.findByText(/signed in with social\. redirecting/i)
    ).toBeInTheDocument();
});

test("uses fallback message when OAuth status is not successful", async () => {
    renderOAuthPage({
        initialEntry: "/home/auth/oauth/callback?status=error&provider=google",
        authValue: {
            refreshUser: vi.fn(),
        },
    });

    expect(
        await screen.findByText(/unable to complete google sign-in/i)
    ).toBeInTheDocument();
});

test("treats missing status and provider as a social sign-in error", async () => {
    renderOAuthPage({
        initialEntry: "/home/auth/oauth/callback",
        authValue: {
            refreshUser: vi.fn(),
        },
    });

    expect(
        await screen.findByText(/unable to complete social sign-in/i)
    ).toBeInTheDocument();
});

test("ignores late OAuth success responses after unmount", async () => {
    let resolveRefresh;
    const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
    });
    const refreshUserMock = vi.fn().mockReturnValue(refreshPromise);

    const { unmount } = renderOAuthPage({
        initialEntry: "/home/auth/oauth/callback?status=success&provider=google",
        authValue: {
            refreshUser: refreshUserMock,
        },
    });

    unmount();
    resolveRefresh();

    await refreshPromise;

    expect(refreshUserMock).toHaveBeenCalledTimes(1);
});

test("ignores late OAuth failures after unmount", async () => {
    let rejectRefresh;
    const refreshPromise = new Promise((_, reject) => {
        rejectRefresh = reject;
    });
    const refreshUserMock = vi.fn().mockReturnValue(refreshPromise);

    const { unmount } = renderOAuthPage({
        initialEntry: "/home/auth/oauth/callback?status=success&provider=google",
        authValue: {
            refreshUser: refreshUserMock,
        },
    });

    unmount();
    rejectRefresh(new Error("late failure"));

    await refreshPromise.catch(() => {});

    expect(refreshUserMock).toHaveBeenCalledTimes(1);
});
