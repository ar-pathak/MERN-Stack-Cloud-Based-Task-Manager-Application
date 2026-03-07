jest.mock("../../src/models/chat", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/message", () => ({
    findById: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/follow", () => ({
    checkRelationship: jest.fn()
}));

jest.mock("../../src/models/post", () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock("../../src/models/workspace", () => ({
    findOne: jest.fn(),
    findById: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findOne: jest.fn(),
    findById: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    findOne: jest.fn(),
    findById: jest.fn()
}));

jest.mock("../../src/models/subtasks", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/models/team", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/modules/posts/post.service", () => ({
    assertCanAccessPost: jest.fn()
}));

jest.mock("../../src/modules/utils/mentionService", () => ({
    resolveMentionUsersFromText: jest.fn(),
    notifyMentionedUsers: jest.fn(),
    getMentionSnippet: jest.fn((value) => String(value || "").slice(0, 40))
}));

const Project = require("../../src/models/project");
const Task = require("../../src/models/tasks");
const chatService = require("../../src/modules/chat/chat.service");

const USER_ID = "507f1f77bcf86cd799439011";
const OTHER_ID = "507f1f77bcf86cd799439012";

const makeSelectLeanQuery = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
});

test("resolveProjectAccess handles missing, owner and member access", async () => {
    await expect(chatService.resolveProjectAccess(null, USER_ID)).resolves.toEqual({
        isMember: false,
        role: null,
        source: "project",
        canView: false,
        canSend: false
    });

    await expect(chatService.resolveProjectAccess({ owner: USER_ID }, USER_ID)).resolves.toEqual({
        isMember: true,
        role: "owner",
        source: "project",
        canView: true,
        canSend: true
    });

    await expect(chatService.resolveProjectAccess({
        owner: OTHER_ID,
        members: [{ user: USER_ID, role: "admin" }]
    }, USER_ID)).resolves.toEqual({
        isMember: true,
        role: "admin",
        source: "project",
        canView: true,
        canSend: true
    });
});

test("resolveProjectAccess falls back to workspace/team access", async () => {
    jest.spyOn(chatService, "resolveWorkspaceAccess").mockResolvedValue({
        isMember: true,
        role: "admin",
        source: "workspace",
        canView: true,
        canSend: true
    });
    jest.spyOn(chatService, "resolveTeamAccess").mockResolvedValue({
        isMember: true,
        role: "lead",
        source: "team",
        canView: true,
        canSend: true
    });

    const viaWorkspace = await chatService.resolveProjectAccess({
        owner: OTHER_ID,
        members: [],
        workspace: "workspace-1",
        teams: []
    }, USER_ID);

    expect(viaWorkspace).toEqual({
        isMember: true,
        role: "admin",
        source: "workspace",
        canView: true,
        canSend: true
    });

    chatService.resolveWorkspaceAccess.mockResolvedValue({
        isMember: false,
        role: null,
        source: "workspace",
        canView: false,
        canSend: false
    });

    const viaTeam = await chatService.resolveProjectAccess({
        owner: OTHER_ID,
        members: [],
        workspace: "workspace-1",
        teams: ["team-1"]
    }, USER_ID);

    expect(viaTeam).toEqual({
        isMember: true,
        role: "lead",
        source: "team",
        canView: true,
        canSend: true
    });
});

test("resolveTaskAccess resolves creator/assignee and project admin fallback", async () => {
    await expect(chatService.resolveTaskAccess({
        createdBy: USER_ID,
        assignees: []
    }, USER_ID)).resolves.toEqual({
        isMember: true,
        role: "creator",
        source: "task",
        canView: true,
        canSend: true
    });

    await expect(chatService.resolveTaskAccess({
        createdBy: OTHER_ID,
        assignees: [USER_ID]
    }, USER_ID)).resolves.toEqual({
        isMember: true,
        role: "assignee",
        source: "task",
        canView: true,
        canSend: true
    });

    Project.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "project-1",
        owner: OTHER_ID,
        members: [{ user: USER_ID, role: "admin" }],
        workspace: "workspace-1"
    }));

    const result = await chatService.resolveTaskAccess({
        createdBy: OTHER_ID,
        assignees: [],
        assigneesTeams: [],
        project: "project-1"
    }, USER_ID);

    expect(result).toEqual({
        isMember: true,
        role: "admin",
        source: "project",
        canView: true,
        canSend: true
    });
});

