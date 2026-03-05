jest.mock("../../src/models/workspace", () => ({
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

jest.mock("../../src/models/workspaceMember.js", () => ({
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    deleteMany: jest.fn(),
    startSession: jest.fn()
}));

jest.mock("../../src/models/workspaceInvite", () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    deleteMany: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn(),
    findOne: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    updateMany: jest.fn(),
    deleteMany: jest.fn()
}));
jest.mock("../../src/models/team", () => ({
    updateMany: jest.fn(),
    deleteMany: jest.fn()
}));
jest.mock("../../src/models/tasks", () => ({
    updateMany: jest.fn(),
    find: jest.fn(),
    deleteMany: jest.fn()
}));
jest.mock("../../src/models/subtasks", () => ({
    updateMany: jest.fn(),
    deleteMany: jest.fn()
}));

jest.mock("../../src/models/chat", () => ({
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

jest.mock("../../src/models/message", () => ({
    deleteMany: jest.fn()
}));
jest.mock("../../src/helpers/sendEmail", () => jest.fn());
jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn(),
    setWorkspaceInviteNotificationState: jest.fn()
}));
jest.mock("../../src/modules/utils/chatMembershipSync", () => ({
    syncWorkspaceChats: jest.fn()
}));
jest.mock("../../src/modules/utils/activityLogger", () => ({
    logActivity: jest.fn(),
    getUserLabel: jest.fn()
}));
jest.mock("../../src/helpers/paginationHelper", () => ({
    toPaginationMeta: jest.fn()
}));

const Workspace = require("../../src/models/workspace");
const WorkspaceMember = require("../../src/models/workspaceMember.js");
const WorkspaceInvite = require("../../src/models/workspaceInvite");
const User = require("../../src/models/user");
const Project = require("../../src/models/project");
const Team = require("../../src/models/team");
const Task = require("../../src/models/tasks");
const Subtask = require("../../src/models/subtasks");
const Chat = require("../../src/models/chat");
const Message = require("../../src/models/message");
const sendMail = require("../../src/helpers/sendEmail");
const notificationService = require("../../src/modules/notification/notification.service");
const { syncWorkspaceChats } = require("../../src/modules/utils/chatMembershipSync");
const { logActivity, getUserLabel } = require("../../src/modules/utils/activityLogger");
const { toPaginationMeta } = require("../../src/helpers/paginationHelper");
const workspaceService = require("../../src/modules/workspace/workspace.service");

const makeQuery = (value) => {
    const query = {};
    query.select = jest.fn().mockReturnValue(query);
    query.populate = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockReturnValue(query);
    query.clone = jest.fn().mockReturnValue(query);
    query.skip = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.session = jest.fn().mockReturnValue(query);
    query.exec = jest.fn().mockResolvedValue(value);
    query.then = (onFulfilled, onRejected) => Promise.resolve(value).then(onFulfilled, onRejected);
    query.catch = (onRejected) => Promise.resolve(value).catch(onRejected);
    return query;
};

const makeSession = () => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn()
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("createWorkspace creates workspace chat, membership, and activity", async () => {
    Chat.create.mockResolvedValue({ _id: "chat-1" });
    Workspace.create.mockResolvedValue({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    });
    WorkspaceMember.create.mockResolvedValue({ _id: "member-1" });
    getUserLabel.mockResolvedValue("Alice");

    const result = await workspaceService.createWorkspace({
        name: "Workspace A",
        description: "Primary",
        ownerId: "user-1"
    });

    expect(Chat.create).toHaveBeenCalledWith({
        type: "group",
        name: "Workspace A",
        members: ["user-1"],
        admin: "user-1"
    });
    expect(WorkspaceMember.create).toHaveBeenCalledWith({
        workspace: "workspace-1",
        user: "user-1",
        role: "owner"
    });
    expect(logActivity).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    });
});

test("getAllWorkspaces returns paginated mapped workspace list", async () => {
    WorkspaceMember.find.mockReturnValue(makeQuery([
        {
            workspace: { _id: "w1", name: "One" },
            role: "owner",
            joinedAt: "2025-01-01T00:00:00.000Z",
            isStarred: true,
            isMuted: false,
            status: "active"
        },
        {
            workspace: { _id: "w2", name: "Two" },
            role: "member",
            joinedAt: "2025-01-02T00:00:00.000Z",
            isStarred: false,
            isMuted: true,
            status: "archived"
        }
    ]));
    WorkspaceMember.countDocuments.mockResolvedValue(2);
    toPaginationMeta.mockReturnValue({ page: 1, limit: 2, total: 2, pages: 1 });

    const result = await workspaceService.getAllWorkspaces("user-1", {
        enabled: true,
        page: 1,
        limit: 2,
        skip: 0
    });

    expect(result).toEqual({
        items: [
            {
                _id: "w1",
                name: "One",
                userRole: "owner",
                joinedAt: "2025-01-01T00:00:00.000Z",
                isStarred: true,
                isMuted: false,
                membershipStatus: "active"
            },
            {
                _id: "w2",
                name: "Two",
                userRole: "member",
                joinedAt: "2025-01-02T00:00:00.000Z",
                isStarred: false,
                isMuted: true,
                membershipStatus: "archived"
            }
        ],
        pagination: { page: 1, limit: 2, total: 2, pages: 1 }
    });
});

test("getWorkspaceById throws when requester is not a member", async () => {
    Workspace.findById.mockResolvedValue({
        _id: "workspace-1",
        name: "Workspace A",
        toObject: () => ({ _id: "workspace-1", name: "Workspace A" })
    });
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(
        workspaceService.getWorkspaceById("workspace-1", "user-1")
    ).rejects.toThrow("You do not have access to this workspace");
});

test("updateWorkspace renames workspace and syncs chat name", async () => {
    WorkspaceMember.findOne.mockResolvedValue({ role: "admin" });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Old Name",
        chatId: "chat-1"
    }));
    Workspace.findByIdAndUpdate.mockResolvedValue({
        _id: "workspace-1",
        name: "New Name",
        chatId: "chat-1"
    });
    getUserLabel.mockResolvedValue("Alice");

    const result = await workspaceService.updateWorkspace(
        "workspace-1",
        { name: "New Name" },
        "user-1"
    );

    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-1", {
        name: "New Name"
    });
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "workspace.renamed",
        workspaceId: "workspace-1"
    }));
    expect(result).toEqual({
        _id: "workspace-1",
        name: "New Name",
        chatId: "chat-1"
    });
});

