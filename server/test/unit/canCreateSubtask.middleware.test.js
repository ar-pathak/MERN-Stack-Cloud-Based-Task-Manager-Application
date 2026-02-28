jest.mock("../../src/models/workspaceMember", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/team", () => ({
    findOne: jest.fn()
}));

const canCreateSubtask = require("../../src/middleware/canCreateSubtask");
const WorkspaceMember = require("../../src/models/workspaceMember");
const Project = require("../../src/models/project");
const Task = require("../../src/models/tasks");
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
    body: { taskId: "task-1" },
    ...overrides
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("returns 404 when task does not exist", async () => {
    Task.findById.mockReturnValue(mockSelect(null));

    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await canCreateSubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Task not found" });
});

test("allows direct task member to create subtask", async () => {
    Task.findById.mockReturnValue(mockSelect({
        createdBy: "user-1",
        assignees: [],
        assigneesTeams: [],
        workspace: null,
        project: null
    }));

    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await canCreateSubtask(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(Team.findOne).not.toHaveBeenCalled();
    expect(WorkspaceMember.findOne).not.toHaveBeenCalled();
    expect(Project.findById).not.toHaveBeenCalled();
});

test("allows task team member", async () => {
    Task.findById.mockReturnValue(mockSelect({
        createdBy: "other-user",
        assignees: [],
        assigneesTeams: ["team-1"],
        workspace: null,
        project: null
    }));
    Team.findOne.mockReturnValue(mockSelectLean({ _id: "team-1" }));

    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await canCreateSubtask(req, res, next);

    expect(Team.findOne).toHaveBeenCalledWith({
        _id: { $in: ["team-1"] },
        "members.user": "user-1"
    });
    expect(next).toHaveBeenCalledTimes(1);
});

test("allows workspace admin even when not task member", async () => {
    Task.findById.mockReturnValue(mockSelect({
        createdBy: "other-user",
        assignees: ["another-user"],
        assigneesTeams: [],
        workspace: "workspace-1",
        project: null
    }));
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "admin" }));

    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await canCreateSubtask(req, res, next);

    expect(WorkspaceMember.findOne).toHaveBeenCalledWith({
        workspace: "workspace-1",
        user: "user-1"
    });
    expect(next).toHaveBeenCalledTimes(1);
});

test("allows project admin member", async () => {
    Task.findById.mockReturnValue(mockSelect({
        createdBy: "other-user",
        assignees: [],
        assigneesTeams: [],
        workspace: null,
        project: "project-1"
    }));
    Project.findById.mockReturnValue(mockSelect({
        owner: "owner-1",
        members: [
            { user: "user-1", role: "admin" }
        ]
    }));

    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await canCreateSubtask(req, res, next);

    expect(Project.findById).toHaveBeenCalledWith("project-1");
    expect(next).toHaveBeenCalledTimes(1);
});

test("returns 403 for unauthorized user", async () => {
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

    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await canCreateSubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
        message: "Only task members, task team members, workspace owners/admins, or project admins can create subtasks"
    });
});

test("returns 500 when permission check throws", async () => {
    Task.findById.mockImplementation(() => {
        throw new Error("db failure");
    });

    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await canCreateSubtask(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Permission check failed" });
});
