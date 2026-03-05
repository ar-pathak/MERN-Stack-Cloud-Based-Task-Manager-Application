jest.mock("mongoose", () => ({
    startSession: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOneAndUpdate: jest.fn()
}));

jest.mock("../../src/models/workspace", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    findOne: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/models/team", () => ({
    find: jest.fn()
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
jest.mock("../../src/models/projectStatusChangeRequest", () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
}));

jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn(),
    setProjectStatusRequestNotificationState: jest.fn()
}));

jest.mock("../../src/helpers/paginationHelper", () => ({
    toPaginationMeta: jest.fn()
}));

jest.mock("../../src/modules/utils/updateParent", () => ({
    touchWorkspace: jest.fn()
}));

jest.mock("../../src/modules/utils/activityLogger", () => ({
    logActivity: jest.fn(),
    getUserLabel: jest.fn(),
    getUserLabels: jest.fn(),
    formatUserList: jest.fn()
}));

jest.mock("../../src/modules/utils/chatMembershipSync", () => ({
    syncProjectChatMembers: jest.fn(),
    syncTaskAndSubtaskChatMembers: jest.fn()
}));

const Project = require("../../src/models/project");
const Workspace = require("../../src/models/workspace");
const WorkspaceMember = require("../../src/models/workspaceMember");
const Team = require("../../src/models/team");
const Chat = require("../../src/models/chat");
const Task = require("../../src/models/tasks");
const Subtask = require("../../src/models/subtasks");
const Message = require("../../src/models/message");
const ProjectStatusChangeRequest = require("../../src/models/projectStatusChangeRequest");
const mongoose = require("mongoose");
const { toPaginationMeta } = require("../../src/helpers/paginationHelper");
const { touchWorkspace } = require("../../src/modules/utils/updateParent");
const { logActivity, getUserLabel, getUserLabels, formatUserList } = require("../../src/modules/utils/activityLogger");
const notificationService = require("../../src/modules/notification/notification.service");
const { syncProjectChatMembers, syncTaskAndSubtaskChatMembers } = require("../../src/modules/utils/chatMembershipSync");
const projectService = require("../../src/modules/projects/project.service");

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

test("getProjectsByWorkspace throws when workspace is missing", async () => {
    Workspace.findById.mockReturnValue(makeQuery(null));

    await expect(projectService.getProjectsByWorkspace("w1", "u1"))
        .rejects
        .toThrow("Workspace not found");
});

test("getProjectsByWorkspace throws when user is not workspace member", async () => {
    Workspace.findById.mockReturnValue(makeQuery({ _id: "w1", name: "Workspace" }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery(null));

    await expect(projectService.getProjectsByWorkspace("w1", "u1"))
        .rejects
        .toThrow("You do not have access to this workspace");
});

test("getProjectsByWorkspace returns paginated project list", async () => {
    Workspace.findById.mockReturnValue(makeQuery({ _id: "w1", name: "Workspace" }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));
    const listQuery = makeQuery([{ _id: "p1" }, { _id: "p2" }]);
    Project.find.mockReturnValue(listQuery);
    Project.countDocuments.mockResolvedValue(5);
    toPaginationMeta.mockReturnValue({ page: 2, limit: 2, total: 5, pages: 3 });

    const result = await projectService.getProjectsByWorkspace("w1", "u1", {
        enabled: true,
        page: 2,
        limit: 2,
        skip: 2
    });

    expect(result).toEqual({
        items: [{ _id: "p1" }, { _id: "p2" }],
        pagination: { page: 2, limit: 2, total: 5, pages: 3 }
    });
});

test("getProjectById throws when project does not exist", async () => {
    Project.findById.mockReturnValue(makeQuery(null));

    await expect(projectService.getProjectById("p1", "u1"))
        .rejects
        .toThrow("Project not found");
});

test("getProjectById allows workspace member even when not project member", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        owner: "owner-1",
        workspace: "w1",
        members: [],
        teams: []
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "viewer" }));

    const result = await projectService.getProjectById("p1", "u1");

    expect(result).toEqual({
        _id: "p1",
        owner: "owner-1",
        workspace: "w1",
        members: [],
        teams: []
    });
});

test("createProject rejects non-admin workspace member", async () => {
    Workspace.findById.mockReturnValue(makeQuery({ _id: "w1", name: "Workspace", chatId: "chat-w1" }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));

    await expect(projectService.createProject({
        data: { name: "Project X" },
        workspaceId: "w1",
        userId: "u1"
    })).rejects.toThrow("Only workspace owners and admins can create projects");
});