test("addMember returns invite_request mode when user requires approval", async () => {
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-2",
            email: "user2@example.com",
            preferences: {
                workspace: { autoApproveWorkspaceInvites: false }
            }
        })
    });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne.mockResolvedValue(null);
    WorkspaceInvite.findOne.mockResolvedValue(null);
    WorkspaceInvite.create.mockResolvedValue({
        _id: "invite-1",
        email: "user2@example.com",
        status: "pending",
        token: "secret"
    });
    getUserLabel.mockResolvedValue("Inviter");

    const result = await workspaceService.addMember({
        workspaceId: "workspace-1",
        userId: "user-2",
        role: "member",
        requesterId: "user-1"
    });

    expect(notificationService.createNotifications).toHaveBeenCalledTimes(1);
    expect(result.mode).toBe("invite_request");
    expect(result.requiresApproval).toBe(true);
    expect(result.invite.token).toBeUndefined();
});

test("addMember directly adds member when auto-approve is enabled", async () => {
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-2",
            email: "user2@example.com",
            preferences: {
                workspace: { autoApproveWorkspaceInvites: true }
            }
        })
    });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne.mockResolvedValue(null);
    WorkspaceMember.create.mockResolvedValue({
        _id: "member-1",
        populate: jest.fn().mockResolvedValue({
            _id: "member-1",
            user: { _id: "user-2", name: "User Two" }
        })
    });
    getUserLabel.mockResolvedValue("Alice");

    const result = await workspaceService.addMember({
        workspaceId: "workspace-1",
        userId: "user-2",
        role: "member",
        requesterId: "user-1"
    });

    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith(
        "chat-1",
        { $addToSet: { members: "user-2" } },
        undefined
    );
    expect(syncWorkspaceChats).toHaveBeenCalledWith("workspace-1");
    expect(result.mode).toBe("member_added");
    expect(result.member).toEqual({
        _id: "member-1",
        user: { _id: "user-2", name: "User Two" }
    });
});

test("respondInvite rejects invite and marks notification state", async () => {
    const inviteDoc = {
        _id: "invite-1",
        workspace: "workspace-1",
        invitedUser: "user-2",
        inviteType: "direct_request",
        status: "pending",
        expiresAt: new Date(Date.now() + 3600_000),
        save: jest.fn().mockResolvedValue(undefined)
    };
    WorkspaceInvite.findById.mockResolvedValue(inviteDoc);
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));

    const result = await workspaceService.respondInvite({
        inviteId: "invite-1",
        userId: "user-2",
        action: "reject"
    });

    expect(inviteDoc.status).toBe("rejected");
    expect(inviteDoc.save).toHaveBeenCalledTimes(1);
    expect(notificationService.setWorkspaceInviteNotificationState).toHaveBeenCalledWith({
        recipientUserId: "user-2",
        inviteId: "invite-1",
        requestState: "rejected",
        read: true
    });
    expect(result).toEqual({
        inviteId: "invite-1",
        status: "rejected",
        workspaceId: "workspace-1"
    });
});

test("leaveWorkspace blocks owner from leaving when multiple members exist", async () => {
    WorkspaceMember.findOne.mockResolvedValue({
        role: "owner"
    });
    WorkspaceMember.countDocuments.mockResolvedValue(2);

    await expect(
        workspaceService.leaveWorkspace({
            workspaceId: "workspace-1",
            userId: "user-1"
        })
    ).rejects.toThrow("Owner must transfer ownership before leaving. Use deleteWorkspace to remove the workspace.");
});

test("getMembers returns paginated workspace members", async () => {
    WorkspaceMember.find.mockReturnValue(makeQuery([
        {
            user: { _id: "u1", name: "Alice" },
            role: "owner"
        },
        {
            user: { _id: "u2", name: "Bob" },
            role: "member"
        }
    ]));
    WorkspaceMember.countDocuments.mockResolvedValue(2);
    toPaginationMeta.mockReturnValue({ page: 1, limit: 2, total: 2, pages: 1 });

    const result = await workspaceService.getMembers("workspace-1", {
        enabled: true,
        page: 1,
        limit: 2,
        skip: 0
    });

    expect(result).toEqual({
        items: [
            { user: { _id: "u1", name: "Alice" }, role: "owner" },
            { user: { _id: "u2", name: "Bob" }, role: "member" }
        ],
        pagination: { page: 1, limit: 2, total: 2, pages: 1 }
    });
});

test("updateMemberRole updates role and syncs workspace chats", async () => {
    WorkspaceMember.findOne.mockResolvedValue({
        workspace: "workspace-1",
        user: "user-2",
        role: "member"
    });
    WorkspaceMember.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
            user: { _id: "user-2", name: "Bob" },
            role: "admin"
        })
    });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    getUserLabel.mockResolvedValueOnce("Alice").mockResolvedValueOnce("Bob");

    const result = await workspaceService.updateMemberRole({
        workspaceId: "workspace-1",
        memberId: "user-2",
        role: "admin",
        requesterId: "user-1"
    });

    expect(WorkspaceMember.findOneAndUpdate).toHaveBeenCalledWith(
        { workspace: "workspace-1", user: "user-2" },
        { role: "admin" },
        { new: true }
    );
    expect(syncWorkspaceChats).toHaveBeenCalledWith("workspace-1");
    expect(result).toEqual({
        user: { _id: "user-2", name: "Bob" },
        role: "admin"
    });
});

test("transferOwnership updates member roles and chat admin in transaction", async () => {
    const session = makeSession();
    WorkspaceMember.startSession.mockResolvedValue(session);
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne
        .mockReturnValueOnce(makeQuery({
            workspace: "workspace-1",
            user: "owner-1",
            role: "owner"
        }))
        .mockReturnValueOnce(makeQuery({
            workspace: "workspace-1",
            user: "user-2",
            role: "member"
        }));
    getUserLabel.mockResolvedValueOnce("Owner").mockResolvedValueOnce("Bob");

    await workspaceService.transferOwnership({
        workspaceId: "workspace-1",
        newOwnerId: "user-2",
        currentOwnerId: "owner-1"
    });

    expect(WorkspaceMember.findOneAndUpdate).toHaveBeenNthCalledWith(
        1,
        { workspace: "workspace-1", user: "owner-1" },
        { role: "admin" },
        { session }
    );
    expect(WorkspaceMember.findOneAndUpdate).toHaveBeenNthCalledWith(
        2,
        { workspace: "workspace-1", user: "user-2" },
        { role: "owner" },
        { session }
    );
    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith(
        "chat-1",
        { admin: "user-2" },
        { session }
    );
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(syncWorkspaceChats).toHaveBeenCalledWith("workspace-1");
});

