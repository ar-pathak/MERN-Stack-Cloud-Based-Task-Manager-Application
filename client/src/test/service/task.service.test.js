import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../../config/axios", () => ({
    default: apiMock,
}));

import {
    assignTeamsToTask,
    assignUsersToTask,
    assignUsersToTaskByUsername,
    createGlobalTask,
    createProjectTask,
    createWorkspaceTask,
    deleteTask,
    getAllGlobalTasks,
    getProjectTasks,
    getTaskById,
    getTasks,
    getWorkspaceTasks,
    hardDeleteTask,
    leaveTask,
    removeAssignTeamsFromTask,
    removeAssignUsersFromTask,
    respondTaskAssigneeRequest,
    restoreTask,
    toggleTaskCompletion,
    updateTask,
    updateTaskStatus,
} from "../../service/task.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("task service returns unwrap payloads", async () => {
    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "t1" } } });
    await expect(createGlobalTask({ title: "Global" })).resolves.toEqual({ id: "t1" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "t2" } } });
    await expect(createWorkspaceTask("ws-1", { title: "Workspace" })).resolves.toEqual({ id: "t2" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "t3" } } });
    await expect(createProjectTask("ws-1", "p1", { title: "Project" })).resolves.toEqual({ id: "t3" });

    apiMock.get.mockResolvedValueOnce({ data: { data: { id: "t4" } } });
    await expect(getTaskById("t4")).resolves.toEqual({ id: "t4" });

    apiMock.patch.mockResolvedValueOnce({ data: { id: "t5" } });
    await expect(updateTask("t5", { title: "Update" })).resolves.toEqual({ id: "t5" });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { id: "t6" } } });
    await expect(updateTaskStatus("t6", "done")).resolves.toEqual({ id: "t6" });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(deleteTask("t7")).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(hardDeleteTask("t8")).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(restoreTask("t9")).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(toggleTaskCompletion("t10")).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(assignUsersToTask("t11", ["u1"])).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(assignTeamsToTask("t12", ["team-1"])).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(assignUsersToTaskByUsername("t13", ["user1"])).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(removeAssignUsersFromTask("t14", ["u2"])).resolves.toEqual({ ok: true });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(respondTaskAssigneeRequest("t15", "r1", "approve")).resolves.toEqual({
        ok: true,
    });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(leaveTask("t16")).resolves.toEqual({ ok: true });
});

test("task lists fall back to empty arrays", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "t1" }] } });
    await expect(getAllGlobalTasks()).resolves.toEqual([{ id: "t1" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getAllGlobalTasks()).resolves.toEqual([]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "t2" }] } });
    await expect(getWorkspaceTasks("ws-1")).resolves.toEqual([{ id: "t2" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getWorkspaceTasks("ws-1")).resolves.toEqual([]);

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "t3" }] } });
    await expect(getProjectTasks("ws-1", "p1")).resolves.toEqual([{ id: "t3" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getProjectTasks("ws-1", "p1")).resolves.toEqual([]);
});

test("getTasks builds URLs for each scope", async () => {
    apiMock.get
        .mockResolvedValueOnce({ data: { data: [{ id: "g1" }] } })
        .mockResolvedValueOnce({ data: { data: [{ id: "w1" }] } })
        .mockResolvedValueOnce({ data: { data: [{ id: "p1" }] } })
        .mockResolvedValueOnce({ data: { data: [{ id: "x1" }] } });

    await expect(getTasks("global")).resolves.toEqual([{ id: "g1" }]);
    expect(apiMock.get).toHaveBeenNthCalledWith(1, "/api/tasks/getAllGlobalLevelTasks");

    await expect(getTasks("workspace", "ws-1")).resolves.toEqual([{ id: "w1" }]);
    expect(apiMock.get).toHaveBeenNthCalledWith(2, "/api/tasks/workspaces/ws-1/tasks");

    await expect(getTasks("project", "ws-1", "p1")).resolves.toEqual([{ id: "p1" }]);
    expect(apiMock.get).toHaveBeenNthCalledWith(3, "/api/tasks/workspaces/ws-1/projects/p1/tasks");

    await expect(getTasks("unknown")).resolves.toEqual([{ id: "x1" }]);
    expect(apiMock.get).toHaveBeenNthCalledWith(4, "");
});

test("getTasks returns [] on errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    apiMock.get.mockRejectedValueOnce(new Error("boom"));

    await expect(getTasks("global")).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
});

