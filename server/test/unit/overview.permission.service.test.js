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

test("getWorkspacePermissions denies access for missing workspace or non-member", async () => {
    Workspace.findById.mockResolvedValueOnce(null);
    const missingWorkspace = await permissionService.getWorkspacePermissions("ws404", "user-1");
    expect(missingWorkspace).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
    });

    Workspace.findById.mockResolvedValueOnce({
        _id: "ws1",
        createdBy: "owner-1"
    });
    WorkspaceMember.findOne.mockResolvedValueOnce(null);

    const nonMember = await permissionService.getWorkspacePermissions("ws1", "user-1");
    expect(nonMember).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
    });
});

test("getWorkspacePermissions returns non-manager member capabilities", async () => {
    Workspace.findById.mockResolvedValue({
        _id: "ws1",
        createdBy: "owner-1"
    });
    WorkspaceMember.findOne.mockResolvedValue({ role: "member" });

    const permissions = await permissionService.getWorkspacePermissions("ws1", "user-1");

    expect(permissions).toEqual({
        role: "member",
        canView: true,
        canEdit: true,
        canManage: false,
        canCreateProject: false,
        canCreateTask: false
    });
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

test("getProjectPermissions handles not-found, owner, member-admin, workspace-manager, viewer and deny flows", async () => {
    Project.findById.mockReturnValueOnce(makePopulateQuery(null));
    const notFound = await permissionService.getProjectPermissions("proj404", "user-1");
    expect(notFound).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
    });

    Project.findById.mockReturnValueOnce(makePopulateQuery({
        _id: "proj-owner",
        owner: "user-1",
        workspace: "ws1",
        members: [],
        teams: []
    }));
    jest.spyOn(permissionService, "getWorkspacePermissions").mockResolvedValueOnce({
        role: "member",
        canView: true,
        canEdit: false,
        canManage: false,
        canCreateTask: false
    });
    const owner = await permissionService.getProjectPermissions("proj-owner", "user-1");
    expect(owner).toEqual({
        canView: true,
        canEdit: true,
        canManage: true,
        role: "owner",
        canCreateTask: true,
        isProjectAdmin: true
    });

    Project.findById.mockReturnValueOnce(makePopulateQuery({
        _id: "proj-member-admin",
        owner: "owner-1",
        workspace: "ws1",
        members: [{ user: "user-1", role: "admin" }],
        teams: []
    }));
    permissionService.getWorkspacePermissions.mockResolvedValueOnce({
        role: "member",
        canView: true,
        canEdit: false,
        canManage: false,
        canCreateTask: false
    });
    const memberAdmin = await permissionService.getProjectPermissions("proj-member-admin", "user-1");
    expect(memberAdmin).toEqual({
        role: "admin",
        canView: true,
        canEdit: true,
        canManage: true,
        canCreateTask: true,
        isProjectAdmin: true
    });

    Project.findById.mockReturnValueOnce(makePopulateQuery({
        _id: "proj-ws-admin",
        owner: "owner-1",
        workspace: "ws1",
        members: [],
        teams: []
    }));
    permissionService.getWorkspacePermissions.mockResolvedValueOnce({
        role: "admin",
        canView: true,
        canEdit: true,
        canManage: true,
        canCreateTask: true
    });
    Team.findOne.mockReturnValueOnce(makeLeanQuery(null));
    const inheritedWsAdmin = await permissionService.getProjectPermissions("proj-ws-admin", "user-1");
    expect(inheritedWsAdmin).toEqual({
        role: "admin",
        canView: true,
        canEdit: true,
        canManage: true,
        canCreateTask: true,
        isProjectAdmin: false,
        inheritedFromWorkspace: true
    });

    Project.findById.mockReturnValueOnce(makePopulateQuery({
        _id: "proj-viewer",
        owner: "owner-1",
        workspace: "ws1",
        members: [],
        teams: []
    }));
    permissionService.getWorkspacePermissions.mockResolvedValueOnce({
        role: "member",
        canView: true,
        canEdit: false,
        canManage: false,
        canCreateTask: false
    });
    Team.findOne.mockReturnValueOnce(makeLeanQuery(null));
    const viewer = await permissionService.getProjectPermissions("proj-viewer", "user-1");
    expect(viewer).toEqual({
        role: "viewer",
        canView: true,
        canEdit: false,
        canManage: false,
        canCreateTask: false,
        isProjectAdmin: false,
        inheritedFromWorkspace: true
    });

    Project.findById.mockReturnValueOnce(makePopulateQuery({
        _id: "proj-deny",
        owner: "owner-1",
        workspace: null,
        members: [],
        teams: []
    }));
    permissionService.getWorkspacePermissions.mockResolvedValueOnce({
        role: null,
        canView: false,
        canEdit: false,
        canManage: false,
        canCreateTask: false
    });
    Team.findOne.mockReturnValueOnce(makeLeanQuery(null));
    const denied = await permissionService.getProjectPermissions("proj-deny", "user-1");
    expect(denied).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
    });
});