test("resolveTaskAccess uses workspace fallback and handles missing task", async () => {
    jest.spyOn(chatService, "resolveWorkspaceAccess").mockResolvedValue({
        isMember: true,
        role: "owner",
        source: "workspace",
        canView: true,
        canSend: true
    });

    const fromWorkspace = await chatService.resolveTaskAccess({
        createdBy: OTHER_ID,
        assignees: [],
        assigneesTeams: [],
        workspace: "workspace-1"
    }, USER_ID);

    expect(fromWorkspace).toEqual({
        isMember: true,
        role: "owner",
        source: "workspace",
        canView: true,
        canSend: true
    });

    await expect(chatService.resolveTaskAccess(null, USER_ID)).resolves.toEqual({
        isMember: false,
        role: null,
        source: "task",
        canView: false,
        canSend: false
    });
});

test("resolveSubtaskAccess resolves direct assignee and team fallback", async () => {
    await expect(chatService.resolveSubtaskAccess({
        createdBy: OTHER_ID,
        assignedTo: [USER_ID]
    }, USER_ID)).resolves.toEqual({
        isMember: true,
        role: "assignee",
        source: "subtask",
        canView: true,
        canSend: true
    });

    Task.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "task-1",
        assigneesTeams: ["team-1"]
    }));
    jest.spyOn(chatService, "resolveTeamAccess").mockResolvedValue({
        isMember: true,
        role: "member",
        source: "team",
        canView: true,
        canSend: true
    });

    const viaTeam = await chatService.resolveSubtaskAccess({
        createdBy: OTHER_ID,
        assignedTo: [],
        task: "task-1"
    }, USER_ID);

    expect(viaTeam).toEqual({
        isMember: true,
        role: "member",
        source: "team",
        canView: true,
        canSend: true
    });
});

test("resolveSubtaskAccess returns no access for missing task chain", async () => {
    Task.findById.mockReturnValue(makeSelectLeanQuery(null));

    await expect(chatService.resolveSubtaskAccess({
        createdBy: OTHER_ID,
        assignedTo: [],
        task: "task-404"
    }, USER_ID)).resolves.toEqual({
        isMember: false,
        role: null,
        source: "subtask",
        canView: false,
        canSend: false
    });

    await expect(chatService.resolveSubtaskAccess({
        createdBy: OTHER_ID,
        assignedTo: []
    }, USER_ID)).resolves.toEqual({
        isMember: false,
        role: null,
        source: "subtask",
        canView: false,
        canSend: false
    });
});

test("resolveWorkspaceAccess handles missing workspace and missing membership", async () => {
    const Workspace = require("../../src/models/workspace");
    const WorkspaceMember = require("../../src/models/workspaceMember");

    Workspace.findById.mockReturnValue(makeSelectLeanQuery(null));
    await expect(chatService.resolveWorkspaceAccess("workspace-404", USER_ID)).resolves.toEqual({
        isMember: false,
        role: null,
        source: "workspace",
        canView: false,
        canSend: false
    });

    WorkspaceMember.findOne.mockReturnValue(makeSelectLeanQuery(null));
    await expect(chatService.resolveWorkspaceAccess(
        "workspace-1",
        USER_ID,
        { _id: "workspace-1", createdBy: OTHER_ID }
    )).resolves.toEqual({
        isMember: false,
        role: null,
        source: "workspace",
        canView: false,
        canSend: false
    });
});

test("resolveWorkspaceAccess defaults missing membership role to member", async () => {
    const WorkspaceMember = require("../../src/models/workspaceMember");

    WorkspaceMember.findOne.mockReturnValue(makeSelectLeanQuery({ role: undefined }));
    await expect(chatService.resolveWorkspaceAccess(
        "workspace-1",
        USER_ID,
        { _id: "workspace-1", createdBy: OTHER_ID }
    )).resolves.toEqual({
        isMember: true,
        role: "member",
        source: "workspace",
        canView: true,
        canSend: true
    });
});