test("sendInvite creates email invite and sends mail", async () => {
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A"
    }));
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-1",
            name: "Alice",
            username: "alice"
        })
    });
    User.findOne.mockResolvedValue(null);
    WorkspaceInvite.findOne.mockResolvedValue(null);
    WorkspaceInvite.create.mockResolvedValue({
        _id: "invite-1",
        email: "user2@example.com",
        token: "hashed-token",
        status: "pending",
        toObject: () => ({
            _id: "invite-1",
            email: "user2@example.com",
            token: "hashed-token",
            status: "pending"
        })
    });

    const result = await workspaceService.sendInvite({
        workspaceId: "workspace-1",
        email: "user2@example.com",
        role: "member",
        invitedBy: "user-1"
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({
        _id: "invite-1",
        email: "user2@example.com",
        status: "pending"
    }));
    expect(result.token).toBeUndefined();
});

test("acceptInvite accepts valid token and creates membership", async () => {
    const inviteDoc = {
        _id: "invite-1",
        workspace: "workspace-1",
        role: "member",
        email: "user2@example.com",
        status: "pending",
        expiresAt: new Date(Date.now() + 3600_000),
        save: jest.fn().mockResolvedValue(undefined)
    };
    WorkspaceInvite.findOne.mockResolvedValue(inviteDoc);
    User.findById.mockResolvedValue({
        _id: "user-2",
        email: "user2@example.com"
    });
    WorkspaceMember.findOne.mockResolvedValue(null);
    WorkspaceMember.create.mockResolvedValue({
        _id: "member-1"
    });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    getUserLabel.mockResolvedValue("Bob");

    const result = await workspaceService.acceptInvite("plain-token", "user-2");

    expect(inviteDoc.status).toBe("accepted");
    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith(
        "chat-1",
        { $addToSet: { members: "user-2" } },
        undefined
    );
    expect(result).toEqual({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    });
});

test("respondInvite accepts direct request and joins workspace", async () => {
    const inviteDoc = {
        _id: "invite-1",
        workspace: "workspace-1",
        invitedUser: "user-2",
        inviteType: "direct_request",
        status: "pending",
        role: "member",
        expiresAt: new Date(Date.now() + 3600_000),
        save: jest.fn().mockResolvedValue(undefined)
    };
    WorkspaceInvite.findById.mockResolvedValue(inviteDoc);
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne.mockResolvedValue(null);
    WorkspaceMember.create.mockResolvedValue({
        _id: "member-1"
    });
    getUserLabel.mockResolvedValue("Bob");

    const result = await workspaceService.respondInvite({
        inviteId: "invite-1",
        userId: "user-2",
        action: "accept"
    });

    expect(inviteDoc.status).toBe("accepted");
    expect(notificationService.setWorkspaceInviteNotificationState).toHaveBeenCalledWith({
        recipientUserId: "user-2",
        inviteId: "invite-1",
        requestState: "accepted",
        read: true
    });
    expect(result).toEqual(expect.objectContaining({
        inviteId: "invite-1",
        status: "accepted",
        workspaceId: "workspace-1"
    }));
});

test("getAllWorkspaces returns filtered list when pagination is disabled", async () => {
    WorkspaceMember.find.mockReturnValue(makeQuery([
        {
            workspace: { _id: "w1", name: "One" },
            role: "owner",
            joinedAt: "2025-01-01T00:00:00.000Z",
            isStarred: true,
            isMuted: false,
            status: "active"
        },
        {
            workspace: null,
            role: "member",
            joinedAt: "2025-01-02T00:00:00.000Z",
            isStarred: false,
            isMuted: true,
            status: "archived"
        }
    ]));

    const result = await workspaceService.getAllWorkspaces("user-1");

    expect(result).toEqual([
        {
            _id: "w1",
            name: "One",
            userRole: "owner",
            joinedAt: "2025-01-01T00:00:00.000Z",
            isStarred: true,
            isMuted: false,
            membershipStatus: "active"
        }
    ]);
});

test("getWorkspaceById throws when workspace does not exist", async () => {
    Workspace.findById.mockResolvedValue(null);

    await expect(
        workspaceService.getWorkspaceById("workspace-404", "user-1")
    ).rejects.toThrow("Workspace not found");
});

test("updateWorkspace throws when workspace update fails", async () => {
    WorkspaceMember.findOne.mockResolvedValue({ role: "owner" });
    Workspace.findById.mockReturnValue(makeQuery({ _id: "workspace-1", name: "Old", chatId: "chat-1" }));
    Workspace.findByIdAndUpdate.mockResolvedValue(null);

    await expect(
        workspaceService.updateWorkspace("workspace-1", { name: "New" }, "user-1")
    ).rejects.toThrow("Workspace not found or update failed");
});

test("deleteWorkspace rejects non-owner requester", async () => {
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(
        workspaceService.deleteWorkspace("workspace-1", "user-2")
    ).rejects.toThrow("Only workspace owner can delete the workspace");
});

test("deleteWorkspace removes related records and chat in transaction", async () => {
    const session = makeSession();
    WorkspaceMember.startSession.mockResolvedValue(session);
    WorkspaceMember.findOne.mockResolvedValue({ workspace: "workspace-1", user: "owner-1", role: "owner" });
    Workspace.findById.mockResolvedValue({ _id: "workspace-1", chatId: "chat-1" });
    Task.find.mockReturnValue(makeQuery([{ _id: "task-1" }]));
    Workspace.findByIdAndDelete.mockResolvedValue({ _id: "workspace-1" });

    await workspaceService.deleteWorkspace("workspace-1", "owner-1");

    expect(Subtask.deleteMany).toHaveBeenCalledWith({ task: { $in: ["task-1"] } }, { session });
    expect(Task.deleteMany).toHaveBeenCalledWith({ workspace: "workspace-1" }, { session });
    expect(Project.deleteMany).toHaveBeenCalledWith({ workspace: "workspace-1" }, { session });
    expect(Team.deleteMany).toHaveBeenCalledWith({ workspace: "workspace-1" }, { session });
    expect(WorkspaceMember.deleteMany).toHaveBeenCalledWith({ workspace: "workspace-1" }, { session });
    expect(WorkspaceInvite.deleteMany).toHaveBeenCalledWith({ workspace: "workspace-1" }, { session });
    expect(Message.deleteMany).toHaveBeenCalledWith({ chatId: "chat-1" }, { session });
    expect(Chat.findByIdAndDelete).toHaveBeenCalledWith("chat-1", { session });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
});

