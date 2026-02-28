jest.mock("../../src/models/subtasks", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/team", () => ({
    findOne: jest.fn()
}));

const canModifySubtask = require("../../src/middleware/canModifySubtask");
const canViewSubtask = require("../../src/middleware/canViewSubtask");
const Subtask = require("../../src/models/subtasks");
const Task = require("../../src/models/tasks");
const WorkspaceMember = require("../../src/models/workspaceMember");
const Project = require("../../src/models/project");
const Team = require("../../src/models/team");

const mockSelect = (value) => ({
    select: jest.fn().mockResolvedValue(value)
});

const mockSelectLean = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const createRes = () => {
    const res = {};
    res.status = jest.fn().mockImplementation((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn().mockImplementation((payload) => {
        res.payload = payload;
        return res;
    });
    return res;
};

const createReq = (overrides = {}) => ({
    user: { id: "user-1" },
    params: {},
    ...overrides
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("canModifySubtask returns 404 when subtask does not exist", async () => {
    Subtask.findById.mockReturnValue(mockSelect(null));

    const req = createReq({ params: { subtaskId: "subtask-1" } });
    const res = createRes();
    const next = jest.fn();

    await canModifySubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Subtask not found" });
});

test("canModifySubtask returns 404 when task does not exist", async () => {
    Task.findById.mockReturnValue(mockSelect(null));

    const req = createReq({ params: { taskId: "task-1" } });
    const res = createRes();
    const next = jest.fn();

    await canModifySubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Task not found" });
});

test("canModifySubtask allows assigned subtask member", async () => {
    Subtask.findById.mockReturnValue(mockSelect({
        createdBy: "other-user",
        assignedTo: ["user-1"],
        task: "task-1"
    }));
    Task.findById.mockReturnValue(mockSelect({
        createdBy: "other-user",
        assignees: [],
        assigneesTeams: [],
        workspace: null,
        project: null
    }));

    const req = createReq({ params: { subtaskId: "subtask-1" } });
    const res = createRes();
    const next = jest.fn();

    await canModifySubtask(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
});

test("canModifySubtask allows task team member", async () => {
    Task.findById.mockReturnValue(mockSelect({
        createdBy: "owner-2",
        assignees: [],
        assigneesTeams: ["team-1"],
        workspace: null,
        project: null
    }));
    Team.findOne.mockReturnValue(mockSelectLean({ _id: "team-1" }));

    const req = createReq({ params: { taskId: "task-1" } });
    const res = createRes();
    const next = jest.fn();

    await canModifySubtask(req, res, next);

    expect(Team.findOne).toHaveBeenCalledWith({
        _id: { $in: ["team-1"] },
        "members.user": "user-1"
    });
    expect(next).toHaveBeenCalledTimes(1);
});

test("canModifySubtask returns 403 for unauthorized user", async () => {
    Task.findById.mockReturnValue(mockSelect({
        createdBy: "owner-2",
        assignees: ["assignee-2"],
        assigneesTeams: ["team-1"],
        workspace: "workspace-1",
        project: "project-1"
    }));
    Team.findOne.mockReturnValue(mockSelectLean(null));
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "member" }));
    Project.findById.mockReturnValue(mockSelect({
        owner: "owner-2",
        members: [
            { user: "user-1", role: "member" }
        ]
    }));

    const req = createReq({ params: { taskId: "task-1" } });
    const res = createRes();
    const next = jest.fn();

    await canModifySubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
        message: "You do not have permission to modify this subtask"
    });
});

test("canModifySubtask returns 500 on failure", async () => {
    Subtask.findById.mockImplementation(() => {
        throw new Error("query error");
    });

    const req = createReq({ params: { subtaskId: "subtask-1" } });
    const res = createRes();
    const next = jest.fn();

    await canModifySubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Permission check failed" });
});

test("canViewSubtask allows workspace member", async () => {
    Task.findById.mockReturnValue(mockSelect({
        createdBy: "owner-2",
        assignees: [],
        assigneesTeams: [],
        workspace: "workspace-1",
        project: null
    }));
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ _id: "wm-1" }));

    const req = createReq({ params: { taskId: "task-1" } });
    const res = createRes();
    const next = jest.fn();

    await canViewSubtask(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
});

test("canViewSubtask allows project owner", async () => {
    Task.findById.mockReturnValue(mockSelect({
        createdBy: "owner-2",
        assignees: [],
        assigneesTeams: [],
        workspace: null,
        project: "project-1"
    }));
    Project.findById.mockReturnValue(mockSelect({
        owner: "user-1",
        members: []
    }));

    const req = createReq({ params: { taskId: "task-1" } });
    const res = createRes();
    const next = jest.fn();

    await canViewSubtask(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
});

test("canViewSubtask returns 404 when task is missing for subtask path", async () => {
    Subtask.findById.mockReturnValue(mockSelect({
        createdBy: "creator-2",
        assignedTo: [],
        task: "task-1"
    }));
    Task.findById.mockReturnValue(mockSelect(null));

    const req = createReq({ params: { subtaskId: "subtask-1" } });
    const res = createRes();
    const next = jest.fn();

    await canViewSubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Task not found" });
});

test("canViewSubtask returns 403 for unauthorized user", async () => {
    Task.findById.mockReturnValue(mockSelect({
        createdBy: "owner-2",
        assignees: [],
        assigneesTeams: ["team-1"],
        workspace: "workspace-1",
        project: "project-1"
    }));
    Team.findOne.mockReturnValue(mockSelectLean(null));
    WorkspaceMember.findOne.mockReturnValue(mockSelect(null));
    Project.findById.mockReturnValue(mockSelect({
        owner: "owner-2",
        members: []
    }));

    const req = createReq({ params: { taskId: "task-1" } });
    const res = createRes();
    const next = jest.fn();

    await canViewSubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
        message: "You do not have permission to view this subtask data"
    });
});
