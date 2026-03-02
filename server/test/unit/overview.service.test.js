jest.mock("../../src/models/workspace", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/subtasks", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/chat", () => ({
    find: jest.fn()
}));

jest.mock("../../src/models/message", () => ({
    aggregate: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    find: jest.fn()
}));

jest.mock("../../src/modules/overview/permission.service", () => ({
    getUserPermissionsForTimeline: jest.fn()
}));

jest.mock("../../src/helpers/cacheHelper", () => ({
    appCache: {
        get: jest.fn(),
        set: jest.fn()
    }
}));

const Workspace = require("../../src/models/workspace");
const Project = require("../../src/models/project");
const Task = require("../../src/models/tasks");
const Subtask = require("../../src/models/subtasks");
const Chat = require("../../src/models/chat");
const Message = require("../../src/models/message");
const WorkspaceMember = require("../../src/models/workspaceMember");
const permissionService = require("../../src/modules/overview/permission.service");
const { appCache } = require("../../src/helpers/cacheHelper");
const overviewService = require("../../src/modules/overview/overview.service");

const makeQuery = (value) => {
    const query = {
        select: jest.fn(() => query),
        populate: jest.fn(() => query),
        lean: jest.fn().mockResolvedValue(value)
    };
    return query;
};

beforeEach(() => {
    jest.clearAllMocks();
});

test("activity returns cached feed when cache hit is available", async () => {
    const cachedFeed = [{ id: "cached-node", type: "chat" }];
    appCache.get.mockReturnValue({ hit: true, value: cachedFeed });

    const result = await overviewService.activity("user-1");

    expect(result).toBe(cachedFeed);
    expect(appCache.get).toHaveBeenCalledWith("overview:activity:user-1");
    expect(permissionService.getUserPermissionsForTimeline).not.toHaveBeenCalled();
    expect(appCache.set).not.toHaveBeenCalled();
});