test("removeAssignTeamsFromTask normalizes team arrays", async () => {
    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(removeAssignTeamsFromTask("t1", ["team-1"])).resolves.toEqual({ ok: true });
    expect(apiMock.delete).toHaveBeenLastCalledWith("/api/tasks/t1/assignees/remove", {
        data: { assigneesTeams: ["team-1"] },
    });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(removeAssignTeamsFromTask("t1", "team-2")).resolves.toEqual({ ok: true });
    expect(apiMock.delete).toHaveBeenLastCalledWith("/api/tasks/t1/assignees/remove", {
        data: { assigneesTeams: ["team-2"] },
    });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(removeAssignTeamsFromTask("t1")).resolves.toEqual({ ok: true });
    expect(apiMock.delete).toHaveBeenLastCalledWith("/api/tasks/t1/assignees/remove", {
        data: { assigneesTeams: undefined },
    });
});

test("task service errors prefer response messages", async () => {
    const error = { response: { data: { message: "Task error" }, status: 500 } };

    apiMock.post.mockRejectedValueOnce(error);
    await expect(createGlobalTask({ title: "Global" })).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(createWorkspaceTask("ws-1", { title: "Workspace" })).rejects.toEqual({
        message: "Task error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(createProjectTask("ws-1", "p1", { title: "Project" })).rejects.toEqual({
        message: "Task error",
        status: 500,
    });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getTaskById("t1")).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(updateTask("t1", { title: "Update" })).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(updateTaskStatus("t1", "done")).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(deleteTask("t1")).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(hardDeleteTask("t1")).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(restoreTask("t1")).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(toggleTaskCompletion("t1")).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(assignUsersToTask("t1", ["u1"])).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(assignTeamsToTask("t1", ["team-1"])).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(assignUsersToTaskByUsername("t1", ["user1"])).rejects.toEqual({
        message: "Task error",
        status: 500,
    });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(removeAssignUsersFromTask("t1", ["u2"])).rejects.toEqual({
        message: "Task error",
        status: 500,
    });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(removeAssignTeamsFromTask("t1", ["team-1"])).rejects.toEqual({
        message: "Task error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(respondTaskAssigneeRequest("t1", "r1", "approve")).rejects.toEqual({
        message: "Task error",
        status: 500,
    });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getAllGlobalTasks()).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getWorkspaceTasks("ws-1")).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getProjectTasks("ws-1", "p1")).rejects.toEqual({ message: "Task error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(leaveTask("t1")).rejects.toEqual({ message: "Task error", status: 500 });
});

test("task service errors fall back to defaults", async () => {
    apiMock.post.mockRejectedValueOnce({});
    await expect(createGlobalTask({ title: "Global" })).rejects.toEqual({
        message: "Failed to create global task",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(createWorkspaceTask("ws-1", { title: "Workspace" })).rejects.toEqual({
        message: "Failed to create workspace task",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(createProjectTask("ws-1", "p1", { title: "Project" })).rejects.toEqual({
        message: "Failed to create project task",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getTaskById("t1")).rejects.toEqual({ message: "Failed to fetch task", status: undefined });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(updateTask("t1", { title: "Update" })).rejects.toEqual({
        message: "Failed to update task",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(updateTaskStatus("t1", "done")).rejects.toEqual({
        message: "Failed to update status",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(deleteTask("t1")).rejects.toEqual({ message: "Failed to delete task", status: undefined });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(hardDeleteTask("t1")).rejects.toEqual({
        message: "Failed to permanently delete task",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(restoreTask("t1")).rejects.toEqual({
        message: "Failed to restore task",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(toggleTaskCompletion("t1")).rejects.toEqual({
        message: "Failed to toggle task completion",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(assignUsersToTask("t1", ["u1"])).rejects.toEqual({
        message: "Failed to assign users",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(assignTeamsToTask("t1", ["team-1"])).rejects.toEqual({
        message: "Failed to assign teams",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(assignUsersToTaskByUsername("t1", ["user1"])).rejects.toEqual({
        message: "Failed to assign users",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(removeAssignUsersFromTask("t1", ["u2"])).rejects.toEqual({
        message: "Failed to remove assignees",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(removeAssignTeamsFromTask("t1", ["team-1"])).rejects.toEqual({
        message: "Failed to remove assignees",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(respondTaskAssigneeRequest("t1", "r1", "approve")).rejects.toEqual({
        message: "Failed to process task assignment request",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getAllGlobalTasks()).rejects.toEqual({
        message: "Failed to fetch global tasks",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getWorkspaceTasks("ws-1")).rejects.toEqual({
        message: "Failed to fetch workspace tasks",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getProjectTasks("ws-1", "p1")).rejects.toEqual({
        message: "Failed to fetch project tasks",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(leaveTask("t1")).rejects.toEqual({
        message: "Failed to leave task",
        status: undefined,
    });
});