test("createProject rejects duplicate project name", async () => {
    Workspace.findById.mockReturnValue(makeQuery({ _id: "w1", name: "Workspace", chatId: "chat-w1" }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Project.findOne.mockReturnValue(makeQuery({ _id: "existing-project" }));

    await expect(projectService.createProject({
        data: { name: "Project X" },
        workspaceId: "w1",
        userId: "u1"
    })).rejects.toThrow("Project with the same name already exists in this workspace");
});

test("createProject creates and returns populated project", async () => {
    Workspace.findById.mockReturnValue(makeQuery({ _id: "w1", name: "Workspace", chatId: "chat-w1" }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Project.findOne.mockReturnValue(makeQuery(null));
    WorkspaceMember.find.mockReturnValue(makeQuery([{ user: "u1" }, { user: "u2" }]));
    Team.find.mockReturnValue(makeQuery([{ _id: "t1" }]));
    Chat.create.mockResolvedValue({ _id: "chat-p1" });
    Project.create.mockResolvedValue({
        _id: "p1",
        workspace: "w1",
        owner: "u1",
        name: "Project X",
        members: [{ user: "u1", role: "admin" }, { user: "u2", role: "member" }],
        teams: ["t1"],
        chatId: "chat-p1"
    });
    syncProjectChatMembers.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Alice");
    logActivity.mockResolvedValue({});
    touchWorkspace.mockResolvedValue({});
    Project.findById.mockReturnValueOnce(makeQuery({
        _id: "p1",
        name: "Project X",
        chatId: "chat-p1"
    }));

    const result = await projectService.createProject({
        data: {
            name: "Project X",
            members: [{ user: "u2", role: "member" }],
            teams: ["t1"]
        },
        workspaceId: "w1",
        userId: "u1"
    });

    expect(result).toEqual({
        _id: "p1",
        name: "Project X",
        chatId: "chat-p1"
    });
    expect(syncProjectChatMembers).toHaveBeenCalledWith("p1");
    expect(logActivity).toHaveBeenCalledTimes(1);
    expect(touchWorkspace).toHaveBeenCalledWith("w1");
});

test("updateProject rejects workspace mismatch", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "member" }],
        settings: { statusChangeAdminApprovalEnabled: false },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));

    await expect(projectService.updateProject({
        projectId: "p1",
        workspaceId: "w2",
        updateData: { name: "New Name" },
        userId: "u1"
    })).rejects.toMatchObject({
        message: "Project does not belong to this workspace",
        statusCode: 400
    });
});

test("updateProject enforces admin approval for status change", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "member" }],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));

    await expect(projectService.updateProject({
        projectId: "p1",
        updateData: { status: "archived" },
        userId: "u1"
    })).rejects.toMatchObject({
        message: "Project status changes require project admin approval. Submit a status change request.",
        statusCode: 403
    });
});

test("requestProjectStatusChange creates a pending request and notifies project admins", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [
            { user: "u1", role: "member" },
            { user: "admin-2", role: "admin" }
        ],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));
    ProjectStatusChangeRequest.findOne.mockReturnValue(makeQuery(null));
    ProjectStatusChangeRequest.create.mockResolvedValue({
        _id: "req-1",
        note: "Need archival",
        requestedBy: "u1"
    });
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1" }));
    getUserLabel.mockResolvedValue("Alice");

    const result = await projectService.requestProjectStatusChange({
        workspaceId: "w1",
        projectId: "p1",
        requestedStatus: "archived",
        note: "Need archival",
        userId: "u1"
    });

    expect(result).toEqual({
        _id: "req-1",
        note: "Need archival",
        requestedBy: "u1"
    });
    expect(ProjectStatusChangeRequest.create).toHaveBeenCalledWith(expect.objectContaining({
        workspace: "w1",
        project: "p1",
        requestedBy: "u1",
        requestedStatus: "archived",
        previousStatus: "active",
        note: "Need archival"
    }));
    expect(notificationService.createNotifications).toHaveBeenCalledWith(expect.objectContaining({
        recipientIds: expect.arrayContaining(["owner-1", "admin-2"]),
        entityType: "project",
        entityId: "p1"
    }));
    expect(logActivity).toHaveBeenCalledTimes(1);
});

