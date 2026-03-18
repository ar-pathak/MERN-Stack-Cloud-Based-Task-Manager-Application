import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const {
    useWorkspaceMock,
    useProjectMock,
    useTaskMock,
    useSubtaskMock,
    fetchMembersMock,
    addMemberMock,
    removeMemberMock,
    sendInviteMock,
    updateMemberRoleMock,
    fetchProjectMembersMock,
    addProjectMembersMock,
    updateProjectMembersRoleMock,
    removeProjectMembersMock,
    fetchTaskByIdMock,
    assignUsersMock,
    assignUsersByUsernameMock,
    removeAssignUsersMock,
    fetchSubtaskByIdMock,
    addSubtaskAssigneesMock,
    removeSubtaskAssigneesMock
} = vi.hoisted(() => ({
    useWorkspaceMock: vi.fn(),
    useProjectMock: vi.fn(),
    useTaskMock: vi.fn(),
    useSubtaskMock: vi.fn(),
    fetchMembersMock: vi.fn(),
    addMemberMock: vi.fn(),
    removeMemberMock: vi.fn(),
    sendInviteMock: vi.fn(),
    updateMemberRoleMock: vi.fn(),
    fetchProjectMembersMock: vi.fn(),
    addProjectMembersMock: vi.fn(),
    updateProjectMembersRoleMock: vi.fn(),
    removeProjectMembersMock: vi.fn(),
    fetchTaskByIdMock: vi.fn(),
    assignUsersMock: vi.fn(),
    assignUsersByUsernameMock: vi.fn(),
    removeAssignUsersMock: vi.fn(),
    fetchSubtaskByIdMock: vi.fn(),
    addSubtaskAssigneesMock: vi.fn(),
    removeSubtaskAssigneesMock: vi.fn()
}));

vi.mock("../../../../../../features/main/features/overview/hook/useWorkspace.js", () => ({
    useWorkspace: useWorkspaceMock
}));

vi.mock("../../../../../../features/main/features/overview/hook/useProject.js", () => ({
    useProject: useProjectMock
}));

vi.mock("../../../../../../features/main/features/overview/hook/useTask.js", () => ({
    useTask: useTaskMock
}));

vi.mock("../../../../../../features/main/features/overview/hook/useSubtask.js", () => ({
    useSubtask: useSubtaskMock
}));

import { useMembersLogic } from "../../../../../../features/main/features/overview/components/infoSidebar/components/MembersSection/useMembersLogic.js";

const workspaceItem = (overrides = {}) => ({
    id: "workspace-1",
    type: "workspace",
    permissions: { role: "owner" },
    ...overrides
});

const projectItem = (overrides = {}) => ({
    id: "project-1",
    workspace: "workspace-1",
    type: "project",
    permissions: { role: "viewer", canEdit: true },
    ...overrides
});

const taskItem = (overrides = {}) => ({
    id: "task-1",
    type: "task",
    permissions: { role: "member" },
    ...overrides
});

const subtaskItem = (overrides = {}) => ({
    id: "subtask-1",
    type: "subtask",
    permissions: { role: "member" },
    ...overrides
});

const renderMembersHook = (item) =>
    renderHook(({ currentItem }) => useMembersLogic(currentItem), {
        initialProps: { currentItem: item }
    });

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    useWorkspaceMock.mockReturnValue({
        fetchMembers: fetchMembersMock,
        addMember: addMemberMock,
        removeMember: removeMemberMock,
        sendInvite: sendInviteMock,
        updateMemberRole: updateMemberRoleMock
    });

    useProjectMock.mockReturnValue({
        fetchProjectMembers: fetchProjectMembersMock,
        addProjectMembers: addProjectMembersMock,
        updateProjectMembersRole: updateProjectMembersRoleMock,
        removeProjectMembers: removeProjectMembersMock
    });

    useTaskMock.mockReturnValue({
        fetchTaskById: fetchTaskByIdMock,
        assignUsers: assignUsersMock,
        assignUsersByUsername: assignUsersByUsernameMock,
        removeAssignUsers: removeAssignUsersMock
    });

    useSubtaskMock.mockReturnValue({
        fetchSubtaskById: fetchSubtaskByIdMock,
        addAssignees: addSubtaskAssigneesMock,
        removeAssignees: removeSubtaskAssigneesMock
    });

    fetchMembersMock.mockResolvedValue({ data: [] });
    fetchProjectMembersMock.mockResolvedValue({ data: [] });
    fetchTaskByIdMock.mockResolvedValue({ data: { assignees: [] } });
    fetchSubtaskByIdMock.mockResolvedValue({ data: { assignedTo: [] } });
});

