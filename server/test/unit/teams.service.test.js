jest.mock("../../src/models/team", () => ({
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn()
}));

jest.mock("../../src/models/workspace", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    findOne: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    updateMany: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    updateMany: jest.fn()
}));

jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn()
}));

jest.mock("../../src/modules/utils/chatMembershipSync", () => ({
    syncChatsForTeam: jest.fn()
}));

jest.mock("../../src/helpers/paginationHelper", () => ({
    toPaginationMeta: jest.fn((value) => value)
}));

const mongoose = require("mongoose");
const Team = require("../../src/models/team");
const Workspace = require("../../src/models/workspace");
const WorkspaceMember = require("../../src/models/workspaceMember");
const User = require("../../src/models/user");
const Project = require("../../src/models/project");
const Task = require("../../src/models/tasks");
const notificationService = require("../../src/modules/notification/notification.service");
const { syncChatsForTeam } = require("../../src/modules/utils/chatMembershipSync");
const { toPaginationMeta } = require("../../src/helpers/paginationHelper");
const teamsService = require("../../src/modules/team/teams.service");

const mockSelectLean = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const mockPopulateResult = (value) => {
    const query = {};
    query.populate = jest.fn().mockReturnValue(query);
    query.then = (onFulfilled, onRejected) => Promise.resolve(value).then(onFulfilled, onRejected);
    query.catch = (onRejected) => Promise.resolve(value).catch(onRejected);
    return query;
};

const createSession = () => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn()
});

beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

test("createTeam validates workspace and membership", async () => {
    Workspace.findById.mockResolvedValue(null);

    await expect(teamsService.createTeam({
        name: "Platform",
        description: "Core",
        workspaceId: "workspace-1",
        userId: "user-1"
    })).rejects.toThrow("Workspace not found");

    Workspace.findById.mockResolvedValue({ _id: "workspace-1" });
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(teamsService.createTeam({
        name: "Platform",
        description: "Core",
        workspaceId: "workspace-1",
        userId: "user-1"
    })).rejects.toThrow("You must be a workspace member to create teams");

    const created = { _id: "team-1", name: "Platform" };
    WorkspaceMember.findOne.mockResolvedValue({ _id: "wm-1" });
    Team.create.mockResolvedValue(created);

    const result = await teamsService.createTeam({
        name: "Platform",
        description: "Core",
        workspaceId: "workspace-1",
        userId: "user-1"
    });

    expect(Team.create).toHaveBeenCalledWith({
        name: "Platform",
        description: "Core",
        workspace: "workspace-1",
        createdBy: "user-1",
        members: [{ user: "user-1", role: "lead" }]
    });
    expect(result).toEqual(created);
});

test("getTeamsByWorkspace returns paginated and non-paginated responses", async () => {
    Workspace.findById.mockResolvedValue({ _id: "workspace-1" });

    const nonPaginatedQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: "team-1" }])
    };
    Team.find.mockReturnValueOnce(nonPaginatedQuery);

    const result = await teamsService.getTeamsByWorkspace("workspace-1", { enabled: false });
    expect(result).toEqual([{ _id: "team-1" }]);

    const paginatedClone = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: "team-2" }])
    };
    const paginatedQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnValue(paginatedClone)
    };
    Team.find.mockReturnValueOnce(paginatedQuery);
    Team.countDocuments.mockResolvedValue(4);

    const paginated = await teamsService.getTeamsByWorkspace("workspace-1", {
        enabled: true,
        page: 2,
        limit: 2,
        skip: 2
    });

    expect(toPaginationMeta).toHaveBeenCalledWith({ page: 2, limit: 2, total: 4 });
    expect(paginated).toEqual({
        items: [{ _id: "team-2" }],
        pagination: { page: 2, limit: 2, total: 4 }
    });
});

test("addTeamMember validates member and notifies user", async () => {
    await expect(teamsService.addTeamMember("team-1", "workspace-1", {
        memberId: "invalid",
        role: "member"
    }, "actor-1")).rejects.toThrow("Invalid member ID");

    Team.findOne.mockResolvedValue({
        _id: "team-1",
        workspace: "workspace-1",
        name: "Platform",
        createdBy: "creator-1",
        members: [{ user: "lead-1", role: "lead" }]
    });
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(teamsService.addTeamMember("team-1", "workspace-1", {
        memberId: "507f1f77bcf86cd799439011",
        role: "member"
    }, "actor-1")).rejects.toThrow("User must be a workspace member before adding to team");

    const teamDoc = {
        _id: "team-1",
        workspace: "workspace-1",
        name: "Platform",
        createdBy: "creator-1",
        members: [{ user: "lead-1", role: "lead" }],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };
    Team.findOne.mockResolvedValue(teamDoc);
    WorkspaceMember.findOne.mockResolvedValue({ _id: "wm-1" });
    User.findById.mockReturnValue(mockSelectLean({
        name: "Actor Name",
        username: "actor"
    }));
    notificationService.createNotifications.mockResolvedValue([]);

    const result = await teamsService.addTeamMember(
        "team-1",
        "workspace-1",
        { memberId: "507f1f77bcf86cd799439011", role: "member" },
        "actor-1"
    );

    expect(teamDoc.save).toHaveBeenCalledTimes(1);
    expect(syncChatsForTeam).toHaveBeenCalledWith("team-1");
    expect(notificationService.createNotifications).toHaveBeenCalledWith(expect.objectContaining({
        recipientIds: ["507f1f77bcf86cd799439011"],
        actorId: "actor-1"
    }));
    expect(result).toEqual(teamDoc);
});

