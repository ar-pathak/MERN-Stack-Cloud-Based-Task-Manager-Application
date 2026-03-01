jest.mock("../../src/models/chat", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/message", () => ({
    findOne: jest.fn(),
    updateMany: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findByIdAndUpdate: jest.fn(),
    findById: jest.fn()
}));

jest.mock("../../src/modules/chat/chat.service", () => ({
    assertCanSendSectionChat: jest.fn()
}));

const Chat = require("../../src/models/chat");
const Message = require("../../src/models/message");
const User = require("../../src/models/user");
const chatService = require("../../src/modules/chat/chat.service");
const registerChatSocket = require("../../src/modules/chat/chat.socket");

const makeSocket = (userId = "user-1") => {
    const handlers = {};
    const socket = {
        userId,
        on: jest.fn((event, handler) => {
            handlers[event] = handler;
        }),
        emit: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
        broadcast: {
            emit: jest.fn()
        }
    };
    return { socket, handlers };
};

const makeIo = () => {
    const emit = jest.fn();
    const io = {
        to: jest.fn(() => ({ emit }))
    };
    return { io, emit };
};

const makePopulateQuery = (value) => ({
    populate: jest.fn().mockResolvedValue(value)
});

const makeSelectResolved = (value) => ({
    select: jest.fn().mockResolvedValue(value)
});

const makeSelectLeanQuery = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

beforeEach(() => {
    jest.clearAllMocks();
    User.findByIdAndUpdate.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({ _id: "user-1", isOnline: true })
    }));
});

test("returns early when socket has no userId", () => {
    const { socket } = makeSocket(null);
    const { io } = makeIo();

    registerChatSocket(io, socket);

    expect(socket.on).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
});

test("join-chat emits not-member error when requester is not in chat", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();
    Chat.findById.mockReturnValue(makePopulateQuery({
        _id: "chat-1",
        members: [{ _id: "user-2" }]
    }));

    registerChatSocket(io, socket);
    await handlers["join-chat"]("chat-1");

    expect(socket.emit).toHaveBeenCalledWith("error", {
        event: "chat",
        reason: "Not a member"
    });
});

test("join-chat emits internal error when authorisation lookup fails", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();
    Chat.findById.mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error("db unavailable"))
    });

    registerChatSocket(io, socket);
    await handlers["join-chat"]("chat-1");

    expect(socket.emit).toHaveBeenCalledWith("error", {
        event: "join-chat",
        reason: "Internal error"
    });
});

test("leave-chat ignores empty chat id", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();

    registerChatSocket(io, socket);
    await handlers["leave-chat"](undefined);

    expect(socket.leave).not.toHaveBeenCalled();
});

test("chat:send returns permission error without emitting member events", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();

    Chat.findById.mockReturnValue(makePopulateQuery({
        _id: "chat-1",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    }));
    chatService.assertCanSendSectionChat.mockRejectedValue({
        statusCode: 403,
        message: "Section send denied"
    });

    registerChatSocket(io, socket);
    await handlers["chat:send"]({
        chatId: "chat-1",
        message: { content: "hello" }
    });

    expect(socket.emit).toHaveBeenCalledWith("error", {
        event: "chat:send",
        reason: "Section send denied"
    });
    expect(io.to).not.toHaveBeenCalledWith("user:user-2");
});

test("chat:typing and chat:stop_typing emit to other chat members", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io, emit } = makeIo();

    Chat.findById.mockReturnValue(makePopulateQuery({
        _id: "chat-1",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    }));
    User.findById.mockReturnValue(makeSelectResolved({ name: "Owner" }));

    registerChatSocket(io, socket);
    await handlers["chat:typing"]({ chatId: "chat-1" });
    await handlers["chat:stop_typing"]({ chatId: "chat-1" });

    expect(io.to).toHaveBeenCalledWith("user:user-2");
    expect(emit).toHaveBeenCalledWith("chat:typing", {
        chatId: "chat-1",
        userId: "user-1",
        userName: "Owner"
    });
    expect(emit).toHaveBeenCalledWith("chat:stop_typing", {
        chatId: "chat-1",
        userId: "user-1"
    });
});

test("chat:read updates readBy and emits read_update + unread reset", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io, emit } = makeIo();
    const createdAt = new Date("2026-01-01T00:00:00.000Z");

    Chat.findById.mockReturnValue(makePopulateQuery({
        _id: "chat-1",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    }));
    Message.findOne.mockReturnValue(makeSelectLeanQuery({
        _id: "msg-1",
        createdAt
    }));
    Message.updateMany.mockResolvedValue({ modifiedCount: 1 });

    registerChatSocket(io, socket);
    await handlers["chat:read"]({
        chatId: "chat-1",
        lastReadMessageId: "msg-1"
    });

    expect(Message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
            chatId: "chat-1",
            senderId: { $ne: "user-1" },
            status: { $in: ["active", "edited"] }
        }),
        expect.objectContaining({
            $push: {
                readBy: expect.objectContaining({ userId: "user-1" })
            }
        })
    );
    expect(emit).toHaveBeenCalledWith("chat:read_update", expect.objectContaining({
        chatId: "chat-1",
        userId: "user-1",
        lastReadMessageId: "msg-1",
        lastReadAt: createdAt
    }));
    expect(emit).toHaveBeenCalledWith("overview:unread_reset", {
        chatId: "chat-1"
    });
});

test("chat:read emits internal error on message lookup failure", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();

    Chat.findById.mockReturnValue(makePopulateQuery({
        _id: "chat-1",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    }));
    Message.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockRejectedValue(new Error("lookup failed"))
        })
    });

    registerChatSocket(io, socket);
    await handlers["chat:read"]({
        chatId: "chat-1",
        lastReadMessageId: "msg-1"
    });

    expect(socket.emit).toHaveBeenCalledWith("error", {
        event: "chat:read",
        reason: "Internal error"
    });
});
