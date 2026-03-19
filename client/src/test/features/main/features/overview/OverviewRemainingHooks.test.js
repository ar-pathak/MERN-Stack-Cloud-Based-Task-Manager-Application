import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  socketHandlers,
  apiGetMock,
  getUnreadMentionSummaryMock,
  getUnreadCallInviteSummaryMock,
  navigateMock,
  getProjectsByWorkspaceMock,
  getProjectByIdMock,
  createProjectServiceMock,
  updateProjectServiceMock,
  deleteProjectServiceMock,
  getProjectTeamsMock,
  addProjectTeamsServiceMock,
  removeProjectTeamsServiceMock,
  getProjectMembersMock,
  addProjectMembersServiceMock,
  removeProjectMembersServiceMock,
  updateProjectMemberRoleServiceMock,
  leaveProjectServiceMock,
  requestProjectStatusChangeServiceMock,
  respondProjectStatusChangeRequestServiceMock,
  getAllGlobalTasksMock,
  getWorkspaceTasksMock,
  getProjectTasksMock,
  getTaskByIdMock,
  createGlobalTaskServiceMock,
  createWorkspaceTaskServiceMock,
  createProjectTaskServiceMock,
  updateTaskServiceMock,
  updateTaskStatusServiceMock,
  toggleTaskCompletionMock,
  assignUsersToTaskMock,
  assignTeamsToTaskMock,
  assignUsersToTaskByUsernameMock,
  removeAssignUsersFromTaskMock,
  removeAssignTeamsFromTaskMock,
  deleteTaskServiceMock,
  hardDeleteTaskServiceMock,
  restoreTaskServiceMock,
  leaveTaskServiceMock,
  getSubtasksByTaskMock,
  getSubtaskByIdMock,
  createSubtaskServiceMock,
  updateSubtaskServiceMock,
  toggleSubtaskCompletionServiceMock,
  deleteSubtaskServiceMock,
  addAssigneesServiceMock,
  removeAssigneesServiceMock,
  leaveSubtaskServiceMock,
  getAllWorkspacesMock,
  getWorkspaceByIdMock,
  createWorkspaceServiceMock,
  updateWorkspaceServiceMock,
  deleteWorkspaceServiceMock,
  getWorkspaceMembersMock,
  addWorkspaceMemberMock,
  removeWorkspaceMemberMock,
  updateWorkspaceMemberRoleMock,
  sendWorkspaceInviteMock,
  acceptWorkspaceInviteMock,
  respondWorkspaceInviteMock,
  leaveWorkspaceServiceMock,
  transferOwnershipMock,
  getQuickStatusMock,
  toggleStarWorkspaceMock,
  toggleMuteWorkspaceMock,
  toggleArchiveWorkspaceMock,
  createTeamServiceMock,
  getTeamsByWorkspaceMock,
  getTeamByIdMock,
  updateTeamServiceMock,
  deleteTeamServiceMock,
  getTeamMembersMock,
  addTeamMemberServiceMock,
  removeTeamMemberServiceMock,
  updateTeamMemberRoleServiceMock,
  leaveTeamServiceMock,
} = vi.hoisted(() => ({
  socketHandlers: {
    receive: null,
    read: null,
    overview: null,
    unread: null,
    callIncoming: null,
    callInitiated: null,
    callEnded: null,
  },
  apiGetMock: vi.fn(),
  getUnreadMentionSummaryMock: vi.fn(),
  getUnreadCallInviteSummaryMock: vi.fn(),
  navigateMock: vi.fn(),
  getProjectsByWorkspaceMock: vi.fn(),
  getProjectByIdMock: vi.fn(),
  createProjectServiceMock: vi.fn(),
  updateProjectServiceMock: vi.fn(),
  deleteProjectServiceMock: vi.fn(),
  getProjectTeamsMock: vi.fn(),
  addProjectTeamsServiceMock: vi.fn(),
  removeProjectTeamsServiceMock: vi.fn(),
  getProjectMembersMock: vi.fn(),
  addProjectMembersServiceMock: vi.fn(),
  removeProjectMembersServiceMock: vi.fn(),
  updateProjectMemberRoleServiceMock: vi.fn(),
  leaveProjectServiceMock: vi.fn(),
  requestProjectStatusChangeServiceMock: vi.fn(),
  respondProjectStatusChangeRequestServiceMock: vi.fn(),
  getAllGlobalTasksMock: vi.fn(),
  getWorkspaceTasksMock: vi.fn(),
  getProjectTasksMock: vi.fn(),
  getTaskByIdMock: vi.fn(),
  createGlobalTaskServiceMock: vi.fn(),
  createWorkspaceTaskServiceMock: vi.fn(),
  createProjectTaskServiceMock: vi.fn(),
  updateTaskServiceMock: vi.fn(),
  updateTaskStatusServiceMock: vi.fn(),
  toggleTaskCompletionMock: vi.fn(),
  assignUsersToTaskMock: vi.fn(),
  assignTeamsToTaskMock: vi.fn(),
  assignUsersToTaskByUsernameMock: vi.fn(),
  removeAssignUsersFromTaskMock: vi.fn(),
  removeAssignTeamsFromTaskMock: vi.fn(),
  deleteTaskServiceMock: vi.fn(),
  hardDeleteTaskServiceMock: vi.fn(),
  restoreTaskServiceMock: vi.fn(),
  leaveTaskServiceMock: vi.fn(),
  getSubtasksByTaskMock: vi.fn(),
  getSubtaskByIdMock: vi.fn(),
  createSubtaskServiceMock: vi.fn(),
  updateSubtaskServiceMock: vi.fn(),
  toggleSubtaskCompletionServiceMock: vi.fn(),
  deleteSubtaskServiceMock: vi.fn(),
  addAssigneesServiceMock: vi.fn(),
  removeAssigneesServiceMock: vi.fn(),
  leaveSubtaskServiceMock: vi.fn(),
  getAllWorkspacesMock: vi.fn(),
  getWorkspaceByIdMock: vi.fn(),
  createWorkspaceServiceMock: vi.fn(),
  updateWorkspaceServiceMock: vi.fn(),
  deleteWorkspaceServiceMock: vi.fn(),
  getWorkspaceMembersMock: vi.fn(),
  addWorkspaceMemberMock: vi.fn(),
  removeWorkspaceMemberMock: vi.fn(),
  updateWorkspaceMemberRoleMock: vi.fn(),
  sendWorkspaceInviteMock: vi.fn(),
  acceptWorkspaceInviteMock: vi.fn(),
  respondWorkspaceInviteMock: vi.fn(),
  leaveWorkspaceServiceMock: vi.fn(),
  transferOwnershipMock: vi.fn(),
  getQuickStatusMock: vi.fn(),
  toggleStarWorkspaceMock: vi.fn(),
  toggleMuteWorkspaceMock: vi.fn(),
  toggleArchiveWorkspaceMock: vi.fn(),
  createTeamServiceMock: vi.fn(),
  getTeamsByWorkspaceMock: vi.fn(),
  getTeamByIdMock: vi.fn(),
  updateTeamServiceMock: vi.fn(),
  deleteTeamServiceMock: vi.fn(),
  getTeamMembersMock: vi.fn(),
  addTeamMemberServiceMock: vi.fn(),
  removeTeamMemberServiceMock: vi.fn(),
  updateTeamMemberRoleServiceMock: vi.fn(),
  leaveTeamServiceMock: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../../../../service/Chat.socket.service", () => ({
  onReceiveMessage: (handler) => {
    socketHandlers.receive = handler;
    return vi.fn();
  },
  onMessageRead: (handler) => {
    socketHandlers.read = handler;
    return vi.fn();
  },
  onOverviewUpdate: (handler) => {
    socketHandlers.overview = handler;
    return vi.fn();
  },
  onOverviewUnread: (handler) => {
    socketHandlers.unread = handler;
    return vi.fn();
  },
  onCallIncoming: (handler) => {
    socketHandlers.callIncoming = handler;
    return vi.fn();
  },
  onCallInitiated: (handler) => {
    socketHandlers.callInitiated = handler;
    return vi.fn();
  },
  onCallEnded: (handler) => {
    socketHandlers.callEnded = handler;
    return vi.fn();
  },
}));

