jest.mock("../../src/modules/subtask/subtask.service", () => ({
    createSubtask: jest.fn(),
    getSubtasksByTask: jest.fn(),
    getSubtaskById: jest.fn(),
    updateSubtask: jest.fn(),
    toggleSubtask: jest.fn(),
    deleteSubtask: jest.fn(),
    reorderSubtasksManual: jest.fn(),
    getSubtaskStats: jest.fn(),
    addAssignees: jest.fn(),
    removeAssignees: jest.fn(),
    leaveSubtask: jest.fn()
}));

const subtaskService = require("../../src/modules/subtask/subtask.service");
const controller = require("../../src/modules/subtask/subtask.controller");

const createResponse = () => {
    const res = { statusCode: null, body: null };
    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    return res;
};

const baseReq = () => ({
    user: { _id: "user-1", id: "user-1" },
    params: { taskId: "task-1", subtaskId: "subtask-1" },
    body: {
        taskId: "task-1",
        title: "Write API docs",
        description: "docs",
        assignedTo: ["user-2"],
        dueDate: "2026-03-10T00:00:00.000Z",
        assignees: ["user-2"],
        subtaskIds: ["subtask-1", "subtask-2"]
    }
});

let consoleSpy;

beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    consoleSpy.mockRestore();
});

test("createSubtask creates record and returns 201", async () => {
    const req = baseReq();
    const res = createResponse();
    const subtask = { _id: "subtask-1", title: "Write API docs" };
    subtaskService.createSubtask.mockResolvedValue(subtask);

    await controller.createSubtask(req, res);

    expect(subtaskService.createSubtask).toHaveBeenCalledWith({
        taskId: "task-1",
        title: "Write API docs",
        description: "docs",
        assignedTo: ["user-2"],
        dueDate: "2026-03-10T00:00:00.000Z",
        createdBy: "user-1"
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
        success: true,
        message: "Subtask created successfully",
        data: subtask
    });
});

test("createSubtask maps task-not-found errors to 404", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.createSubtask.mockRejectedValue(new Error("Task not found"));

    await controller.createSubtask(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Task not found");
});

test("createSubtask returns 500 for unexpected errors", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.createSubtask.mockRejectedValue(new Error("db unavailable"));

    await controller.createSubtask(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
        success: false,
        message: "db unavailable"
    });
});

test("getSubtasksByTask returns list with count", async () => {
    const req = baseReq();
    const res = createResponse();
    const subtasks = [{ _id: "subtask-1" }, { _id: "subtask-2" }];
    subtaskService.getSubtasksByTask.mockResolvedValue(subtasks);

    await controller.getSubtasksByTask(req, res);

    expect(subtaskService.getSubtasksByTask).toHaveBeenCalledWith("task-1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
        success: true,
        count: 2,
        data: subtasks
    });
});

test("getSubtasksByTask returns 500 when service throws", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.getSubtasksByTask.mockRejectedValue(new Error("query failed"));

    await controller.getSubtasksByTask(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
        success: false,
        message: "Failed to fetch subtasks"
    });
});

test("getSubtask returns payload on success", async () => {
    const req = baseReq();
    const res = createResponse();
    const subtask = { _id: "subtask-1", title: "Subtask A" };
    subtaskService.getSubtaskById.mockResolvedValue(subtask);

    await controller.getSubtask(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
        success: true,
        data: subtask
    });
});

test("getSubtask returns 404 when missing", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.getSubtaskById.mockRejectedValue(new Error("Subtask not found"));

    await controller.getSubtask(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
        success: false,
        message: "Subtask not found"
    });
});

test("getSubtask returns 500 with fallback message for unknown errors", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.getSubtaskById.mockRejectedValue(new Error(""));

    await controller.getSubtask(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
        success: false,
        message: "Failed to fetch subtask"
    });
});