test("respondProjectStatusChangeRequest approves request and updates project status", async () => {
    const project = {
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        chatId: "chat-p1",
        owner: "owner-1",
        status: "active",
        members: [{ user: "u1", role: "admin" }],
        save: jest.fn().mockResolvedValue(undefined)
    };
    const request = {
        _id: "req-1",
        requestedBy: "u2",
        requestedStatus: "completed",
        status: "pending",
        save: jest.fn().mockResolvedValue(undefined)
    };

    Project.findById.mockReturnValue(makeQuery(project));
    ProjectStatusChangeRequest.findOne.mockResolvedValue(request);
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1" }));
    getUserLabel.mockResolvedValueOnce("Admin").mockResolvedValueOnce("Requester");

    const result = await projectService.respondProjectStatusChangeRequest({
        workspaceId: "w1",
        projectId: "p1",
        requestId: "req-1",
        action: "approve",
        userId: "u1"
    });

    expect(request.save).toHaveBeenCalledTimes(1);
    expect(project.save).toHaveBeenCalledTimes(1);
    expect(result.projectStatus).toBe("completed");
    expect(notificationService.setProjectStatusRequestNotificationState).toHaveBeenCalledWith({
        requestId: "req-1",
        requestState: "approved",
        recipientUserIds: expect.arrayContaining(["owner-1", "u1"]),
        read: true
    });
    expect(touchWorkspace).toHaveBeenCalledWith("w1");
});

test("deleteProject removes related resources in a transaction", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);

    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        chatId: "chat-p1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }]
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Workspace.findById.mockReturnValue(makeQuery({ name: "Workspace A", chatId: "chat-w1" }));
    Task.find.mockReturnValue(makeQuery([{ _id: "t1" }]));
    getUserLabel.mockResolvedValue("Admin");
    Project.findByIdAndDelete.mockResolvedValue({ _id: "p1" });

    const result = await projectService.deleteProject("p1", "u1");

    expect(result).toEqual({
        message: "Project deleted successfully",
        projectId: "p1"
    });
    expect(Subtask.deleteMany).toHaveBeenCalledWith({ task: { $in: ["t1"] } }, { session });
    expect(Task.deleteMany).toHaveBeenCalledWith({ project: "p1" }, { session });
    expect(ProjectStatusChangeRequest.deleteMany).toHaveBeenCalledWith({ project: "p1" }, { session });
    expect(Message.deleteMany).toHaveBeenCalledWith({ chatId: "chat-p1" }, { session });
    expect(Chat.findByIdAndDelete).toHaveBeenCalledWith("chat-p1", { session });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(touchWorkspace).toHaveBeenCalledWith("w1");
});

test("addProjectMembers adds only new members and logs activity", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        chatId: "chat-p1",
        members: [{ user: "u1", role: "admin" }],
        teams: []
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    WorkspaceMember.find.mockReturnValue(makeQuery([{ user: "u2" }]));
    Project.findByIdAndUpdate.mockResolvedValue({ _id: "p1" });
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1" }));
    getUserLabel.mockResolvedValue("Admin");
    getUserLabels.mockResolvedValue(["Bob"]);
    formatUserList.mockReturnValue("Bob");

    const result = await projectService.addProjectMembers(
        "p1",
        {
            members: [
                { user: "u1", role: "admin" },
                { user: "u2", role: "member" }
            ]
        },
        "u1"
    );

    expect(result).toEqual({ message: "1 new member(s) added successfully" });
    expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        "p1",
        { $push: { members: { $each: [{ user: "u2", role: "member" }] } } },
        { new: true }
    );
    expect(syncProjectChatMembers).toHaveBeenCalledWith("p1");
});

test("updateProjectMemberRole updates target member role", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        chatId: "chat-p1",
        members: [{ user: "u1", role: "admin" }, { user: "u2", role: "member" }],
        teams: []
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Project.findOneAndUpdate.mockResolvedValue({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        chatId: "chat-p1"
    });
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1" }));
    getUserLabel.mockResolvedValueOnce("Admin").mockResolvedValueOnce("Bob");

    const result = await projectService.updateProjectMemberRole("p1", "u2", "viewer", "u1");

    expect(result).toEqual({ message: "Member role updated successfully" });
    expect(Project.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "p1", "members.user": "u2" },
        { $set: { "members.$.role": "viewer" } },
        { new: true }
    );
    expect(syncProjectChatMembers).toHaveBeenCalledWith("p1");
});