test("getProjectPermissions returns deny fallback on unexpected errors", async () => {
    Project.findById.mockImplementation(() => {
        throw new Error("project query failed");
    });

    const permissions = await permissionService.getProjectPermissions("proj-err", "user-1");

    expect(permissions).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
});

test("getProjectPermissions returns project-member permissions when role is member", async () => {
    Project.findById.mockReturnValue(makePopulateQuery({
        _id: "proj-member",
        owner: "owner-1",
        workspace: "ws1",
        members: [{ user: "user-1", role: "member" }],
        teams: []
    }));
    jest.spyOn(permissionService, "getWorkspacePermissions").mockResolvedValue({
        role: "member",
        canView: true,
        canEdit: false,
        canManage: false,
        canCreateTask: false
    });

    const permissions = await permissionService.getProjectPermissions("proj-member", "user-1");

    expect(permissions).toEqual({
        role: "member",
        canView: true,
        canEdit: true,
        canManage: false,
        canCreateTask: false,
        isProjectAdmin: false
    });
});

test("getProjectPermissions falls back to empty team list when project.teams is undefined", async () => {
    Project.findById.mockReturnValue(makePopulateQuery({
        _id: "proj-team-default",
        owner: "owner-1",
        workspace: "ws1",
        members: [],
        teams: undefined
    }));
    jest.spyOn(permissionService, "getWorkspacePermissions").mockResolvedValue({
        role: null,
        canView: false,
        canEdit: false,
        canManage: false,
        canCreateTask: false
    });
    Team.findOne.mockReturnValue(makeLeanQuery(null));

    const permissions = await permissionService.getProjectPermissions("proj-team-default", "user-1");

    expect(Team.findOne).toHaveBeenCalledWith({
        _id: { $in: [] },
        "members.user": "user-1"
    });
    expect(permissions).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
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

test("getTaskPermissions handles not-found, creator, assignee, team, workspace and deny flows", async () => {
    Task.findById.mockReturnValueOnce(makeDoublePopulateQuery(null));
    const notFound = await permissionService.getTaskPermissions("task404", "user-1");
    expect(notFound).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
    });

    Task.findById.mockReturnValueOnce(makeDoublePopulateQuery({
        _id: "task-owner",
        createdBy: "user-1",
        assignees: [],
        assigneesTeams: [],
        project: null,
        workspace: null
    }));
    const creator = await permissionService.getTaskPermissions("task-owner", "user-1");
    expect(creator).toEqual({
        canView: true,
        canEdit: true,
        canManage: true,
        role: "creator",
        canCreateSubtask: true
    });

    Task.findById.mockReturnValueOnce(makeDoublePopulateQuery({
        _id: "task-assignee",
        createdBy: "owner-1",
        assignees: ["user-1"],
        assigneesTeams: [],
        project: null,
        workspace: null
    }));
    const assignee = await permissionService.getTaskPermissions("task-assignee", "user-1");
    expect(assignee).toEqual({
        role: "assignee",
        canView: true,
        canEdit: true,
        canManage: false,
        canCreateSubtask: true
    });

    Task.findById.mockReturnValueOnce(makeDoublePopulateQuery({
        _id: "task-team",
        createdBy: "owner-1",
        assignees: [],
        assigneesTeams: ["team-1"],
        project: null,
        workspace: null
    }));
    Team.findOne.mockReturnValueOnce(makeLeanQuery({
        members: [{ user: "user-1", role: "lead" }]
    }));
    const teamBased = await permissionService.getTaskPermissions("task-team", "user-1");
    expect(teamBased).toEqual({
        role: "lead",
        canView: true,
        canEdit: true,
        canManage: false,
        canCreateSubtask: true,
        inheritedFromTeam: true
    });

    Task.findById.mockReturnValueOnce(makeDoublePopulateQuery({
        _id: "task-ws-admin",
        createdBy: "owner-1",
        assignees: [],
        assigneesTeams: [],
        project: null,
        workspace: { _id: "ws1" }
    }));
    Team.findOne.mockReturnValueOnce(makeLeanQuery(null));
    jest.spyOn(permissionService, "getWorkspacePermissions").mockResolvedValueOnce({
        role: "admin",
        canView: true,
        canEdit: true,
        canManage: true
    });
    const wsInherited = await permissionService.getTaskPermissions("task-ws-admin", "user-1");
    expect(wsInherited).toEqual({
        role: "admin",
        canView: true,
        canEdit: true,
        canManage: true,
        canCreateSubtask: true,
        inheritedFromWorkspace: true
    });

    Task.findById.mockReturnValueOnce(makeDoublePopulateQuery({
        _id: "task-deny",
        createdBy: "owner-1",
        assignees: [],
        assigneesTeams: [],
        project: null,
        workspace: null
    }));
    Team.findOne.mockReturnValueOnce(makeLeanQuery(null));
    const denied = await permissionService.getTaskPermissions("task-deny", "user-1");
    expect(denied).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
    });
});