test("updateSubtask returns updated subtask payload", async () => {
    const req = baseReq();
    req.body = { title: "Updated title" };
    const res = createResponse();
    const updated = { _id: "subtask-1", title: "Updated title" };
    subtaskService.updateSubtask.mockResolvedValue(updated);

    await controller.updateSubtask(req, res);

    expect(subtaskService.updateSubtask).toHaveBeenCalledWith("subtask-1", { title: "Updated title" }, "user-1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
        success: true,
        message: "Subtask updated successfully",
        data: updated
    });
});

test("updateSubtask maps not found errors to 404", async () => {
    const req = baseReq();
    req.body = { title: "Updated title" };
    const res = createResponse();
    subtaskService.updateSubtask.mockRejectedValue(new Error("Subtask not found"));

    await controller.updateSubtask(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
        success: false,
        message: "Subtask not found"
    });
});

test("updateSubtask returns 500 with fallback message for unknown errors", async () => {
    const req = baseReq();
    req.body = { title: "Updated title" };
    const res = createResponse();
    subtaskService.updateSubtask.mockRejectedValue(new Error(""));

    await controller.updateSubtask(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
        success: false,
        message: "Failed to update subtask"
    });
});

test("toggleSubtask returns completion message based on state", async () => {
    const req = baseReq();
    const res = createResponse();
    const toggled = { _id: "subtask-1", completed: true };
    subtaskService.toggleSubtask.mockResolvedValue(toggled);

    await controller.toggleSubtask(req, res);

    expect(subtaskService.toggleSubtask).toHaveBeenCalledWith("subtask-1", "user-1");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Subtask completed successfully");
});

test("toggleSubtask returns reopened message for incomplete result", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.toggleSubtask.mockResolvedValue({ _id: "subtask-1", completed: false });

    await controller.toggleSubtask(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Subtask reopened successfully");
});

test("toggleSubtask maps not found errors to 404", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.toggleSubtask.mockRejectedValue(new Error("Subtask not found"));

    await controller.toggleSubtask(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
        success: false,
        message: "Subtask not found"
    });
});

test("toggleSubtask returns 500 with fallback message for unknown errors", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.toggleSubtask.mockRejectedValue(new Error(""));

    await controller.toggleSubtask(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
        success: false,
        message: "Failed to toggle subtask"
    });
});

test("deleteSubtask returns service message", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.deleteSubtask.mockResolvedValue({ message: "Subtask deleted" });

    await controller.deleteSubtask(req, res);

    expect(subtaskService.deleteSubtask).toHaveBeenCalledWith("subtask-1", "user-1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
        success: true,
        message: "Subtask deleted"
    });
});

test("deleteSubtask maps not found errors to 404", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.deleteSubtask.mockRejectedValue(new Error("Subtask not found"));

    await controller.deleteSubtask(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
        success: false,
        message: "Subtask not found"
    });
});

test("deleteSubtask returns 500 with fallback message for unknown errors", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.deleteSubtask.mockRejectedValue(new Error(""));

    await controller.deleteSubtask(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
        success: false,
        message: "Failed to delete subtask"
    });
});

test("reorderSubtasks validates array input", async () => {
    const req = baseReq();
    req.body = { subtaskIds: "not-an-array" };
    const res = createResponse();

    await controller.reorderSubtasks(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "subtaskIds must be an array"
    });
    expect(subtaskService.reorderSubtasksManual).not.toHaveBeenCalled();
});

test("reorderSubtasks reorders and returns payload", async () => {
    const req = baseReq();
    req.body = { subtaskIds: ["subtask-2", "subtask-1"] };
    const res = createResponse();
    const reordered = [{ _id: "subtask-2", order: 0 }, { _id: "subtask-1", order: 1 }];
    subtaskService.reorderSubtasksManual.mockResolvedValue(reordered);

    await controller.reorderSubtasks(req, res);

    expect(subtaskService.reorderSubtasksManual).toHaveBeenCalledWith("task-1", ["subtask-2", "subtask-1"]);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
});

test("reorderSubtasks returns 500 when service fails", async () => {
    const req = baseReq();
    req.body = { subtaskIds: ["subtask-2", "subtask-1"] };
    const res = createResponse();
    subtaskService.reorderSubtasksManual.mockRejectedValue(new Error("invalid sequence"));

    await controller.reorderSubtasks(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
        success: false,
        message: "invalid sequence"
    });
});

