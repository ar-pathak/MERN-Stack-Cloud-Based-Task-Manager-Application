import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateWorkspaceMock,
  toggleStarMock,
  toggleMuteMock,
  getQuickStatusMock,
  deleteWorkspaceMock,
  leaveWorkspaceMock,
  updateProjectMock,
  fetchProjectByIdMock,
  requestProjectStatusChangeMock,
  deleteProjectMock,
  leaveProjectMock,
  fetchTaskByIdMock,
  updateTaskMock,
  updateStatusMock,
  hardDeleteTaskMock,
  leaveTaskMock,
  updateSubtaskMock,
  deleteSubtaskMock,
  leaveSubtaskMock,
  removeTeamMock,
  leaveTeamMock,
  navigateMock,
  useMembersLogicMock,
  useAuthMock,
} = vi.hoisted(() => ({
  updateWorkspaceMock: vi.fn(),
  toggleStarMock: vi.fn(),
  toggleMuteMock: vi.fn(),
  getQuickStatusMock: vi.fn(),
  deleteWorkspaceMock: vi.fn(),
  leaveWorkspaceMock: vi.fn(),
  updateProjectMock: vi.fn(),
  fetchProjectByIdMock: vi.fn(),
  requestProjectStatusChangeMock: vi.fn(),
  deleteProjectMock: vi.fn(),
  leaveProjectMock: vi.fn(),
  fetchTaskByIdMock: vi.fn(),
  updateTaskMock: vi.fn(),
  updateStatusMock: vi.fn(),
  hardDeleteTaskMock: vi.fn(),
  leaveTaskMock: vi.fn(),
  updateSubtaskMock: vi.fn(),
  deleteSubtaskMock: vi.fn(),
  leaveSubtaskMock: vi.fn(),
  removeTeamMock: vi.fn(),
  leaveTeamMock: vi.fn(),
  navigateMock: vi.fn(),
  useMembersLogicMock: vi.fn(),
  useAuthMock: vi.fn(),
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
    updateWorkspace: updateWorkspaceMock,
    toggleStar: toggleStarMock,
    toggleMute: toggleMuteMock,
    getQuickStatus: getQuickStatusMock,
    deleteWorkspace: deleteWorkspaceMock,
    leaveWorkspace: leaveWorkspaceMock,
  }),
}));

vi.mock("../../../../../features/main/features/overview/hook/useProject", () => ({
  useProject: () => ({
    updateProject: updateProjectMock,
    fetchProjectById: fetchProjectByIdMock,
    requestProjectStatusChange: requestProjectStatusChangeMock,
    deleteProject: deleteProjectMock,
    leaveProject: leaveProjectMock,
  }),
}));

vi.mock("../../../../../features/main/features/overview/hook/useTask", () => ({
  useTask: () => ({
    fetchTaskById: fetchTaskByIdMock,
    updateTask: updateTaskMock,
    updateStatus: updateStatusMock,
    hardDeleteTask: hardDeleteTaskMock,
    leaveTask: leaveTaskMock,
  }),
}));

vi.mock("../../../../../features/main/features/overview/hook/useSubtask", () => ({
  useSubtask: () => ({
    updateSubtask: updateSubtaskMock,
    deleteSubtask: deleteSubtaskMock,
    leaveSubtask: leaveSubtaskMock,
  }),
}));

vi.mock("../../../../../features/main/features/overview/hook/useTeam", () => ({
  useTeam: () => ({
    removeTeam: removeTeamMock,
    leaveTeam: leaveTeamMock,
  }),
}));

import AnalyticsSection from "../../../../../features/main/features/overview/components/infoSidebar/AnalyticsSection";
import DangerZoneSection from "../../../../../features/main/features/overview/components/infoSidebar/DangerZoneSection";
import Description from "../../../../../features/main/features/overview/components/infoSidebar/Description";
import InfoSidebar from "../../../../../features/main/features/overview/components/infoSidebar/InfoSidebar";
import MetaDetails from "../../../../../features/main/features/overview/components/infoSidebar/MetaDetails";
import ProgressSection from "../../../../../features/main/features/overview/components/infoSidebar/ProgressSection";
import QuickActions from "../../../../../features/main/features/overview/components/infoSidebar/QuickActions";
import QuickStatsSection from "../../../../../features/main/features/overview/components/infoSidebar/QuickStatsSection";
import StatusControl from "../../../../../features/main/features/overview/components/infoSidebar/StatusControl";

