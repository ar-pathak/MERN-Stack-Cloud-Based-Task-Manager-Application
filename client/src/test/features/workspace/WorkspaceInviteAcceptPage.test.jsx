import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

const acceptWorkspaceInviteMock = vi.fn();

vi.mock("../../../service/workspace.service", () => ({
  acceptWorkspaceInvite: (...args) => acceptWorkspaceInviteMock(...args),
}));

import { AuthContext } from "../../../context/AuthContext";
import WorkspaceInviteAcceptPage from "../../../features/workspace/WorkspaceInviteAcceptPage.jsx";

const LocationDebug = () => {
  const location = useLocation();
  return (
    <div data-testid="location-debug">
      {location.pathname}
      {location.search}
    </div>
  );
};

const renderWorkspaceInvitePage = ({ initialEntry, authValue }) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/invites/accept/:token" element={<WorkspaceInviteAcceptPage />} />
          <Route
            path="/home/auth"
            element={
              <div>
                <div>Login Page</div>
                <LocationDebug />
              </div>
            }
          />
          <Route path="/main" element={<div>Main Page</div>} />
          <Route path="/main/notifications" element={<div>Notifications Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe("WorkspaceInviteAcceptPage", () => {
  beforeEach(() => {
    acceptWorkspaceInviteMock.mockReset();
  });

  it("shows an immediate error for malformed invite tokens", async () => {
    renderWorkspaceInvitePage({
      initialEntry: "/invites/accept/short-token",
      authValue: {
        isAuthenticated: true,
        loading: false,
        refreshUser: vi.fn(),
      },
    });

    expect(await screen.findByText("Invalid invite link.")).toBeInTheDocument();
    expect(acceptWorkspaceInviteMock).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login with a safe return path", async () => {
    const token = "a".repeat(64);

    renderWorkspaceInvitePage({
      initialEntry: `/invites/accept/${token}`,
      authValue: {
        isAuthenticated: false,
        loading: false,
        refreshUser: vi.fn(),
      },
    });

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
    expect(screen.getByTestId("location-debug")).toHaveTextContent(
      `/home/auth?redirect=%2Finvites%2Faccept%2F${token}`,
    );
    expect(acceptWorkspaceInviteMock).not.toHaveBeenCalled();
  });

  it("accepts a valid invite, refreshes the user, and allows navigation to notifications", async () => {
    const user = userEvent.setup();
    const token = "b".repeat(64);
    const refreshUserMock = vi.fn().mockResolvedValue(undefined);

    acceptWorkspaceInviteMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });

    renderWorkspaceInvitePage({
      initialEntry: `/invites/accept/${token}`,
      authValue: {
        isAuthenticated: true,
        loading: false,
        refreshUser: refreshUserMock,
      },
    });

    expect(
      await screen.findByText("Invite accepted. You are now a workspace member."),
    ).toBeInTheDocument();

    expect(acceptWorkspaceInviteMock).toHaveBeenCalledWith(token);
    await waitFor(() => {
      expect(refreshUserMock).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole("button", { name: /view notifications/i }));

    expect(screen.getByText("Notifications Page")).toBeInTheDocument();
  });

  it("surfaces invite acceptance failures from the service", async () => {
    const token = "c".repeat(64);

    acceptWorkspaceInviteMock.mockRejectedValue({
      message: "Invite expired.",
    });

    renderWorkspaceInvitePage({
      initialEntry: `/invites/accept/${token}`,
      authValue: {
        isAuthenticated: true,
        loading: false,
        refreshUser: vi.fn(),
      },
    });

    expect(await screen.findByText("Invite expired.")).toBeInTheDocument();
  });
});