test("removeTeamMember enforces lead-presence guard", async () => {
    Team.findOne.mockResolvedValue({
        _id: "team-1",
        members: [
            { user: "lead-1", role: "lead" },
            { user: "member-1", role: "member" }
        ]
    });

    await expect(teamsService.removeTeamMember("team-1", "workspace-1", "lead-1", "actor-1"))
        .rejects
        .toThrow("A team must have at least one lead");
});

test("removeTeamMember removes member, syncs chats, and returns message", async () => {
    const teamDoc = {
        _id: "team-1",
        workspace: "workspace-1",
        name: "Platform",
        createdBy: "creator-1",
        members: [
            { user: "lead-1", role: "lead" },
            { user: "member-1", role: "member" }
        ],
        save: jest.fn().mockResolvedValue({})
    };
    Team.findOne.mockResolvedValue(teamDoc);
    User.findById.mockReturnValue(mockSelectLean({ username: "actor" }));
    notificationService.createNotifications.mockResolvedValue([]);

    const result = await teamsService.removeTeamMember(
        "team-1",
        "workspace-1",
        "member-1",
        "actor-1"
    );

    expect(teamDoc.members).toHaveLength(1);
    expect(teamDoc.members[0].user).toBe("lead-1");
    expect(syncChatsForTeam).toHaveBeenCalledWith("team-1");
    expect(result).toEqual({ message: "Member removed from team" });
});

test("updateTeamMemberRole blocks demoting the last lead", async () => {
    Team.findOne.mockResolvedValue({
        _id: "team-1",
        members: [{ user: "lead-1", role: "lead" }]
    });

    await expect(teamsService.updateTeamMemberRole(
        "team-1",
        "workspace-1",
        "lead-1",
        "member",
        "actor-1"
    )).rejects.toThrow("A team must have at least one lead");
});

test("updateTeamMemberRole updates role and notifies member", async () => {
    const teamDoc = {
        _id: "team-1",
        workspace: "workspace-1",
        name: "Platform",
        createdBy: "creator-1",
        members: [
            { user: "lead-1", role: "lead" },
            { user: "member-1", role: "member" }
        ],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };
    Team.findOne.mockResolvedValue(teamDoc);
    User.findById.mockReturnValue(mockSelectLean({ username: "actor" }));
    notificationService.createNotifications.mockResolvedValue([]);

    const result = await teamsService.updateTeamMemberRole(
        "team-1",
        "workspace-1",
        "member-1",
        "lead",
        "actor-1"
    );

    expect(teamDoc.members[1].role).toBe("lead");
    expect(teamDoc.save).toHaveBeenCalledTimes(1);
    expect(notificationService.createNotifications).toHaveBeenCalledTimes(1);
    expect(result).toEqual(teamDoc);
});

test("leaveTeam enforces creator/member guards and notifies leads/admins", async () => {
    Team.findById.mockResolvedValueOnce({
        _id: "team-1",
        createdBy: "user-1"
    });
    await expect(teamsService.leaveTeam("team-1", "user-1"))
        .rejects
        .toThrow("Team creator cannot leave. Delete the team instead.");

    Team.findById.mockResolvedValueOnce({
        _id: "team-1",
        createdBy: "creator-1",
        members: [{ user: "lead-1", role: "lead" }]
    });
    await expect(teamsService.leaveTeam("team-1", "user-2"))
        .rejects
        .toThrow("You are not a member of this team");

    const teamDoc = {
        _id: "team-1",
        workspace: "workspace-1",
        name: "Platform",
        createdBy: "creator-1",
        members: [
            { user: "user-1", role: "member" },
            { user: "lead-1", role: "lead" }
        ],
        save: jest.fn().mockResolvedValue({})
    };
    Team.findById.mockResolvedValueOnce(teamDoc);
    User.findById.mockReturnValue(mockSelectLean({ username: "user1" }));
    WorkspaceMember.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ user: "admin-1" }, { user: "lead-1" }])
        })
    });
    notificationService.createNotifications.mockResolvedValue([]);

    const result = await teamsService.leaveTeam("team-1", "user-1");

    expect(teamDoc.members).toHaveLength(1);
    expect(teamDoc.members[0].user).toBe("lead-1");
    expect(syncChatsForTeam).toHaveBeenCalledWith("team-1");
    expect(notificationService.createNotifications).toHaveBeenCalledWith(expect.objectContaining({
        recipientIds: expect.arrayContaining(["lead-1", "admin-1"]),
        actorId: "user-1"
    }));
    expect(result).toEqual({ message: "You have left the team successfully" });
});

