jest.mock("../../src/models/chat", () => ({
    findByIdAndUpdate: jest.fn(),
    bulkWrite: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findById: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/models/subtasks", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    findById: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/models/team", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    find: jest.fn()
}));

const Chat = require("../../src/models/chat");
const Project = require("../../src/models/project");
const Subtask = require("../../src/models/subtasks");
const Task = require("../../src/models/tasks");
const Team = require("../../src/models/team");
const WorkspaceMember = require("../../src/models/workspaceMember");
const {
    getProjectAdminIds,
    getTeamMemberIds,
    getWorkspaceAdminIds,
    syncProjectChatMembers,
    syncTaskAndSubtaskChatMembers,
    syncChatsForTeam,
    syncWorkspaceChats
} = require("../../src/modules/utils/chatMembershipSync");

const makeQuery = (value) => {
    const query = {};
    query.session = jest.fn().mockReturnValue(query);
    query.select = jest.fn().mockReturnValue(query);
    query.populate = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockResolvedValue(value);
    query.exec = jest.fn().mockResolvedValue(value);
    return query;
};

beforeEach(() => {
    jest.clearAllMocks();
});

test("getTeamMemberIds returns unique team members", async () => {
    Team.find.mockReturnValue(makeQuery([
        { members: [{ user: "u1" }, { user: "u2" }] },
        { members: [{ user: "u2" }, { user: "u3" }] }
    ]));

    const ids = await getTeamMemberIds(["t1", "t1", "t2"]);

    expect(ids.sort()).toEqual(["u1", "u2", "u3"]);
    expect(Team.find).toHaveBeenCalledWith({ _id: { $in: ["t1", "t2"] } });
});

test("getWorkspaceAdminIds returns empty list for missing workspace", async () => {
    const ids = await getWorkspaceAdminIds(null);
    expect(ids).toEqual([]);
    expect(WorkspaceMember.find).not.toHaveBeenCalled();
});

test("getProjectAdminIds resolves owner plus admin members", async () => {
    const ids = await getProjectAdminIds({
        owner: "owner-1",
        members: [
            { user: "admin-1", role: "admin" },
            { user: "member-1", role: "member" },
            { user: "admin-1", role: "admin" }
        ]
    });

    expect(ids.sort()).toEqual(["admin-1", "owner-1"]);
});

test("syncProjectChatMembers returns null when project has no chat", async () => {
    Project.findById.mockReturnValue(makeQuery({
        workspace: "workspace-1",
        owner: "owner-1",
        members: [],
        teams: [],
        chatId: null
    }));

    const result = await syncProjectChatMembers("project-1");

    expect(result).toBeNull();
    expect(Chat.findByIdAndUpdate).not.toHaveBeenCalled();
});

test("syncProjectChatMembers updates chat members from project + workspace + teams", async () => {
    Project.findById.mockReturnValue(makeQuery({
        workspace: "workspace-1",
        owner: "owner-1",
        members: [
            { user: "member-1", role: "member" },
            { user: "admin-2", role: "admin" }
        ],
        teams: ["team-1"],
        chatId: "chat-1"
    }));
    WorkspaceMember.find.mockReturnValue(makeQuery([
        { user: "workspace-admin" }
    ]));
    Team.find.mockReturnValue(makeQuery([
        { members: [{ user: "team-member" }, { user: "member-1" }] }
    ]));
    Chat.findByIdAndUpdate.mockResolvedValue({});

    const result = await syncProjectChatMembers("project-1");
    const updatedMembers = Chat.findByIdAndUpdate.mock.calls[0][1].members;

    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-1", {
        members: expect.any(Array)
    });
    expect(updatedMembers.sort()).toEqual(
        ["owner-1", "member-1", "admin-2", "workspace-admin", "team-member"].sort()
    );
    expect(result).toEqual({
        projectId: "project-1",
        chatId: "chat-1",
        memberIds: updatedMembers
    });
});

test("syncTaskAndSubtaskChatMembers syncs task chat and subtask chats", async () => {
    Task.findById.mockReturnValue(makeQuery({
        chatId: "task-chat-1",
        createdBy: "owner-1",
        assignees: ["assignee-1"],
        assigneesTeams: ["team-1"],
        workspace: "workspace-1",
        project: "project-1"
    }));
    Team.find.mockReturnValue(makeQuery([
        { members: [{ user: "team-user-1" }, { user: "team-user-2" }] }
    ]));
    WorkspaceMember.find.mockReturnValue(makeQuery([
        { user: "workspace-admin" }
    ]));
    Project.findById.mockReturnValue(makeQuery({
        owner: "project-owner",
        members: [{ user: "project-admin", role: "admin" }]
    }));
    Subtask.find.mockReturnValue(makeQuery([
        { chatId: "sub-chat-1", createdBy: "owner-1", assignedTo: ["assignee-1"] },
        { chatId: "sub-chat-2", createdBy: "creator-2", assignedTo: [] }
    ]));
    Chat.findByIdAndUpdate.mockResolvedValue({});
    Chat.bulkWrite.mockResolvedValue({});

    const result = await syncTaskAndSubtaskChatMembers("task-1");

    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("task-chat-1", {
        members: expect.any(Array)
    });
    expect(Chat.bulkWrite).toHaveBeenCalledTimes(1);
    expect(Chat.bulkWrite.mock.calls[0][0]).toHaveLength(2);
    expect(result.taskId).toBe("task-1");
    expect(result.subtasksSynced).toBe(2);
});

