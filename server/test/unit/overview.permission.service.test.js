jest.mock("../../src/models/project", () => ({
    findById: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    findById: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/models/team", () => ({
    findOne: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/models/workspace", () => ({
    findById: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    findOne: jest.fn(),
    find: jest.fn()
}));

const Project = require("../../src/models/project");
const Task = require("../../src/models/tasks");
const Team = require("../../src/models/team");
const Workspace = require("../../src/models/workspace");
const WorkspaceMember = require("../../src/models/workspaceMember");
const permissionService = require("../../src/modules/overview/permission.service");
let consoleErrorSpy;

const makeLeanQuery = (value) => {
    const query = {
        select: jest.fn(() => query),
        populate: jest.fn(() => query),
        lean: jest.fn().mockResolvedValue(value)
    };
    return query;
};

const makePopulateQuery = (value) => ({
    populate: jest.fn().mockResolvedValue(value)
});

const makeDoublePopulateQuery = (value) => ({
    populate: jest.fn(() => ({
        populate: jest.fn().mockResolvedValue(value)
    }))
});

beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

test("canCreateWorkspace always returns true", () => {
    expect(permissionService.canCreateWorkspace("user-1")).toBe(true);
});

test("getWorkspacePermissions returns owner permissions for workspace creator", async () => {
    Workspace.findById.mockResolvedValue({
        _id: "ws1",
        createdBy: "user-1"
    });

    const permissions = await permissionService.getWorkspacePermissions("ws1", "user-1");

    expect(permissions).toEqual({
        canView: true,
        canEdit: true,
        canManage: true,
        role: "owner",
        canCreateProject: true,
        canCreateTask: true
    });
    expect(WorkspaceMember.findOne).not.toHaveBeenCalled();
});

test("getWorkspacePermissions returns member role permissions", async () => {
    Workspace.findById.mockResolvedValue({
        _id: "ws1",
        createdBy: "owner-1"
    });
    WorkspaceMember.findOne.mockResolvedValue({ role: "admin" });

    const permissions = await permissionService.getWorkspacePermissions("ws1", "user-1");

    expect(WorkspaceMember.findOne).toHaveBeenCalledWith({
        workspace: "ws1",
        user: "user-1"
    });
    expect(permissions).toEqual({
        role: "admin",
        canView: true,
        canEdit: true,
        canManage: true,
        canCreateProject: true,
        canCreateTask: true
    });
});

test("getWorkspacePermissions returns deny-all fallback on database errors", async () => {
    Workspace.findById.mockRejectedValue(new Error("db unavailable"));

    const permissions = await permissionService.getWorkspacePermissions("ws1", "user-1");

    expect(permissions).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
});

test("getProjectPermissions resolves team-inherited lead permissions", async () => {
    Project.findById.mockReturnValue(makePopulateQuery({
        _id: "proj1",
        owner: "owner-1",
        workspace: "ws1",
        members: [],
        teams: ["team1"]
    }));

    jest.spyOn(permissionService, "getWorkspacePermissions").mockResolvedValue({
        role: "member",
        canView: true,
        canEdit: false,
        canManage: false,
        canCreateTask: false
    });

    Team.findOne.mockReturnValue(makeLeanQuery({
        members: [{ user: "user-1", role: "lead" }]
    }));

    const permissions = await permissionService.getProjectPermissions("proj1", "user-1");

    expect(permissions).toEqual({
        role: "lead",
        canView: true,
        canEdit: false,
        canManage: false,
        canCreateTask: true,
        isProjectAdmin: false,
        inheritedFromTeam: true
    });
});

test("getTaskPermissions inherits project-admin access when user is not direct assignee", async () => {
    Task.findById.mockReturnValue(makeDoublePopulateQuery({
        _id: "task1",
        createdBy: "creator-1",
        assignees: [],
        assigneesTeams: [],
        project: { _id: "proj1" },
        workspace: null
    }));

    jest.spyOn(permissionService, "getProjectPermissions").mockResolvedValue({
        role: "admin",
        canView: true,
        canEdit: true,
        canManage: true,
        canCreateTask: true,
        isProjectAdmin: true
    });
    Team.findOne.mockReturnValue(makeLeanQuery(null));

    const permissions = await permissionService.getTaskPermissions("task1", "user-1");

    expect(permissions).toEqual({
        role: "admin",
        canView: true,
        canEdit: true,
        canManage: true,
        canCreateTask: true,
        isProjectAdmin: true,
        canCreateSubtask: true,
        inheritedFromProject: true
    });
});

test("getUserPermissionsForTimeline builds workspace, project and task permission maps", async () => {
    WorkspaceMember.find.mockReturnValue(makeLeanQuery([
        {
            role: "member",
            workspace: { _id: "ws1" }
        }
    ]));

    Workspace.find.mockReturnValue(makeLeanQuery([]));

    Team.find.mockReturnValue(makeLeanQuery([
        {
            _id: "team1",
            members: [{ user: "user-1", role: "lead" }]
        }
    ]));

    Project.find.mockReturnValue(makeLeanQuery([
        {
            _id: "proj1",
            owner: "owner-1",
            workspace: { _id: "ws1" },
            members: [{ user: "user-1", role: "member" }],
            teams: []
        },
        {
            _id: "proj2",
            owner: "owner-2",
            workspace: { _id: "ws1" },
            members: [],
            teams: ["team1"]
        }
    ]));

    Task.find.mockReturnValue(makeLeanQuery([
        {
            _id: "taskCreator",
            createdBy: "user-1",
            assignees: [],
            assigneesTeams: []
        },
        {
            _id: "taskAssignee",
            createdBy: "user-2",
            assignees: ["user-1"],
            assigneesTeams: []
        },
        {
            _id: "taskTeam",
            createdBy: "user-3",
            assignees: [],
            assigneesTeams: ["team1"]
        }
    ]));

    const permissions = await permissionService.getUserPermissionsForTimeline("user-1");

    expect(permissions.workspaces.ws1).toEqual({
        role: "member",
        canCreateProject: false,
        canCreateTask: false
    });

    expect(permissions.projects.proj1).toEqual({
        role: "member",
        canEdit: true,
        canCreateTask: false,
        isProjectAdmin: false
    });

    expect(permissions.projects.proj2).toEqual({
        role: "lead",
        canEdit: false,
        canCreateTask: true,
        isProjectAdmin: false,
        inheritedFromTeam: true
    });

    expect(permissions.tasks.taskCreator).toEqual({
        role: "creator",
        canCreateSubtask: true,
        canChangeStatus: true,
        canUpdateTask: true,
        canUpdatePriority: true,
        inheritedFromTeam: false
    });

    expect(permissions.tasks.taskAssignee).toEqual({
        role: "assignee",
        canCreateSubtask: true,
        canChangeStatus: true,
        canUpdateTask: false,
        canUpdatePriority: false,
        inheritedFromTeam: false
    });

    expect(permissions.tasks.taskTeam).toEqual({
        role: "lead",
        canCreateSubtask: true,
        canChangeStatus: true,
        canUpdateTask: false,
        canUpdatePriority: false,
        inheritedFromTeam: true
    });
});

test("getUserPermissionsForTimeline returns empty maps on unexpected errors", async () => {
    WorkspaceMember.find.mockImplementation(() => {
        throw new Error("query failure");
    });

    const permissions = await permissionService.getUserPermissionsForTimeline("user-1");

    expect(permissions).toEqual({
        workspaces: {},
        projects: {},
        tasks: {}
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
});
