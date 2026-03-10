import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, test } from "vitest";

import { AuthContext } from "../../context/AuthContext";
import ProtectedRoute from "../../router/ProtectedRoute";
import PublicRoute from "../../router/PublicRoute";

const renderProtectedRoute = (authValue) => render(
    <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/main"]}>
            <Routes>
                <Route element={<ProtectedRoute />}>
                    <Route path="/main" element={<div>Protected content</div>} />
                </Route>
                <Route path="/home/auth" element={<div>Login screen</div>} />
            </Routes>
        </MemoryRouter>
    </AuthContext.Provider>
);

const renderPublicRoute = (authValue) => render(
    <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/home/auth"]}>
            <Routes>
                <Route element={<PublicRoute />}>
                    <Route path="/home/auth" element={<div>Public content</div>} />
                </Route>
                <Route path="/main" element={<div>Main dashboard</div>} />
            </Routes>
        </MemoryRouter>
    </AuthContext.Provider>
);

test("ProtectedRoute shows the loading screen while auth state resolves", () => {
    renderProtectedRoute({
        isAuthenticated: false,
        loading: true,
    });

    expect(screen.getByText(/loading your experience/i)).toBeInTheDocument();
});

test("ProtectedRoute redirects unauthenticated users to login", () => {
    renderProtectedRoute({
        isAuthenticated: false,
        loading: false,
    });

    expect(screen.getByText("Login screen")).toBeInTheDocument();
});

test("ProtectedRoute renders nested content for authenticated users", () => {
    renderProtectedRoute({
        isAuthenticated: true,
        loading: false,
    });

    expect(screen.getByText("Protected content")).toBeInTheDocument();
});

test("PublicRoute keeps public pages visible while auth is loading", () => {
    renderPublicRoute({
        isAuthenticated: false,
        loading: true,
    });

    expect(screen.getByText("Public content")).toBeInTheDocument();
});

test("PublicRoute redirects authenticated users away from auth screens", () => {
    renderPublicRoute({
        isAuthenticated: true,
        loading: false,
    });

    expect(screen.getByText("Main dashboard")).toBeInTheDocument();
});

test("PublicRoute renders public content when unauthenticated", () => {
    renderPublicRoute({
        isAuthenticated: false,
        loading: false,
    });

    expect(screen.getByText("Public content")).toBeInTheDocument();
});
