import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  navigateMock,
  useMembersLogicMock,
  useAuthMock,
  fetchWorkspaceMembersMock,
  fetchTaskByIdMock,
  fetchTeamsMock,
  fetchTeamMembersMock,
  createNewTeamMock,
  removeTeamMock,
  addTeamMemberMock,
  removeTeamMemberMock,
  updateTeamMemberRoleMock,
  leaveTeamMock,
  fetchProjectTeamsMock,
  addProjectTeamsMock,
  removeProjectTeamsMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useMembersLogicMock: vi.fn(),
  useAuthMock: vi.fn(),
  fetchWorkspaceMembersMock: vi.fn(),
  fetchTaskByIdMock: vi.fn(),
  fetchTeamsMock: vi.fn(),
  fetchTeamMembersMock: vi.fn(),
  createNewTeamMock: vi.fn(),
  removeTeamMock: vi.fn(),
  addTeamMemberMock: vi.fn(),
  removeTeamMemberMock: vi.fn(),
  updateTeamMemberRoleMock: vi.fn(),
  leaveTeamMock: vi.fn(),
  fetchProjectTeamsMock: vi.fn(),
  addProjectTeamsMock: vi.fn(),
  removeProjectTeamsMock: vi.fn(),
}));

vi.mock("framer-motion", async () => {
  const React = await vi.importActual("react");
  const make = (tag) => ({ children, initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, ...props }) =>
    React.createElement(typeof tag === "string" ? tag : "div", props, children);
  return {
    motion: new Proxy({}, { get: (_target, tag) => make(tag) }),
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../../../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../../../features/main/features/overview/components/infoSidebar/components/MembersSection/useMembersLogic", () => ({
  useMembersLogic: (...args) => useMembersLogicMock(...args),
}));

vi.mock("../../../../../features/main/features/overview/hook/useWorkspace", () => ({
  useWorkspace: () => ({
    fetchMembers: fetchWorkspaceMembersMock,
  }),
}));

vi.mock("../../../../../features/main/features/overview/hook/useTask", () => ({
  useTask: () => ({
    fetchTaskById: fetchTaskByIdMock,
  }),
}));

vi.mock("../../../../../features/main/features/overview/hook/useTeam", () => ({
  useTeam: () => ({
    fetchTeams: fetchTeamsMock,
    createNewTeam: createNewTeamMock,
    removeTeam: removeTeamMock,
    fetchMembers: fetchTeamMembersMock,
    fetchTeamMembers: fetchTeamMembersMock,
    addMember: addTeamMemberMock,
    removeMember: removeTeamMemberMock,
    updateMemberRole: updateTeamMemberRoleMock,
    leaveTeam: leaveTeamMock,
  }),
}));

vi.mock("../../../../../features/main/features/overview/hook/useProject", () => ({
  useProject: () => ({
    fetchProjectTeams: fetchProjectTeamsMock,
    addProjectTeams: addProjectTeamsMock,
    removeProjectTeams: removeProjectTeamsMock,
  }),
}));

