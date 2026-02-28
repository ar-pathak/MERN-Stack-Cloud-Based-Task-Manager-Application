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
