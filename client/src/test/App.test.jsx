import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { toasterCapture } = vi.hoisted(() => ({
  toasterCapture: { current: null },
}));

vi.mock("react-router", () => ({
  Outlet: () => <div data-testid="app-outlet">Outlet</div>,
}));

vi.mock("../context/AuthProvider", () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
}));

vi.mock("../context/ToggleProvider", () => ({
  ToggleProvider: ({ children }) => <div data-testid="toggle-provider">{children}</div>,
}));

vi.mock("sonner", () => ({
  Toaster: (props) => {
    toasterCapture.current = props;
    return <div data-testid="toaster" />;
  },
}));

import App from "../App";

describe("App", () => {
  beforeEach(() => {
    toasterCapture.current = null;
  });

  it("wraps the outlet with auth and toggle providers and renders the toaster", () => {
    render(<App />);

    expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-provider")).toBeInTheDocument();
    expect(screen.getByTestId("app-outlet")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  it("passes the expected toaster configuration", () => {
    render(<App />);

    expect(toasterCapture.current).toMatchObject({
      position: "top-right",
      richColors: true,
      closeButton: true,
      toastOptions: {
        duration: 4000,
        style: {
          background: "rgb(15 23 42)",
          color: "rgb(241 245 249)",
          border: "1px solid rgb(51 65 85)",
        },
      },
    });
  });
});
