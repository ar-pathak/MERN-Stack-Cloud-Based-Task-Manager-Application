jest.mock("../../src/modules/tasks/tasks.service", () => ({
    createTask: jest.fn(),
    updateTask: jest.fn(),
    addTaskAssignees: jest.fn(),
    respondTaskAssigneeRequest: jest.fn(),
    removeTaskAssignees: jest.fn(),
    changeTaskStatus: jest.fn(),
    toggleTaskCompletion: jest.fn(),
    deleteTask: jest.fn(),
    restoreTask: jest.fn(),
    permanentDeleteTask: jest.fn(),
    getAllGlobalLevelTasks: jest.fn(),
    getTaskById: jest.fn(),
    getTasksByWorkspace: jest.fn(),
    getTasksByProject: jest.fn(),
    leaveTask: jest.fn()
}));

jest.mock("../../src/modules/tasks/tasks.validation", () => ({
    createTaskSchema: { parse: jest.fn((value) => value) },
    updateTaskSchema: { parse: jest.fn((value) => value) },
    addTaskAssigneesSchema: { parse: jest.fn((value) => value) },
    removeTaskAssigneesSchema: { parse: jest.fn((value) => value) },
    changeTaskStatusSchema: { parse: jest.fn((value) => value) },
    respondTaskAssigneeRequestSchema: { parse: jest.fn((value) => value) }
}));

jest.mock("../../src/helpers/paginationHelper", () => ({
    parsePaginationQuery: jest.fn(() => ({ page: 1, limit: 30, skip: 0 }))
}));

jest.mock("../../src/helpers/responseHelper", () => ({
    sendSuccess: jest.fn((res, data = null, message = "Success", statusCode = 200) => (
        res.status(statusCode).json({
            success: true,
            message,
            ...(data !== null ? { data } : {})
        })
    )),
    handleError: jest.fn((error, res) => (
        res.status(error?.statusCode || 500).json({
            success: false,
            message: error?.message || "Internal server error"
        })
    ))
}));

const taskService = require("../../src/modules/tasks/tasks.service");
const {
    createTaskSchema,
    updateTaskSchema,
    addTaskAssigneesSchema,
    removeTaskAssigneesSchema,
    changeTaskStatusSchema,
    respondTaskAssigneeRequestSchema
} = require("../../src/modules/tasks/tasks.validation");
const { parsePaginationQuery } = require("../../src/helpers/paginationHelper");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/tasks/tasks.controller");

const USER_ID = "507f1f77bcf86cd799439011";
const WORKSPACE_ID = "507f1f77bcf86cd799439012";
const PROJECT_ID = "507f1f77bcf86cd799439013";
const TASK_ID = "507f1f77bcf86cd799439014";
const REQUEST_ID = "507f1f77bcf86cd799439015";

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
    user: { _id: USER_ID },
    params: {
        workspaceId: WORKSPACE_ID,
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        requestId: REQUEST_ID
    },
    query: { page: "1", limit: "30" },
    body: {
        title: "Task title",
        status: "completed",
        users: [USER_ID],
        action: "approve"
    }
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("createTask handlers validate payload and forward scope", async () => {
    const reqGlobal = baseReq();
    const resGlobal = createResponse();
    taskService.createTask.mockResolvedValueOnce({ _id: TASK_ID });

    await controller.createTaskAtGlobalLevel(reqGlobal, resGlobal);

    expect(createTaskSchema.parse).toHaveBeenCalledWith(reqGlobal.body);
    expect(taskService.createTask).toHaveBeenCalledWith(USER_ID, reqGlobal.body);
    expect(sendSuccess).toHaveBeenCalledWith(
        resGlobal,
        { _id: TASK_ID },
        "Task created successfully",
        201
    );

    const reqWorkspace = baseReq();
    const resWorkspace = createResponse();
    taskService.createTask.mockResolvedValueOnce({ _id: TASK_ID });

    await controller.createTaskAtWorkspaceLevel(reqWorkspace, resWorkspace);

    expect(taskService.createTask).toHaveBeenCalledWith(
        USER_ID,
        reqWorkspace.body,
        { workspaceId: WORKSPACE_ID }
    );

    const reqProject = baseReq();
    const resProject = createResponse();
    taskService.createTask.mockResolvedValueOnce({ _id: TASK_ID });

    await controller.createTaskAtProjectLevel(reqProject, resProject);

    expect(taskService.createTask).toHaveBeenCalledWith(
        USER_ID,
        reqProject.body,
        { workspaceId: WORKSPACE_ID, projectId: PROJECT_ID }
    );
});

