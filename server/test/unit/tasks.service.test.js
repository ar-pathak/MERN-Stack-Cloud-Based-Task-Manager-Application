jest.mock("../../src/helpers/isUserTaskAssignee", () => jest.fn());
jest.mock("../../src/middleware/resolveTaskCreatePermission", () => ({
    canCreateTask: jest.fn()
}));
jest.mock("../../src/models/tasks", () => ({
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    countDocuments: jest.fn()
}));
jest.mock("../../src/models/team", () => ({
    exists: jest.fn()
}));
jest.mock("../../src/models/user", () => ({
    find: jest.fn()
}));
jest.mock("../../src/models/subtasks", () => ({}));
jest.mock("../../src/models/taskAssigneeRequest", () => ({}));
jest.mock("../../src/models/project", () => ({
    findById: jest.fn()
}));
jest.mock("../../src/models/workspace", () => ({
    findById: jest.fn()
}));
jest.mock("../../src/models/workspaceMember", () => ({
    exists: jest.fn()
}));
jest.mock("../../src/models/chat", () => ({
    create: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));
jest.mock("../../src/models/message", () => ({}));
jest.mock("../../src/modules/notification/notification.service", () => ({}));
jest.mock("../../src/modules/utils/updateParent", () => ({
    touchParents: jest.fn()
}));
jest.mock("../../src/modules/utils/activityLogger", () => ({
    logActivity: jest.fn(),
    getUserLabel: jest.fn(),
    getUserLabels: jest.fn(),
    formatUserList: jest.fn()
}));
jest.mock("../../src/helpers/paginationHelper", () => ({
    toPaginationMeta: jest.fn()
}));
jest.mock("../../src/modules/utils/chatMembershipSync", () => ({
    getTeamMemberIds: jest.fn(),
    syncTaskAndSubtaskChatMembers: jest.fn()
}));

const isUserTaskAssignee = require("../../src/helpers/isUserTaskAssignee");
const { canCreateTask } = require("../../src/middleware/resolveTaskCreatePermission");
const Task = require("../../src/models/tasks");
const Team = require("../../src/models/team");
const Project = require("../../src/models/project");
const Workspace = require("../../src/models/workspace");
const WorkspaceMember = require("../../src/models/workspaceMember");
const { toPaginationMeta } = require("../../src/helpers/paginationHelper");
const taskService = require("../../src/modules/tasks/tasks.service");

const makeTaskListQuery = (result) => {
    const query = {};
    query.populate = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.clone = jest.fn().mockReturnValue(query);
    query.skip = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockReturnValue(query);
    query.exec = jest.fn().mockResolvedValue(result);
    return query;
};

const makeSelectResolved = (value) => ({
    select: jest.fn().mockResolvedValue(value)
});

const makeSelectLeanResolved = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const makePopulateQuery = (value) => {
    const query = {};
    query.populate = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockReturnValue(query);
    query.exec = jest.fn().mockResolvedValue(value);
    return query;
};

beforeEach(() => {
    jest.clearAllMocks();
});

test("getAllGlobalLevelTasks returns non-paginated task list", async () => {
    const query = makeTaskListQuery([{ _id: "task-1" }]);
    Task.find.mockReturnValue(query);

    const result = await taskService.getAllGlobalLevelTasks("user-1");

    expect(Task.find).toHaveBeenCalledWith({
        workspace: null,
        project: null,
        status: { $ne: "deleted" },
        $or: [
            { createdBy: "user-1" },
            { assignees: "user-1" }
        ]
    });
    expect(result).toEqual([{ _id: "task-1" }]);
});

test("getAllGlobalLevelTasks returns paginated response when pagination is enabled", async () => {
    const query = makeTaskListQuery([{ _id: "task-1" }, { _id: "task-2" }]);
    Task.find.mockReturnValue(query);
    Task.countDocuments.mockResolvedValue(9);
    toPaginationMeta.mockReturnValue({
        page: 2,
        limit: 2,
        total: 9,
        pages: 5
    });

    const result = await taskService.getAllGlobalLevelTasks("user-1", {
        enabled: true,
        page: 2,
        limit: 2,
        skip: 2
    });

    expect(Task.countDocuments).toHaveBeenCalledTimes(1);
    expect(toPaginationMeta).toHaveBeenCalledWith({
        page: 2,
        limit: 2,
        total: 9
    });
    expect(result).toEqual({
        items: [{ _id: "task-1" }, { _id: "task-2" }],
        pagination: {
            page: 2,
            limit: 2,
            total: 9,
            pages: 5
        }
    });
});

test("getTaskById throws when task does not exist", async () => {
    Task.findById.mockReturnValueOnce(makeSelectResolved(null));

    await expect(taskService.getTaskById("task-404", "user-1"))
        .rejects
        .toThrow("Task not found");
});

test("getTaskById throws 403 when user cannot read task", async () => {
    Task.findById.mockReturnValueOnce(makeSelectResolved({
        createdBy: "owner-1",
        assignees: [],
        assigneesTeams: [],
        workspace: "workspace-1",
        project: "project-1"
    }));
    isUserTaskAssignee.mockResolvedValue(false);
    WorkspaceMember.exists.mockResolvedValue(false);
    Project.findById.mockReturnValue(makeSelectLeanResolved({
        owner: "owner-1",
        members: []
    }));

    try {
        await taskService.getTaskById("task-1", "user-1");
        throw new Error("Expected getTaskById to throw");
    } catch (error) {
        expect(error.message).toBe("You are not allowed to access this task");
        expect(error.statusCode).toBe(403);
    }
});

test("getTaskById returns populated task when user has access", async () => {
    Task.findById
        .mockReturnValueOnce(makeSelectResolved({
            _id: "task-1",
            createdBy: "owner-1",
            assignees: [],
            assigneesTeams: [],
            workspace: "workspace-1",
            project: "project-1"
        }))
        .mockReturnValueOnce(makePopulateQuery({
            _id: "task-1",
            title: "Demo task"
        }));
    isUserTaskAssignee.mockResolvedValue(true);

    const task = await taskService.getTaskById("task-1", "user-1");

    expect(task).toEqual({
        _id: "task-1",
        title: "Demo task"
    });
    expect(WorkspaceMember.exists).not.toHaveBeenCalled();
});

test("getTasksByWorkspace returns task list without pagination", async () => {
    const query = makeTaskListQuery([{ _id: "task-1" }]);
    Task.find.mockReturnValue(query);

    const result = await taskService.getTasksByWorkspace("workspace-1");

    expect(Task.find).toHaveBeenCalledWith({
        workspace: "workspace-1",
        status: { $ne: "deleted" }
    });
    expect(result).toEqual([{ _id: "task-1" }]);
});

test("getTasksByWorkspace returns paginated response", async () => {
    const query = makeTaskListQuery([{ _id: "task-1" }, { _id: "task-2" }]);
    Task.find.mockReturnValue(query);
    Task.countDocuments.mockResolvedValue(4);
    toPaginationMeta.mockReturnValue({
        page: 1,
        limit: 2,
        total: 4,
        pages: 2
    });

    const result = await taskService.getTasksByWorkspace("workspace-1", {
        enabled: true,
        page: 1,
        limit: 2,
        skip: 0
    });

    expect(result).toEqual({
        items: [{ _id: "task-1" }, { _id: "task-2" }],
        pagination: {
            page: 1,
            limit: 2,
            total: 4,
            pages: 2
        }
    });
});

test("getTasksByProject returns paginated response", async () => {
    const query = makeTaskListQuery([{ _id: "task-1" }]);
    Task.find.mockReturnValue(query);
    Task.countDocuments.mockResolvedValue(1);
    toPaginationMeta.mockReturnValue({
        page: 3,
        limit: 1,
        total: 1,
        pages: 1
    });

    const result = await taskService.getTasksByProject("project-1", {
        enabled: true,
        page: 3,
        limit: 1,
        skip: 2
    });

    expect(Task.find).toHaveBeenCalledWith({
        project: "project-1",
        status: { $ne: "deleted" }
    });
    expect(result.pagination.total).toBe(1);
});

test("leaveTask throws when task is missing", async () => {
    Task.findById.mockResolvedValue(null);

    await expect(taskService.leaveTask("task-1", "user-1"))
        .rejects
        .toThrow("Task not found");
});

test("leaveTask throws when user is not directly assigned", async () => {
    Task.findById.mockResolvedValue({
        assignees: ["user-2"]
    });

    await expect(taskService.leaveTask("task-1", "user-1"))
        .rejects
        .toThrow("You are not directly assigned to this task.");
});

test("createTask throws when workspace does not exist", async () => {
    Workspace.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
    });

    await expect(taskService.createTask("user-1", { title: "Task A" }, { workspaceId: "workspace-1" }))
        .rejects
        .toThrow("Workspace not found");
});