vi.mock("../../../../../config/axios", () => ({
  default: {
    get: (...args) => apiGetMock(...args),
  },
}));

vi.mock("../../../../../service/chat.service", () => ({
  getUnreadMentionSummary: (...args) => getUnreadMentionSummaryMock(...args),
  getUnreadCallInviteSummary: (...args) => getUnreadCallInviteSummaryMock(...args),
}));

vi.mock("../../../../../service/project.service", () => ({
  getProjectsByWorkspace: (...args) => getProjectsByWorkspaceMock(...args),
  getProjectById: (...args) => getProjectByIdMock(...args),
  createProject: (...args) => createProjectServiceMock(...args),
  updateProject: (...args) => updateProjectServiceMock(...args),
  deleteProject: (...args) => deleteProjectServiceMock(...args),
  getProjectTeams: (...args) => getProjectTeamsMock(...args),
  addProjectTeams: (...args) => addProjectTeamsServiceMock(...args),
  removeProjectTeams: (...args) => removeProjectTeamsServiceMock(...args),
  getProjectMembers: (...args) => getProjectMembersMock(...args),
  addProjectMembers: (...args) => addProjectMembersServiceMock(...args),
  removeProjectMembers: (...args) => removeProjectMembersServiceMock(...args),
  updateProjectMemberRole: (...args) => updateProjectMemberRoleServiceMock(...args),
  leaveProject: (...args) => leaveProjectServiceMock(...args),
  requestProjectStatusChange: (...args) => requestProjectStatusChangeServiceMock(...args),
  respondProjectStatusChangeRequest: (...args) => respondProjectStatusChangeRequestServiceMock(...args),
}));