test("update and assignee handlers return service message", async () => {
    const reqUpdate = baseReq();
    const resUpdate = createResponse();
    taskService.updateTask.mockResolvedValue({ task: { _id: TASK_ID }, message: "Task updated" });

    await controller.updateTask(reqUpdate, resUpdate);

    expect(updateTaskSchema.parse).toHaveBeenCalledWith(reqUpdate.body);
    expect(taskService.updateTask).toHaveBeenCalledWith(USER_ID, TASK_ID, reqUpdate.body);
    expect(sendSuccess).toHaveBeenCalledWith(resUpdate, { _id: TASK_ID }, "Task updated");

    const reqAdd = baseReq();
    const resAdd = createResponse();
    taskService.addTaskAssignees.mockResolvedValue({ task: { _id: TASK_ID }, message: "Added" });

    await controller.addTaskAssignees(reqAdd, resAdd);

    expect(addTaskAssigneesSchema.parse).toHaveBeenCalledWith(reqAdd.body);
    expect(taskService.addTaskAssignees).toHaveBeenCalledWith(USER_ID, TASK_ID, reqAdd.body);
    expect(sendSuccess).toHaveBeenCalledWith(resAdd, { _id: TASK_ID }, "Added");

    const reqRemove = baseReq();
    const resRemove = createResponse();
    taskService.removeTaskAssignees.mockResolvedValue({ task: { _id: TASK_ID }, message: "Removed" });

    await controller.removeTaskAssignees(reqRemove, resRemove);

    expect(removeTaskAssigneesSchema.parse).toHaveBeenCalledWith(reqRemove.body);
    expect(taskService.removeTaskAssignees).toHaveBeenCalledWith(USER_ID, TASK_ID, reqRemove.body);
    expect(sendSuccess).toHaveBeenCalledWith(resRemove, { _id: TASK_ID }, "Removed");
});

test("respondTaskAssigneeRequest validates request and maps action message", async () => {
    const reqApprove = baseReq();
    const resApprove = createResponse();
    reqApprove.body = { action: "approve" };
    taskService.respondTaskAssigneeRequest.mockResolvedValue({ requestId: REQUEST_ID, status: "approved" });

    await controller.respondTaskAssigneeRequest(reqApprove, resApprove);

    expect(respondTaskAssigneeRequestSchema.parse).toHaveBeenCalledWith({ action: "approve" });
    expect(taskService.respondTaskAssigneeRequest).toHaveBeenCalledWith({
        userId: USER_ID,
        taskId: TASK_ID,
        requestId: REQUEST_ID,
        action: "approve"
    });
    expect(sendSuccess).toHaveBeenCalledWith(
        resApprove,
        { requestId: REQUEST_ID, status: "approved" },
        "Task assignment request approved"
    );

    const reqReject = baseReq();
    const resReject = createResponse();
    reqReject.body = { action: "reject" };
    taskService.respondTaskAssigneeRequest.mockResolvedValue({ requestId: REQUEST_ID, status: "rejected" });

    await controller.respondTaskAssigneeRequest(reqReject, resReject);

    expect(sendSuccess).toHaveBeenLastCalledWith(
        resReject,
        { requestId: REQUEST_ID, status: "rejected" },
        "Task assignment request rejected"
    );
});

test("status/complete/delete/restore/permanent/leave handlers forward ids", async () => {
    const reqStatus = baseReq();
    const resStatus = createResponse();
    reqStatus.body = { status: "completed" };
    taskService.changeTaskStatus.mockResolvedValue({ task: { _id: TASK_ID }, message: "Status updated" });

    await controller.changeTaskStatus(reqStatus, resStatus);

    expect(changeTaskStatusSchema.parse).toHaveBeenCalledWith({ status: "completed" });
    expect(taskService.changeTaskStatus).toHaveBeenCalledWith(USER_ID, TASK_ID, "completed");
    expect(sendSuccess).toHaveBeenCalledWith(resStatus, { _id: TASK_ID }, "Status updated");

    const reqToggle = baseReq();
    const resToggle = createResponse();
    taskService.toggleTaskCompletion.mockResolvedValue({ task: { _id: TASK_ID }, message: "Toggled" });

    await controller.toggleTaskCompletion(reqToggle, resToggle);

    expect(taskService.toggleTaskCompletion).toHaveBeenCalledWith(USER_ID, TASK_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resToggle, { _id: TASK_ID }, "Toggled");

    const reqDelete = baseReq();
    const resDelete = createResponse();
    taskService.deleteTask.mockResolvedValue({ message: "Task deleted" });

    await controller.deleteTask(reqDelete, resDelete);

    expect(taskService.deleteTask).toHaveBeenCalledWith(USER_ID, TASK_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resDelete, null, "Task deleted");

    const reqRestore = baseReq();
    const resRestore = createResponse();
    taskService.restoreTask.mockResolvedValue({ task: { _id: TASK_ID }, message: "Task restored" });

    await controller.restoreTask(reqRestore, resRestore);

    expect(taskService.restoreTask).toHaveBeenCalledWith(USER_ID, TASK_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resRestore, { _id: TASK_ID }, "Task restored");

    const reqPermanent = baseReq();
    const resPermanent = createResponse();
    taskService.permanentDeleteTask.mockResolvedValue({ message: "Task permanently deleted" });

    await controller.permanentDeleteTask(reqPermanent, resPermanent);

    expect(taskService.permanentDeleteTask).toHaveBeenCalledWith(USER_ID, TASK_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resPermanent, null, "Task permanently deleted");

    const reqLeave = baseReq();
    const resLeave = createResponse();
    taskService.leaveTask.mockResolvedValue({ message: "Left task" });

    await controller.leaveTask(reqLeave, resLeave);

    expect(taskService.leaveTask).toHaveBeenCalledWith(TASK_ID, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resLeave, null, "Left task");
});