test("createTask enforces create permission for workspace scope", async () => {
    Workspace.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: "workspace-1" })
    });
    canCreateTask.mockResolvedValue(false);

    await expect(taskService.createTask("user-1", { title: "Task A" }, { workspaceId: "workspace-1" }))
        .rejects
        .toThrow("Only workspace owners and admins can create tasks");
});

test("createTask rejects duplicate task names in same scope", async () => {
    Task.findOne.mockResolvedValue({ _id: "task-duplicate" });

    await expect(taskService.createTask("user-1", { title: "Task A" }))
        .rejects
        .toThrow("Task with this name already exists in this scope");
});

test("createTask rejects global tasks with team assignees", async () => {
    Task.findOne.mockResolvedValue(null);

    await expect(taskService.createTask("user-1", {
        title: "Task A",
        assigneesTeams: ["team-1"]
    })).rejects.toThrow("Global tasks cannot include team assignees");
});

test("createTask rejects global tasks assigned to other users", async () => {
    Task.findOne.mockResolvedValue(null);

    await expect(taskService.createTask("user-1", {
        title: "Task A",
        assignees: ["user-2"]
    })).rejects.toThrow("Global tasks can only be assigned to yourself");
});

test("updateTask throws when task is missing", async () => {
    Task.findById.mockResolvedValue(null);

    await expect(taskService.updateTask("user-1", "task-1", { title: "T2" }))
        .rejects
        .toThrow("Task not found");
});

