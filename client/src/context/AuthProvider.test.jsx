import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";

const navigateMock = vi.fn();
const loginServiceMock = vi.fn();
const logoutServiceMock = vi.fn();
const registerServiceMock = vi.fn();
const getStoredUserMock = vi.fn();
const getUserInfoMock = vi.fn();
const updateActivityMock = vi.fn();

vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

vi.mock("../service/auth.service", () => ({
    login: (...args) => loginServiceMock(...args),
    logout: (...args) => logoutServiceMock(...args),
    register: (...args) => registerServiceMock(...args),
    getStoredUser: (...args) => getStoredUserMock(...args),
    getUserInfo: (...args) => getUserInfoMock(...args),
}));

vi.mock("../service/user.service", () => ({
    updateActivity: (...args) => updateActivityMock(...args),
}));

import { useAuth } from "./AuthContext";
import { AuthProvider } from "./AuthProvider";

let latestAuth;

function AuthConsumer() {
    latestAuth = useAuth();

    return (
        <div>
            <span>{latestAuth.loading ? "loading" : (latestAuth.user?.name || "guest")}</span>
            <span>{latestAuth.isAuthenticated ? "authenticated" : "anonymous"}</span>
        </div>
    );
}

const renderProvider = (initialEntries = ["/main"]) => render(
    <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
            <AuthConsumer />
        </AuthProvider>
    </MemoryRouter>
);

beforeEach(() => {
    latestAuth = undefined;
    localStorage.clear();
    navigateMock.mockReset();
    loginServiceMock.mockReset();
    logoutServiceMock.mockReset();
    registerServiceMock.mockReset();
    getStoredUserMock.mockReset();
    getUserInfoMock.mockReset();
    updateActivityMock.mockReset();
    getStoredUserMock.mockReturnValue(null);
    getUserInfoMock.mockResolvedValue(null);
    updateActivityMock.mockResolvedValue(null);
});

test("loads the current user, persists it, and reports authenticated state", async () => {
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                _id: "user-1",
                name: "Aurora User",
            },
        },
    });

    renderProvider();

    expect(screen.getByText("loading")).toBeInTheDocument();

    await waitFor(() => {
        expect(screen.getByText("Aurora User")).toBeInTheDocument();
        expect(screen.getByText("authenticated")).toBeInTheDocument();
    });

    expect(JSON.parse(localStorage.getItem("user"))).toEqual({
        _id: "user-1",
        name: "Aurora User",
    });
    await waitFor(() => {
        expect(updateActivityMock).toHaveBeenCalledWith(true);
    });
});

test("login wrapper delegates to service and refreshes the loaded user", async () => {
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                _id: "user-2",
                name: "Loaded User",
            },
        },
    });
    loginServiceMock.mockResolvedValue({ success: true });

    renderProvider();

    await waitFor(() => expect(screen.getByText("Loaded User")).toBeInTheDocument());
    const getUserInfoCalls = getUserInfoMock.mock.calls.length;

    await act(async () => {
        await latestAuth.login({
            email: "aurora@example.com",
            password: "Str0ng@Pass1",
        });
    });

    expect(loginServiceMock).toHaveBeenCalledWith({
        email: "aurora@example.com",
        password: "Str0ng@Pass1",
    });
    expect(getUserInfoMock.mock.calls).toHaveLength(getUserInfoCalls + 1);
});

test("register wrapper delegates to service and refreshes the loaded user", async () => {
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                _id: "user-6",
                name: "Registered User",
            },
        },
    });
    registerServiceMock.mockResolvedValue({ success: true });

    renderProvider();

    await waitFor(() => expect(screen.getByText("Registered User")).toBeInTheDocument());
    const getUserInfoCalls = getUserInfoMock.mock.calls.length;

    await act(async () => {
        await latestAuth.register({
            name: "Aurora User",
            email: "aurora@example.com",
            password: "Str0ng@Pass1",
        });
    });

    expect(registerServiceMock).toHaveBeenCalledWith({
        name: "Aurora User",
        email: "aurora@example.com",
        password: "Str0ng@Pass1",
    });
    expect(getUserInfoMock.mock.calls).toHaveLength(getUserInfoCalls + 1);
});

test("logout clears user state and redirects even when the API call fails", async () => {
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                _id: "user-3",
                name: "Active User",
            },
        },
    });
    logoutServiceMock.mockRejectedValue(new Error("logout failed"));

    renderProvider();

    await waitFor(() => expect(screen.getByText("Active User")).toBeInTheDocument());

    await act(async () => {
        await latestAuth.logout().catch(() => {});
    });

    expect(screen.getByText("guest")).toBeInTheDocument();
    expect(localStorage.getItem("user")).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith("/home/auth", { replace: true });
});

test("session-expired event redirects protected routes to login", async () => {
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                _id: "user-4",
                name: "Session User",
            },
        },
    });

    renderProvider(["/main"]);

    await waitFor(() => expect(screen.getByText("Session User")).toBeInTheDocument());

    act(() => {
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
    });

    expect(screen.getByText("guest")).toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledWith("/home/auth", { replace: true });
});

test("session-expired event does not redirect public auth routes", async () => {
    getUserInfoMock.mockRejectedValue({
        message: "Unauthorized",
    });

    renderProvider(["/home/auth"]);

    await waitFor(() => expect(screen.getByText("guest")).toBeInTheDocument());

    act(() => {
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
    });

    expect(navigateMock).not.toHaveBeenCalled();
});