vi.mock("../../../../../service/task.service", () => ({
  getAllGlobalTasks: (...args) => getAllGlobalTasksMock(...args),
  getWorkspaceTasks: (...args) => getWorkspaceTasksMock(...args),
  getProjectTasks: (...args) => getProjectTasksMock(...args),
  getTaskById: (...args) => getTaskByIdMock(...args),
  createGlobalTask: (...args) => createGlobalTaskServiceMock(...args),
  createWorkspaceTask: (...args) => createWorkspaceTaskServiceMock(...args),
  createProjectTask: (...args) => createProjectTaskServiceMock(...args),
  updateTask: (...args) => updateTaskServiceMock(...args),
  updateTaskStatus: (...args) => updateTaskStatusServiceMock(...args),
  toggleTaskCompletion: (...args) => toggleTaskCompletionMock(...args),
  assignUsersToTask: (...args) => assignUsersToTaskMock(...args),
  assignTeamsToTask: (...args) => assignTeamsToTaskMock(...args),
  assignUsersToTaskByUsername: (...args) => assignUsersToTaskByUsernameMock(...args),
  removeAssignUsersFromTask: (...args) => removeAssignUsersFromTaskMock(...args),
  removeAssignTeamsFromTask: (...args) => removeAssignTeamsFromTaskMock(...args),
  deleteTask: (...args) => deleteTaskServiceMock(...args),
  hardDeleteTask: (...args) => hardDeleteTaskServiceMock(...args),
  restoreTask: (...args) => restoreTaskServiceMock(...args),
  leaveTask: (...args) => leaveTaskServiceMock(...args),
}));

vi.mock("../../../../../service/subtask.service", () => ({
  getSubtasksByTask: (...args) => getSubtasksByTaskMock(...args),
  getSubtaskById: (...args) => getSubtaskByIdMock(...args),
  createSubtask: (...args) => createSubtaskServiceMock(...args),
  updateSubtask: (...args) => updateSubtaskServiceMock(...args),
  toggleSubtaskCompletion: (...args) => toggleSubtaskCompletionServiceMock(...args),
  deleteSubtask: (...args) => deleteSubtaskServiceMock(...args),
  addAssignees: (...args) => addAssigneesServiceMock(...args),
  removeAssignees: (...args) => removeAssigneesServiceMock(...args),
  leaveSubtask: (...args) => leaveSubtaskServiceMock(...args),
}));

vi.mock("../../../../../service/workspace.service", () => ({
  getAllWorkspaces: (...args) => getAllWorkspacesMock(...args),
  getWorkspaceById: (...args) => getWorkspaceByIdMock(...args),
  createWorkspace: (...args) => createWorkspaceServiceMock(...args),
  updateWorkspace: (...args) => updateWorkspaceServiceMock(...args),
  deleteWorkspace: (...args) => deleteWorkspaceServiceMock(...args),
  getWorkspaceMembers: (...args) => getWorkspaceMembersMock(...args),
  addWorkspaceMember: (...args) => addWorkspaceMemberMock(...args),
  removeMember: (...args) => removeWorkspaceMemberMock(...args),
  updateMemberRole: (...args) => updateWorkspaceMemberRoleMock(...args),
  sendWorkspaceInvite: (...args) => sendWorkspaceInviteMock(...args),
  acceptWorkspaceInvite: (...args) => acceptWorkspaceInviteMock(...args),
  respondWorkspaceInvite: (...args) => respondWorkspaceInviteMock(...args),
  leaveWorkspace: (...args) => leaveWorkspaceServiceMock(...args),
  transferOwnership: (...args) => transferOwnershipMock(...args),
  getQuickStatus: (...args) => getQuickStatusMock(...args),
  toggleStarWorkspace: (...args) => toggleStarWorkspaceMock(...args),
  toggleMuteWorkspace: (...args) => toggleMuteWorkspaceMock(...args),
  toggleArchiveWorkspace: (...args) => toggleArchiveWorkspaceMock(...args),
}));