test("updateProject merges settings when requester can manage settings", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "member" }],
        settings: {
            statusChangeAdminApprovalEnabled: true,
            budgetVisibility: "private",
            toObject: () => ({
                statusChangeAdminApprovalEnabled: true,
                budgetVisibility: "private"
            })
        },
        status: "active",
        chatId: "chat-p1"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Project.findByIdAndUpdate.mockReturnValue(makeQuery({
        _id: "p1",
        workspace: "w1",
        name: "Project X",
        status: "active",
        chatId: "chat-p1"
    }));
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1", name: "Workspace A" }));
    getUserLabel.mockResolvedValue("Admin");

    await projectService.updateProject({
        projectId: "p1",
        updateData: {
            settings: {
                statusChangeAdminApprovalEnabled: false
            }
        },
        userId: "u1"
    });

    expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
            settings: {
                statusChangeAdminApprovalEnabled: false,
                budgetVisibility: "private"
            }
        }),
        { new: true, runValidators: true }
    );
});

test("updateProject rejects duplicate project name in workspace", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }],
        settings: { statusChangeAdminApprovalEnabled: false },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Project.findOne.mockReturnValue(makeQuery({ _id: "duplicate" }));

    await expect(
        projectService.updateProject({
            projectId: "p1",
            updateData: { name: "Project Y" },
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "Project with the same name already exists in this workspace",
        statusCode: 409
    });
});

test("requestProjectStatusChange rejects when approval workflow is disabled", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "member" }],
        settings: { statusChangeAdminApprovalEnabled: false },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));

    await expect(
        projectService.requestProjectStatusChange({
            projectId: "p1",
            requestedStatus: "archived",
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "Status approval workflow is disabled for this project",
        statusCode: 400
    });
});

test("requestProjectStatusChange rejects workspace viewers", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "member" }],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "viewer" }));

    await expect(
        projectService.requestProjectStatusChange({
            projectId: "p1",
            requestedStatus: "archived",
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "Workspace viewers cannot request project status changes",
        statusCode: 403
    });
});

test("requestProjectStatusChange rejects project viewers", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "viewer" }],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));

    await expect(
        projectService.requestProjectStatusChange({
            projectId: "p1",
            requestedStatus: "archived",
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "Project viewers cannot request status changes",
        statusCode: 403
    });
});

test("requestProjectStatusChange rejects project admins (direct change allowed)", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));

    await expect(
        projectService.requestProjectStatusChange({
            projectId: "p1",
            requestedStatus: "archived",
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "Project admins can change project status directly",
        statusCode: 400
    });
});

test("requestProjectStatusChange rejects duplicate pending request", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "member" }],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));
    ProjectStatusChangeRequest.findOne.mockReturnValue(makeQuery({ _id: "pending-1" }));

    await expect(
        projectService.requestProjectStatusChange({
            projectId: "p1",
            requestedStatus: "archived",
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "You already have a pending request for this status",
        statusCode: 409
    });
});

test("respondProjectStatusChangeRequest rejects non-admin reviewer", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u2", role: "member" }],
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));

    await expect(
        projectService.respondProjectStatusChangeRequest({
            projectId: "p1",
            requestId: "req-1",
            action: "approve",
            userId: "u2"
        })
    ).rejects.toMatchObject({
        message: "Only project admins can review status change requests",
        statusCode: 403
    });
});

test("respondProjectStatusChangeRequest rejects when request is missing", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }],
        status: "active"
    }));
    ProjectStatusChangeRequest.findOne.mockResolvedValue(null);

    await expect(
        projectService.respondProjectStatusChangeRequest({
            projectId: "p1",
            requestId: "req-404",
            action: "approve",
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "Project status change request not found or already processed",
        statusCode: 404
    });
});

