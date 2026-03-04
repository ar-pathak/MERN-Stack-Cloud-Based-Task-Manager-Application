jest.mock("mongoose", () => ({
    startSession: jest.fn()
}));

jest.mock("../../src/helpers/isUserTaskAssignee", () => jest.fn());
jest.mock("../../src/middleware/resolveTaskCreatePermission", () => ({
    canCreateTask: jest.fn()
}));
jest.mock("../../src/models/tasks", () => ({
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    deleteOne: jest.fn()
}));
jest.mock("../../src/models/team", () => ({
    find: jest.fn(),
    exists: jest.fn()
}));
jest.mock("../../src/models/user", () => ({
    find: jest.fn()
}));
jest.mock("../../src/models/subtasks", () => ({
    updateMany: jest.fn(),
    deleteMany: jest.fn()
}));
jest.mock("../../src/models/taskAssigneeRequest", () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn()
}));
jest.mock("../../src/models/project", () => ({
    findById: jest.fn()
}));
jest.mock("../../src/models/workspace", () => ({
    findById: jest.fn()
}));
jest.mock("../../src/models/workspaceMember", () => ({
    find: jest.fn(),
    exists: jest.fn()
}));
jest.mock("../../src/models/chat", () => ({
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));
jest.mock("../../src/models/message", () => ({
    deleteMany: jest.fn()
}));
jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn(),
    setTaskAssigneeRequestNotificationState: jest.fn()
}));
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

const mongoose = require("mongoose");
const isUserTaskAssignee = require("../../src/helpers/isUserTaskAssignee");
const { canCreateTask } = require("../../src/middleware/resolveTaskCreatePermission");
const Task = require("../../src/models/tasks");
const Team = require("../../src/models/team");
const User = require("../../src/models/user");
const Subtask = require("../../src/models/subtasks");
const TaskAssigneeRequest = require("../../src/models/taskAssigneeRequest");
const Project = require("../../src/models/project");
const Workspace = require("../../src/models/workspace");
const WorkspaceMember = require("../../src/models/workspaceMember");
const Chat = require("../../src/models/chat");
const Message = require("../../src/models/message");
const notificationService = require("../../src/modules/notification/notification.service");
const { touchParents } = require("../../src/modules/utils/updateParent");
const { logActivity, getUserLabel, getUserLabels, formatUserList } = require("../../src/modules/utils/activityLogger");
const { toPaginationMeta } = require("../../src/helpers/paginationHelper");
const { getTeamMemberIds, syncTaskAndSubtaskChatMembers } = require("../../src/modules/utils/chatMembershipSync");
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

const makePopulateResolved = (value) => {
    const query = {};
    query.populate = jest.fn().mockReturnValue(query);
    query.then = (onFulfilled, onRejected) => Promise.resolve(value).then(onFulfilled, onRejected);
    query.catch = (onRejected) => Promise.resolve(value).catch(onRejected);
    return query;
};

const makeSelectLeanQuery = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const makeSession = () => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn()
});

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

test("createTask creates global task and returns populated payload", async () => {
    Task.findOne.mockResolvedValue(null);
    Chat.create.mockResolvedValue({ _id: "chat-1" });
    Task.create.mockResolvedValue({
        _id: "task-1",
        title: "Task A",
        chatId: "chat-1",
        workspace: null,
        project: null
    });
    Task.findById.mockReturnValue(makePopulateResolved({ _id: "task-1", title: "Task A" }));
    getUserLabel.mockResolvedValue("Alice");

    const result = await taskService.createTask("user-1", {
        title: "Task A",
        assignees: ["user-1"]
    });

    expect(Task.create).toHaveBeenCalledWith(expect.objectContaining({
        title: "Task A",
        assignees: ["user-1"],
        assigneesTeams: [],
        createdBy: "user-1",
        workspace: null,
        project: null,
        chatId: "chat-1"
    }));
    expect(syncTaskAndSubtaskChatMembers).toHaveBeenCalledWith("task-1");
    expect(touchParents).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ _id: "task-1", title: "Task A" });
});