test("syncChatsForTeam syncs related projects and tasks", async () => {
    Project.find.mockReturnValueOnce(makeQuery([{ _id: "project-1" }]));
    Task.find.mockReturnValueOnce(makeQuery([{ _id: "task-1" }]));

    Project.findById.mockReturnValueOnce(makeQuery({
        workspace: "workspace-1",
        owner: "owner-1",
        members: [],
        teams: [],
        chatId: "project-chat-1"
    }));
    WorkspaceMember.find.mockReturnValueOnce(makeQuery([]));
    Team.find.mockReturnValueOnce(makeQuery([]));

    Task.findById.mockReturnValueOnce(makeQuery({
        chatId: "task-chat-1",
        createdBy: "owner-1",
        assignees: [],
        assigneesTeams: [],
        workspace: "workspace-1",
        project: null
    }));
    Team.find.mockReturnValueOnce(makeQuery([]));
    WorkspaceMember.find.mockReturnValueOnce(makeQuery([]));
    Subtask.find.mockReturnValueOnce(makeQuery([]));

    Chat.findByIdAndUpdate.mockResolvedValue({});
    Chat.bulkWrite.mockResolvedValue({});

    const result = await syncChatsForTeam("team-1");

    expect(result).toEqual({
        projectsSynced: 1,
        tasksSynced: 1
    });
});

test("syncWorkspaceChats returns zero counts for empty workspace id", async () => {
    const result = await syncWorkspaceChats(undefined);
    expect(result).toEqual({ projectsSynced: 0, tasksSynced: 0 });
    expect(Project.find).not.toHaveBeenCalled();
    expect(Task.find).not.toHaveBeenCalled();
});

test("getTeamMemberIds returns empty list for empty team ids", async () => {
    const ids = await getTeamMemberIds([]);
    expect(ids).toEqual([]);
    expect(Team.find).not.toHaveBeenCalled();
});

test("getWorkspaceAdminIds supports object ids via toHexString and session", async () => {
    const session = { id: "session-1" };
    const adminsQuery = makeQuery([{ user: "owner-1" }, { user: "admin-1" }]);
    WorkspaceMember.find.mockReturnValue(adminsQuery);

    const ids = await getWorkspaceAdminIds(
        { toHexString: () => "workspace-hex-1" },
        session
    );

    expect(WorkspaceMember.find).toHaveBeenCalledWith({
        workspace: "workspace-hex-1",
        role: { $in: ["owner", "admin"] },
        status: { $ne: "archived" }
    });
    expect(adminsQuery.session).toHaveBeenCalledWith(session);
    expect(ids.sort()).toEqual(["admin-1", "owner-1"]);
});

test("getProjectAdminIds returns empty for invalid object-style id and loads by id when needed", async () => {
    const empty = await getProjectAdminIds({});
    expect(empty).toEqual([]);
    expect(Project.findById).not.toHaveBeenCalled();

    const session = { id: "session-2" };
    const projectQuery = makeQuery({
        owner: "owner-1",
        members: [{ user: "admin-1", role: "admin" }]
    });
    Project.findById.mockReturnValue(projectQuery);

    const ids = await getProjectAdminIds("project-1", session);

    expect(projectQuery.session).toHaveBeenCalledWith(session);
    expect(ids.sort()).toEqual(["admin-1", "owner-1"]);
});

test("syncProjectChatMembers returns null for invalid id or missing project", async () => {
    const invalidResult = await syncProjectChatMembers({});
    expect(invalidResult).toBeNull();
    expect(Project.findById).not.toHaveBeenCalled();

    Project.findById.mockReturnValue(makeQuery(null));
    const missingResult = await syncProjectChatMembers("project-404");
    expect(missingResult).toBeNull();
});

