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
    addAssignees,
    createSubtask,
    deleteSubtask,
    getSubtaskById,
    getSubtasksByTask,
    leaveSubtask,
    removeAssignees,
    toggleSubtaskCompletion,
    updateSubtask,
} from "../../service/subtask.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("subtask lists return arrays and defaults", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "s1" }] } });
    await expect(getSubtasksByTask("task-1")).resolves.toEqual([{ id: "s1" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getSubtasksByTask("task-1")).resolves.toEqual([]);
});

test("subtask creation validates and normalizes payloads", async () => {
    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "s1" } } });
    await expect(
        createSubtask({
            taskId: "task-1",
            title: "  Subtask A  ",
            description: "  Details  ",
            assignedTo: "user-1",
            dueDate: "2025-01-01",
        })
    ).resolves.toEqual({ id: "s1" });
    expect(apiMock.post).toHaveBeenLastCalledWith("/api/subtasks/createSubtask", {
        taskId: "task-1",
        title: "Subtask A",
        description: "Details",
        assignedTo: "user-1",
        dueDate: "2025-01-01T00:00:00.000Z",
    });

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "s2" } } });
    await expect(
        createSubtask({
            taskId: "task-2",
            title: "Subtask B",
            dueDate: null,
        })
    ).resolves.toEqual({ id: "s2" });
    expect(apiMock.post).toHaveBeenLastCalledWith("/api/subtasks/createSubtask", {
        taskId: "task-2",
        title: "Subtask B",
    });
});

test("subtask creation enforces required fields", async () => {
    await expect(createSubtask({ title: "Missing taskId" })).rejects.toEqual({
        message: "taskId is required",
        status: undefined,
    });

    await expect(createSubtask({ taskId: "task-1", title: " " })).rejects.toEqual({
        message: "title is required",
        status: undefined,
    });
});

test("subtask creation errors prefer response messages and fall back", async () => {
    apiMock.post.mockRejectedValueOnce({
        response: { data: { message: "Subtask create failed" }, status: 400 },
    });
    await expect(
        createSubtask({ taskId: "task-1", title: "Subtask" })
    ).rejects.toEqual({
        message: "Subtask create failed",
        status: 400,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(
        createSubtask({ taskId: "task-1", title: "Subtask" })
    ).rejects.toEqual({
        message: "Failed to create subtask",
        status: undefined,
    });
});

test("updateSubtask normalizes due dates and handles errors", async () => {
    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(updateSubtask("s1", { title: "Edit", dueDate: undefined })).resolves.toEqual({
        ok: true,
    });
    expect(apiMock.patch).toHaveBeenLastCalledWith("/api/subtasks/s1", { title: "Edit" });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(updateSubtask("s2", { dueDate: "2025-01-02" })).resolves.toEqual({ ok: true });
    expect(apiMock.patch).toHaveBeenLastCalledWith("/api/subtasks/s2", {
        dueDate: "2025-01-02T00:00:00.000Z",
    });

    apiMock.patch.mockRejectedValueOnce({ response: { data: { message: "Update failed" }, status: 422 } });
    await expect(updateSubtask("s3", { title: "Edit" })).rejects.toEqual({
        message: "Update failed",
        status: 422,
    });

    await expect(updateSubtask("s4", { dueDate: "not-a-date" })).rejects.toEqual({
        message: "Failed to update subtask",
        status: undefined,
    });
});

test("subtask actions return unwrap payloads", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: { id: "s1" } } });
    await expect(getSubtaskById("s1")).resolves.toEqual({ id: "s1" });

    apiMock.get.mockResolvedValueOnce({ data: { id: "s2" } });
    await expect(getSubtaskById("s2")).resolves.toEqual({ id: "s2" });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(toggleSubtaskCompletion("s1")).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(deleteSubtask("s1")).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(addAssignees("s1", { assignees: ["u1"] })).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(removeAssignees("s1", { assignees: ["u1"] })).resolves.toEqual({ ok: true });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(leaveSubtask("s1")).resolves.toEqual({ ok: true });
});

test("subtask actions error handling prefers response messages", async () => {
    const error = { response: { data: { message: "Subtask error" }, status: 500 } };

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getSubtasksByTask("task-1")).rejects.toEqual({ message: "Subtask error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getSubtaskById("s1")).rejects.toEqual({ message: "Subtask error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(toggleSubtaskCompletion("s1")).rejects.toEqual({ message: "Subtask error", status: 500 });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(deleteSubtask("s1")).rejects.toEqual({ message: "Subtask error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(addAssignees("s1", { assignees: ["u1"] })).rejects.toEqual({
        message: "Subtask error",
        status: 500,
    });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(removeAssignees("s1", { assignees: ["u1"] })).rejects.toEqual({
        message: "Subtask error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(leaveSubtask("s1")).rejects.toEqual({ message: "Subtask error", status: 500 });
});

test("subtask actions error handling falls back to defaults", async () => {
    apiMock.get.mockRejectedValueOnce({});
    await expect(getSubtasksByTask("task-1")).rejects.toEqual({
        message: "Failed to fetch subtasks",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getSubtaskById("s1")).rejects.toEqual({
        message: "Failed to fetch subtask",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(toggleSubtaskCompletion("s1")).rejects.toEqual({
        message: "Failed to toggle subtask",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(deleteSubtask("s1")).rejects.toEqual({
        message: "Failed to delete subtask",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(addAssignees("s1", { assignees: ["u1"] })).rejects.toEqual({
        message: "Failed to add assignees",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(removeAssignees("s1", { assignees: ["u1"] })).rejects.toEqual({
        message: "Failed to remove assignees",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(leaveSubtask("s1")).rejects.toEqual({
        message: "Failed to leave subtask",
        status: undefined,
    });
});