test("loads workspace members and applies search + role filters", async () => {
    fetchMembersMock.mockResolvedValue({
        data: [
            {
                user: { _id: "u1", name: "Alice", email: "alice@example.com" },
                role: "owner"
            },
            {
                user: { _id: "u2", name: "Bob", email: "bob@example.com" },
                role: "admin"
            },
            {
                user: { _id: "u3", name: "Cara", email: "cara@example.com" },
                role: "member"
            }
        ]
    });

    const { result } = renderMembersHook(workspaceItem());

    await waitFor(() => expect(result.current.members).toHaveLength(3));
    expect(result.current.initialLoadComplete).toBe(true);
    expect(result.current.roleStats).toEqual({
        all: 3,
        owner: 1,
        admin: 1,
        member: 1,
        viewer: 0
    });

    act(() => {
        result.current.setSearchQuery("alice");
    });
    expect(result.current.filteredMembers).toHaveLength(1);

    act(() => {
        result.current.setSearchQuery("");
        result.current.setFilterRole("admin");
    });
    expect(result.current.filteredMembers).toHaveLength(1);
    expect(result.current.filteredMembers[0].user.name).toBe("Bob");
});

test("loads project members and calculates project role stats", async () => {
    fetchProjectMembersMock.mockResolvedValue({
        data: [
            { user: { _id: "u1", name: "A", email: "a@x.com" }, role: "admin" },
            { user: { _id: "u2", name: "B", email: "b@x.com" }, role: "member" },
            { user: { _id: "u3", name: "C", email: "c@x.com" }, role: "viewer" }
        ]
    });

    const { result } = renderMembersHook(projectItem());
    await waitFor(() => expect(result.current.members).toHaveLength(3));

    expect(result.current.roleStats).toEqual({
        all: 3,
        admin: 1,
        member: 1,
        viewer: 1
    });
});

test("loads task members and uses task-specific role stats", async () => {
    fetchTaskByIdMock.mockResolvedValue({
        data: {
            _id: "task-1",
            assignees: [
                { _id: "u1", name: "Task One", email: "one@example.com" },
                { _id: "u2", name: "Task Two", email: "two@example.com" }
            ]
        }
    });

    const { result } = renderMembersHook(taskItem());
    await waitFor(() => expect(result.current.members).toHaveLength(2));

    expect(fetchTaskByIdMock).toHaveBeenCalledWith("task-1");
    expect(result.current.taskData).toMatchObject({ _id: "task-1" });
    expect(result.current.roleStats).toEqual({ all: 2 });

    act(() => {
        result.current.setFilterRole("admin");
    });
    expect(result.current.filteredMembers).toHaveLength(0);
});

test("loads subtask members and stores subtask data", async () => {
    fetchSubtaskByIdMock.mockResolvedValue({
        data: {
            _id: "subtask-1",
            assignedTo: [{ _id: "u8", name: "Sub User", email: "sub@example.com" }]
        }
    });

    const { result } = renderMembersHook(subtaskItem());
    await waitFor(() => expect(result.current.members).toHaveLength(1));

    expect(fetchSubtaskByIdMock).toHaveBeenCalledWith("subtask-1");
    expect(result.current.subtaskData).toMatchObject({ _id: "subtask-1" });
    expect(result.current.roleStats).toEqual({ all: 1 });
});

test("surfaces load errors and resets refreshing state", async () => {
    fetchMembersMock.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderMembersHook(workspaceItem());

    await waitFor(() => {
        expect(result.current.notification).toEqual({
            type: "error",
            message: "Failed to load members."
        });
    });
    expect(result.current.isRefreshing).toBe(false);
    expect(console.error).toHaveBeenCalled();
});