test("reorderSubtasks returns fallback message when service error message is empty", async () => {
    const req = baseReq();
    req.body = { subtaskIds: ["subtask-2", "subtask-1"] };
    const res = createResponse();
    subtaskService.reorderSubtasksManual.mockRejectedValue(new Error(""));

    await controller.reorderSubtasks(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
        success: false,
        message: "Failed to reorder subtasks"
    });
});

test("getSubtaskStats returns stats payload", async () => {
    const req = baseReq();
    const res = createResponse();
    const stats = { total: 4, completed: 2 };
    subtaskService.getSubtaskStats.mockResolvedValue(stats);

    await controller.getSubtaskStats(req, res);

    expect(subtaskService.getSubtaskStats).toHaveBeenCalledWith("task-1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: stats });
});

test("getSubtaskStats returns 500 on service failure", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.getSubtaskStats.mockRejectedValue(new Error("boom"));

    await controller.getSubtaskStats(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
        success: false,
        message: "Failed to fetch subtask statistics"
    });
});

test("addAssignees and removeAssignees forward actor and assignee list", async () => {
    const addReq = baseReq();
    addReq.body = { assignees: ["user-3"] };
    const addRes = createResponse();
    const addResult = { _id: "subtask-1", assignedTo: ["user-3"] };
    subtaskService.addAssignees.mockResolvedValue(addResult);

    await controller.addAssignees(addReq, addRes);

    expect(subtaskService.addAssignees).toHaveBeenCalledWith("subtask-1", ["user-3"], "user-1");
    expect(addRes.statusCode).toBe(200);
    expect(addRes.body.message).toBe("Assignees added successfully");

    const removeReq = baseReq();
    removeReq.body = { assignees: ["user-3"] };
    const removeRes = createResponse();
    const removeResult = { _id: "subtask-1", assignedTo: [] };
    subtaskService.removeAssignees.mockResolvedValue(removeResult);

    await controller.removeAssignees(removeReq, removeRes);

    expect(subtaskService.removeAssignees).toHaveBeenCalledWith("subtask-1", ["user-3"], "user-1");
    expect(removeRes.statusCode).toBe(200);
    expect(removeRes.body.message).toBe("Assignees removed successfully");
});

test("addAssignees and removeAssignees map subtask-not-found errors to 404", async () => {
    const addReq = baseReq();
    addReq.body = { assignees: ["user-3"] };
    const addRes = createResponse();
    subtaskService.addAssignees.mockRejectedValue(new Error("Subtask not found"));

    await controller.addAssignees(addReq, addRes);

    expect(addRes.statusCode).toBe(404);
    expect(addRes.body).toEqual({
        success: false,
        message: "Subtask not found"
    });

    const removeReq = baseReq();
    removeReq.body = { assignees: ["user-3"] };
    const removeRes = createResponse();
    subtaskService.removeAssignees.mockRejectedValue(new Error("Subtask not found"));

    await controller.removeAssignees(removeReq, removeRes);

    expect(removeRes.statusCode).toBe(404);
    expect(removeRes.body).toEqual({
        success: false,
        message: "Subtask not found"
    });
});

test("addAssignees and removeAssignees return 500 with fallback message for unknown errors", async () => {
    const addReq = baseReq();
    addReq.body = { assignees: ["user-3"] };
    const addRes = createResponse();
    subtaskService.addAssignees.mockRejectedValue(new Error(""));

    await controller.addAssignees(addReq, addRes);

    expect(addRes.statusCode).toBe(500);
    expect(addRes.body).toEqual({
        success: false,
        message: "Failed to add assignees"
    });

    const removeReq = baseReq();
    removeReq.body = { assignees: ["user-3"] };
    const removeRes = createResponse();
    subtaskService.removeAssignees.mockRejectedValue(new Error(""));

    await controller.removeAssignees(removeReq, removeRes);

    expect(removeRes.statusCode).toBe(500);
    expect(removeRes.body).toEqual({
        success: false,
        message: "Failed to remove assignees"
    });
});