test("deleteTeam removes dependent references inside transaction", async () => {
    const session = createSession();
    jest.spyOn(mongoose, "startSession").mockResolvedValue(session);
    Team.findOne.mockResolvedValue({ _id: "team-1" });
    Project.updateMany.mockResolvedValue({ acknowledged: true });
    Task.updateMany.mockResolvedValue({ acknowledged: true });
    Team.findByIdAndDelete.mockResolvedValue({ acknowledged: true });

    const result = await teamsService.deleteTeam("team-1", "workspace-1");

    expect(Project.updateMany).toHaveBeenCalledWith(
        { teams: "team-1" },
        { $pull: { teams: "team-1" } },
        { session }
    );
    expect(Task.updateMany).toHaveBeenCalledWith(
        { assigneesTeams: "team-1" },
        { $pull: { assigneesTeams: "team-1" } },
        { session }
    );
    expect(Team.findByIdAndDelete).toHaveBeenCalledWith("team-1", { session });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ message: "Team and all its references deleted successfully" });
});

test("getTeamsByWorkspace throws when workspace is missing", async () => {
    Workspace.findById.mockResolvedValue(null);

    await expect(
        teamsService.getTeamsByWorkspace("workspace-404")
    ).rejects.toThrow("Workspace not found");
});

test("getTeamById throws when team is missing", async () => {
    Team.findOne.mockReturnValue(mockPopulateResult(null));

    await expect(
        teamsService.getTeamById("team-404", "workspace-1")
    ).rejects.toThrow("Team not found");
});

test("updateTeam throws when team is missing", async () => {
    Team.findOneAndUpdate.mockResolvedValue(null);

    await expect(
        teamsService.updateTeam("team-404", "workspace-1", { name: "New name" })
    ).rejects.toThrow("Team not found");
});

test("deleteTeam throws when team does not exist in workspace", async () => {
    Team.findOne.mockResolvedValue(null);

    await expect(
        teamsService.deleteTeam("team-404", "workspace-1")
    ).rejects.toThrow("Team not found");
});

test("deleteTeam aborts transaction when cascading update fails", async () => {
    const session = createSession();
    jest.spyOn(mongoose, "startSession").mockResolvedValue(session);
    Team.findOne.mockResolvedValue({ _id: "team-1" });
    Project.updateMany.mockRejectedValue(new Error("cascade-update-failed"));

    await expect(
        teamsService.deleteTeam("team-1", "workspace-1")
    ).rejects.toThrow("cascade-update-failed");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
});

test("addTeamMember throws when team is missing", async () => {
    Team.findOne.mockResolvedValue(null);

    await expect(
        teamsService.addTeamMember(
            "team-1",
            "workspace-1",
            { memberId: "507f1f77bcf86cd799439011", role: "member" },
            "actor-1"
        )
    ).rejects.toThrow("Team not found in this workspace");
});

test("addTeamMember rejects duplicate member entries", async () => {
    Team.findOne.mockResolvedValue({
        _id: "team-1",
        workspace: "workspace-1",
        createdBy: "creator-1",
        members: [{ user: "507f1f77bcf86cd799439011", role: "lead" }]
    });
    WorkspaceMember.findOne.mockResolvedValue({ _id: "wm-1" });

    await expect(
        teamsService.addTeamMember(
            "team-1",
            "workspace-1",
            { memberId: "507f1f77bcf86cd799439011", role: "member" },
            "actor-1"
        )
    ).rejects.toThrow("User is already a member of this team");
});

test("addTeamMember defaults role and falls back actor to team creator", async () => {
    const teamDoc = {
        _id: "team-1",
        workspace: "workspace-1",
        name: "Platform",
        createdBy: "creator-1",
        members: [{ user: "lead-1", role: "lead" }],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };
    Team.findOne.mockResolvedValue(teamDoc);
    WorkspaceMember.findOne.mockResolvedValue({ _id: "wm-1" });
    User.findById.mockReturnValue(mockSelectLean(null));
    notificationService.createNotifications.mockResolvedValue([]);

    const result = await teamsService.addTeamMember(
        "team-1",
        "workspace-1",
        { memberId: "507f1f77bcf86cd799439011" }
    );

    expect(teamDoc.members).toEqual(expect.arrayContaining([
        { user: "507f1f77bcf86cd799439011", role: "member" }
    ]));
    expect(notificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
            actorId: "creator-1",
            recipientIds: ["507f1f77bcf86cd799439011"]
        })
    );
    expect(result).toEqual(teamDoc);
});