test("updateTask rejects updates by non-creator", async () => {
    Task.findById.mockResolvedValue({
        createdBy: "owner-1",
        title: "Task A"
    });

    await expect(taskService.updateTask("user-1", "task-1", { title: "T2" }))
        .rejects
        .toThrow("You are not allowed to update this task");
});

test("updateTask rejects duplicate title change", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        createdBy: "user-1",
        title: "Task A",
        workspace: null,
        project: null
    });
    Task.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: "task-2" })
    });

    await expect(taskService.updateTask("user-1", "task-1", { title: "Task B" }))
        .rejects
        .toThrow("Task with this name already exists in this scope");
});

test("changeTaskStatus validates task existence and assignee access", async () => {
    Task.findById.mockResolvedValueOnce(null);
    await expect(taskService.changeTaskStatus("user-1", "task-1", "completed"))
        .rejects
        .toThrow("Task not found");

    Task.findById.mockResolvedValueOnce({
        _id: "task-1",
        status: "active"
    });
    isUserTaskAssignee.mockResolvedValue(false);
    await expect(taskService.changeTaskStatus("user-1", "task-1", "completed"))
        .rejects
        .toThrow("Only task assignees can change task status");
});

test("changeTaskStatus rejects no-op status changes", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        status: "active"
    });
    isUserTaskAssignee.mockResolvedValue(true);

    await expect(taskService.changeTaskStatus("user-1", "task-1", "active"))
        .rejects
        .toThrow("Task already has this status");
});

test("toggleTaskCompletion delegates to changeTaskStatus with computed status", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        status: "completed"
    });
    const changeSpy = jest.spyOn(taskService, "changeTaskStatus").mockResolvedValue({
        message: "Task status updated successfully"
    });

    const result = await taskService.toggleTaskCompletion("user-1", "task-1");

    expect(changeSpy).toHaveBeenCalledWith("user-1", "task-1", "active");
    expect(result).toEqual({ message: "Task status updated successfully" });
});

test("deleteTask enforces deletion guards", async () => {
    Task.findById.mockResolvedValueOnce(null);
    await expect(taskService.deleteTask("user-1", "task-1"))
        .rejects
        .toThrow("Task not found");

    Task.findById.mockResolvedValueOnce({
        status: "deleted"
    });
    await expect(taskService.deleteTask("user-1", "task-1"))
        .rejects
        .toThrow("Task already deleted");

    Task.findById.mockResolvedValueOnce({
        status: "active",
        createdBy: "owner-1"
    });
    await expect(taskService.deleteTask("user-1", "task-1"))
        .rejects
        .toThrow("You are not allowed to delete this task");
});

test("restoreTask validates status and restore permissions", async () => {
    Task.findById.mockResolvedValueOnce({
        status: "active"
    });
    await expect(taskService.restoreTask("user-1", "task-1"))
        .rejects
        .toThrow("Only deleted tasks can be restored");

    Task.findById.mockResolvedValueOnce({
        status: "deleted",
        createdBy: "owner-1",
        assigneesTeams: ["team-1"]
    });
    Team.exists.mockResolvedValue(false);
    await expect(taskService.restoreTask("user-1", "task-1"))
        .rejects
        .toThrow("You are not allowed to restore this task");
});