vi.mock("../../../../../service/team.service", () => ({
  createTeam: (...args) => createTeamServiceMock(...args),
  getTeamsByWorkspace: (...args) => getTeamsByWorkspaceMock(...args),
  getTeamById: (...args) => getTeamByIdMock(...args),
  updateTeam: (...args) => updateTeamServiceMock(...args),
  deleteTeam: (...args) => deleteTeamServiceMock(...args),
  getTeamMembers: (...args) => getTeamMembersMock(...args),
  addTeamMember: (...args) => addTeamMemberServiceMock(...args),
  removeTeamMember: (...args) => removeTeamMemberServiceMock(...args),
  updateTeamMemberRole: (...args) => updateTeamMemberRoleServiceMock(...args),
  leaveTeamService: (...args) => leaveTeamServiceMock(...args),
}));

import { useOverviewRealtime } from "../../../../../features/main/features/overview/hook/useOverviewRealtime";
import { useProject } from "../../../../../features/main/features/overview/hook/useProject";
import useSidebarLogic from "../../../../../features/main/features/overview/hook/useSidebarLogic";
import { useSubtask } from "../../../../../features/main/features/overview/hook/useSubtask";
import { useTask } from "../../../../../features/main/features/overview/hook/useTask";
import { useTeam } from "../../../../../features/main/features/overview/hook/useTeam";
import { useWorkspace } from "../../../../../features/main/features/overview/hook/useWorkspace";

