jest.mock("../../src/modules/chat/chat.service", () => ({
    checkPrivateChatExists: jest.fn(),
    getOrCreatePrivateChat: jest.fn(),
    createGroupChat: jest.fn(),
    updateGroupChat: jest.fn(),
    addMembers: jest.fn(),
    removeMember: jest.fn(),
    leaveGroup: jest.fn(),
    toggleMute: jest.fn(),
    toggleArchive: jest.fn(),
    getChats: jest.fn(),
    getMessages: jest.fn(),
    getUnreadMentionSummary: jest.fn(),
    getUnreadCallInviteSummary: jest.fn(),
    sendMessage: jest.fn(),
    togglePinMessage: jest.fn(),
    deleteMessage: jest.fn(),
    editMessage: jest.fn(),
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
    searchMessages: jest.fn()
}));

jest.mock("../../src/models/chat", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/modules/utils/socketStore", () => ({
    getIO: jest.fn()
}));

jest.mock("../../src/helpers/responseHelper", () => ({
    sendSuccess: jest.fn((res, data = null, message = "Success", statusCode = 200) => (
        res.status(statusCode).json({
            success: true,
            message,
            ...(data !== null ? { data } : {})
        })
    )),
    handleError: jest.fn((error, res) => (
        res.status(error?.statusCode || 500).json({
            success: false,
            message: error?.message || "Internal server error"
        })
    ))
}));

const chatService = require("../../src/modules/chat/chat.service");
const Chat = require("../../src/models/chat");
const { getIO } = require("../../src/modules/utils/socketStore");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/chat/chat.controller");

const createResponse = () => {
    const res = {
        statusCode: null,
        body: null
    };

    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });

    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });

    return res;
};

const makeMemberQuery = (members) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ members })
    })
});