test("addTaskAssignees updates task for workspace assignees and teams", async () => {
    Task.findById
        .mockResolvedValueOnce({
            _id: "task-1",
            title: "Task A",
            createdBy: "user-1",
            assignees: ["user-1"],
            assigneesTeams: [],
            workspace: "workspace-1",
            project: null,
            chatId: "chat-1"
        })
        .mockReturnValueOnce(makePopulateResolved({ _id: "task-1", title: "Task A" }));
    WorkspaceMember.find.mockReturnValue(makeSelectLeanQuery([
        { user: "user-1" },
        { user: "user-2" }
    ]));
    Team.find.mockReturnValue(makeSelectLeanQuery([
        { _id: "team-1", workspace: "workspace-1" }
    ]));
    Workspace.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-w1"
    }));
    getUserLabel.mockResolvedValue("Alice");
    getUserLabels.mockResolvedValue(["Bob"]);
    formatUserList.mockReturnValue("Bob");

    const result = await taskService.addTaskAssignees("user-1", "task-1", {
        assignees: ["user-2"],
        assigneesTeams: ["team-1"]
    });

    expect(Task.updateOne).toHaveBeenCalledWith(
        { _id: "task-1" },
        {
            $addToSet: {
                assignees: { $each: ["user-2"] },
                assigneesTeams: { $each: ["team-1"] }
            }
        }
    );
    expect(syncTaskAndSubtaskChatMembers).toHaveBeenCalledWith("task-1");
    expect(result.message).toBe("Added assignees to task");
    expect(result.task.assignmentMode).toBe("member_added");
    expect(result.task.assignmentSummary.addedAssigneeIds).toEqual(["user-2"]);
    expect(result.task.assignmentSummary.addedTeamIds).toEqual(["team-1"]);
});

test("addTaskAssignees creates invite request for global task when auto-approve is disabled", async () => {
    Task.findById
        .mockResolvedValueOnce({
            _id: "task-1",
            title: "Task A",
            createdBy: "user-1",
            assignees: ["user-1"],
            assigneesTeams: [],
            workspace: null,
            project: null,
            chatId: "chat-1"
        })
        .mockReturnValueOnce(makePopulateResolved({ _id: "task-1", title: "Task A" }));
    User.find.mockReturnValue(makeSelectLeanQuery([{
        _id: "user-2",
        preferences: {
            workspace: { autoApproveWorkspaceInvites: false }
        }
    }]));
    TaskAssigneeRequest.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
    });
    TaskAssigneeRequest.create.mockResolvedValue([{
        _id: "req-1",
        requestedUser: "user-2"
    }]);
    getUserLabel.mockResolvedValue("Alice");

    const result = await taskService.addTaskAssignees("user-1", "task-1", {
        assignees: ["user-2"]
    });

    expect(Task.updateOne).not.toHaveBeenCalled();
    expect(TaskAssigneeRequest.create).toHaveBeenCalledTimes(1);
    expect(notificationService.createNotifications).toHaveBeenCalledTimes(1);
    expect(result.message).toBe("Task assignment request sent");
    expect(result.task.assignmentMode).toBe("invite_request");
    expect(result.task.assignmentSummary.requestIds).toEqual(["req-1"]);
});

test("respondTaskAssigneeRequest approves pending request and adds assignee", async () => {
    const requestDoc = {
        _id: "req-1",
        requestedBy: "owner-1",
        requestedStatus: "pending",
        status: "pending",
        expiresAt: new Date(Date.now() + 3600_000),
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({ _id: "req-1", status: "approved" })
    };
    TaskAssigneeRequest.findOne.mockResolvedValue(requestDoc);
    Task.findById
        .mockResolvedValueOnce({
            _id: "task-1",
            title: "Task A",
            workspace: null,
            project: null,
            chatId: "chat-1",
            status: "active"
        })
        .mockReturnValueOnce(makePopulateResolved({ _id: "task-1", title: "Task A" }));
    getUserLabel.mockResolvedValueOnce("Bob").mockResolvedValueOnce("Owner");

    const result = await taskService.respondTaskAssigneeRequest({
        userId: "user-2",
        taskId: "task-1",
        requestId: "req-1",
        action: "approve"
    });

    expect(requestDoc.status).toBe("approved");
    expect(requestDoc.save).toHaveBeenCalledTimes(1);
    expect(Task.updateOne).toHaveBeenCalledWith(
        { _id: "task-1" },
        { $addToSet: { assignees: "user-2" } }
    );
    expect(notificationService.setTaskAssigneeRequestNotificationState).toHaveBeenCalledWith({
        requestId: "req-1",
        requestState: "approved",
        recipientUserIds: ["user-2"],
        read: true
    });
    expect(result.task.assignmentMode).toBe("member_added");
});