beforeEach(() => {
  vi.clearAllMocks();
  socketHandlers.receive = null;
  socketHandlers.read = null;
  socketHandlers.overview = null;
  socketHandlers.unread = null;
  socketHandlers.callIncoming = null;
  socketHandlers.callInitiated = null;
  socketHandlers.callEnded = null;

  apiGetMock.mockResolvedValue({
    data: {
      data: {
        activeCalls: [{ _id: "call-1", chatId: { _id: "chat-1" }, mode: "group" }],
      },
    },
  });
  getUnreadMentionSummaryMock.mockResolvedValue({ byChat: { "chat-1": { count: 2, nextMentionMessageId: "m1" } } });
  getUnreadCallInviteSummaryMock.mockResolvedValue({ byChat: { "chat-1": { count: 1 } } });

  getAllWorkspacesMock.mockResolvedValue([{ _id: "w1", name: "Workspace Alpha", isStarred: false, isMuted: false }]);
  getWorkspaceByIdMock.mockResolvedValue({ _id: "w1", name: "Workspace Alpha" });
  createWorkspaceServiceMock.mockResolvedValue({ _id: "w2", name: "Workspace Beta" });
  updateWorkspaceServiceMock.mockResolvedValue({ _id: "w1", name: "Workspace Prime" });
  deleteWorkspaceServiceMock.mockResolvedValue(true);
  getWorkspaceMembersMock.mockResolvedValue([{ user: { _id: "u1" } }]);
  addWorkspaceMemberMock.mockResolvedValue({ ok: true });
  removeWorkspaceMemberMock.mockResolvedValue({ ok: true });
  updateWorkspaceMemberRoleMock.mockResolvedValue({ ok: true });
  sendWorkspaceInviteMock.mockResolvedValue({ ok: true });
  acceptWorkspaceInviteMock.mockResolvedValue({ ok: true });
  respondWorkspaceInviteMock.mockResolvedValue({ ok: true });
  leaveWorkspaceServiceMock.mockResolvedValue({ ok: true });
  transferOwnershipMock.mockResolvedValue({ ok: true });
  getQuickStatusMock.mockResolvedValue({ isStarred: true, isMuted: false });
  toggleStarWorkspaceMock.mockResolvedValue({ ok: true });
  toggleMuteWorkspaceMock.mockResolvedValue({ ok: true });
  toggleArchiveWorkspaceMock.mockResolvedValue({ ok: true });

  getProjectsByWorkspaceMock.mockResolvedValue([{ _id: "p1", name: "Project Alpha" }]);
  getProjectByIdMock.mockResolvedValue({ _id: "p1", name: "Project Alpha" });
  createProjectServiceMock.mockResolvedValue({ _id: "p2", name: "Project Beta" });
  updateProjectServiceMock.mockResolvedValue({ _id: "p1", name: "Project Prime" });
  deleteProjectServiceMock.mockResolvedValue(true);
  getProjectTeamsMock.mockResolvedValue([{ _id: "team-1" }]);
  addProjectTeamsServiceMock.mockResolvedValue({ ok: true });
  removeProjectTeamsServiceMock.mockResolvedValue({ ok: true });
  getProjectMembersMock.mockResolvedValue([{ user: { _id: "u1" } }]);
  addProjectMembersServiceMock.mockResolvedValue({ ok: true });
  removeProjectMembersServiceMock.mockResolvedValue({ ok: true });
  updateProjectMemberRoleServiceMock.mockResolvedValue({ ok: true });
  leaveProjectServiceMock.mockResolvedValue({ ok: true });
  requestProjectStatusChangeServiceMock.mockResolvedValue({ ok: true });
  respondProjectStatusChangeRequestServiceMock.mockResolvedValue({ ok: true });

  getAllGlobalTasksMock.mockResolvedValue([{ _id: "task-1", title: "Task Alpha", status: "active" }]);
  getWorkspaceTasksMock.mockResolvedValue([{ _id: "task-w1" }]);
  getProjectTasksMock.mockResolvedValue([{ _id: "task-p1" }]);
  getTaskByIdMock.mockResolvedValue({ id: "task-1", _id: "task-1", type: "task", title: "Task Alpha", workspaceId: "workspace-1" });
  createGlobalTaskServiceMock.mockResolvedValue({ _id: "task-2", title: "Task Beta", status: "active" });
  createWorkspaceTaskServiceMock.mockResolvedValue({ _id: "task-w2" });
  createProjectTaskServiceMock.mockResolvedValue({ _id: "task-p2" });
  updateTaskServiceMock.mockResolvedValue({ _id: "task-1", title: "Task Prime", isHighPriority: true });
  updateTaskStatusServiceMock.mockResolvedValue({ _id: "task-1", status: "completed" });
  toggleTaskCompletionMock.mockResolvedValue({ _id: "task-1", completed: true });
  assignUsersToTaskMock.mockResolvedValue({ _id: "task-1", assignees: [{ _id: "u1" }] });
  assignTeamsToTaskMock.mockResolvedValue({ _id: "task-1", assigneesTeams: [{ _id: "team-1" }] });
  assignUsersToTaskByUsernameMock.mockResolvedValue({ _id: "task-1", assignees: [{ _id: "u2" }] });
  removeAssignUsersFromTaskMock.mockResolvedValue({ _id: "task-1", assignees: [] });
  removeAssignTeamsFromTaskMock.mockResolvedValue({ _id: "task-1", assigneesTeams: [] });
  deleteTaskServiceMock.mockResolvedValue(true);
  hardDeleteTaskServiceMock.mockResolvedValue(true);
  restoreTaskServiceMock.mockResolvedValue({ _id: "task-3", title: "Restored Task" });
  leaveTaskServiceMock.mockResolvedValue({ ok: true });

  getSubtasksByTaskMock.mockResolvedValue([{ _id: "sub-1", completed: false }]);
  getSubtaskByIdMock.mockResolvedValue({ _id: "sub-1", title: "Subtask" });
  createSubtaskServiceMock.mockResolvedValue({ _id: "sub-2", title: "New Subtask" });
  updateSubtaskServiceMock.mockResolvedValue({ _id: "sub-1", title: "Updated Subtask", completed: false, assignedTo: [] });
  toggleSubtaskCompletionServiceMock.mockResolvedValue({ _id: "sub-1", completed: true });
  deleteSubtaskServiceMock.mockResolvedValue(true);
  addAssigneesServiceMock.mockResolvedValue({ _id: "sub-1", assignedTo: [{ _id: "u1" }] });
  removeAssigneesServiceMock.mockResolvedValue({ _id: "sub-1", assignedTo: [] });
  leaveSubtaskServiceMock.mockResolvedValue({ ok: true });

  getTeamsByWorkspaceMock.mockResolvedValue([{ _id: "team-1", name: "Design" }]);
  getTeamByIdMock.mockResolvedValue({ _id: "team-1", name: "Design" });
  createTeamServiceMock.mockResolvedValue({ _id: "team-2", name: "Engineering" });
  updateTeamServiceMock.mockResolvedValue({ _id: "team-1", name: "Design Ops" });
  deleteTeamServiceMock.mockResolvedValue(true);
  getTeamMembersMock.mockResolvedValue([{ user: { _id: "u1" }, role: "member" }]);
  addTeamMemberServiceMock.mockResolvedValue({ ok: true });
  removeTeamMemberServiceMock.mockResolvedValue({ ok: true });
  updateTeamMemberRoleServiceMock.mockResolvedValue({ ok: true });
  leaveTeamServiceMock.mockResolvedValue({ ok: true });
});