test("list and get handlers parse pagination and return payload", async () => {
    const reqGlobal = baseReq();
    const resGlobal = createResponse();
    taskService.getAllGlobalLevelTasks.mockResolvedValue({ items: [{ _id: TASK_ID }] });

    await controller.getAllGlobalLevelTasks(reqGlobal, resGlobal);

    expect(parsePaginationQuery).toHaveBeenCalledWith(reqGlobal.query, {
        defaultLimit: 30,
        maxLimit: 100
    });
    expect(taskService.getAllGlobalLevelTasks).toHaveBeenCalledWith(
        USER_ID,
        { page: 1, limit: 30, skip: 0 }
    );
    expect(sendSuccess).toHaveBeenCalledWith(
        resGlobal,
        { items: [{ _id: TASK_ID }] },
        "Tasks retrieved successfully"
    );

    const reqTask = baseReq();
    const resTask = createResponse();
    taskService.getTaskById.mockResolvedValue({ _id: TASK_ID });

    await controller.getTask(reqTask, resTask);

    expect(taskService.getTaskById).toHaveBeenCalledWith(TASK_ID, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resTask, { _id: TASK_ID }, "Task retrieved successfully");

    const reqWorkspace = baseReq();
    const resWorkspace = createResponse();
    taskService.getTasksByWorkspace.mockResolvedValue({ items: [] });

    await controller.getTasksByWorkspace(reqWorkspace, resWorkspace);

    expect(taskService.getTasksByWorkspace).toHaveBeenCalledWith(
        WORKSPACE_ID,
        { page: 1, limit: 30, skip: 0 }
    );
    expect(sendSuccess).toHaveBeenCalledWith(resWorkspace, { items: [] }, "Tasks retrieved successfully");

    const reqProject = baseReq();
    const resProject = createResponse();
    taskService.getTasksByProject.mockResolvedValue({ items: [] });

    await controller.getTasksByProject(reqProject, resProject);

    expect(taskService.getTasksByProject).toHaveBeenCalledWith(
        PROJECT_ID,
        { page: 1, limit: 30, skip: 0 }
    );
    expect(sendSuccess).toHaveBeenCalledWith(resProject, { items: [] }, "Tasks retrieved successfully");
});

test("getTask and list handlers return 400 for invalid ids", async () => {
    const invalidTaskReq = baseReq();
    invalidTaskReq.params.taskId = "invalid";
    const invalidTaskRes = createResponse();

    await controller.getTask(invalidTaskReq, invalidTaskRes);

    expect(invalidTaskRes.statusCode).toBe(400);
    expect(invalidTaskRes.body).toEqual({
        success: false,
        message: "Invalid task ID"
    });

    const invalidWorkspaceReq = baseReq();
    invalidWorkspaceReq.params.workspaceId = "invalid";
    const invalidWorkspaceRes = createResponse();

    await controller.getTasksByWorkspace(invalidWorkspaceReq, invalidWorkspaceRes);

    expect(invalidWorkspaceRes.statusCode).toBe(400);
    expect(invalidWorkspaceRes.body).toEqual({
        success: false,
        message: "Invalid workspace ID"
    });

    const invalidProjectReq = baseReq();
    invalidProjectReq.params.projectId = "invalid";
    const invalidProjectRes = createResponse();

    await controller.getTasksByProject(invalidProjectReq, invalidProjectRes);

    expect(invalidProjectRes.statusCode).toBe(400);
    expect(invalidProjectRes.body).toEqual({
        success: false,
        message: "Invalid project ID"
    });
});

test("getAllGlobalLevelTasks returns 400 for invalid user id", async () => {
    const req = baseReq();
    req.user._id = "invalid-user-id";
    const res = createResponse();

    await controller.getAllGlobalLevelTasks(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "Invalid user ID"
    });
    expect(taskService.getAllGlobalLevelTasks).not.toHaveBeenCalled();
});

test("controller delegates thrown errors to handleError", async () => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("permission denied");
    error.statusCode = 403;
    taskService.createTask.mockRejectedValue(error);

    await controller.createTaskAtGlobalLevel(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ success: false, message: "permission denied" });
});