test("resolveTeamAccess handles no matching team and default member role", async () => {
    const Team = require("../../src/models/team");

    Team.findOne.mockReturnValueOnce(makeSelectLeanQuery(null));
    await expect(chatService.resolveTeamAccess(["team-1"], USER_ID)).resolves.toEqual({
        isMember: false,
        role: null,
        source: "team",
        canView: false,
        canSend: false
    });

    Team.findOne.mockReturnValueOnce(makeSelectLeanQuery({
        members: [{ user: USER_ID, role: undefined }]
    }));
    await expect(chatService.resolveTeamAccess(["team-1", "team-1", ""], USER_ID)).resolves.toEqual({
        isMember: true,
        role: "member",
        source: "team",
        canView: true,
        canSend: true
    });
});

test("resolveProjectAccess returns no access when workspace/team fallback cannot send", async () => {
    jest.spyOn(chatService, "resolveWorkspaceAccess").mockResolvedValue({
        isMember: true,
        role: "member",
        source: "workspace",
        canView: true,
        canSend: true
    });
    jest.spyOn(chatService, "resolveTeamAccess").mockResolvedValue({
        isMember: false,
        role: null,
        source: "team",
        canView: false,
        canSend: false
    });

    await expect(chatService.resolveProjectAccess({
        owner: OTHER_ID,
        members: [],
        workspace: "workspace-1",
        teams: []
    }, USER_ID)).resolves.toEqual({
        isMember: false,
        role: null,
        source: "project",
        canView: false,
        canSend: false
    });
});

test("resolveTaskAccess returns no access when fallbacks are non-admin roles", async () => {
    Project.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "project-1",
        owner: OTHER_ID,
        members: [{ user: USER_ID, role: "member" }],
        workspace: "workspace-1"
    }));
    jest.spyOn(chatService, "resolveWorkspaceAccess").mockResolvedValue({
        isMember: true,
        role: "viewer",
        source: "workspace",
        canView: true,
        canSend: false
    });
    jest.spyOn(chatService, "resolveTeamAccess").mockResolvedValue({
        isMember: false,
        role: null,
        source: "team",
        canView: false,
        canSend: false
    });

    await expect(chatService.resolveTaskAccess({
        createdBy: OTHER_ID,
        assignees: [],
        assigneesTeams: [],
        project: "project-1",
        workspace: "workspace-1"
    }, USER_ID)).resolves.toEqual({
        isMember: false,
        role: null,
        source: "task",
        canView: false,
        canSend: false
    });
});

test("resolveSectionAccessByChat routes workspace and subtask scopes", async () => {
    jest.spyOn(chatService, "findSectionScopeByChatId")
        .mockResolvedValueOnce({ type: "workspace", entity: { _id: "workspace-1" } })
        .mockResolvedValueOnce({ type: "subtask", entity: { _id: "subtask-1" } });

    jest.spyOn(chatService, "resolveWorkspaceAccess").mockResolvedValue({
        isMember: true,
        role: "owner",
        source: "workspace",
        canView: true,
        canSend: true
    });
    jest.spyOn(chatService, "resolveSubtaskAccess").mockResolvedValue({
        isMember: true,
        role: "assignee",
        source: "subtask",
        canView: true,
        canSend: true
    });

    const workspaceAccess = await chatService.resolveSectionAccessByChat("chat-workspace", USER_ID);
    const subtaskAccess = await chatService.resolveSectionAccessByChat("chat-subtask", USER_ID);

    expect(workspaceAccess).toEqual(expect.objectContaining({
        isSectionChat: true,
        scopeType: "workspace",
        role: "owner"
    }));
    expect(subtaskAccess).toEqual(expect.objectContaining({
        isSectionChat: true,
        scopeType: "subtask",
        role: "assignee"
    }));
});