describe("overview remaining hooks", () => {
  it("tracks overview realtime socket state and refresh helpers", async () => {
    const onReceiveMessageEvent = vi.fn();
    const onMessageReadEvent = vi.fn();
    const onOverviewUpdateEvent = vi.fn();
    const onOverviewUnreadEvent = vi.fn();

    const { result } = renderHook(() =>
      useOverviewRealtime({
        onReceiveMessageEvent,
        onMessageReadEvent,
        onOverviewUpdateEvent,
        onOverviewUnreadEvent,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeCallsByChatId["chat-1"]).toBeTruthy();
    });

    expect(result.current.mentionByChatId["chat-1"]).toEqual({ count: 2, nextMentionMessageId: "m1" });
    expect(result.current.callInviteByChatId["chat-1"]).toEqual({ count: 1 });

    act(() => {
      socketHandlers.receive?.({ chatId: "chat-1", message: { content: "Hello" } });
      socketHandlers.read?.({ chatId: "chat-1" });
      socketHandlers.overview?.([{ _id: "node-1" }]);
      socketHandlers.unread?.({ chatId: "chat-1", unreadCount: 0 });
      socketHandlers.callIncoming?.({ callId: "call-2", chatId: "chat-2", call: { mode: "group" } });
      socketHandlers.callEnded?.({ chatId: "chat-1", callId: "call-1" });
    });

    await waitFor(() => {
      expect(onReceiveMessageEvent).toHaveBeenCalled();
    });

    expect(onMessageReadEvent).toHaveBeenCalledWith({ chatId: "chat-1" });
    expect(onOverviewUpdateEvent).toHaveBeenCalledWith([{ _id: "node-1" }]);
    expect(onOverviewUnreadEvent).toHaveBeenCalledWith({ chatId: "chat-1", unreadCount: 0 });
    expect(result.current.activeCallsByChatId["chat-2"]).toBeTruthy();
    expect(result.current.activeCallsByChatId["chat-1"]).toBeUndefined();
  });

  it("manages workspace state through the workspace hook", async () => {
    const { result } = renderHook(() => useWorkspace());

    await act(async () => {
      await result.current.fetchWorkspaces();
      await result.current.fetchWorkspaceById("w1");
      await result.current.createWorkspace({ name: "Workspace Beta" });
      await result.current.updateWorkspace("w1", { name: "Workspace Prime" });
      await result.current.toggleStar("w1");
      await result.current.leaveWorkspace("w2");
    });

    expect(result.current.workspaces.map((workspace) => workspace._id)).toContain("w1");
    expect(result.current.currentWorkspace).toMatchObject({ _id: "w1" });
    expect(toggleStarWorkspaceMock).toHaveBeenCalledWith("w1");
    expect(leaveWorkspaceServiceMock).toHaveBeenCalledWith("w2");
  });

  it("manages project state through the project hook", async () => {
    const { result } = renderHook(() => useProject());

    await act(async () => {
      await result.current.fetchProjects("workspace-1");
      await result.current.fetchProjectById("workspace-1", "p1");
      await result.current.createProject("workspace-1", { name: "Project Beta" });
      await result.current.updateProject("workspace-1", "p1", { name: "Project Prime" });
      await result.current.addProjectTeams("workspace-1", "p1", ["team-1"]);
      await result.current.requestProjectStatusChange("workspace-1", "p1", { status: "completed" });
      await result.current.leaveProject("workspace-1", "p2");
    });

    expect(result.current.projects.some((project) => project._id === "p1")).toBe(true);
    expect(result.current.currentProject).toMatchObject({ _id: "p1" });
    expect(addProjectTeamsServiceMock).toHaveBeenCalledWith("workspace-1", "p1", ["team-1"]);
    expect(requestProjectStatusChangeServiceMock).toHaveBeenCalledWith("workspace-1", "p1", { status: "completed" });
  });

  it("manages task state through the task hook", async () => {
    const { result } = renderHook(() => useTask());

    await act(async () => {
      await result.current.fetchGlobalTasks();
      await result.current.fetchTaskById("task-1");
      await result.current.createGlobalTask({ title: "Task Beta" });
      await result.current.updateStatus("task-1", "completed");
      await result.current.assignUsers("task-1", ["u1"]);
      await result.current.leaveTask("task-2");
    });

    expect(result.current.tasks.some((task) => task._id === "task-1")).toBe(true);
    expect(result.current.currentTask).toMatchObject({ _id: "task-1" });
    expect(updateTaskStatusServiceMock).toHaveBeenCalledWith("task-1", "completed");
    expect(assignUsersToTaskMock).toHaveBeenCalledWith("task-1", ["u1"]);
  });

  it("manages subtask state through the subtask hook", async () => {
    const { result } = renderHook(() => useSubtask());

    await act(async () => {
      await result.current.fetchSubtasks("task-1");
      await result.current.fetchSubtaskById("sub-1");
      await result.current.createSubtask({ title: "New Subtask" });
      await result.current.updateSubtask("sub-1", { title: "Updated Subtask" });
      await result.current.toggleSubtaskCompletion("sub-1");
      await result.current.addAssignees("sub-1", { assignees: ["u1"] });
      await result.current.removeAssignees("sub-1", { assignees: ["u1"] });
      await result.current.leaveSubtask("sub-2");
    });

    expect(result.current.subtasks.some((subtask) => subtask._id === "sub-1")).toBe(true);
    expect(result.current.currentSubtask).toMatchObject({ _id: "sub-1" });
    expect(addAssigneesServiceMock).toHaveBeenCalledWith("sub-1", { assignees: ["u1"], usernames: undefined });
    expect(removeAssigneesServiceMock).toHaveBeenCalledWith("sub-1", { assignees: ["u1"], usernames: undefined });
  });

  it("manages team state through the team hook", async () => {
    const { result } = renderHook(() => useTeam());

    await act(async () => {
      await result.current.fetchTeams("workspace-1");
      await result.current.fetchTeamById("workspace-1", "team-1");
      await result.current.createNewTeam("workspace-1", { name: "Engineering" });
      await result.current.updateExistingTeam("workspace-1", "team-1", { name: "Design Ops" });
      await result.current.fetchMembers("workspace-1", "team-1");
      await result.current.addMember("workspace-1", "team-1", { memberId: "u2", role: "member" });
      await result.current.updateMemberRole("workspace-1", "team-1", "u1", "lead");
      await result.current.removeMember("workspace-1", "team-1", "u1");
      await result.current.leaveTeam("workspace-1", "team-1");
    });

    expect(result.current.currentTeam).toMatchObject({ _id: "team-1" });
    expect(result.current.teamMembers).toEqual([]);
    expect(addTeamMemberServiceMock).toHaveBeenCalledWith("workspace-1", "team-1", { memberId: "u2", role: "member" });
    expect(leaveTeamServiceMock).toHaveBeenCalledWith("workspace-1", "team-1");
  });

  it("fetches sidebar data, updates status, and deletes items", async () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const sidebarItem = { id: "task-1", type: "task", title: "Task Alpha", workspaceId: "workspace-1" };
    const { result } = renderHook(() => useSidebarLogic(sidebarItem));

    await waitFor(() => {
      expect(getTaskByIdMock).toHaveBeenCalledWith("task-1");
      expect(getSubtasksByTaskMock).toHaveBeenCalledWith("task-1");
    });

    await act(async () => {
      await result.current.handleStatusUpdate("completed");
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(updateTaskStatusServiceMock).toHaveBeenCalledWith("task-1", "completed");
    expect(deleteTaskServiceMock).toHaveBeenCalledWith("task-1");
    expect(dispatchEventSpy).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/main", { replace: true });
  }, 10000);
});