test("addMember throws when target user does not exist", async () => {
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
    });

    await expect(
        workspaceService.addMember({
            workspaceId: "workspace-1",
            userId: "user-404",
            requesterId: "user-1"
        })
    ).rejects.toMatchObject({
        message: "User not found",
        statusCode: 404
    });
});

test("addMember throws when workspace does not exist", async () => {
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-2",
            email: "user2@example.com",
            preferences: { workspace: { autoApproveWorkspaceInvites: true } }
        })
    });
    Workspace.findById.mockReturnValue(makeQuery(null));

    await expect(
        workspaceService.addMember({
            workspaceId: "workspace-404",
            userId: "user-2",
            requesterId: "user-1"
        })
    ).rejects.toMatchObject({
        message: "Workspace not found",
        statusCode: 404
    });
});

test("addMember throws when user is already in workspace", async () => {
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-2",
            email: "user2@example.com",
            preferences: { workspace: { autoApproveWorkspaceInvites: true } }
        })
    });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne.mockResolvedValue({ _id: "member-1" });

    await expect(
        workspaceService.addMember({
            workspaceId: "workspace-1",
            userId: "user-2",
            requesterId: "user-1"
        })
    ).rejects.toMatchObject({
        message: "User is already a member of this workspace",
        statusCode: 409
    });
});

test("sendInvite throws when no valid emails are provided", async () => {
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A"
    }));
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-1",
            name: "Alice",
            username: "alice"
        })
    });

    await expect(
        workspaceService.sendInvite({
            workspaceId: "workspace-1",
            invitedBy: "user-1",
            csvBuffer: Buffer.from("email\nnot-an-email", "utf8")
        })
    ).rejects.toMatchObject({
        message: "No valid email addresses found",
        statusCode: 400
    });
});

test("sendInvite returns bulk result and keeps per-email failures", async () => {
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A"
    }));
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-1",
            name: "Alice",
            username: "alice"
        })
    });
    User.findOne.mockResolvedValue(null);
    WorkspaceInvite.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: "existing-invite" });
    WorkspaceInvite.create.mockResolvedValue({
        _id: "invite-1",
        email: "good@example.com",
        status: "pending",
        token: "hashed-token",
        toObject: () => ({
            _id: "invite-1",
            email: "good@example.com",
            status: "pending",
            token: "hashed-token"
        })
    });

    const result = await workspaceService.sendInvite({
        workspaceId: "workspace-1",
        invitedBy: "user-1",
        csvBuffer: Buffer.from("email\ngood@example.com\ndup@example.com", "utf8")
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({
        mode: "bulk_csv",
        sent: 1,
        failed: 1
    }));
    expect(result.errors[0].email).toBe("dup@example.com");
});

test("acceptInvite rejects expired invite token", async () => {
    WorkspaceInvite.findOne.mockResolvedValue({
        _id: "invite-1",
        status: "pending",
        inviteType: "email",
        email: "user@example.com",
        expiresAt: new Date(Date.now() - 60_000),
        save: jest.fn().mockResolvedValue(undefined)
    });

    await expect(
        workspaceService.acceptInvite("plain-token", "user-1")
    ).rejects.toMatchObject({
        message: "Invite has expired",
        statusCode: 400
    });
});

test("acceptInvite rejects when invite email does not match logged-in user", async () => {
    WorkspaceInvite.findOne.mockResolvedValue({
        _id: "invite-1",
        workspace: "workspace-1",
        status: "pending",
        inviteType: "email",
        email: "invitee@example.com",
        expiresAt: new Date(Date.now() + 60_000),
        save: jest.fn().mockResolvedValue(undefined)
    });
    User.findById.mockResolvedValue({
        _id: "user-1",
        email: "other@example.com"
    });

    await expect(
        workspaceService.acceptInvite("plain-token", "user-1")
    ).rejects.toMatchObject({
        message: "This invite was sent to a different email address",
        statusCode: 403
    });
});

test("respondInvite marks expired invite and throws", async () => {
    const inviteDoc = {
        _id: "invite-1",
        workspace: "workspace-1",
        invitedUser: "user-2",
        inviteType: "direct_request",
        status: "pending",
        expiresAt: new Date(Date.now() - 60_000),
        save: jest.fn().mockResolvedValue(undefined)
    };
    WorkspaceInvite.findById.mockResolvedValue(inviteDoc);

    await expect(
        workspaceService.respondInvite({
            inviteId: "invite-1",
            userId: "user-2",
            action: "accept"
        })
    ).rejects.toMatchObject({
        message: "Invite has expired",
        statusCode: 400
    });

    expect(inviteDoc.status).toBe("expired");
    expect(notificationService.setWorkspaceInviteNotificationState).toHaveBeenCalledWith({
        recipientUserId: "user-2",
        inviteId: "invite-1",
        requestState: "expired",
        read: true
    });
});

test("removeMember removes user resources and syncs workspace chats", async () => {
    const session = makeSession();
    WorkspaceMember.startSession.mockResolvedValue(session);
    WorkspaceMember.findOne
        .mockResolvedValueOnce({ workspace: "workspace-1", user: "user-2", role: "member" })
        .mockResolvedValueOnce({ workspace: "workspace-1", user: "owner-1", role: "owner" });
    Workspace.findById
        .mockReturnValueOnce(makeQuery({
            _id: "workspace-1",
            name: "Workspace A",
            chatId: "chat-1"
        }))
        .mockReturnValueOnce(makeQuery({
            _id: "workspace-1",
            chatId: "chat-1"
        }));
    Task.find.mockReturnValue(makeQuery([{ _id: "task-1" }]));
    getUserLabel.mockResolvedValueOnce("Owner").mockResolvedValueOnce("Bob");

    await workspaceService.removeMember({
        workspaceId: "workspace-1",
        memberId: "user-2",
        requesterId: "owner-1"
    });

    expect(Project.updateMany).toHaveBeenCalledTimes(1);
    expect(Team.updateMany).toHaveBeenCalledTimes(1);
    expect(Task.updateMany).toHaveBeenCalledTimes(1);
    expect(Subtask.updateMany).toHaveBeenCalledTimes(1);
    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith(
        "chat-1",
        { $pull: { members: "user-2" } },
        { session }
    );
    expect(WorkspaceMember.findOneAndDelete).toHaveBeenCalledWith(
        { workspace: "workspace-1", user: "user-2" },
        { session }
    );
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(syncWorkspaceChats).toHaveBeenCalledWith("workspace-1");
});

