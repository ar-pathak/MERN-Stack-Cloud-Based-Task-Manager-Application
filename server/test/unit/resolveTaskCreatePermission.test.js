jest.mock("../../src/models/workspaceMember", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/team", () => ({
    findOne: jest.fn()
}));

const WorkspaceMember = require("../../src/models/workspaceMember");
const Project = require("../../src/models/project");
const Team = require("../../src/models/team");
const { canCreateTask } = require("../../src/middleware/resolveTaskCreatePermission");

const mockSelect = (value) => ({
    select: jest.fn().mockResolvedValue(value)
});

const mockSelectLean = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const mockLean = (value) => ({
    lean: jest.fn().mockResolvedValue(value)
});

const createProject = (overrides = {}) => ({
    workspace: "workspace-1",
    owner: "owner-1",
    members: [],
    teams: [],
    ...overrides
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("returns false when project is missing", async () => {
    Project.findById.mockReturnValue(mockSelectLean(null));

    const allowed = await canCreateTask({
        userId: "user-1",
        projectId: "project-1"
    });

    expect(allowed).toBe(false);
});

test("returns false when project and workspace do not match", async () => {
    Project.findById.mockReturnValue(mockSelectLean(createProject({
        workspace: "workspace-2"
    })));
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "owner" }));

    const allowed = await canCreateTask({
        userId: "user-1",
        workspaceId: "workspace-1",
        projectId: "project-1"
    });

    expect(allowed).toBe(false);
});

test("requireProjectAdminOrWorkspaceOwner allows workspace admin", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "admin" }));
    Project.findById.mockReturnValue(mockSelectLean(createProject()));

    const allowed = await canCreateTask({
        userId: "user-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        requireProjectAdminOrWorkspaceOwner: true
    });

    expect(allowed).toBe(true);
});

test("requireProjectAdminOrWorkspaceOwner allows project owner", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "member" }));
    Project.findById.mockReturnValue(mockSelectLean(createProject({
        owner: "user-1"
    })));

    const allowed = await canCreateTask({
        userId: "user-1",
        projectId: "project-1",
        requireProjectAdminOrWorkspaceOwner: true
    });

    expect(allowed).toBe(true);
});

test("requireProjectAdminOrWorkspaceOwner allows project admin member", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "member" }));
    Project.findById.mockReturnValue(mockSelectLean(createProject({
        members: [{ user: "user-1", role: "admin" }]
    })));

    const allowed = await canCreateTask({
        userId: "user-1",
        projectId: "project-1",
        requireProjectAdminOrWorkspaceOwner: true
    });

    expect(allowed).toBe(true);
});

test("requireProjectAdminOrWorkspaceOwner uses scoped project teams for lead check", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "member" }));
    Project.findById.mockReturnValue(mockSelectLean(createProject({
        teams: ["team-1", "team-2"]
    })));
    Team.findOne.mockReturnValue(mockSelectLean({ _id: "team-2" }));

    const allowed = await canCreateTask({
        userId: "user-1",
        projectId: "project-1",
        teamIds: ["team-9", "team-2", "team-2"],
        teamId: "team-1",
        requireProjectAdminOrWorkspaceOwner: true
    });

    expect(Team.findOne).toHaveBeenCalledWith({
        _id: { $in: ["team-2", "team-1"] },
        members: {
            $elemMatch: {
                user: "user-1",
                role: "lead"
            }
        }
    });
    expect(allowed).toBe(true);
});

test("requireProjectAdminOrWorkspaceOwner returns false when no scoped teams exist", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "member" }));
    Project.findById.mockReturnValue(mockSelectLean(createProject({
        teams: ["team-1"]
    })));

    const allowed = await canCreateTask({
        userId: "user-1",
        projectId: "project-1",
        teamIds: ["team-9"],
        requireProjectAdminOrWorkspaceOwner: true
    });

    expect(Team.findOne).not.toHaveBeenCalled();
    expect(allowed).toBe(false);
});

test("enforceWorkspaceAdminOnly blocks non-admin workspace members", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "member" }));
    Project.findById.mockReturnValue(mockSelectLean(createProject()));

    const allowed = await canCreateTask({
        userId: "user-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        enforceWorkspaceAdminOnly: true
    });

    expect(allowed).toBe(false);
});

test("project flow with scoped team allows admin member when user is not lead", async () => {
    Project.findById.mockReturnValue(mockSelectLean(createProject({
        members: [{ user: "user-1", role: "admin" }],
        teams: ["team-1"]
    })));
    Team.findOne.mockReturnValue(mockSelectLean(null));

    const allowed = await canCreateTask({
        userId: "user-1",
        projectId: "project-1",
        teamIds: ["team-1"]
    });

    expect(allowed).toBe(true);
});

test("project flow with scoped team rejects non-admin member when not lead", async () => {
    Project.findById.mockReturnValue(mockSelectLean(createProject({
        members: [{ user: "user-1", role: "member" }],
        teams: ["team-1"]
    })));
    Team.findOne.mockReturnValue(mockSelectLean(null));

    const allowed = await canCreateTask({
        userId: "user-1",
        projectId: "project-1",
        teamIds: ["team-1"]
    });

    expect(allowed).toBe(false);
});

test("workspace-level access allows member role when admin-only is disabled", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "member" }));

    const allowed = await canCreateTask({
        userId: "user-1",
        workspaceId: "workspace-1"
    });

    expect(allowed).toBe(true);
});

test("workspace-level access enforces owner/admin when requested", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect({ role: "member" }));

    const allowed = await canCreateTask({
        userId: "user-1",
        workspaceId: "workspace-1",
        enforceWorkspaceAdminOnly: true
    });

    expect(allowed).toBe(false);
});

test("team-level fallback allows only lead role", async () => {
    Team.findOne.mockReturnValue(mockLean({
        members: [{ user: "user-1", role: "lead" }]
    }));

    const allowed = await canCreateTask({
        userId: "user-1",
        teamIds: ["team-1"]
    });

    expect(allowed).toBe(true);
});

test("team-level fallback rejects non-lead member", async () => {
    Team.findOne.mockReturnValue(mockLean({
        members: [{ user: "user-1", role: "member" }]
    }));

    const allowed = await canCreateTask({
        userId: "user-1",
        teamId: "team-1"
    });

    expect(allowed).toBe(false);
});

test("returns false when no workspace, project, or team context is provided", async () => {
    const allowed = await canCreateTask({
        userId: "user-1"
    });

    expect(allowed).toBe(false);
});