test("handleAddMember supports workspace and task assignment modes", async () => {
    fetchMembersMock.mockResolvedValue({ data: [] });
    addMemberMock
        .mockResolvedValueOnce({ success: true, data: { mode: "invite_request" } })
        .mockResolvedValueOnce({ success: true, data: { mode: "direct" } })
        .mockResolvedValueOnce({ success: false, message: "Cannot add member" })
        .mockRejectedValueOnce(new Error("workspace exploded"));

    const { result } = renderMembersHook(workspaceItem());
    await waitFor(() => expect(fetchMembersMock).toHaveBeenCalledTimes(1));

    let actionResult = false;
    await act(async () => {
        actionResult = await result.current.handleAddMember("mila", "member");
    });
    expect(actionResult).toBe(true);
    expect(result.current.notification.message).toContain("Invite request sent to mila");
    expect(fetchMembersMock).toHaveBeenCalledTimes(1);

    await act(async () => {
        actionResult = await result.current.handleAddMember("mila", "member");
    });
    expect(actionResult).toBe(true);
    expect(fetchMembersMock).toHaveBeenCalledTimes(2);

    await act(async () => {
        actionResult = await result.current.handleAddMember("mila", "member");
    });
    expect(actionResult).toBe(false);
    expect(result.current.notification.message).toBe("Cannot add member");

    await act(async () => {
        actionResult = await result.current.handleAddMember("mila", "member");
    });
    expect(actionResult).toBe(false);
    expect(result.current.notification.message).toBe("workspace exploded");

    assignUsersByUsernameMock
        .mockResolvedValueOnce({ success: true, data: { assignmentMode: "invite_request" } })
        .mockResolvedValueOnce({ success: true, data: { assignmentMode: "mixed" } })
        .mockResolvedValueOnce({ success: true, data: { assignmentMode: "direct" } })
        .mockResolvedValueOnce({ success: false, message: "Task add failed" });

    const { result: taskResult } = renderMembersHook(taskItem());
    await waitFor(() => expect(fetchTaskByIdMock).toHaveBeenCalledTimes(1));

    await act(async () => {
        actionResult = await taskResult.current.handleAddMember("neo", "member");
    });
    expect(actionResult).toBe(true);
    expect(fetchTaskByIdMock).toHaveBeenCalledTimes(1);

    await act(async () => {
        actionResult = await taskResult.current.handleAddMember("neo", "member");
    });
    expect(actionResult).toBe(true);
    expect(fetchTaskByIdMock).toHaveBeenCalledTimes(2);

    await act(async () => {
        actionResult = await taskResult.current.handleAddMember("neo", "member");
    });
    expect(actionResult).toBe(true);
    expect(fetchTaskByIdMock).toHaveBeenCalledTimes(3);

    await act(async () => {
        actionResult = await taskResult.current.handleAddMember("neo", "member");
    });
    expect(actionResult).toBe(false);
    expect(taskResult.current.notification.message).toBe("Task add failed");
});

test("handleAssignProjectMembers works for project, task, and subtask", async () => {
    addProjectMembersMock.mockResolvedValue({ success: true });
    assignUsersMock
        .mockResolvedValueOnce({ success: true, data: { assignmentMode: "invite_request" } })
        .mockResolvedValueOnce({ success: true, data: { assignmentMode: "mixed" } })
        .mockResolvedValueOnce({ success: true, data: { assignmentMode: "direct" } });
    addSubtaskAssigneesMock
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, message: "Subtask assign failed" });

    const { result: projectResult } = renderMembersHook(projectItem());
    await waitFor(() => expect(fetchProjectMembersMock).toHaveBeenCalledTimes(1));

    let actionResult = false;
    await act(async () => {
        actionResult = await projectResult.current.handleAssignProjectMembers(["u1", "u2"]);
    });
    expect(actionResult).toBe(true);
    expect(addProjectMembersMock).toHaveBeenCalledWith("workspace-1", "project-1", {
        members: [
            { user: "u1", role: "viewer" },
            { user: "u2", role: "viewer" }
        ]
    });
    expect(fetchProjectMembersMock).toHaveBeenCalledTimes(2);

    const { result: taskResult } = renderMembersHook(taskItem());
    await waitFor(() => expect(fetchTaskByIdMock).toHaveBeenCalledTimes(1));

    await act(async () => {
        actionResult = await taskResult.current.handleAssignProjectMembers(["x1"]);
    });
    expect(actionResult).toBe(true);
    expect(taskResult.current.notification.message).toBe("Assignment requests sent.");
    expect(fetchTaskByIdMock).toHaveBeenCalledTimes(1);

    await act(async () => {
        actionResult = await taskResult.current.handleAssignProjectMembers(["x2"]);
    });
    expect(actionResult).toBe(true);
    expect(fetchTaskByIdMock).toHaveBeenCalledTimes(2);

    await act(async () => {
        actionResult = await taskResult.current.handleAssignProjectMembers(["x3"]);
    });
    expect(actionResult).toBe(true);
    expect(fetchTaskByIdMock).toHaveBeenCalledTimes(3);

    const { result: subtaskResult } = renderMembersHook(subtaskItem());
    await waitFor(() => expect(fetchSubtaskByIdMock).toHaveBeenCalledTimes(1));

    await act(async () => {
        actionResult = await subtaskResult.current.handleAssignProjectMembers(["s1"]);
    });
    expect(actionResult).toBe(true);
    expect(fetchSubtaskByIdMock).toHaveBeenCalledTimes(2);

    await act(async () => {
        actionResult = await subtaskResult.current.handleAssignProjectMembers(["s1"]);
    });
    expect(actionResult).toBe(false);
    expect(subtaskResult.current.notification.message).toBe("Subtask assign failed");
});