test("updateMemberRole delegates owner assignment to transferOwnership", async () => {
    WorkspaceMember.findOne.mockReset();
    WorkspaceMember.findOne.mockResolvedValue({
        workspace: "workspace-1",
        user: "user-2",
        role: "member"
    });
    const transferSpy = jest.spyOn(workspaceService, "transferOwnership").mockResolvedValue({
        message: "ok"
    });

    const result = await workspaceService.updateMemberRole({
        workspaceId: "workspace-1",
        memberId: "user-2",
        role: "owner",
        requesterId: "owner-1"
    });

    expect(transferSpy).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        newOwnerId: "user-2",
        currentOwnerId: "owner-1"
    });
    expect(result).toEqual({ message: "ok" });
    transferSpy.mockRestore();
});

test("transferOwnership rejects when current owner check fails", async () => {
    WorkspaceMember.findOne.mockReset();
    Workspace.findById.mockReset();
    const session = makeSession();
    WorkspaceMember.startSession.mockResolvedValue(session);
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne.mockReturnValueOnce(makeQuery(null));

    await expect(
        workspaceService.transferOwnership({
            workspaceId: "workspace-1",
            newOwnerId: "user-2",
            currentOwnerId: "user-1"
        })
    ).rejects.toThrow("Only current owner can transfer ownership");
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("leaveWorkspace removes member and cleans up resources", async () => {
    WorkspaceMember.findOne.mockReset();
    Workspace.findById.mockReset();
    Task.find.mockReset();
    const session = makeSession();
    WorkspaceMember.startSession.mockResolvedValue(session);
    WorkspaceMember.findOne.mockResolvedValue({
        workspace: "workspace-1",
        user: "user-2",
        role: "member"
    });
    Workspace.findById
        .mockReturnValueOnce(makeQuery({
            _id: "workspace-1",
            name: "Workspace A",
            chatId: "chat-1"
        }))
        .mockReturnValueOnce(makeQuery({
            _id: "workspace-1",
            chatId: "chat-1"
        }));
    Task.find.mockReturnValue(makeQuery([{ _id: "task-1" }]));
    getUserLabel.mockResolvedValue("Bob");

    await workspaceService.leaveWorkspace({
        workspaceId: "workspace-1",
        userId: "user-2"
    });

    expect(WorkspaceMember.findOneAndDelete).toHaveBeenCalledWith(
        { workspace: "workspace-1", user: "user-2" },
        { session }
    );
    expect(Project.updateMany).toHaveBeenCalledTimes(1);
    expect(Subtask.updateMany).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(syncWorkspaceChats).toHaveBeenCalledWith("workspace-1");
});

test("getWorkspaceById returns workspace payload with requester role", async () => {
    Workspace.findById.mockResolvedValue({
        _id: "workspace-1",
        name: "Workspace A",
        toObject: () => ({ _id: "workspace-1", name: "Workspace A" })
    });
    WorkspaceMember.findOne.mockResolvedValue({ role: "admin" });

    const result = await workspaceService.getWorkspaceById("workspace-1", "user-1");

    expect(result).toEqual({
        _id: "workspace-1",
        name: "Workspace A",
        userRole: "admin"
    });
});

test("updateWorkspace rejects requester without owner/admin role", async () => {
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(
        workspaceService.updateWorkspace("workspace-1", { name: "New Name" }, "user-1")
    ).rejects.toThrow("Only workspace owners and admins can update workspace details");
});

test("getMembers returns plain member list when pagination is disabled", async () => {
    const members = [
        { role: "owner", user: { _id: "user-1", name: "Alice" } },
        { role: "member", user: { _id: "user-2", name: "Bob" } }
    ];
    WorkspaceMember.find.mockReturnValue(makeQuery(members));

    const result = await workspaceService.getMembers("workspace-1");

    expect(result).toEqual(members);
});

test("addMember supports email based lookup", async () => {
    User.findOne.mockReset();
    User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-2",
            email: "user2@example.com",
            preferences: { workspace: { autoApproveWorkspaceInvites: true } }
        })
    });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne.mockResolvedValue(null);
    WorkspaceMember.create.mockResolvedValue({
        _id: "member-1",
        populate: jest.fn().mockResolvedValue({ _id: "member-1", user: { _id: "user-2" } })
    });
    getUserLabel.mockResolvedValue("Alice");
    syncWorkspaceChats.mockResolvedValue(undefined);

    const result = await workspaceService.addMember({
        workspaceId: "workspace-1",
        email: "USER2@example.com",
        requesterId: "user-1"
    });

    expect(User.findOne).toHaveBeenCalledWith({ email: "user2@example.com" });
    expect(result.mode).toBe("member_added");
});

test("addMember supports username lookup and logs sync failures without breaking flow", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    User.findOne.mockReset();
    User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-3",
            username: "bob",
            email: "bob@example.com",
            preferences: { workspace: { autoApproveWorkspaceInvites: true } }
        })
    });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne.mockResolvedValue(null);
    WorkspaceMember.create.mockResolvedValue({
        _id: "member-2",
        populate: jest.fn().mockResolvedValue({ _id: "member-2", user: { _id: "user-3" } })
    });
    getUserLabel.mockResolvedValue("Alice");
    syncWorkspaceChats.mockRejectedValue(new Error("sync down"));

    const result = await workspaceService.addMember({
        workspaceId: "workspace-1",
        username: " Bob ",
        requesterId: "user-1"
    });

    expect(User.findOne).toHaveBeenCalledWith({ username: "bob" });
    expect(result.mode).toBe("member_added");
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
});