const baseReq = () => ({
    user: { _id: "user-1" },
    params: { chatId: "chat-1", messageId: "msg-1", targetUserId: "user-2" },
    query: { page: "1", limit: "20", q: "hello" },
    body: {
        chatId: "chat-1",
        userId: "user-2",
        name: "Group",
        members: ["user-2", "user-3"],
        content: "hello",
        attachments: [],
        replyTo: null,
        postId: null,
        emoji: ":fire:"
    }
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("checkPrivateChat returns exists=true when chat id is found", async () => {
    chatService.checkPrivateChatExists.mockResolvedValue("chat-77");
    const req = baseReq();
    const res = createResponse();

    await controller.checkPrivateChat(req, res);

    expect(chatService.checkPrivateChatExists).toHaveBeenCalledWith("user-1", "user-2");
    expect(sendSuccess).toHaveBeenCalledWith(res, { exists: true, chatId: "chat-77" });
    expect(res.statusCode).toBe(200);
});

test("checkPrivateChat returns exists=false when no chat id is found", async () => {
    chatService.checkPrivateChatExists.mockResolvedValue(null);
    const req = baseReq();
    const res = createResponse();

    await controller.checkPrivateChat(req, res);

    expect(sendSuccess).toHaveBeenCalledWith(res, { exists: false, chatId: null });
    expect(res.statusCode).toBe(200);
});

test.each([
    ["createPrivateChat", "getOrCreatePrivateChat", (req) => [req.user._id, req.body.userId]],
    ["createGroupChat", "createGroupChat", (req) => [req.user._id, req.body.name, req.body.members]],
    ["updateGroupChat", "updateGroupChat", (req) => [req.params.chatId, req.user._id, req.body]],
    ["addMembers", "addMembers", (req) => [req.params.chatId, req.user._id, req.body.members]],
    ["removeMember", "removeMember", (req) => [req.params.chatId, req.user._id, req.body.userId]],
    ["leaveGroup", "leaveGroup", (req) => [req.params.chatId, req.user._id]],
    ["toggleMute", "toggleMute", (req) => [req.params.chatId, req.user._id]],
    ["toggleArchive", "toggleArchive", (req) => [req.params.chatId, req.user._id]],
    ["getChats", "getChats", (req) => [req.user._id]],
    ["getMessages", "getMessages", (req) => [req.params.chatId, req.user._id, req.query.page, req.query.limit]],
    ["getUnreadMentionSummary", "getUnreadMentionSummary", (req) => [req.user._id, req.query.limit]],
    ["getUnreadCallInviteSummary", "getUnreadCallInviteSummary", (req) => [req.user._id, req.query.limit]],
    ["sendMessage", "sendMessage", (req) => [
        req.user._id,
        req.body.chatId,
        req.body.content,
        req.body.attachments,
        req.body.replyTo,
        req.body.postId
    ]],
    ["searchMessages", "searchMessages", (req) => [req.params.chatId, req.user._id, req.query.q, req.query.limit]]
])("%s forwards args to service and returns sendSuccess", async (handlerName, serviceMethod, getArgs) => {
    const req = baseReq();
    const res = createResponse();
    const payload = { ok: handlerName };
    chatService[serviceMethod].mockResolvedValue(payload);

    await controller[handlerName](req, res);

    expect(chatService[serviceMethod]).toHaveBeenCalledWith(...getArgs(req));
    expect(sendSuccess).toHaveBeenCalledWith(res, payload);
    expect(res.statusCode).toBe(200);
});

test("togglePinMessage emits chat:message_pin_updated to chat members except actor", async () => {
    const req = baseReq();
    const res = createResponse();
    const result = { chatId: "chat-1", messageId: "msg-1", pinned: true };
    const ioEmit = jest.fn();
    const io = {
        to: jest.fn(() => ({ emit: ioEmit }))
    };

    chatService.togglePinMessage.mockResolvedValue(result);
    getIO.mockReturnValue(io);
    Chat.findById.mockReturnValue(makeMemberQuery([
        { _id: "user-1" },
        { _id: "user-2" },
        { _id: "user-3" }
    ]));

    await controller.togglePinMessage(req, res);

    expect(io.to).toHaveBeenCalledWith("user:user-2");
    expect(io.to).toHaveBeenCalledWith("user:user-3");
    expect(ioEmit).toHaveBeenCalledWith("chat:message_pin_updated", result);
    expect(sendSuccess).toHaveBeenCalledWith(res, result);
});

test("deleteMessage emits chat:message_deleted with messageId payload", async () => {
    const req = baseReq();
    const res = createResponse();
    const ioEmit = jest.fn();
    const io = {
        to: jest.fn(() => ({ emit: ioEmit }))
    };

    chatService.deleteMessage.mockResolvedValue({ _id: "msg-1", status: "deleted" });
    getIO.mockReturnValue(io);
    Chat.findById.mockReturnValue(makeMemberQuery([{ _id: "user-1" }, { _id: "user-2" }]));

    await controller.deleteMessage(req, res);

    expect(ioEmit).toHaveBeenCalledWith("chat:message_deleted", {
        chatId: "chat-1",
        messageId: "msg-1"
    });
    expect(res.statusCode).toBe(200);
});

test("editMessage emits chat:message_edited with resolved content", async () => {
    const req = baseReq();
    const res = createResponse();
    const ioEmit = jest.fn();
    const io = {
        to: jest.fn(() => ({ emit: ioEmit }))
    };
    const edited = { _id: "msg-1", content: "updated" };

    chatService.editMessage.mockResolvedValue(edited);
    getIO.mockReturnValue(io);
    Chat.findById.mockReturnValue(makeMemberQuery([{ _id: "user-1" }, { _id: "user-2" }]));

    await controller.editMessage(req, res);

    expect(ioEmit).toHaveBeenCalledWith("chat:message_edited", {
        chatId: "chat-1",
        messageId: "msg-1",
        content: "updated",
        message: edited
    });
    expect(res.statusCode).toBe(200);
});

test("addReaction and removeReaction emit chat:reaction_updated", async () => {
    const req = baseReq();
    const res = createResponse();
    const ioEmit = jest.fn();
    const io = {
        to: jest.fn(() => ({ emit: ioEmit }))
    };

    chatService.addReaction.mockResolvedValue({ _id: "msg-1", reactions: [{ emoji: ":fire:" }] });
    chatService.removeReaction.mockResolvedValue({ _id: "msg-1", reactions: [] });
    getIO.mockReturnValue(io);
    Chat.findById.mockReturnValue(makeMemberQuery([{ _id: "user-1" }, { _id: "user-2" }]));

    await controller.addReaction(req, res);
    await controller.removeReaction(req, res);

    expect(ioEmit).toHaveBeenCalledWith("chat:reaction_updated", {
        chatId: "chat-1",
        messageId: "msg-1",
        reactions: [{ emoji: ":fire:" }]
    });
    expect(ioEmit).toHaveBeenCalledWith("chat:reaction_updated", {
        chatId: "chat-1",
        messageId: "msg-1",
        reactions: []
    });
});

test("emit helper no-ops when io store is unavailable", async () => {
    const req = baseReq();
    const res = createResponse();

    chatService.togglePinMessage.mockResolvedValue({ messageId: "msg-1" });
    getIO.mockReturnValue(null);

    await controller.togglePinMessage(req, res);

    expect(Chat.findById).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
});

test("controller delegates service errors to handleError", async () => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("not allowed");
    error.statusCode = 403;

    chatService.getOrCreatePrivateChat.mockRejectedValue(error);

    await controller.createPrivateChat(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
        success: false,
        message: "not allowed"
    });
});