test("syncTaskAndSubtaskChatMembers handles invalid/missing task and skips updates when no chats exist", async () => {
    const invalidResult = await syncTaskAndSubtaskChatMembers({});
    expect(invalidResult).toBeNull();
    expect(Task.findById).not.toHaveBeenCalled();

    Task.findById.mockReturnValueOnce(makeQuery(null));
    const missingResult = await syncTaskAndSubtaskChatMembers("task-404");
    expect(missingResult).toBeNull();

    Task.findById.mockReturnValueOnce(makeQuery({
        chatId: null,
        createdBy: "owner-1",
        assignees: [],
        assigneesTeams: [],
        workspace: "workspace-1",
        project: null
    }));
    Team.find.mockReturnValue(makeQuery([]));
    WorkspaceMember.find.mockReturnValue(makeQuery([]));
    Subtask.find.mockReturnValue(makeQuery([{ chatId: null, createdBy: "owner-1", assignedTo: [] }]));

    const result = await syncTaskAndSubtaskChatMembers("task-no-chat");

    expect(Chat.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(Chat.bulkWrite).not.toHaveBeenCalled();
    expect(result).toEqual({
        taskId: "task-no-chat",
        chatId: "",
        memberIds: ["owner-1"],
        subtasksSynced: 0
    });
});

test("syncTaskAndSubtaskChatMembers applies session to task chat and bulk subtask updates", async () => {
    const session = { id: "session-3" };
    Task.findById.mockReturnValue(makeQuery({
        chatId: "task-chat-2",
        createdBy: "owner-1",
        assignees: ["assignee-1"],
        assigneesTeams: ["team-1"],
        workspace: "workspace-1",
        project: null
    }));
    Team.find.mockReturnValue(makeQuery([{ members: [{ user: "team-user-1" }] }]));
    WorkspaceMember.find.mockReturnValue(makeQuery([{ user: "workspace-admin" }]));
    Subtask.find.mockReturnValue(makeQuery([
        { chatId: "sub-chat-session", createdBy: "owner-1", assignedTo: ["assignee-1"] }
    ]));
    const taskChatUpdateQuery = {
        session: jest.fn().mockResolvedValue({})
    };
    Chat.findByIdAndUpdate.mockReturnValue(taskChatUpdateQuery);
    Chat.bulkWrite.mockResolvedValue({});

    const result = await syncTaskAndSubtaskChatMembers("task-1", { session });

    expect(taskChatUpdateQuery.session).toHaveBeenCalledWith(session);
    expect(Chat.bulkWrite).toHaveBeenCalledWith(expect.any(Array), { session });
    expect(result.subtasksSynced).toBe(1);
});

test("syncChatsForTeam returns zero counts for invalid team id", async () => {
    const result = await syncChatsForTeam({});
    expect(result).toEqual({ projectsSynced: 0, tasksSynced: 0 });
});

test("syncWorkspaceChats builds task filter without project clause when no projects exist", async () => {
    Project.find.mockReturnValueOnce(makeQuery([]));
    Task.find.mockReturnValueOnce(makeQuery([{ _id: "task-1" }]));

    Task.findById.mockReturnValue(makeQuery({
        chatId: null,
        createdBy: "owner-1",
        assignees: [],
        assigneesTeams: [],
        workspace: "workspace-1",
        project: null
    }));
    Team.find.mockReturnValue(makeQuery([]));
    WorkspaceMember.find.mockReturnValue(makeQuery([]));
    Subtask.find.mockReturnValue(makeQuery([]));

    const result = await syncWorkspaceChats("workspace-1");

    expect(Task.find).toHaveBeenCalledWith({ $or: [{ workspace: "workspace-1" }] });
    expect(result).toEqual({
        projectsSynced: 0,
        tasksSynced: 1
    });
});

test("getTeamMemberIds defaults to empty array when input is omitted", async () => {
    const ids = await getTeamMemberIds();
    expect(ids).toEqual([]);
    expect(Team.find).not.toHaveBeenCalled();
});

test("getWorkspaceAdminIds normalizes numeric and nested object identifiers", async () => {
    WorkspaceMember.find.mockReturnValue(makeQuery([]));

    await getWorkspaceAdminIds(101);
    await getWorkspaceAdminIds({ _id: "workspace-2" });

    expect(WorkspaceMember.find).toHaveBeenNthCalledWith(1, {
        workspace: "101",
        role: { $in: ["owner", "admin"] },
        status: { $ne: "archived" }
    });
    expect(WorkspaceMember.find).toHaveBeenNthCalledWith(2, {
        workspace: "workspace-2",
        role: { $in: ["owner", "admin"] },
        status: { $ne: "archived" }
    });
});

test("getProjectAdminIds returns empty when project lookup by id does not exist", async () => {
    Project.findById.mockReturnValue(makeQuery(null));

    const ids = await getProjectAdminIds("project-missing");

    expect(ids).toEqual([]);
});

test("syncWorkspaceChats adds project task filter when workspace has projects", async () => {
    Project.find.mockReturnValueOnce(makeQuery([{ _id: "project-1" }]));
    Task.find.mockReturnValueOnce(makeQuery([]));
    Project.findById.mockReturnValue(makeQuery({
        workspace: "workspace-1",
        owner: "owner-1",
        members: [],
        teams: [],
        chatId: null
    }));

    const result = await syncWorkspaceChats("workspace-1");

    expect(Task.find).toHaveBeenCalledWith({
        $or: [
            { workspace: "workspace-1" },
            { project: { $in: ["project-1"] } }
        ]
    });
    expect(result).toEqual({
        projectsSynced: 1,
        tasksSynced: 0
    });
});
