import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseAdminAuth, mockUseLocation, toasterCapture } = vi.hoisted(() => ({
  mockUseAdminAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  toasterCapture: { current: null },
}));

vi.mock("react-router", () => ({
  Navigate: ({ to, replace, state }) => (
    <div
      data-testid="navigate"
      data-replace={String(replace)}
      data-state={JSON.stringify(state || null)}
      data-to={to}
    />
  ),
  Outlet: () => <div data-testid="admin-outlet">Outlet</div>,
  useLocation: () => mockUseLocation(),
}));

vi.mock("../../../features/admin/context/AdminAuthContext", () => ({
  useAdminAuth: () => mockUseAdminAuth(),
}));

vi.mock("../../../features/admin/context/AdminAuthProvider", () => ({
  AdminAuthProvider: ({ children }) => <div data-testid="admin-auth-provider">{children}</div>,
}));

vi.mock("sonner", () => ({
  Toaster: (props) => {
    toasterCapture.current = props;
    return <div data-testid="admin-toaster" />;
  },
}));

import AdminApp from "../../../features/admin/AdminApp";
import AdminProtectedRoute from "../../../features/admin/components/AdminProtectedRoute";
import AdminPublicRoute from "../../../features/admin/components/AdminPublicRoute";

describe("admin shell and routes", () => {
  beforeEach(() => {
    mockUseLocation.mockReturnValue({ pathname: "/admin/panel", search: "?tab=users" });
    toasterCapture.current = null;
  });

  it("renders AdminApp with the provider, outlet, and toaster", () => {
    render(<AdminApp />);

    expect(screen.getByTestId("admin-auth-provider")).toBeInTheDocument();
    expect(screen.getByTestId("admin-outlet")).toBeInTheDocument();
    expect(screen.getByTestId("admin-toaster")).toBeInTheDocument();
    expect(toasterCapture.current).toMatchObject({
      position: "top-right",
      richColors: true,
      closeButton: true,
      toastOptions: {
        duration: 4200,
        style: {
          background: "rgb(15 23 42)",
          color: "rgb(241 245 249)",
          border: "1px solid rgb(51 65 85)",
        },
      },
    });
  });

  it("shows a loading state for protected routes while auth is loading", () => {
    mockUseAdminAuth.mockReturnValue({ loading: true, isAuthenticated: false });

    const { container } = render(<AdminProtectedRoute />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users away from protected routes", () => {
    mockUseAdminAuth.mockReturnValue({ loading: false, isAuthenticated: false });

    render(<AdminProtectedRoute />);

    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/admin/auth");
    expect(screen.getByTestId("navigate")).toHaveAttribute(
      "data-state",
      JSON.stringify({ from: "/admin/panel?tab=users" }),
    );
  });

  it("renders protected content for authenticated admins", () => {
    mockUseAdminAuth.mockReturnValue({ loading: false, isAuthenticated: true });

    render(<AdminProtectedRoute />);

    expect(screen.getByTestId("admin-outlet")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });

  it("shows a loading state for public routes while auth is loading", () => {
    mockUseAdminAuth.mockReturnValue({ loading: true, isAuthenticated: false });

    const { container } = render(<AdminPublicRoute />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects authenticated admins away from public routes", () => {
    mockUseAdminAuth.mockReturnValue({ loading: false, isAuthenticated: true });

    render(<AdminPublicRoute />);

    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/admin/panel");
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-replace", "true");
  });

  it("renders public content for signed-out admins", () => {
    mockUseAdminAuth.mockReturnValue({ loading: false, isAuthenticated: false });

    render(<AdminPublicRoute />);

    expect(screen.getByTestId("admin-outlet")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });
});