import AddMemberModal from "../../../../../features/main/features/overview/components/infoSidebar/components/MembersSection/AddMemberModal";
import AssignProjectMemberModal from "../../../../../features/main/features/overview/components/infoSidebar/components/MembersSection/AssignProjectMemberModal";
import InviteModal from "../../../../../features/main/features/overview/components/infoSidebar/components/MembersSection/InviteModal";
import MemberCard from "../../../../../features/main/features/overview/components/infoSidebar/components/MembersSection/MemberCard";
import MemberFilters from "../../../../../features/main/features/overview/components/infoSidebar/components/MembersSection/MemberFilters";
import MembersSection from "../../../../../features/main/features/overview/components/infoSidebar/components/MembersSection/MembersSection";
import AssignTeamModal from "../../../../../features/main/features/overview/components/infoSidebar/components/TeamsSection/AssignTeamModal";
import ConfirmationModal from "../../../../../features/main/features/overview/components/infoSidebar/components/TeamsSection/ConfirmationModal";
import CreateTeamModal from "../../../../../features/main/features/overview/components/infoSidebar/components/TeamsSection/CreateTeamModal";
import TeamCard from "../../../../../features/main/features/overview/components/infoSidebar/components/TeamsSection/TeamCard";
import TeamMemberItem from "../../../../../features/main/features/overview/components/infoSidebar/components/TeamsSection/TeamMemberItem";
import TeamsSection from "../../../../../features/main/features/overview/components/infoSidebar/components/TeamsSection/TeamsSection";
import TeamsToolbar from "../../../../../features/main/features/overview/components/infoSidebar/components/TeamsSection/TeamsToolbar";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);

  useAuthMock.mockReturnValue({ user: { _id: "me", id: "me" } });
  useMembersLogicMock.mockReturnValue({
    members: [
      { _id: "member-1", user: { _id: "u1", name: "Alex", email: "alex@example.com" }, role: "admin" },
    ],
    taskData: { workspace: null, project: null },
    subtaskData: null,
    filteredMembers: [
      { _id: "member-1", user: { _id: "u1", name: "Alex", email: "alex@example.com" }, role: "admin" },
    ],
    roleStats: { all: 1, owner: 0, admin: 1, member: 0, viewer: 0 },
    initialLoadComplete: true,
    isRefreshing: false,
    isGlobalLoading: false,
    canManageMembers: true,
    notification: { type: "", message: "" },
    setNotification: vi.fn(),
    searchQuery: "",
    setSearchQuery: vi.fn(),
    filterRole: "all",
    setFilterRole: vi.fn(),
    loadMembers: vi.fn(),
    handleAddMember: vi.fn(),
    handleAssignProjectMembers: vi.fn(),
    handleInvite: vi.fn(),
    handleRemoveMember: vi.fn(),
    handleUpdateRole: vi.fn(),
  });

  fetchWorkspaceMembersMock.mockResolvedValue({
    data: [
      { user: { _id: "u1", name: "Alex", email: "alex@example.com" } },
      { user: { _id: "u2", name: "Sam", email: "sam@example.com" } },
    ],
  });
  fetchTaskByIdMock.mockResolvedValue({ data: { assigneesTeams: [] } });

  fetchTeamsMock.mockResolvedValue({
    data: [
      { _id: "team-1", name: "Design", description: "Designers", createdAt: "2026-03-10T00:00:00.000Z" },
      { _id: "team-2", name: "Engineering", description: "Builders", createdAt: "2026-03-11T00:00:00.000Z" },
    ],
  });
  fetchTeamMembersMock.mockResolvedValue({
    data: [
      { user: { _id: "me", name: "Riya", email: "riya@example.com" }, role: "lead" },
      { user: { _id: "u2", name: "Sam", email: "sam@example.com" }, role: "member" },
    ],
  });
  createNewTeamMock.mockResolvedValue({ success: true, data: { _id: "team-3", name: "QA" } });
  removeTeamMock.mockResolvedValue({ success: true });
  addTeamMemberMock.mockResolvedValue({ success: true });
  removeTeamMemberMock.mockResolvedValue({ success: true });
  updateTeamMemberRoleMock.mockResolvedValue({ success: true });
  leaveTeamMock.mockResolvedValue({ success: true });

  fetchProjectTeamsMock.mockResolvedValue({
    data: [{ _id: "team-2", name: "Engineering", members: [{ _id: "u2" }] }],
  });
  addProjectTeamsMock.mockResolvedValue({ success: true });
  removeProjectTeamsMock.mockResolvedValue({ success: true });

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn() },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:members"),
  });

  const anchor = { click: vi.fn(), set href(value) { this._href = value; }, set download(value) { this._download = value; } };
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName) => {
    if (tagName === "a") return anchor;
    return originalCreateElement(tagName);
  });
});