test("leaveSubtask returns 404 for missing subtask", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.leaveSubtask.mockRejectedValue(new Error("Subtask not found"));

    await controller.leaveSubtask(req, res);

    expect(subtaskService.leaveSubtask).toHaveBeenCalledWith("subtask-1", "user-1");
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
        success: false,
        message: "Subtask not found"
    });
});

test("leaveSubtask returns 400 for domain errors other than not found", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.leaveSubtask.mockRejectedValue(new Error("You are not assigned to this subtask"));

    await controller.leaveSubtask(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "You are not assigned to this subtask"
    });
});

test("leaveSubtask returns success payload", async () => {
    const req = baseReq();
    const res = createResponse();
    subtaskService.leaveSubtask.mockResolvedValue({ message: "ok" });

    await controller.leaveSubtask(req, res);

    expect(subtaskService.leaveSubtask).toHaveBeenCalledWith("subtask-1", "user-1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
        success: true,
        message: "Left subtask successfully"
    });
});

test("controller methods fallback to req.user._id when req.user.id is missing", async () => {
    const reqWithLegacyUser = () => ({
        user: { _id: "legacy-user-1" },
        params: { taskId: "task-1", subtaskId: "subtask-1" },
        body: {
            taskId: "task-1",
            title: "Write API docs",
            description: "docs",
            assignedTo: ["user-2"],
            dueDate: "2026-03-10T00:00:00.000Z",
            assignees: ["user-2"]
        }
    });

    const createRes = createResponse();
    subtaskService.createSubtask.mockResolvedValue({ _id: "subtask-1" });
    await controller.createSubtask(reqWithLegacyUser(), createRes);
    expect(subtaskService.createSubtask).toHaveBeenCalledWith(expect.objectContaining({
        createdBy: "legacy-user-1"
    }));

    const updateRes = createResponse();
    subtaskService.updateSubtask.mockResolvedValue({ _id: "subtask-1" });
    await controller.updateSubtask(
        { ...reqWithLegacyUser(), body: { title: "Updated" } },
        updateRes
    );
    expect(subtaskService.updateSubtask).toHaveBeenCalledWith(
        "subtask-1",
        { title: "Updated" },
        "legacy-user-1"
    );

    const toggleRes = createResponse();
    subtaskService.toggleSubtask.mockResolvedValue({ _id: "subtask-1", completed: true });
    await controller.toggleSubtask(reqWithLegacyUser(), toggleRes);
    expect(subtaskService.toggleSubtask).toHaveBeenCalledWith("subtask-1", "legacy-user-1");

    const deleteRes = createResponse();
    subtaskService.deleteSubtask.mockResolvedValue({ message: "deleted" });
    await controller.deleteSubtask(reqWithLegacyUser(), deleteRes);
    expect(subtaskService.deleteSubtask).toHaveBeenCalledWith("subtask-1", "legacy-user-1");

    const addRes = createResponse();
    subtaskService.addAssignees.mockResolvedValue({ _id: "subtask-1" });
    await controller.addAssignees(reqWithLegacyUser(), addRes);
    expect(subtaskService.addAssignees).toHaveBeenCalledWith(
        "subtask-1",
        ["user-2"],
        "legacy-user-1"
    );

    const removeRes = createResponse();
    subtaskService.removeAssignees.mockResolvedValue({ _id: "subtask-1" });
    await controller.removeAssignees(reqWithLegacyUser(), removeRes);
    expect(subtaskService.removeAssignees).toHaveBeenCalledWith(
        "subtask-1",
        ["user-2"],
        "legacy-user-1"
    );

    const leaveRes = createResponse();
    subtaskService.leaveSubtask.mockResolvedValue({ message: "ok" });
    await controller.leaveSubtask(reqWithLegacyUser(), leaveRes);
    expect(subtaskService.leaveSubtask).toHaveBeenCalledWith("subtask-1", "legacy-user-1");
});