const taskItem = (overrides = {}) => ({
  id: "task-1",
  _id: "task-1",
  type: "task",
  title: "Build dashboard",
  description: "Ship charts and filters",
  status: "active",
  isHighPriority: false,
  assignees: [{ _id: "u1" }, { _id: "u2" }],
  subtasks: [{ completed: true }, { completed: false }],
  dueDate: "2026-03-25T12:00:00.000Z",
  createdAt: "2026-03-10T08:00:00.000Z",
  updatedAt: "2026-03-18T08:00:00.000Z",
  permissions: { role: "creator", canChangeStatus: true, canUpdatePriority: true },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();

  useAuthMock.mockReturnValue({ user: { _id: "me", id: "me" } });
  useMembersLogicMock.mockReturnValue({
    members: [{ user: { _id: "me", name: "Riya" }, role: "member" }],
    subtaskData: null,
  });

  updateWorkspaceMock.mockResolvedValue({ success: true, data: { name: "Updated Workspace" } });
  toggleStarMock.mockResolvedValue({ success: true, data: { isStarred: true } });
  toggleMuteMock.mockResolvedValue({ success: true, data: { isMuted: true } });
  getQuickStatusMock.mockResolvedValue({ success: true, data: { isStarred: false, isMuted: false } });
  deleteWorkspaceMock.mockResolvedValue(true);
  leaveWorkspaceMock.mockResolvedValue(true);

  updateProjectMock.mockResolvedValue({ success: true, data: { status: "completed", isHighPriority: true } });
  fetchProjectByIdMock.mockResolvedValue({ data: { workspace: { _id: "workspace-1" } } });
  requestProjectStatusChangeMock.mockResolvedValue({ success: true });
  deleteProjectMock.mockResolvedValue(true);
  leaveProjectMock.mockResolvedValue(true);

  fetchTaskByIdMock.mockResolvedValue({ data: { workspace: null, project: null } });
  updateTaskMock.mockResolvedValue({ success: true, data: { _id: "task-1", status: "completed", isHighPriority: true, dueDate: "2026-03-30T00:00:00.000Z" } });
  updateStatusMock.mockResolvedValue({ success: true, data: { _id: "task-1", status: "completed" } });
  hardDeleteTaskMock.mockResolvedValue(true);
  leaveTaskMock.mockResolvedValue(true);

  updateSubtaskMock.mockResolvedValue({ success: true, data: { _id: "subtask-1", completed: true } });
  deleteSubtaskMock.mockResolvedValue(true);
  leaveSubtaskMock.mockResolvedValue(true);

  removeTeamMock.mockResolvedValue({ success: true });
  leaveTeamMock.mockResolvedValue({ success: true });

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn() },
  });
});

describe("overview info sidebar sections", () => {
  it("renders quick stats and progress blocks for tasks and workspaces", () => {
    render(<QuickStatsSection item={taskItem({ isHighPriority: true })} />);
    expect(screen.getByText("Quick Stats")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Assignees")).toBeInTheDocument();

    render(
      <ProgressSection
        item={{ id: "workspace-1", type: "workspace" }}
        overview={{ stats: { totalTasks: 10, completedTasks: 5, inProgressTasks: 3 } }}
      />,
    );

    expect(screen.getByText("Workspace Progress")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("updates task status and priority from the status control", async () => {
    const onItemPatch = vi.fn();
    const onMutationSuccess = vi.fn();

    render(
      <StatusControl
        item={taskItem()}
        onItemPatch={onItemPatch}
        onMutationSuccess={onMutationSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "completed" },
    });

    await waitFor(() => {
      expect(updateStatusMock).toHaveBeenCalledWith("task-1", "completed");
    });

    fireEvent.click(screen.getByRole("button", { name: /High/i }));

    await waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledWith("task-1", { isHighPriority: true });
    });
    expect(onItemPatch).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
    expect(onItemPatch).toHaveBeenCalledWith(expect.objectContaining({ isHighPriority: true }));
    expect(onMutationSuccess).toHaveBeenCalledTimes(2);
  });

  it("loads workspace quick actions and toggles star plus mute", async () => {
    render(
      <QuickActions item={{ id: "workspace-1", type: "workspace", starred: false, muted: false }} />,
    );

    await waitFor(() => {
      expect(getQuickStatusMock).toHaveBeenCalledWith("workspace-1");
    });

    fireEvent.click(screen.getByRole("button", { name: /Star/i }));

    await waitFor(() => {
      expect(toggleStarMock).toHaveBeenCalledWith("workspace-1");
    });

    fireEvent.click(screen.getByRole("button", { name: /Mute/i }));

    await waitFor(() => {
      expect(toggleMuteMock).toHaveBeenCalledWith("workspace-1");
    });
  });

  it("edits and saves descriptions", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <Description item={{ description: "Old copy" }} canEdit onSave={onSave} />,
    );

    fireEvent.click(container.querySelector("button"));
    fireEvent.change(screen.getByPlaceholderText(/Add a description/i), {
      target: { value: "New overview description" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("New overview description");
    });
  });

  it("copies ids and updates due dates in meta details", async () => {
    render(<MetaDetails item={taskItem()} />);

    fireEvent.click(screen.getByLabelText(/Copy full ID/i));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("task-1");

    fireEvent.click(screen.getByLabelText(/Edit due date/i));
    fireEvent.change(screen.getByLabelText(/Select due date/i), {
      target: { value: "2026-03-30T10:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledWith("task-1", expect.objectContaining({ dueDate: expect.any(String) }));
    });
  });

  it("confirms danger-zone deletes and reports success", async () => {
    render(
      <DangerZoneSection
        item={{ id: "workspace-1", type: "workspace", name: "Workspace Alpha", permissions: { role: "owner" } }}
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Delete workspace/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));

    await waitFor(() => {
      expect(deleteWorkspaceMock).toHaveBeenCalledWith("workspace-1");
    });

    expect(navigateMock).toHaveBeenCalledWith("/main");
    expect(screen.getByRole("button", { name: /Done/i })).toBeInTheDocument();
  });

  it("renders analytics and info sidebar tabs", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      render(<AnalyticsSection item={{ id: "workspace-1", type: "workspace" }} overview={{}} />);
      expect(screen.getByText("Activity Overview")).toBeInTheDocument();
      expect(screen.getByText("Tasks completed")).toBeInTheDocument();
      expect(screen.getByText("Mon")).toBeInTheDocument();

      render(
        <InfoSidebar
          item={taskItem()}
          overview={{ stats: { totalTasks: 2, completedTasks: 1, inProgressTasks: 1 } }}
          initialTab="settings"
          onClose={vi.fn()}
          onUpdate={vi.fn()}
        />,
      );

      expect(screen.getByText("Build dashboard")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Danger Zone")).toBeInTheDocument();
      });

      expect(fetchTaskByIdMock).toHaveBeenCalledWith("task-1");
    } finally {
      randomSpy.mockRestore();
    }
  });
});