test("respondProjectStatusChangeRequest handles rejection without changing status", async () => {
    const project = {
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        chatId: "chat-p1",
        owner: "owner-1",
        status: "active",
        members: [{ user: "u1", role: "admin" }],
        save: jest.fn().mockResolvedValue(undefined)
    };
    const request = {
        _id: "req-1",
        requestedBy: "u2",
        requestedStatus: "completed",
        status: "pending",
        save: jest.fn().mockResolvedValue(undefined)
    };
    Project.findById.mockReturnValue(makeQuery(project));
    ProjectStatusChangeRequest.findOne.mockResolvedValue(request);
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1" }));
    getUserLabel.mockResolvedValueOnce("Admin").mockResolvedValueOnce("Requester");

    const result = await projectService.respondProjectStatusChangeRequest({
        projectId: "p1",
        requestId: "req-1",
        action: "reject",
        userId: "u1"
    });

    expect(project.save).not.toHaveBeenCalled();
    expect(request.status).toBe("rejected");
    expect(result.projectStatus).toBe("active");
    expect(notificationService.setProjectStatusRequestNotificationState).toHaveBeenCalledWith({
        requestId: "req-1",
        requestState: "rejected",
        recipientUserIds: expect.arrayContaining(["owner-1", "u1"]),
        read: true
    });
});

test("addProjectMembers returns no-op message when all members already exist", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        chatId: "chat-p1",
        members: [{ user: "u1", role: "admin" }],
        teams: []
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));

    const result = await projectService.addProjectMembers(
        "p1",
        {
            members: [{ user: "u1", role: "admin" }]
        },
        "u1"
    );

    expect(result).toEqual({
        message: "All selected members are already in the project"
    });
    expect(Project.findByIdAndUpdate).not.toHaveBeenCalled();
});

test("removeProjectMembers rejects when trying to remove project owner", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "owner-1", role: "admin" }],
        teams: []
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));

    await expect(
        projectService.removeProjectMembers("p1", { users: ["owner-1"] }, "u1")
    ).rejects.toThrow("Project owner cannot be removed from members");
});

test("leaveProject rejects project owner", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        owner: "u1",
        members: [{ user: "u2" }]
    }));

    await expect(projectService.leaveProject("p1", "u1"))
        .rejects
        .toThrow("Project owner cannot leave the project. Transfer ownership or delete the project first.");
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("leaveProject rejects when requester is not a project member", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        owner: "owner-1",
        members: [{ user: "u2" }]
    }));

    await expect(projectService.leaveProject("p1", "u3"))
        .rejects
        .toThrow("You are not a member of this project");
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("leaveProject removes member and syncs project chat", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: { toString: () => "u2" } }],
        name: "Project X",
        chatId: "chat-p1"
    }));
    Workspace.findById.mockReturnValue(makeQuery({ name: "Workspace", chatId: "chat-w1" }));
    Task.updateMany.mockResolvedValue({});
    Task.find.mockReturnValue(makeQuery([]));
    Project.findByIdAndUpdate.mockResolvedValue({ _id: "p1" });
    getUserLabel.mockResolvedValue("Bob");

    const result = await projectService.leaveProject("p1", "u2");

    expect(result).toEqual({
        message: "You have left the project successfully"
    });
    expect(syncProjectChatMembers).toHaveBeenCalledWith("p1", { session });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
});

test("getProjectsByWorkspace returns non-paginated list when pagination disabled", async () => {
    Workspace.findById.mockReturnValue(makeQuery({ _id: "w1", name: "Workspace" }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));
    Project.find.mockReturnValue(makeQuery([{ _id: "p1" }]));

    const result = await projectService.getProjectsByWorkspace("w1", "u1", { enabled: false });

    expect(result).toEqual([{ _id: "p1" }]);
});

test("updateProject rejects requester without edit permissions", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [],
        settings: { statusChangeAdminApprovalEnabled: false },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "viewer" }));

    await expect(
        projectService.updateProject({
            projectId: "p1",
            updateData: { description: "new" },
            userId: "u1"
        })
    ).rejects.toThrow("You are not allowed to update this project");
});

test("updateProject validates teams in workspace and rejects foreign teams", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }],
        settings: { statusChangeAdminApprovalEnabled: false },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Team.find.mockReturnValue(makeQuery([]));

    await expect(
        projectService.updateProject({
            projectId: "p1",
            updateData: { teams: ["t1"] },
            userId: "u1"
        })
    ).rejects.toThrow("Some selected teams do not belong to this workspace");
});

test("updateProject throws when project cannot be loaded after update", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }],
        settings: { statusChangeAdminApprovalEnabled: false },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Project.findByIdAndUpdate.mockReturnValue(makeQuery(null));

    await expect(
        projectService.updateProject({
            projectId: "p1",
            updateData: { description: "changed" },
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "Project not found",
        statusCode: 404
    });
});