test("addMember returns conflict when pending direct invite already exists", async () => {
    User.findById.mockReset();
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-2",
            email: "user2@example.com",
            preferences: { workspace: { autoApproveWorkspaceInvites: false } }
        })
    });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne.mockResolvedValue(null);
    WorkspaceInvite.findOne.mockResolvedValue({ _id: "invite-existing" });

    await expect(
        workspaceService.addMember({
            workspaceId: "workspace-1",
            userId: "user-2",
            requesterId: "user-1"
        })
    ).rejects.toMatchObject({
        message: "A pending workspace invite request already exists for this user",
        statusCode: 409
    });
});

test("sendInvite rejects when workspace is not found", async () => {
    Workspace.findById.mockReturnValue(makeQuery(null));

    await expect(
        workspaceService.sendInvite({
            workspaceId: "workspace-404",
            email: "user@example.com",
            invitedBy: "user-1"
        })
    ).rejects.toMatchObject({
        message: "Workspace not found",
        statusCode: 404
    });
});

test("sendInvite rejects when inviter does not exist", async () => {
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A"
    }));
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
    });

    await expect(
        workspaceService.sendInvite({
            workspaceId: "workspace-1",
            email: "user@example.com",
            invitedBy: "user-404"
        })
    ).rejects.toMatchObject({
        message: "Inviter not found",
        statusCode: 404
    });
});

test("sendInvite parses quoted CSV rows with escaped quotes", async () => {
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A"
    }));
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-1",
            name: "Alice",
            username: "alice"
        })
    });
    User.findOne.mockResolvedValue(null);
    WorkspaceInvite.findOne.mockResolvedValue(null);
    WorkspaceInvite.create.mockResolvedValue({
        _id: "invite-1",
        email: "good@example.com",
        token: "hashed-token",
        status: "pending",
        toObject: () => ({
            _id: "invite-1",
            email: "good@example.com",
            token: "hashed-token",
            status: "pending"
        })
    });

    const result = await workspaceService.sendInvite({
        workspaceId: "workspace-1",
        invitedBy: "user-1",
        csvBuffer: Buffer.from('email,name\n"good@example.com","Display ""Name"""', "utf8")
    });

    expect(result).toEqual(expect.objectContaining({
        mode: "bulk_csv",
        sent: 1,
        failed: 0
    }));
    expect(sendMail).toHaveBeenCalledTimes(1);
});

test("sendInvite returns first failure when all invite attempts fail", async () => {
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A"
    }));
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-1",
            name: "Alice",
            username: "alice"
        })
    });

    await expect(
        workspaceService.sendInvite({
            workspaceId: "workspace-1",
            invitedBy: "user-1",
            email: "not-an-email"
        })
    ).rejects.toMatchObject({
        message: "Invalid email address: not-an-email",
        statusCode: 400
    });
});

test("sendInvite handles completely empty CSV input", async () => {
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A"
    }));
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-1",
            name: "Alice",
            username: "alice"
        })
    });

    await expect(
        workspaceService.sendInvite({
            workspaceId: "workspace-1",
            invitedBy: "user-1",
            csvBuffer: Buffer.from("", "utf8")
        })
    ).rejects.toMatchObject({
        message: "No valid email addresses found",
        statusCode: 400
    });
});

test("sendInvite tolerates null invite object from persistence layer", async () => {
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A"
    }));
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-1",
            name: "Alice",
            username: "alice"
        })
    });
    User.findOne.mockResolvedValue(null);
    WorkspaceInvite.findOne.mockResolvedValue(null);
    WorkspaceInvite.create.mockResolvedValue(null);

    const result = await workspaceService.sendInvite({
        workspaceId: "workspace-1",
        invitedBy: "user-1",
        email: "user@example.com"
    });

    expect(result).toBeNull();
});

test("sendInvite fails when target email already belongs to workspace member", async () => {
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A"
    }));
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-1",
            name: "Alice",
            username: "alice"
        })
    });
    User.findOne.mockResolvedValue({ _id: "user-2", email: "user2@example.com" });
    WorkspaceMember.findOne.mockResolvedValue({ _id: "member-1" });

    await expect(
        workspaceService.sendInvite({
            workspaceId: "workspace-1",
            invitedBy: "user-1",
            email: "user2@example.com"
        })
    ).rejects.toMatchObject({
        message: "user2@example.com is already a workspace member",
        statusCode: 400
    });
});

test("acceptInvite rejects invalid invite token", async () => {
    WorkspaceInvite.findOne.mockResolvedValue(null);

    await expect(
        workspaceService.acceptInvite("plain-token", "user-1")
    ).rejects.toMatchObject({
        message: "Invalid or already used invite token",
        statusCode: 404
    });
});

test("acceptInvite rejects when user account is missing", async () => {
    WorkspaceInvite.findOne.mockResolvedValue({
        _id: "invite-1",
        workspace: "workspace-1",
        status: "pending",
        inviteType: "email",
        email: "user@example.com",
        expiresAt: new Date(Date.now() + 60_000),
        save: jest.fn().mockResolvedValue(undefined)
    });
    User.findById.mockResolvedValue(null);

    await expect(
        workspaceService.acceptInvite("plain-token", "user-1")
    ).rejects.toMatchObject({
        message: "User not found",
        statusCode: 404
    });
});

test("acceptInvite rejects when user is already a member", async () => {
    WorkspaceInvite.findOne.mockResolvedValue({
        _id: "invite-1",
        workspace: "workspace-1",
        status: "pending",
        inviteType: "email",
        role: "member",
        email: "user@example.com",
        expiresAt: new Date(Date.now() + 60_000),
        save: jest.fn().mockResolvedValue(undefined)
    });
    User.findById.mockResolvedValue({
        _id: "user-1",
        email: "user@example.com"
    });
    WorkspaceMember.findOne.mockResolvedValue({ _id: "member-1" });

    await expect(
        workspaceService.acceptInvite("plain-token", "user-1")
    ).rejects.toMatchObject({
        message: "You are already a member of this workspace",
        statusCode: 409
    });
});

test("respondInvite rejects unknown invite id", async () => {
    WorkspaceInvite.findById.mockResolvedValue(null);

    await expect(
        workspaceService.respondInvite({
            inviteId: "invite-404",
            userId: "user-1",
            action: "accept"
        })
    ).rejects.toMatchObject({
        message: "Invite not found",
        statusCode: 404
    });
});