test("removeTaskAssignees removes users and teams in transaction", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Task.findById
        .mockResolvedValueOnce({
            _id: "task-1",
            title: "Task A",
            createdBy: "user-1",
            assignees: ["user-1", "user-2"],
            assigneesTeams: ["team-1"],
            workspace: null,
            project: null,
            chatId: "chat-1"
        })
        .mockReturnValueOnce(makePopulateResolved({ _id: "task-1", title: "Task A" }));
    getUserLabel.mockResolvedValue("Alice");
    getUserLabels.mockResolvedValue(["Bob"]);
    formatUserList.mockReturnValue("Bob");

    const result = await taskService.removeTaskAssignees("user-1", "task-1", {
        assignees: ["user-2"],
        assigneesTeams: ["team-1"]
    });

    expect(Subtask.updateMany).toHaveBeenCalledWith(
        { task: "task-1" },
        { $pull: { assignedTo: { $in: ["user-2"] } } },
        { session }
    );
    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith(
        "chat-1",
        { $pull: { members: { $in: ["user-2"] } } },
        { session }
    );
    expect(Task.updateOne).toHaveBeenCalledWith(
        { _id: "task-1" },
        { $pull: { assignees: { $in: ["user-2"] }, assigneesTeams: { $in: ["team-1"] } } },
        { session }
    );
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(result.message).toBe("Removed assignees from task and its subtasks");
});

test("deleteTask soft deletes task for creator", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        title: "Task A",
        createdBy: "user-1",
        status: "active",
        workspace: null,
        project: null,
        chatId: "chat-1"
    });
    getUserLabel.mockResolvedValue("Alice");

    const result = await taskService.deleteTask("user-1", "task-1");

    expect(Task.updateOne).toHaveBeenCalledWith(
        { _id: "task-1" },
        { $set: { status: "deleted" } }
    );
    expect(logActivity).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ message: "Task deleted successfully" });
});

test("restoreTask restores deleted task for team lead", async () => {
    Task.findById
        .mockResolvedValueOnce({
            _id: "task-1",
            title: "Task A",
            status: "deleted",
            createdBy: "owner-1",
            assigneesTeams: ["team-1"],
            workspace: null,
            project: null,
            chatId: "chat-1"
        })
        .mockReturnValueOnce(makePopulateResolved({ _id: "task-1", title: "Task A", status: "active" }));
    Team.exists.mockResolvedValue(true);
    getUserLabel.mockResolvedValue("Lead");

    const result = await taskService.restoreTask("user-2", "task-1");

    expect(Task.updateOne).toHaveBeenCalledWith(
        { _id: "task-1" },
        { $set: { status: "active" } }
    );
    expect(result.message).toBe("Task restored successfully");
    expect(result.task.status).toBe("active");
});

test("leaveTask removes direct assignee from task and subtasks", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Task.findById.mockResolvedValue({
        _id: "task-1",
        title: "Task A",
        assignees: ["user-1", "user-2"],
        workspace: null,
        project: null,
        chatId: "chat-1"
    });
    getUserLabel.mockResolvedValue("Alice");

    const result = await taskService.leaveTask("task-1", "user-2");

    expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        "task-1",
        { $pull: { assignees: "user-2" } },
        { new: true, session }
    );
    expect(Subtask.updateMany).toHaveBeenCalledWith(
        { task: "task-1" },
        { $pull: { assignedTo: "user-2" } },
        { session }
    );
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
        message: "You have left the task and its subtasks successfully"
    });
});

test("createTask rejects project scope when project is missing", async () => {
    Project.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
    });

    await expect(
        taskService.createTask("user-1", { title: "Task A" }, { projectId: "project-404" })
    ).rejects.toThrow("Project not found");
});

test("createTask rejects project/workspace mismatch", async () => {
    Project.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "project-1",
            workspace: "workspace-1"
        })
    });

    await expect(
        taskService.createTask(
            "user-1",
            { title: "Task A" },
            { projectId: "project-1", workspaceId: "workspace-2" }
        )
    ).rejects.toThrow("Project does not belong to workspace");
});

test("createTask enforces create permission for project scope", async () => {
    Project.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "project-1",
            workspace: "workspace-1",
            members: [{ user: "user-1" }],
            owner: "owner-1",
            teams: [],
            name: "Project A"
        })
    });
    Workspace.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: "workspace-1" })
    });
    canCreateTask.mockResolvedValue(false);

    await expect(
        taskService.createTask(
            "user-1",
            { title: "Task A", assignees: ["user-1"] },
            { projectId: "project-1" }
        )
    ).rejects.toThrow(
        "Only workspace owners/admins, project admins, or assigned team leads can create tasks in this project"
    );
});