test("handleInvite supports CSV mode, single invite mode, and failures", async () => {
    sendInviteMock
        .mockResolvedValueOnce({ success: true, data: { mode: "bulk_csv", sent: 2, failed: 1 } })
        .mockResolvedValueOnce({ success: true, data: { mode: "single" } })
        .mockResolvedValueOnce({ success: false, message: "Invite blocked" })
        .mockRejectedValueOnce(new Error("Invite crashed"));

    const { result } = renderMembersHook(workspaceItem());
    await waitFor(() => expect(fetchMembersMock).toHaveBeenCalledTimes(1));

    let actionResult = false;
    await act(async () => {
        actionResult = await result.current.handleInvite({
            email: "bulk@example.com",
            role: "member",
            file: new File(["csv"], "members.csv", { type: "text/csv" })
        });
    });
    expect(actionResult).toBe(true);
    expect(result.current.notification.message).toContain("CSV processed: 2 invites sent, 1 failed");

    await act(async () => {
        actionResult = await result.current.handleInvite({
            email: "solo@example.com",
            role: "viewer",
            file: null
        });
    });
    expect(actionResult).toBe(true);
    expect(result.current.notification.message).toBe("Invitation sent to solo@example.com!");

    await act(async () => {
        actionResult = await result.current.handleInvite({
            email: "deny@example.com",
            role: "member",
            file: null
        });
    });
    expect(actionResult).toBe(false);
    expect(result.current.notification.message).toBe("Invite blocked");

    await act(async () => {
        actionResult = await result.current.handleInvite({
            email: "fail@example.com",
            role: "member",
            file: null
        });
    });
    expect(actionResult).toBe(false);
    expect(result.current.notification.message).toBe("Invite crashed");
});

test("handleRemoveMember and handleUpdateRole update state across item types", async () => {
    fetchMembersMock.mockResolvedValue({
        data: [
            { user: { _id: "u1", name: "Owner", email: "o@example.com" }, role: "owner" },
            { user: { _id: "u2", name: "Member", email: "m@example.com" }, role: "member" }
        ]
    });
    removeMemberMock.mockResolvedValue({ success: true });
    updateMemberRoleMock
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, message: "Role update failed" });

    const { result } = renderMembersHook(workspaceItem());
    await waitFor(() => expect(result.current.members).toHaveLength(2));

    await act(async () => {
        await result.current.handleRemoveMember("u2");
    });
    expect(result.current.members).toHaveLength(1);
    expect(result.current.notification.message).toBe("Member removed successfully");

    await act(async () => {
        await result.current.handleUpdateRole("u1", "admin");
    });
    expect(result.current.members[0].role).toBe("admin");

    await act(async () => {
        await result.current.handleUpdateRole("u1", "viewer");
    });
    expect(result.current.notification.message).toBe("Role update failed");

    fetchProjectMembersMock.mockResolvedValue({
        data: [{ user: { _id: "u9", name: "Proj", email: "p@example.com" }, role: "member" }]
    });
    removeProjectMembersMock.mockResolvedValue({ success: true });
    updateProjectMembersRoleMock.mockResolvedValue({ success: true });

    const { result: projectResult } = renderMembersHook(projectItem());
    await waitFor(() => expect(projectResult.current.members).toHaveLength(1));

    await act(async () => {
        await projectResult.current.handleRemoveMember("u9");
    });
    expect(projectResult.current.members).toHaveLength(0);

    fetchTaskByIdMock.mockResolvedValue({
        data: { assignees: [{ _id: "t-user", name: "Task", email: "task@example.com" }] }
    });
    removeAssignUsersMock.mockResolvedValue({ success: true });

    const { result: taskResult } = renderMembersHook(taskItem());
    await waitFor(() => expect(taskResult.current.members).toHaveLength(1));

    await act(async () => {
        await taskResult.current.handleRemoveMember("t-user");
    });
    expect(taskResult.current.members).toHaveLength(0);

    fetchSubtaskByIdMock.mockResolvedValue({
        data: { assignedTo: [{ _id: "s-user", name: "Sub", email: "sub@example.com" }] }
    });
    removeSubtaskAssigneesMock
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, message: "Cannot remove subtask member" });

    const { result: subtaskResult } = renderMembersHook(subtaskItem());
    await waitFor(() => expect(subtaskResult.current.members).toHaveLength(1));

    await act(async () => {
        await subtaskResult.current.handleRemoveMember("s-user");
    });
    expect(subtaskResult.current.members).toHaveLength(0);

    await act(async () => {
        await subtaskResult.current.handleRemoveMember("s-user");
    });
    expect(subtaskResult.current.notification.message).toBe("Cannot remove subtask member");
});

test("skips member loading when id is missing and keeps management disabled", async () => {
    const { result } = renderMembersHook(
        workspaceItem({
            id: "",
            permissions: { role: "viewer", canEdit: false }
        })
    );

    await waitFor(() => expect(result.current.initialLoadComplete).toBe(false));
    expect(fetchMembersMock).not.toHaveBeenCalled();
    expect(result.current.canManageMembers).toBe(false);
});