test("updateProject renames project and syncs project chat title", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }],
        settings: { statusChangeAdminApprovalEnabled: false },
        status: "active",
        chatId: "chat-p1"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Project.findOne.mockReturnValue(makeQuery(null));
    Project.findByIdAndUpdate.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project Renamed",
        workspace: "w1",
        status: "active",
        chatId: "chat-p1"
    }));
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1", name: "Workspace A" }));
    getUserLabel.mockResolvedValue("Admin");

    const result = await projectService.updateProject({
        projectId: "p1",
        updateData: { name: "Project Renamed" },
        userId: "u1"
    });

    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-p1", { name: "Project Renamed" });
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "project.renamed"
    }));
    expect(result.name).toBe("Project Renamed");
});

test("updateProject logs status-change activity when status changes", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active",
        chatId: "chat-p1"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Project.findByIdAndUpdate.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        status: "completed",
        chatId: "chat-p1"
    }));
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1" }));
    getUserLabel.mockResolvedValue("Admin");

    await projectService.updateProject({
        projectId: "p1",
        updateData: { status: "completed" },
        userId: "u1"
    });

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "project.status_changed"
    }));
});

test("requestProjectStatusChange validates workspace ownership mapping", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "member" }],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));

    await expect(
        projectService.requestProjectStatusChange({
            workspaceId: "w2",
            projectId: "p1",
            requestedStatus: "archived",
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "Project does not belong to this workspace",
        statusCode: 400
    });
});

test("requestProjectStatusChange rejects non-member requesters and unknown workspace roles", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));

    await expect(
        projectService.requestProjectStatusChange({
            projectId: "p1",
            requestedStatus: "archived",
            userId: "u2"
        })
    ).rejects.toMatchObject({
        message: "Only project members can request project status changes",
        statusCode: 403
    });

    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "member" }],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "guest" }));

    await expect(
        projectService.requestProjectStatusChange({
            projectId: "p1",
            requestedStatus: "archived",
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "You are not allowed to request project status changes",
        statusCode: 403
    });
});

test("requestProjectStatusChange rejects same-status requests", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "member" }],
        settings: { statusChangeAdminApprovalEnabled: true },
        status: "active"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "member" }));

    await expect(
        projectService.requestProjectStatusChange({
            projectId: "p1",
            requestedStatus: "active",
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "Project already has this status",
        statusCode: 400
    });
});

test("respondProjectStatusChangeRequest validates workspace mapping", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }],
        status: "active"
    }));

    await expect(
        projectService.respondProjectStatusChangeRequest({
            workspaceId: "w2",
            projectId: "p1",
            requestId: "req-1",
            action: "approve",
            userId: "u1"
        })
    ).rejects.toMatchObject({
        message: "Project does not belong to this workspace",
        statusCode: 400
    });
});

test("deleteProject throws when project is missing or user is unauthorized", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Project.findById.mockReturnValue(makeQuery(null));

    await expect(projectService.deleteProject("p404", "u1"))
        .rejects
        .toThrow("Project not found");

    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        workspace: "w1",
        owner: "owner-1",
        members: [],
        name: "Project X"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "viewer" }));

    await expect(projectService.deleteProject("p1", "u2"))
        .rejects
        .toThrow("Only workspace owners/admins or project owner can delete this project");
});

test("deleteProject aborts transaction when cascading operations fail", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        chatId: null,
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }]
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Workspace.findById.mockReturnValue(makeQuery({ name: "Workspace A", chatId: "chat-w1" }));
    Task.find.mockReturnValue(makeQuery([]));
    getUserLabel.mockResolvedValue("Admin");
    Task.deleteMany.mockRejectedValue(new Error("delete-failed"));

    await expect(projectService.deleteProject("p1", "u1"))
        .rejects
        .toThrow("delete-failed");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("project team/member helper methods return expected payloads", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        chatId: "chat-p1",
        members: [{ user: "u1", role: "admin" }],
        teams: [{ _id: "t1" }]
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Team.find.mockReturnValue(makeQuery([{ _id: "t1" }, { _id: "t2" }]));
    Project.findByIdAndUpdate.mockResolvedValue({ _id: "p1" });
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1" }));
    getUserLabel.mockResolvedValue("Admin");

    const teams = await projectService.getProjectTeams("p1", "u1");
    const addTeams = await projectService.addProjectTeams("p1", { teams: ["t1", "t2"] }, "u1");
    const removeTeams = await projectService.removeProjectTeams("p1", { teams: ["t2"] }, "u1");
    const members = await projectService.getProjectMembers("p1", "u1");

    expect(teams).toEqual([{ _id: "t1" }]);
    expect(addTeams).toEqual({ message: "Teams added to project" });
    expect(removeTeams).toEqual({ message: "Teams removed from project" });
    expect(members).toEqual([{ user: "u1", role: "admin" }]);
});