test("addTaskAssignees rejects requester without permission", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        createdBy: "owner-1",
        assigneesTeams: [],
        workspace: "workspace-1",
        project: null
    });
    canCreateTask.mockResolvedValue(false);

    await expect(
        taskService.addTaskAssignees("user-2", "task-1", {
            assignees: ["user-3"]
        })
    ).rejects.toThrow("Permission denied");
});

test("addTaskAssignees rejects unknown usernames when no other targets exist", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        createdBy: "user-1",
        assignees: [],
        assigneesTeams: [],
        workspace: "workspace-1",
        project: null
    });
    User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
    });

    await expect(
        taskService.addTaskAssignees("user-1", "task-1", {
            usernames: ["missing-user"]
        })
    ).rejects.toThrow("No valid users found with provided usernames");
});

test("addTaskAssignees global flow rejects when selected users are missing", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        title: "Task A",
        createdBy: "user-1",
        assignees: ["user-1"],
        assigneesTeams: [],
        workspace: null,
        project: null,
        chatId: "chat-1"
    });
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
        })
    });

    await expect(
        taskService.addTaskAssignees("user-1", "task-1", {
            assignees: ["user-404"]
        })
    ).rejects.toMatchObject({
        message: "Some selected users were not found",
        statusCode: 404
    });
});

test("addTaskAssignees rejects when pending request already exists", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        title: "Task A",
        createdBy: "user-1",
        assignees: ["user-1"],
        assigneesTeams: [],
        workspace: null,
        project: null,
        chatId: "chat-1"
    });
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{
                _id: "user-2",
                preferences: { workspace: { autoApproveWorkspaceInvites: false } }
            }])
        })
    });
    TaskAssigneeRequest.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ requestedUser: "user-2" }])
    });

    await expect(
        taskService.addTaskAssignees("user-1", "task-1", {
            assignees: ["user-2"]
        })
    ).rejects.toMatchObject({
        message: "A pending task assignment request already exists for one or more users",
        statusCode: 409
    });
});

test("addTaskAssignees supports mixed direct assignment and invite requests", async () => {
    Task.findById
        .mockResolvedValueOnce({
            _id: "task-1",
            title: "Task A",
            createdBy: "user-1",
            assignees: ["user-1"],
            assigneesTeams: [],
            workspace: null,
            project: null,
            chatId: "chat-1"
        })
        .mockReturnValueOnce(makePopulateResolved({ _id: "task-1", title: "Task A" }));
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                {
                    _id: "user-2",
                    preferences: { workspace: { autoApproveWorkspaceInvites: true } }
                },
                {
                    _id: "user-3",
                    preferences: { workspace: { autoApproveWorkspaceInvites: false } }
                }
            ])
        })
    });
    TaskAssigneeRequest.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
    });
    TaskAssigneeRequest.create.mockResolvedValue([{
        _id: "req-1",
        requestedUser: "user-3"
    }]);
    getUserLabel.mockResolvedValue("Alice");
    getUserLabels.mockResolvedValue(["Bob"]);
    formatUserList.mockReturnValue("Bob");

    const result = await taskService.addTaskAssignees("user-1", "task-1", {
        assignees: ["user-2", "user-3"]
    });

    expect(Task.updateOne).toHaveBeenCalledWith(
        { _id: "task-1" },
        {
            $addToSet: {
                assignees: { $each: ["user-2"] }
            }
        }
    );
    expect(result.message).toBe("Added assignees and sent task assignment requests");
    expect(result.task.assignmentMode).toBe("mixed");
    expect(result.task.assignmentSummary.addedAssigneeIds).toEqual(["user-2"]);
    expect(result.task.assignmentSummary.requestedAssigneeIds).toEqual(["user-3"]);
});

test("respondTaskAssigneeRequest expires stale request and returns 410", async () => {
    const requestDoc = {
        _id: "req-1",
        requestedBy: "owner-1",
        status: "pending",
        expiresAt: new Date(Date.now() - 1000),
        save: jest.fn().mockResolvedValue(undefined)
    };
    TaskAssigneeRequest.findOne.mockResolvedValue(requestDoc);

    await expect(
        taskService.respondTaskAssigneeRequest({
            userId: "user-2",
            taskId: "task-1",
            requestId: "req-1",
            action: "approve"
        })
    ).rejects.toMatchObject({
        message: "Task assignment request has expired",
        statusCode: 410
    });

    expect(requestDoc.status).toBe("expired");
    expect(notificationService.setTaskAssigneeRequestNotificationState).toHaveBeenCalledWith({
        requestId: "req-1",
        requestState: "expired",
        recipientUserIds: ["user-2"],
        read: true
    });
});

