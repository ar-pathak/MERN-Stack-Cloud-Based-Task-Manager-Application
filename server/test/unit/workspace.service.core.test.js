jest.mock("../../src/models/workspace", () => ({
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock("../../src/models/workspaceMember.js", () => ({
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
    startSession: jest.fn()
}));

jest.mock("../../src/models/workspaceInvite", () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn(),
    findOne: jest.fn()
}));

jest.mock("../../src/models/project", () => ({}));
jest.mock("../../src/models/team", () => ({}));
jest.mock("../../src/models/tasks", () => ({}));
jest.mock("../../src/models/subtasks", () => ({}));

jest.mock("../../src/models/chat", () => ({
    create: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock("../../src/models/message", () => ({}));
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
const Chat = require("../../src/models/chat");
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