describe("overview members and teams", () => {
  it("submits add-member forms", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <AddMemberModal
        item={{ type: "workspace" }}
        isOpen
        onClose={onClose}
        onAdd={onAdd}
        isLoading={false}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter username/i), {
      target: { value: "new-user" },
    });
    fireEvent.change(screen.getByDisplayValue("Member"), {
      target: { value: "admin" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith("new-user", "admin");
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("supports single-email and csv invite flows", async () => {
    const onInvite = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    const { container, rerender } = render(
      <InviteModal isOpen onClose={onClose} onInvite={onInvite} isLoading={false} />,
    );

    fireEvent.change(screen.getByPlaceholderText(/colleague@example.com/i), {
      target: { value: "solo@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Invite/i }));

    await waitFor(() => {
      expect(onInvite).toHaveBeenCalledWith({
        email: "solo@example.com",
        role: "member",
        file: null,
      });
    });

    rerender(<InviteModal isOpen onClose={onClose} onInvite={onInvite} isLoading={false} />);
    fireEvent.click(screen.getByRole("button", { name: /CSV Upload/i }));
    const file = new File(["email\nteam@example.com"], "team.csv", { type: "text/csv" });
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Upload CSV & Invite/i }));

    await waitFor(() => {
      expect(onInvite).toHaveBeenCalledWith({
        email: "",
        role: "member",
        file,
      });
    });
  });

  it("assigns available project members from the modal", async () => {
    const onAssign = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <AssignProjectMemberModal
        item={{ type: "project" }}
        taskData={null}
        isOpen
        onClose={onClose}
        onAssign={onAssign}
        workspaceId="workspace-1"
        currentProjectMembers={[{ user: { _id: "u1", name: "Alex" } }]}
        isLoading={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Sam")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sam"));
    fireEvent.click(screen.getByRole("button", { name: /Assign Members/i }));

    await waitFor(() => {
      expect(onAssign).toHaveBeenCalledWith(["u2"]);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("filters members and manages member cards", async () => {
    const setSearchQuery = vi.fn();
    const setFilterRole = vi.fn();
    const onUpdateRole = vi.fn().mockResolvedValue(undefined);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <>
        <MemberFilters
          searchQuery="alex"
          setSearchQuery={setSearchQuery}
          filterRole="all"
          setFilterRole={setFilterRole}
          roleStats={{ all: 2, admin: 1, member: 1 }}
        />
        <MemberCard
          item={{ type: "workspace" }}
          member={{ user: { _id: "u1", name: "Alex", email: "alex@example.com" }, role: "member" }}
          canManageMembers
          onRemove={onRemove}
          onUpdateRole={onUpdateRole}
          presenceByUserId={{ u1: { isOnline: true } }}
        />
      </>,
    );

    fireEvent.click(screen.getAllByText("admin")[0].closest("button"));
    expect(setFilterRole).toHaveBeenCalledWith("admin");

    fireEvent.click(screen.getAllByText("Alex")[0]);
    expect(navigateMock).toHaveBeenCalledWith("/profile/u1");

    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[buttons.length - 1]);
    await act(async () => {
      fireEvent.click(screen.getAllByText("admin").at(-1));
    });
    fireEvent.click(container.querySelectorAll("button")[container.querySelectorAll("button").length - 1]);
    await act(async () => {
      fireEvent.click(screen.getByText(/Remove Member/i));
    });

    expect(onUpdateRole).toHaveBeenCalledWith("u1", "admin");
    expect(onRemove).toHaveBeenCalledWith("u1");
  });

  it("renders the members section actions and opens member modals", async () => {
    const loadMembers = vi.fn();
    useMembersLogicMock.mockReturnValue({
      members: [
        { _id: "member-1", user: { _id: "u1", name: "Alex", email: "alex@example.com" }, role: "admin" },
      ],
      taskData: { workspace: null, project: null },
      subtaskData: null,
      filteredMembers: [
        { _id: "member-1", user: { _id: "u1", name: "Alex", email: "alex@example.com" }, role: "admin" },
      ],
      roleStats: { all: 1, owner: 0, admin: 1, member: 0, viewer: 0 },
      initialLoadComplete: true,
      isRefreshing: false,
      isGlobalLoading: false,
      canManageMembers: true,
      notification: { type: "", message: "" },
      setNotification: vi.fn(),
      searchQuery: "",
      setSearchQuery: vi.fn(),
      filterRole: "all",
      setFilterRole: vi.fn(),
      loadMembers,
      handleAddMember: vi.fn(),
      handleAssignProjectMembers: vi.fn(),
      handleInvite: vi.fn(),
      handleRemoveMember: vi.fn(),
      handleUpdateRole: vi.fn(),
    });

    render(
      <MembersSection
        item={{ id: "workspace-1", type: "workspace" }}
        presenceByUserId={{ u1: { isOnline: true } }}
      />,
    );

    expect(screen.getByText(/Workspace Members/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));
    fireEvent.click(screen.getByRole("button", { name: /Export/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Invite/i }));

    expect(loadMembers).toHaveBeenCalledWith(true);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /Add Member/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Invite Members/i })).toBeInTheDocument();
  });

  it("creates teams and confirms destructive actions", () => {
    const onCreate = vi.fn();
    const onConfirm = vi.fn();

    render(
      <>
        <CreateTeamModal onClose={vi.fn()} onCreate={onCreate} submitting={false} />
        <ConfirmationModal
          isOpen
          onClose={vi.fn()}
          onConfirm={onConfirm}
          title="Leave team?"
          message="Please confirm"
          type="warning"
          loading={false}
        />
      </>,
    );

    fireEvent.change(screen.getByPlaceholderText(/Engineering/i), {
      target: { value: "Research" },
    });
    fireEvent.change(screen.getByPlaceholderText(/What does this team do/i), {
      target: { value: "Discovery work" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Team/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));

    expect(onCreate).toHaveBeenCalledWith({ name: "Research", description: "Discovery work" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("filters teams and assigns available teams", async () => {
    const setSearchQuery = vi.fn();
    const setShowFilters = vi.fn();
    const setSortBy = vi.fn();
    const onAssign = vi.fn();

    const { container } = render(
      <>
        <TeamsToolbar
          searchQuery=""
          setSearchQuery={setSearchQuery}
          showFilters={false}
          setShowFilters={setShowFilters}
          sortBy="name"
          setSortBy={setSortBy}
        />
        <AssignTeamModal
          item={{ type: "project" }}
          taskData={null}
          onClose={vi.fn()}
          onAssign={onAssign}
          submitting={false}
          workspaceId="workspace-1"
          currentTeamIds={["team-1"]}
        />
      </>,
    );

    fireEvent.change(screen.getByPlaceholderText(/Search teams/i), {
      target: { value: "eng" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sort/i }));

    expect(setSearchQuery).toHaveBeenCalledWith("eng");
    expect(setShowFilters).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Engineering"));
    fireEvent.click(container.querySelectorAll("button")[container.querySelectorAll("button").length - 1]);

    expect(onAssign).toHaveBeenCalledWith(["team-2"]);
  });

  it("manages team members from team member items and cards", () => {
    const onRoleChange = vi.fn();
    const onRemove = vi.fn();
    const onDelete = vi.fn();
    const onLeave = vi.fn();
    const onAddMember = vi.fn();

    const { container } = render(
      <>
        <TeamMemberItem
          member={{ user: { _id: "u2", name: "Sam", email: "sam@example.com" }, role: "member" }}
          canManage
          onRoleChange={onRoleChange}
          onRemove={onRemove}
        />
        <TeamCard
          team={{ _id: "team-1", name: "Design", createdAt: "2026-03-10T00:00:00.000Z" }}
          members={[
            { user: { _id: "me", name: "Riya", email: "riya@example.com" }, role: "lead" },
          ]}
          workspaceMembers={[
            { user: { _id: "u3", name: "Jordan", email: "jordan@example.com" } },
          ]}
          presenceByUserId={{ me: { isOnline: true }, u3: { isOnline: false } }}
          canManage
          onDelete={onDelete}
          onLeave={onLeave}
          onAddMember={onAddMember}
          onRemoveMember={vi.fn()}
          onRoleChange={vi.fn()}
          contextType="workspace"
          currentUserId="me"
        />
      </>,
    );

    fireEvent.click(screen.getAllByText("Sam")[0]);
    expect(navigateMock).toHaveBeenCalledWith("/profile/u2");

    let buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[2]);
    fireEvent.click(screen.getByText(/Make Lead/i));
    buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[2]);
    fireEvent.click(screen.getByText(/Remove Member/i));

    expect(onRoleChange).toHaveBeenCalledWith("u2", "member");
    expect(onRemove).toHaveBeenCalledWith("u2");

    fireEvent.click(screen.getByRole("button", { name: /View\s*Members/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add member/i }));
    fireEvent.click(screen.getByText("Jordan"));
    fireEvent.click(screen.getByRole("button", { name: /Team actions/i }));
    fireEvent.click(screen.getByText(/Delete Team/i));
    fireEvent.click(screen.getByRole("button", { name: /Team actions/i }));
    fireEvent.click(screen.getByText(/Leave Team/i));

    expect(onAddMember).toHaveBeenCalledWith("team-1", "u3");
    expect(onDelete).toHaveBeenCalledWith("team-1", "Design");
    expect(onLeave).toHaveBeenCalledWith("team-1", "Design");
  });

  it("loads teams inside the teams section and opens the create modal", async () => {
    render(
      <TeamsSection
        item={{ id: "workspace-1", type: "workspace", permissions: { role: "owner" } }}
        taskData={null}
        presenceByUserId={{ me: { isOnline: true } }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Design")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Team/i }));
    expect(screen.getByText(/Create New Team/i)).toBeInTheDocument();
  });
});












