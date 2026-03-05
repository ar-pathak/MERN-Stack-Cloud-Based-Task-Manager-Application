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

    expect(uniqueIds()).toEqual([]);
    expect(uniqueIds(["u1", "u1", { _id: "u2" }]).sort()).toEqual(["u1", "u2"]);
    expect(formatUserList()).toBe("user");
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

test("getUserLabel supports session and username/email fallback ordering", async () => {
    const session = { id: "session-1" };
    const usernameQuery = makeQuery({
        _id: "user-1",
        username: "alpha"
    });
    const emailQuery = makeQuery({
        _id: "user-2",
        email: "user2@example.com"
    });
    User.findById
        .mockReturnValueOnce(usernameQuery)
        .mockReturnValueOnce(emailQuery);

    const usernameLabel = await getUserLabel("user-1", session);
    const emailLabel = await getUserLabel("user-2");

    expect(usernameQuery.session).toHaveBeenCalledWith(session);
    expect(usernameLabel).toBe("alpha");
    expect(emailLabel).toBe("user2@example.com");
});

test("getUserLabels preserves order and applies fallback labels", async () => {
    User.find.mockReturnValue(makeQuery([
        { _id: "u1", name: "Alice" },
        { _id: "u3", email: "u3@example.com" }
    ]));

    const labels = await getUserLabels(["u1", "u2", "u3"]);

    expect(labels).toEqual(["Alice", "User", "u3@example.com"]);
});

test("getUserLabels returns empty list when no ids are provided", async () => {
    const labels = await getUserLabels();
    expect(labels).toEqual([]);
    expect(User.find).not.toHaveBeenCalled();
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

test("logActivity uses transactional create/session path and skips realtime emit", async () => {
    const session = { id: "tx-1" };
    const io = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    getIO.mockReturnValue(io);

    Activity.create.mockResolvedValue([{ _id: "activity-tx" }]);
    Message.create.mockResolvedValue([{
        _id: "message-tx",
        chatId: "chat-tx",
        content: "Scoped update"
    }]);
    Chat.findById.mockReturnValue(makeQuery({
        _id: "chat-tx",
        members: ["actor-1", "member-1"]
    }));
    const updateQuery = {
        session: jest.fn().mockResolvedValue({})
    };
    Chat.findByIdAndUpdate.mockReturnValue(updateQuery);
    createActivityNotifications.mockResolvedValue([]);

    const result = await logActivity({
        actorId: "actor-1",
        action: "task.updated",
        message: "Scoped update",
        chatId: "chat-tx",
        session
    });

    expect(Activity.create).toHaveBeenCalledWith([
        expect.objectContaining({
            user: "actor-1",
            action: "task.updated"
        })
    ], { session });
    expect(Message.create).toHaveBeenCalledWith([
        expect.objectContaining({
            chatId: "chat-tx",
            senderId: "actor-1",
            isSystem: true
        })
    ], { session });
    expect(updateQuery.session).toHaveBeenCalledWith(session);
    expect(getIO).not.toHaveBeenCalled();
    expect(createActivityNotifications).toHaveBeenCalledWith(expect.objectContaining({ session }));
    expect(result).toEqual({ _id: "activity-tx" });
});

test("logActivity skips chat message creation when chat cannot be found", async () => {
    Activity.create.mockResolvedValue({ _id: "activity-no-chat" });
    Chat.findById.mockReturnValue(makeQuery(null));
    createActivityNotifications.mockResolvedValue([]);

    const result = await logActivity({
        actorId: "actor-1",
        action: "task.updated",
        message: "No chat found",
        chatId: "chat-missing"
    });

    expect(Message.create).not.toHaveBeenCalled();
    expect(Chat.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ _id: "activity-no-chat" });
});

test("logActivity emits realtime using plain message object and ignores invalid member ids", async () => {
    const emit = jest.fn();
    const io = {
        to: jest.fn().mockReturnValue({ emit })
    };
    getIO.mockReturnValue(io);

    Activity.create.mockResolvedValue({ _id: "activity-plain" });
    Message.create.mockResolvedValue({
        _id: "message-plain",
        chatId: "chat-plain",
        content: "Plain payload"
    });
    Chat.findById.mockReturnValue(makeQuery({
        _id: null,
        members: [null, "actor-1", "member-2"]
    }));
    Chat.findByIdAndUpdate.mockResolvedValue({});
    createActivityNotifications.mockResolvedValue([]);

    await logActivity({
        actorId: "actor-1",
        action: "task.updated",
        message: "Plain payload",
        chatId: "chat-plain"
    });

    expect(io.to).toHaveBeenCalledWith("user:actor-1");
    expect(io.to).toHaveBeenCalledWith("user:member-2");
    expect(io.to).not.toHaveBeenCalledWith("user:null");
});