test("respondTaskAssigneeRequest marks request expired when task is deleted", async () => {
    const requestDoc = {
        _id: "req-1",
        requestedBy: "owner-1",
        status: "pending",
        expiresAt: new Date(Date.now() + 3600_000),
        save: jest.fn().mockResolvedValue(undefined)
    };
    TaskAssigneeRequest.findOne.mockResolvedValue(requestDoc);
    Task.findById.mockResolvedValue({
        _id: "task-1",
        status: "deleted"
    });

    await expect(
        taskService.respondTaskAssigneeRequest({
            userId: "user-2",
            taskId: "task-1",
            requestId: "req-1",
            action: "approve"
        })
    ).rejects.toMatchObject({
        message: "Task not found",
        statusCode: 404
    });
    expect(requestDoc.status).toBe("expired");
});

test("respondTaskAssigneeRequest handles rejection flow", async () => {
    const requestDoc = {
        _id: "req-1",
        requestedBy: "owner-1",
        requestedStatus: "pending",
        status: "pending",
        expiresAt: new Date(Date.now() + 3600_000),
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({ _id: "req-1", status: "rejected" })
    };
    TaskAssigneeRequest.findOne.mockResolvedValue(requestDoc);
    Task.findById
        .mockResolvedValueOnce({
            _id: "task-1",
            title: "Task A",
            workspace: null,
            project: null,
            chatId: "chat-1",
            status: "active"
        })
        .mockReturnValueOnce(makePopulateResolved({ _id: "task-1", title: "Task A" }));
    getUserLabel.mockResolvedValueOnce("Bob").mockResolvedValueOnce("Owner");

    const result = await taskService.respondTaskAssigneeRequest({
        userId: "user-2",
        taskId: "task-1",
        requestId: "req-1",
        action: "reject"
    });

    expect(Task.updateOne).not.toHaveBeenCalledWith(
        { _id: "task-1" },
        { $addToSet: { assignees: "user-2" } }
    );
    expect(result.task.assignmentMode).toBe("invite_request");
    expect(result.task.assignmentSummary.addedAssigneeIds).toEqual([]);
});

test("removeTaskAssignees rejects requester without permission", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        createdBy: "owner-1",
        assigneesTeams: [],
        workspace: "workspace-1",
        project: null
    });
    canCreateTask.mockResolvedValue(false);

    await expect(
        taskService.removeTaskAssignees("user-2", "task-1", {
            assignees: ["user-3"]
        })
    ).rejects.toThrow("Permission denied");
});

test("removeTaskAssignees prevents removing task owner", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        createdBy: "user-1",
        assigneesTeams: [],
        workspace: null,
        project: null
    });

    await expect(
        taskService.removeTaskAssignees("user-1", "task-1", {
            assignees: ["user-1"]
        })
    ).rejects.toThrow("Task owner cannot be removed");
});

test("permanentDeleteTask enforces creator authorization", async () => {
    Task.findById.mockResolvedValue({
        _id: "task-1",
        createdBy: "owner-1"
    });

    await expect(
        taskService.permanentDeleteTask("user-2", "task-1")
    ).rejects.toThrow("You are not allowed to permanently delete this task");
});

test("permanentDeleteTask cascades task-related records in transaction", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Task.findById.mockResolvedValue({
        _id: "task-1",
        title: "Task A",
        createdBy: "user-1",
        chatId: "chat-1",
        workspace: null,
        project: null
    });
    getUserLabel.mockResolvedValue("Alice");
    Task.deleteOne.mockResolvedValue({});

    const result = await taskService.permanentDeleteTask("user-1", "task-1");

    expect(Subtask.deleteMany).toHaveBeenCalledWith({ task: "task-1" }, { session });
    expect(Message.deleteMany).toHaveBeenCalledWith({ chatId: "chat-1" }, { session });
    expect(Chat.findByIdAndDelete).toHaveBeenCalledWith("chat-1", { session });
    expect(Task.deleteOne).toHaveBeenCalledWith({ _id: "task-1" }, { session });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
        message: "Task and its subtasks permanently deleted"
    });
});