test("getTeamMembers throws when team is missing", async () => {
    Team.findOne.mockReturnValue(mockPopulateResult(null));

    await expect(
        teamsService.getTeamMembers("team-404", "workspace-1")
    ).rejects.toThrow("Team not found");
});

test("removeTeamMember throws when team is missing", async () => {
    Team.findOne.mockResolvedValue(null);

    await expect(
        teamsService.removeTeamMember("team-404", "workspace-1", "member-1", "actor-1")
    ).rejects.toThrow("Team not found");
});

test("removeTeamMember throws when target member is not in team", async () => {
    Team.findOne.mockResolvedValue({
        _id: "team-1",
        members: [{ user: "lead-1", role: "lead" }]
    });

    await expect(
        teamsService.removeTeamMember("team-1", "workspace-1", "member-404", "actor-1")
    ).rejects.toThrow("Member not found in this team");
});

test("updateTeamMemberRole throws when team is missing", async () => {
    Team.findOne.mockResolvedValue(null);

    await expect(
        teamsService.updateTeamMemberRole("team-404", "workspace-1", "member-1", "lead", "actor-1")
    ).rejects.toThrow("Team not found");
});

test("updateTeamMemberRole throws when member is missing", async () => {
    Team.findOne.mockResolvedValue({
        _id: "team-1",
        members: [{ user: "lead-1", role: "lead" }]
    });

    await expect(
        teamsService.updateTeamMemberRole("team-1", "workspace-1", "member-404", "lead", "actor-1")
    ).rejects.toThrow("Member not found in this team");
});

test("leaveTeam throws when team is not found", async () => {
    Team.findById.mockResolvedValue(null);

    await expect(
        teamsService.leaveTeam("team-404", "user-1")
    ).rejects.toThrow("Team not found");
});

test("leaveTeam skips notification creation when no recipients are resolved", async () => {
    const teamDoc = {
        _id: "team-1",
        workspace: "workspace-1",
        name: "Platform",
        createdBy: "creator-1",
        members: [
            { user: "user-1", role: "member" },
            { user: null, role: "lead" }
        ],
        save: jest.fn().mockResolvedValue({})
    };
    Team.findById.mockResolvedValue(teamDoc);
    User.findById.mockReturnValue(mockSelectLean({ username: "user1" }));
    WorkspaceMember.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
        })
    });

    const result = await teamsService.leaveTeam("team-1", "user-1");

    expect(notificationService.createNotifications).not.toHaveBeenCalled();
    expect(result).toEqual({ message: "You have left the team successfully" });
});

test("getTeamById returns populated team when found", async () => {
    const teamDoc = { _id: "team-1", name: "Platform" };
    Team.findOne.mockReturnValue(mockPopulateResult(teamDoc));

    const result = await teamsService.getTeamById("team-1", "workspace-1");

    expect(result).toEqual(teamDoc);
});

test("updateTeam returns updated team document", async () => {
    const updated = { _id: "team-1", name: "Platform Updated" };
    Team.findOneAndUpdate.mockResolvedValue(updated);

    const result = await teamsService.updateTeam("team-1", "workspace-1", { name: "Platform Updated" });

    expect(Team.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "team-1", workspace: "workspace-1" },
        { name: "Platform Updated" },
        { new: true, runValidators: true }
    );
    expect(result).toEqual(updated);
});

test("getTeamMembers returns members when team exists", async () => {
    const members = [{ user: { _id: "user-1" }, role: "lead" }];
    Team.findOne.mockReturnValue(mockPopulateResult({ members }));

    const result = await teamsService.getTeamMembers("team-1", "workspace-1");

    expect(result).toEqual(members);
});

test("updateTeamMemberRole falls back actor to team creator when actor is omitted", async () => {
    const teamDoc = {
        _id: "team-1",
        workspace: "workspace-1",
        name: "Platform",
        createdBy: "creator-1",
        members: [
            { user: "lead-1", role: "lead" },
            { user: "member-1", role: "member" }
        ],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };
    Team.findOne.mockResolvedValue(teamDoc);
    User.findById.mockReturnValue(mockSelectLean({ username: "creator" }));
    notificationService.createNotifications.mockResolvedValue([]);

    const result = await teamsService.updateTeamMemberRole(
        "team-1",
        "workspace-1",
        "member-1",
        "lead"
    );

    expect(notificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
            actorId: "creator-1",
            recipientIds: ["member-1"]
        })
    );
    expect(result).toEqual(teamDoc);
});