test("respondInvite rejects already processed invite", async () => {
    WorkspaceInvite.findById.mockResolvedValue({
        _id: "invite-1",
        invitedUser: "user-1",
        inviteType: "direct_request",
        status: "accepted",
        expiresAt: new Date(Date.now() + 60_000)
    });

    await expect(
        workspaceService.respondInvite({
            inviteId: "invite-1",
            userId: "user-1",
            action: "accept"
        })
    ).rejects.toMatchObject({
        message: "This invite has already been processed",
        statusCode: 400
    });
});

test("respondInvite rejects non-direct invite type", async () => {
    WorkspaceInvite.findById.mockResolvedValue({
        _id: "invite-1",
        invitedUser: "user-1",
        inviteType: "email",
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000)
    });

    await expect(
        workspaceService.respondInvite({
            inviteId: "invite-1",
            userId: "user-1",
            action: "accept"
        })
    ).rejects.toMatchObject({
        message: "Only in-app invite requests can be responded to here",
        statusCode: 400
    });
});

test("respondInvite rejects users other than invite target", async () => {
    WorkspaceInvite.findById.mockResolvedValue({
        _id: "invite-1",
        invitedUser: "user-2",
        inviteType: "direct_request",
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000)
    });

    await expect(
        workspaceService.respondInvite({
            inviteId: "invite-1",
            userId: "user-1",
            action: "accept"
        })
    ).rejects.toMatchObject({
        message: "You are not allowed to respond to this invite",
        statusCode: 403
    });
});

test("respondInvite rejects when invite workspace no longer exists", async () => {
    const inviteDoc = {
        _id: "invite-1",
        workspace: "workspace-1",
        invitedUser: "user-1",
        inviteType: "direct_request",
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000),
        save: jest.fn().mockResolvedValue(undefined)
    };
    WorkspaceInvite.findById.mockResolvedValue(inviteDoc);
    Workspace.findById.mockReturnValue(makeQuery(null));

    await expect(
        workspaceService.respondInvite({
            inviteId: "invite-1",
            userId: "user-1",
            action: "accept"
        })
    ).rejects.toMatchObject({
        message: "Workspace not found",
        statusCode: 404
    });
});

test("respondInvite expired path logs notification sync failures and still throws expiry", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const inviteDoc = {
        _id: "invite-1",
        workspace: "workspace-1",
        invitedUser: "user-1",
        inviteType: "direct_request",
        status: "pending",
        expiresAt: new Date(Date.now() - 60_000),
        save: jest.fn().mockResolvedValue(undefined)
    };
    WorkspaceInvite.findById.mockResolvedValue(inviteDoc);
    notificationService.setWorkspaceInviteNotificationState.mockRejectedValue(new Error("notify down"));

    await expect(
        workspaceService.respondInvite({
            inviteId: "invite-1",
            userId: "user-1",
            action: "accept"
        })
    ).rejects.toMatchObject({
        message: "Invite has expired",
        statusCode: 400
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
});

test("respondInvite reject action logs notification sync failures and returns response", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const inviteDoc = {
        _id: "invite-1",
        workspace: "workspace-1",
        invitedUser: "user-1",
        inviteType: "direct_request",
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000),
        save: jest.fn().mockResolvedValue(undefined)
    };
    WorkspaceInvite.findById.mockResolvedValue(inviteDoc);
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    notificationService.setWorkspaceInviteNotificationState.mockRejectedValue(new Error("notify down"));

    const result = await workspaceService.respondInvite({
        inviteId: "invite-1",
        userId: "user-1",
        action: "reject"
    });

    expect(result).toEqual({
        inviteId: "invite-1",
        status: "rejected",
        workspaceId: "workspace-1"
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
});

test("respondInvite accept action logs notification sync failures and still succeeds", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const inviteDoc = {
        _id: "invite-1",
        workspace: "workspace-1",
        invitedUser: "user-1",
        inviteType: "direct_request",
        status: "pending",
        role: "member",
        expiresAt: new Date(Date.now() + 60_000),
        save: jest.fn().mockResolvedValue(undefined)
    };
    WorkspaceInvite.findById.mockResolvedValue(inviteDoc);
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne.mockResolvedValue({
        _id: "member-1",
        workspace: "workspace-1",
        user: "user-1"
    });
    notificationService.setWorkspaceInviteNotificationState.mockRejectedValue(new Error("notify down"));
    getUserLabel.mockResolvedValue("Alice");

    const result = await workspaceService.respondInvite({
        inviteId: "invite-1",
        userId: "user-1",
        action: "accept"
    });

    expect(result).toEqual(expect.objectContaining({
        inviteId: "invite-1",
        status: "accepted",
        workspaceId: "workspace-1"
    }));
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
});

test("removeMember rejects unknown target member", async () => {
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(
        workspaceService.removeMember({
            workspaceId: "workspace-1",
            memberId: "user-2",
            requesterId: "owner-1"
        })
    ).rejects.toThrow("Member not found in workspace");
});

test("removeMember rejects when target member is owner", async () => {
    WorkspaceMember.findOne.mockResolvedValue({
        workspace: "workspace-1",
        user: "owner-1",
        role: "owner"
    });

    await expect(
        workspaceService.removeMember({
            workspaceId: "workspace-1",
            memberId: "owner-1",
            requesterId: "admin-1"
        })
    ).rejects.toThrow("Cannot remove workspace owner. Transfer ownership first.");
});

test("removeMember rejects self-removal for non-owner requester", async () => {
    WorkspaceMember.findOne
        .mockResolvedValueOnce({
            workspace: "workspace-1",
            user: "user-2",
            role: "member"
        })
        .mockResolvedValueOnce({
            workspace: "workspace-1",
            user: "user-2",
            role: "admin"
        });

    await expect(
        workspaceService.removeMember({
            workspaceId: "workspace-1",
            memberId: "user-2",
            requesterId: { toString: () => "user-2" }
        })
    ).rejects.toThrow("You cannot remove yourself. Please leave the workspace instead.");
});

