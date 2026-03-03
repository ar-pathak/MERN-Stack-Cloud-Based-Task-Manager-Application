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
const { syncProjectChatMembers } = require("../../src/modules/utils/chatMembershipSync");
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