test("getTaskPermissions returns deny fallback on unexpected errors", async () => {
    Task.findById.mockImplementation(() => {
        throw new Error("task query failed");
    });

    const permissions = await permissionService.getTaskPermissions("task-err", "user-1");

    expect(permissions).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
});

test("getTaskPermissions falls through project/workspace checks when no admin access is present", async () => {
    Task.findById.mockReturnValue(makeDoublePopulateQuery({
        _id: "task-no-admin",
        createdBy: "owner-1",
        assignees: [],
        assigneesTeams: undefined,
        project: { _id: "proj-no-admin" },
        workspace: { _id: "ws-member" }
    }));
    Team.findOne.mockReturnValue(makeLeanQuery(null));
    jest.spyOn(permissionService, "getProjectPermissions").mockResolvedValue({
        role: null,
        isProjectAdmin: false,
        canView: true,
        canEdit: false,
        canManage: false,
        canCreateTask: false
    });
    jest.spyOn(permissionService, "getWorkspacePermissions").mockResolvedValue({
        role: "member",
        canView: true,
        canEdit: true,
        canManage: false
    });

    const permissions = await permissionService.getTaskPermissions("task-no-admin", "user-1");

    expect(permissions).toEqual({
        canView: false,
        canEdit: false,
        canManage: false,
        role: null
    });
});

test("getTaskPermissions defaults team role to member when team membership lacks user row", async () => {
    Task.findById.mockReturnValue(makeDoublePopulateQuery({
        _id: "task-team-default",
        createdBy: "owner-1",
        assignees: [],
        assigneesTeams: ["team-1"],
        project: null,
        workspace: null
    }));
    Team.findOne.mockReturnValue(makeLeanQuery({
        members: [{ user: "other-user", role: "lead" }]
    }));

    const permissions = await permissionService.getTaskPermissions("task-team-default", "user-1");

    expect(permissions).toEqual({
        role: "member",
        canView: true,
        canEdit: true,
        canManage: false,
        canCreateSubtask: true,
        inheritedFromTeam: true
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

test("getUserPermissionsForTimeline handles created workspace ownership and viewer fallback branches", async () => {
    WorkspaceMember.find.mockReturnValue(makeLeanQuery([
        {
            role: "admin",
            workspace: { _id: "ws-owned" }
        },
        {
            role: "member",
            workspace: { _id: "ws-viewer" }
        }
    ]));
    Workspace.find.mockReturnValue(makeLeanQuery([
        { _id: "ws-owned" },
        { _id: "ws-created-by-user" }
    ]));
    Team.find.mockReturnValue(makeLeanQuery([]));
    Project.find.mockReturnValue(makeLeanQuery([
        {
            _id: "proj-owned",
            owner: "user-1",
            workspace: { _id: "ws-owned" },
            members: [],
            teams: []
        },
        {
            _id: "proj-viewer",
            owner: "owner-2",
            workspace: { _id: "ws-viewer" },
            members: [],
            teams: []
        }
    ]));
    Task.find.mockReturnValue(makeLeanQuery([
        {
            _id: "task-none",
            createdBy: "owner-2",
            assignees: [],
            assigneesTeams: []
        }
    ]));

    const permissions = await permissionService.getUserPermissionsForTimeline("user-1");

    expect(permissions.workspaces["ws-created-by-user"]).toEqual({
        role: "owner",
        canCreateProject: true,
        canCreateTask: true
    });
    expect(permissions.projects["proj-owned"]).toEqual({
        role: "owner",
        canEdit: true,
        canCreateTask: true,
        isProjectAdmin: true
    });
    expect(permissions.projects["proj-viewer"]).toEqual({
        role: "viewer",
        canEdit: false,
        canCreateTask: false,
        isProjectAdmin: false,
        inheritedFromWorkspace: true
    });
    expect(permissions.tasks["task-none"]).toEqual({
        role: null,
        canCreateSubtask: false,
        canChangeStatus: false,
        canUpdateTask: false,
        canUpdatePriority: false,
        inheritedFromTeam: false
    });
});
