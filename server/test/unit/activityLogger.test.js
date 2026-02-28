jest.mock("../../src/models/activity", () => ({
    create: jest.fn()
}));

jest.mock("../../src/models/message", () => ({
    create: jest.fn()
}));

jest.mock("../../src/models/chat", () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn(),
    find: jest.fn()
}));

jest.mock("../../src/modules/notification/notification.service", () => ({
    createActivityNotifications: jest.fn()
}));

jest.mock("../../src/modules/utils/socketStore", () => ({
    getIO: jest.fn()
}));

const Activity = require("../../src/models/activity");
const Message = require("../../src/models/message");
const Chat = require("../../src/models/chat");
const User = require("../../src/models/user");
const { createActivityNotifications } = require("../../src/modules/notification/notification.service");
const { getIO } = require("../../src/modules/utils/socketStore");
const {
    logActivity,
    getUserLabel,
    getUserLabels,
    formatUserList,
    normalizeIdString,
    uniqueIds
} = require("../../src/modules/utils/activityLogger");

const makeQuery = (value) => {
    const query = {};
    query.session = jest.fn().mockReturnValue(query);
    query.select = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockResolvedValue(value);
    return query;
};

beforeEach(() => {
    jest.clearAllMocks();
});

test("format helpers normalize ids and user lists", () => {
    expect(normalizeIdString({ _id: "user-1" })).toBe("user-1");
    expect(normalizeIdString(null)).toBeNull();

    expect(uniqueIds(["u1", "u1", { _id: "u2" }]).sort()).toEqual(["u1", "u2"]);
    expect(formatUserList([])).toBe("user");
    expect(formatUserList(["A"])).toBe("A");
    expect(formatUserList(["A", "B"])).toBe("A and B");
    expect(formatUserList(["A", "B", "C"])).toBe("A, B and C");
});

test("getUserLabel falls back when user is missing", async () => {
    User.findById.mockReturnValue(makeQuery(null));

    const labelWithNoId = await getUserLabel(null);
    const labelWithMissingUser = await getUserLabel("user-1");

    expect(labelWithNoId).toBe("User");
    expect(labelWithMissingUser).toBe("User");
});

test("getUserLabels preserves order and applies fallback labels", async () => {
    User.find.mockReturnValue(makeQuery([
        { _id: "u1", name: "Alice" },
        { _id: "u3", email: "u3@example.com" }
    ]));

    const labels = await getUserLabels(["u1", "u2", "u3"]);

    expect(labels).toEqual(["Alice", "User", "u3@example.com"]);
});

test("logActivity returns null for incomplete payload", async () => {
    const result = await logActivity({
        actorId: null,
        action: "task.updated",
        message: "Task updated"
    });

    expect(result).toBeNull();
    expect(Activity.create).not.toHaveBeenCalled();
});

test("logActivity writes activity, posts system chat messages, and emits notifications", async () => {
    const emit = jest.fn();
    const io = {
        to: jest.fn().mockReturnValue({ emit })
    };
    getIO.mockReturnValue(io);

    Activity.create.mockResolvedValue({ _id: "activity-1" });
    Message.create.mockResolvedValue({
        _id: "message-1",
        chatId: "chat-1",
        content: "Task updated",
        toObject: () => ({
            _id: "message-1",
            content: "Task updated"
        })
    });
    Chat.findById.mockImplementation((chatId) => makeQuery({
        _id: chatId,
        members: ["actor-1", "member-1"]
    }));
    Chat.findByIdAndUpdate.mockResolvedValue({});
    createActivityNotifications.mockResolvedValue([{ _id: "n1" }]);

    const activity = await logActivity({
        actorId: "actor-1",
        action: "task.updated",
        message: "Task updated",
        level: "task",
        workspaceId: "workspace-1",
        projectId: "project-1",
        taskId: "task-1",
        chatId: "chat-1",
        mirrorChatIds: ["chat-2"]
    });

    expect(Activity.create).toHaveBeenCalledWith({
        user: "actor-1",
        workspace: "workspace-1",
        project: "project-1",
        task: "task-1",
        subtask: null,
        chatId: "chat-1",
        level: "task",
        action: "task.updated",
        message: "Task updated",
        meta: {}
    });
    expect(Message.create).toHaveBeenCalledTimes(2);
    expect(Chat.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    expect(createActivityNotifications).toHaveBeenCalledTimes(1);
    expect(io.to).toHaveBeenCalled();
    expect(activity).toEqual({ _id: "activity-1" });
});