test("removeMember aborts transaction when mutation fails", async () => {
    const session = makeSession();
    WorkspaceMember.startSession.mockResolvedValue(session);
    WorkspaceMember.findOne
        .mockResolvedValueOnce({ workspace: "workspace-1", user: "user-2", role: "member" })
        .mockResolvedValueOnce({ workspace: "workspace-1", user: "owner-1", role: "owner" });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    getUserLabel.mockResolvedValueOnce("Owner").mockResolvedValueOnce("Bob");
    WorkspaceMember.findOneAndDelete.mockRejectedValue(new Error("delete failed"));

    await expect(
        workspaceService.removeMember({
            workspaceId: "workspace-1",
            memberId: "user-2",
            requesterId: "owner-1"
        })
    ).rejects.toThrow("delete failed");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("updateMemberRole rejects missing member", async () => {
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(
        workspaceService.updateMemberRole({
            workspaceId: "workspace-1",
            memberId: "user-2",
            role: "admin",
            requesterId: "owner-1"
        })
    ).rejects.toThrow("Member not found in workspace");
});

test("updateMemberRole rejects owner role mutation through role-update endpoint", async () => {
    WorkspaceMember.findOne.mockResolvedValue({
        workspace: "workspace-1",
        user: "owner-1",
        role: "owner"
    });

    await expect(
        workspaceService.updateMemberRole({
            workspaceId: "workspace-1",
            memberId: "owner-1",
            role: "admin",
            requesterId: "owner-1"
        })
    ).rejects.toThrow("Cannot change owner role. Use transfer ownership instead.");
});

test("transferOwnership rejects when new owner is not a current member", async () => {
    WorkspaceMember.findOne.mockReset();
    const session = makeSession();
    WorkspaceMember.startSession.mockResolvedValue(session);
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    WorkspaceMember.findOne
        .mockReturnValueOnce(makeQuery({
            workspace: "workspace-1",
            user: "owner-1",
            role: "owner"
        }))
        .mockReturnValueOnce(makeQuery(null));

    await expect(
        workspaceService.transferOwnership({
            workspaceId: "workspace-1",
            newOwnerId: "user-2",
            currentOwnerId: "owner-1"
        })
    ).rejects.toThrow("New owner must be an existing workspace member");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("deleteWorkspace aborts transaction when workspace delete returns null", async () => {
    const session = makeSession();
    WorkspaceMember.startSession.mockResolvedValue(session);
    WorkspaceMember.findOne.mockResolvedValue({
        workspace: "workspace-1",
        user: "owner-1",
        role: "owner"
    });
    Workspace.findById.mockResolvedValue({
        _id: "workspace-1",
        chatId: null
    });
    Task.find.mockReturnValue(makeQuery([]));
    Workspace.findByIdAndDelete.mockResolvedValue(null);

    await expect(
        workspaceService.deleteWorkspace("workspace-1", "owner-1")
    ).rejects.toThrow("Workspace not found");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("leaveWorkspace rejects when user is not in workspace", async () => {
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(
        workspaceService.leaveWorkspace({
            workspaceId: "workspace-1",
            userId: "user-404"
        })
    ).rejects.toThrow("You are not a member of this workspace");
});

test("leaveWorkspace aborts transaction when cleanup operation fails", async () => {
    const session = makeSession();
    WorkspaceMember.startSession.mockResolvedValue(session);
    WorkspaceMember.findOne.mockResolvedValue({
        workspace: "workspace-1",
        user: "user-2",
        role: "member"
    });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    getUserLabel.mockResolvedValue("Bob");
    logActivity.mockRejectedValue(new Error("activity failed"));

    await expect(
        workspaceService.leaveWorkspace({
            workspaceId: "workspace-1",
            userId: "user-2"
        })
    ).rejects.toThrow("activity failed");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("updateWorkspace logs generic update action when workspace name is unchanged", async () => {
    logActivity.mockResolvedValue(undefined);
    WorkspaceMember.findOne.mockResolvedValue({ role: "admin" });
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1"
    }));
    Workspace.findByIdAndUpdate.mockResolvedValue({
        _id: "workspace-1",
        name: "Workspace A",
        chatId: "chat-1",
        description: "Updated description"
    });
    getUserLabel.mockResolvedValue("Alice");

    const result = await workspaceService.updateWorkspace(
        "workspace-1",
        { description: "Updated description" },
        "user-1"
    );

    expect(Chat.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "workspace.updated",
        workspaceId: "workspace-1"
    }));
    expect(result.description).toBe("Updated description");
});

test("removeMember cleanup skips subtask and chat updates when workspace has no tasks/chat", async () => {
    logActivity.mockResolvedValue(undefined);
    const session = makeSession();
    WorkspaceMember.startSession.mockResolvedValue(session);
    WorkspaceMember.findOne
        .mockResolvedValueOnce({ workspace: "workspace-1", user: "user-2", role: "member" })
        .mockResolvedValueOnce({ workspace: "workspace-1", user: "owner-1", role: "owner" });
    Workspace.findById
        .mockReturnValueOnce(makeQuery({
            _id: "workspace-1",
            name: "Workspace A",
            chatId: null
        }))
        .mockReturnValueOnce(makeQuery({
            _id: "workspace-1",
            chatId: null
        }));
    Task.find.mockReturnValue(makeQuery([]));
    WorkspaceMember.findOneAndDelete.mockResolvedValue({ _id: "member-removed" });
    getUserLabel.mockResolvedValueOnce("Owner").mockResolvedValueOnce("Bob");

    await workspaceService.removeMember({
        workspaceId: "workspace-1",
        memberId: "user-2",
        requesterId: "owner-1"
    });

    expect(Subtask.updateMany).not.toHaveBeenCalled();
    expect(Chat.findByIdAndUpdate).not.toHaveBeenCalled();
});

test("sendInvite preserves invite payload when token field is absent", async () => {
    Workspace.findById.mockReturnValue(makeQuery({
        _id: "workspace-1",
        name: "Workspace A"
    }));
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            _id: "user-1",
            name: "Alice",
            username: "alice"
        })
    });
    User.findOne.mockResolvedValue(null);
    WorkspaceInvite.findOne.mockResolvedValue(null);
    WorkspaceInvite.create.mockResolvedValue({
        _id: "invite-1",
        email: "user2@example.com",
        status: "pending",
        toObject: () => ({
            _id: "invite-1",
            email: "user2@example.com",
            status: "pending"
        })
    });

    const result = await workspaceService.sendInvite({
        workspaceId: "workspace-1",
        invitedBy: "user-1",
        email: "user2@example.com"
    });

    expect(result).toEqual({
        _id: "invite-1",
        email: "user2@example.com",
        status: "pending"
    });
});