test("activity builds deduped timeline with unread counts, permissions and chat fallbacks", async () => {
    const userId = "user-1";
    appCache.get.mockReturnValue({ hit: false, value: null });

    permissionService.getUserPermissionsForTimeline.mockResolvedValue({
        workspaces: {
            ws1: {
                role: "owner",
                canCreateProject: true,
                canCreateTask: true
            }
        },
        projects: {
            proj1: {
                role: "member",
                canEdit: true,
                canCreateTask: true,
                isProjectAdmin: false
            }
        },
        tasks: {
            task1: {
                role: "assignee",
                canCreateSubtask: true,
                canChangeStatus: true,
                canUpdateTask: false,
                canUpdatePriority: false,
                inheritedFromTeam: false
            }
        }
    });

    WorkspaceMember.find.mockReturnValue(makeQuery([
        { workspace: "ws1" }
    ]));

    Workspace.find.mockImplementation((filter) => {
        if (filter && Object.prototype.hasOwnProperty.call(filter, "createdBy")) {
            return makeQuery([]);
        }

        return makeQuery([
            {
                _id: "ws1",
                name: "Workspace One",
                description: "Workspace description",
                chatId: {
                    _id: "chat-linked",
                    lastMessage: {
                        content: "",
                        createdAt: "2024-01-05T00:00:00.000Z",
                        type: "file",
                        senderId: { username: "Owner" }
                    }
                },
                createdAt: "2024-01-01T00:00:00.000Z",
                updatedAt: "2024-01-04T00:00:00.000Z"
            }
        ]);
    });

    Project.find.mockReturnValue(makeQuery([
        {
            _id: "proj1",
            name: "Project One",
            workspace: "ws1",
            description: "Project description",
            chatId: {
                _id: "chat-proj",
                lastMessage: {
                    content: "Project ping",
                    createdAt: "2024-01-06T00:00:00.000Z",
                    type: "text",
                    senderId: { username: "Teammate" }
                }
            },
            status: "active",
            settings: {},
            isHighPriority: false,
            dueDate: null,
            createdAt: "2024-01-03T00:00:00.000Z",
            updatedAt: "2024-01-04T00:00:00.000Z",
            members: []
        }
    ]));

    Task.find.mockReturnValue(makeQuery([
        {
            _id: "task1",
            title: "Task One",
            project: "proj1",
            workspace: "ws1",
            description: "Task description",
            status: "todo",
            isHighPriority: false,
            dueDate: null,
            chatId: {
                _id: "chat-task1",
                lastMessage: {
                    content: "",
                    createdAt: "2024-01-07T00:00:00.000Z",
                    type: "image",
                    senderId: { username: "Teammate" }
                }
            },
            createdAt: "2024-01-03T00:00:00.000Z",
            updatedAt: "2024-01-04T00:00:00.000Z"
        },
        {
            _id: "task-global",
            title: "Global Task",
            project: null,
            workspace: null,
            description: "Global description",
            status: "in-progress",
            isHighPriority: true,
            dueDate: null,
            chatId: null,
            createdAt: "2024-01-02T00:00:00.000Z",
            updatedAt: "2024-01-08T00:00:00.000Z"
        }
    ]));

    Chat.find.mockReturnValue(makeQuery([
        {
            _id: "chat-task1",
            type: "group",
            name: "Duplicate task chat",
            avatar: "dup.png",
            members: [
                { _id: "user-1", name: "Self", avatar: "self.png" },
                { _id: "user-2", name: "Other", avatar: "other.png" }
            ],
            lastMessage: {
                content: "Should be filtered out",
                createdAt: "2024-01-09T00:00:00.000Z",
                type: "text",
                senderId: { username: "Other" }
            },
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-09T00:00:00.000Z"
        },
        {
            _id: "chat-private1",
            type: "private",
            name: "",
            avatar: null,
            members: [
                { _id: "user-1", name: "Self", avatar: "self.png" },
                { _id: "user-9", name: "Asha", avatar: "asha.png" }
            ],
            lastMessage: {
                content: "",
                createdAt: "2024-01-10T00:00:00.000Z",
                type: "post",
                sharedPost: "post-1",
                senderId: { username: "Asha" }
            },
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-10T00:00:00.000Z"
        }
    ]));

    Subtask.find.mockReturnValue(makeQuery([
        {
            _id: "sub1",
            task: "task1",
            title: "Subtask One",
            chatId: "chat-sub1",
            completed: false,
            isHighPriority: false,
            description: "Subtask description",
            createdBy: "user-2",
            assignedTo: ["user-1"],
            createdAt: "2024-01-08T12:00:00.000Z",
            updatedAt: "2024-01-08T12:00:00.000Z"
        }
    ]));

    Message.aggregate.mockResolvedValue([
        { _id: "chat-linked", count: 1 },
        { _id: "chat-proj", count: 5 },
        { _id: "chat-task1", count: 4 },
        { _id: "chat-sub1", count: 3 },
        { _id: "chat-private1", count: 2 }
    ]);

    const feed = await overviewService.activity(userId);

    expect(Array.isArray(feed)).toBe(true);
    expect(feed[0].id).toBe("chat-private1");
    expect(feed.some((node) => node.type === "chat" && node.id === "chat-task1")).toBe(false);

    const workspaceNode = feed.find((node) => node.type === "workspace");
    expect(workspaceNode).toBeTruthy();
    expect(workspaceNode.unreadCount).toBe(1);
    expect(workspaceNode.lastMessage.content).toBe("Sent an attachment");
    expect(workspaceNode.permissions).toEqual({
        canCreateProject: true,
        canCreateTask: true,
        role: "owner"
    });

    const projectNode = workspaceNode.projects[0];
    expect(projectNode.id).toBe("proj1");
    expect(projectNode.unreadCount).toBe(5);
    expect(projectNode.permissions.canEdit).toBe(true);

    const taskNode = projectNode.tasks[0];
    expect(taskNode.id).toBe("task1");
    expect(taskNode.unreadCount).toBe(4);
    expect(taskNode.lastMessage.content).toBe("Sent an image");
    expect(taskNode.permissions.canCreateSubtask).toBe(true);
    expect(taskNode.permissions.canChangeStatus).toBe(true);

    const subtaskNode = taskNode.subtasks[0];
    expect(subtaskNode.id).toBe("sub1");
    expect(subtaskNode.unreadCount).toBe(3);
    expect(subtaskNode.permissions).toEqual({
        canEdit: true,
        canDelete: true,
        canChangeStatus: true,
        canUpdatePriority: true
    });

    const privateChatNode = feed.find((node) => node.id === "chat-private1");
    expect(privateChatNode).toBeTruthy();
    expect(privateChatNode.title).toBe("Asha");
    expect(privateChatNode.description).toBe("Shared a post");
    expect(privateChatNode.unreadCount).toBe(2);

    const aggregatePipeline = Message.aggregate.mock.calls[0][0];
    const matchStage = aggregatePipeline[0].$match;
    expect(matchStage["readBy.userId"]).toEqual({ $ne: userId });
    expect(matchStage.senderId).toEqual({ $ne: userId });
    expect(matchStage.chatId.$in).toEqual(expect.arrayContaining([
        "chat-linked",
        "chat-proj",
        "chat-task1",
        "chat-sub1",
        "chat-private1"
    ]));

    expect(appCache.set).toHaveBeenCalledTimes(1);
    expect(appCache.set).toHaveBeenCalledWith(
        "overview:activity:user-1",
        feed,
        expect.any(Number)
    );
    const ttlMs = appCache.set.mock.calls[0][2];
    expect(ttlMs).toBeGreaterThanOrEqual(1000);
});