test("removeProjectMembers removes users from members/tasks/subtasks", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        chatId: "chat-p1",
        members: [{ user: "u1", role: "admin" }, { user: "u2", role: "member" }],
        teams: []
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Task.find.mockReturnValue(makeQuery([{ _id: "task-1" }]));
    Task.updateMany.mockResolvedValue({});
    Subtask.updateMany.mockResolvedValue({});
    syncTaskAndSubtaskChatMembers.mockResolvedValue({});
    Project.findByIdAndUpdate.mockResolvedValue({ _id: "p1" });
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1" }));
    getUserLabel.mockResolvedValue("Admin");
    getUserLabels.mockResolvedValue(["Bob"]);
    formatUserList.mockReturnValue("Bob");

    const result = await projectService.removeProjectMembers("p1", { users: ["u2"] }, "u1");

    expect(Task.updateMany).toHaveBeenCalledWith(
        { project: "p1" },
        { $pull: { assignees: { $in: ["u2"] } } },
        { session }
    );
    expect(Subtask.updateMany).toHaveBeenCalledWith(
        { task: { $in: ["task-1"] } },
        { $pull: { assignedTo: { $in: ["u2"] } } },
        { session }
    );
    expect(syncTaskAndSubtaskChatMembers).toHaveBeenCalledWith("task-1", { session });
    expect(result).toEqual({
        message: "Members removed from project and unassigned from tasks"
    });
});

test("removeProjectMembers throws when project update returns null", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }, { user: "u2", role: "member" }],
        teams: []
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    Task.find.mockReturnValue(makeQuery([]));
    Task.updateMany.mockResolvedValue({});
    Project.findByIdAndUpdate.mockResolvedValue(null);

    await expect(
        projectService.removeProjectMembers("p1", { users: ["u2"] }, "u1")
    ).rejects.toThrow("Project not found");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
});

test("updateProjectMemberRole validates owner and target member existence", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }],
        teams: []
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));

    await expect(
        projectService.updateProjectMemberRole("p1", "owner-1", "member", "u1")
    ).rejects.toThrow("Project owner role cannot be changed");

    Project.findOneAndUpdate.mockResolvedValue(null);
    await expect(
        projectService.updateProjectMemberRole("p1", "u2", "viewer", "u1")
    ).rejects.toThrow("Project not found or user is not a member of this project");
});

test("leaveProject throws when project is not found", async () => {
    const session = makeSession();
    mongoose.startSession.mockResolvedValue(session);
    Project.findById.mockReturnValue(makeQuery(null));

    await expect(projectService.leaveProject("p404", "u1"))
        .rejects
        .toThrow("Project not found");
});

test("updateProject normalizes member payload and defaults missing roles to viewer", async () => {
    Project.findById.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        owner: "owner-1",
        members: [{ user: "u1", role: "admin" }],
        settings: { statusChangeAdminApprovalEnabled: false },
        status: "active",
        chatId: "chat-p1"
    }));
    WorkspaceMember.findOne.mockReturnValue(makeQuery({ role: "admin" }));
    WorkspaceMember.find.mockReturnValue(makeQuery([{ user: "u2" }, { user: "owner-1" }]));
    Project.findByIdAndUpdate.mockReturnValue(makeQuery({
        _id: "p1",
        name: "Project X",
        workspace: "w1",
        status: "active",
        chatId: "chat-p1"
    }));
    Workspace.findById.mockReturnValue(makeQuery({ chatId: "chat-w1", name: "Workspace A" }));
    getUserLabel.mockResolvedValue("Admin");

    await projectService.updateProject({
        projectId: "p1",
        updateData: {
            members: [
                null,
                { user: "u2" }
            ]
        },
        userId: "u1"
    });

    expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
            members: expect.arrayContaining([
                { user: "u2", role: "viewer" },
                { user: "owner-1", role: "admin" }
            ])
        }),
        { new: true, runValidators: true }
    );
});
