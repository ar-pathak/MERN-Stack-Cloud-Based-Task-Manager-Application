import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";

const navigateMock = vi.fn();
let locationValue = { pathname: "/main" };
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
        useLocation: () => locationValue,
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

const renderProvider = (initialEntries = ["/main"], locationPath) => {
    const resolvedPath = locationPath !== undefined ? locationPath : initialEntries[0];
    locationValue = { pathname: resolvedPath };

    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        </MemoryRouter>
    );
};

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
    locationValue = { pathname: "/main" };
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

test("logout clears user state and redirects on success", async () => {
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                _id: "user-10",
                name: "Logged In",
            },
        },
    });
    logoutServiceMock.mockResolvedValue({ success: true });

    renderProvider();

    await waitFor(() => expect(screen.getByText("Logged In")).toBeInTheDocument());

    await act(async () => {
        await latestAuth.logout();
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

test("updates activity on visibility changes and beforeunload", async () => {
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                _id: "user-11",
                name: "Activity User",
            },
        },
    });

    renderProvider();

    await waitFor(() => expect(updateActivityMock).toHaveBeenCalledWith(true));

    const originalVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState");

    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
    });

    act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(updateActivityMock).toHaveBeenCalledWith(false);

    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
    });

    act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(updateActivityMock).toHaveBeenCalledWith(true);

    act(() => {
        window.dispatchEvent(new Event("beforeunload"));
    });

    expect(updateActivityMock).toHaveBeenCalledWith(false);

    if (originalVisibility) {
        Object.defineProperty(document, "visibilityState", originalVisibility);
    }
});

test("clears loading after timeout when user info hangs", async () => {
    vi.useFakeTimers();
    getUserInfoMock.mockImplementation(() => new Promise(() => {}));

    renderProvider();

    expect(screen.getByText("loading")).toBeInTheDocument();

    await act(async () => {
        vi.advanceTimersByTime(2600);
    });

    expect(screen.getByText("guest")).toBeInTheDocument();

    vi.useRealTimers();
});

test("handles stored user read errors and clears missing user data", async () => {
    getStoredUserMock.mockImplementation(() => {
        throw new Error("storage unavailable");
    });
    getUserInfoMock.mockResolvedValue({ data: { user: null } });
    localStorage.setItem("user", JSON.stringify({ id: "stale-user" }));

    renderProvider();

    expect(screen.getByText("loading")).toBeInTheDocument();

    await waitFor(() => {
        expect(screen.getByText("guest")).toBeInTheDocument();
    });

    expect(localStorage.getItem("user")).toBeNull();
});

test("background refresh does not flip loading true when a stored user exists", async () => {
    getStoredUserMock.mockReturnValue({ id: "stored-1", name: "Stored User" });
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                id: "stored-1",
                name: "Stored User",
            },
        },
    });

    renderProvider();

    expect(screen.queryByText("loading")).toBeNull();
    await waitFor(() => expect(screen.getByText("Stored User")).toBeInTheDocument());
});

test("clears local storage when user info fetch fails", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "stale-2" }));
    getUserInfoMock.mockRejectedValue({ message: "Unauthorized" });

    renderProvider();

    await waitFor(() => expect(screen.getByText("guest")).toBeInTheDocument());
    expect(localStorage.getItem("user")).toBeNull();
});

test("session-expired redirects for profile routes", async () => {
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                _id: "user-12",
                name: "Profile User",
            },
        },
    });

    renderProvider(["/profile/user-12"]);

    await waitFor(() => expect(screen.getByText("Profile User")).toBeInTheDocument());

    act(() => {
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
    });

    expect(navigateMock).toHaveBeenCalledWith("/home/auth", { replace: true });
});

test("session-expired does not redirect when pathname is missing", async () => {
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                _id: "user-13",
                name: "Pathless User",
            },
        },
    });

    renderProvider(["/main"], null);

    await waitFor(() => expect(screen.getByText("Pathless User")).toBeInTheDocument());

    act(() => {
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
    });

    expect(navigateMock).not.toHaveBeenCalled();
});

test("ignores late user info failures after timeout", async () => {
    vi.useFakeTimers();
    let rejectFetch;
    const fetchPromise = new Promise((_, reject) => {
        rejectFetch = reject;
    });
    getUserInfoMock.mockReturnValue(fetchPromise);

    renderProvider();

    await act(async () => {
        vi.advanceTimersByTime(2600);
    });

    expect(screen.getByText("guest")).toBeInTheDocument();

    rejectFetch(new Error("late failure"));

    await act(async () => {
        await fetchPromise.catch(() => {});
    });

    expect(screen.getByText("guest")).toBeInTheDocument();

    vi.useRealTimers();
});

test("does not push activity updates after unmount", async () => {
    getUserInfoMock.mockResolvedValue({
        data: {
            user: {
                _id: "user-14",
                name: "Active User",
            },
        },
    });

    const visibilityHandlers = [];
    const originalAdd = document.addEventListener;
    const originalRemove = document.removeEventListener;

    const addSpy = vi.spyOn(document, "addEventListener").mockImplementation((event, handler, options) => {
        if (event === "visibilitychange") {
            visibilityHandlers.push(handler);
        }
        return originalAdd.call(document, event, handler, options);
    });

    const removeSpy = vi.spyOn(document, "removeEventListener").mockImplementation((event, handler, options) => {
        return originalRemove.call(document, event, handler, options);
    });

    const { unmount } = renderProvider();

    await waitFor(() => expect(updateActivityMock).toHaveBeenCalledWith(true));
    expect(visibilityHandlers.length).toBeGreaterThan(0);

    unmount();
    const callsAfterUnmount = updateActivityMock.mock.calls.length;

    act(() => {
        visibilityHandlers.forEach((handler) => handler());
    });

    expect(updateActivityMock.mock.calls.length).toBe(callsAfterUnmount);

    addSpy.mockRestore();
    removeSpy.mockRestore();
});
