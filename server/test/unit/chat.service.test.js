jest.mock("../../src/models/chat", () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

jest.mock("../../src/models/message", () => ({
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/follow", () => ({
    checkRelationship: jest.fn()
}));

jest.mock("../../src/models/post", () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock("../../src/models/workspace", () => ({
    findOne: jest.fn(),
    findById: jest.fn()
}));

jest.mock("../../src/models/workspaceMember", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findOne: jest.fn(),
    findById: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    findOne: jest.fn(),
    findById: jest.fn()
}));

jest.mock("../../src/models/subtasks", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/models/team", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/modules/posts/post.service", () => ({
    assertCanAccessPost: jest.fn()
}));

jest.mock("../../src/modules/utils/mentionService", () => ({
    resolveMentionUsersFromText: jest.fn(),
    notifyMentionedUsers: jest.fn(),
    getMentionSnippet: jest.fn((value) => String(value || "").slice(0, 40))
}));

const Chat = require("../../src/models/chat");
const Message = require("../../src/models/message");
const User = require("../../src/models/user");
const Follow = require("../../src/models/follow");
const Post = require("../../src/models/post");
const Workspace = require("../../src/models/workspace");
const WorkspaceMember = require("../../src/models/workspaceMember");
const Project = require("../../src/models/project");
const Task = require("../../src/models/tasks");
const Subtask = require("../../src/models/subtasks");
const Team = require("../../src/models/team");
const postService = require("../../src/modules/posts/post.service");
const {
    resolveMentionUsersFromText,
    notifyMentionedUsers
} = require("../../src/modules/utils/mentionService");
const chatService = require("../../src/modules/chat/chat.service");

const USER_ID = "507f1f77bcf86cd799439011";
const TARGET_ID = "507f1f77bcf86cd799439012";

const makeQuery = (value) => ({
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

const makeSelectLeanQuery = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const makeSelectResolvedQuery = (value) => ({
    select: jest.fn().mockResolvedValue(value)
});

const makeTwoPopulateResolvedQuery = (value) => ({
    populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(value)
    })
});

beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
});

test("assertCanMessageTarget rejects inactive sender account", async () => {
    User.findById
        .mockReturnValueOnce(makeSelectLeanQuery({ _id: USER_ID, accountStatus: "suspended", blockedUsers: [] }))
        .mockReturnValueOnce(makeSelectLeanQuery({ _id: TARGET_ID, accountStatus: "active", blockedUsers: [] }));
    Follow.checkRelationship.mockResolvedValue({ isFollowing: true });

    await expect(chatService.assertCanMessageTarget(USER_ID, TARGET_ID))
        .rejects
        .toMatchObject({
            message: "Your account is not active",
            statusCode: 403
        });
});

test("assertCanMessageTarget rejects when target blocks sender", async () => {
    User.findById
        .mockReturnValueOnce(makeSelectLeanQuery({ _id: USER_ID, accountStatus: "active", blockedUsers: [] }))
        .mockReturnValueOnce(makeSelectLeanQuery({ _id: TARGET_ID, accountStatus: "active", blockedUsers: [USER_ID] }));
    Follow.checkRelationship.mockResolvedValue({ isFollowing: true });

    await expect(chatService.assertCanMessageTarget(USER_ID, TARGET_ID))
        .rejects
        .toMatchObject({
            message: "You cannot message this user",
            statusCode: 403
        });
});

test("assertCanMessageTarget enforces followers-only setting", async () => {
    User.findById
        .mockReturnValueOnce(makeSelectLeanQuery({ _id: USER_ID, accountStatus: "active", blockedUsers: [] }))
        .mockReturnValueOnce(makeSelectLeanQuery({
            _id: TARGET_ID,
            accountStatus: "active",
            blockedUsers: [],
            isPrivate: true,
            preferences: { privacy: { disablePublicMessages: true } }
        }));
    Follow.checkRelationship.mockResolvedValue({ isFollowing: false });

    await expect(chatService.assertCanMessageTarget(USER_ID, TARGET_ID))
        .rejects
        .toMatchObject({
            message: "This user accepts messages from followers only",
            statusCode: 403
        });
});

test("assertCanMessageTarget resolves for active accounts with valid relationship", async () => {
    User.findById
        .mockReturnValueOnce(makeSelectLeanQuery({ _id: USER_ID, accountStatus: "active", blockedUsers: [] }))
        .mockReturnValueOnce(makeSelectLeanQuery({
            _id: TARGET_ID,
            accountStatus: "active",
            blockedUsers: [],
            isPrivate: false,
            preferences: { privacy: { disablePublicMessages: false } }
        }));
    Follow.checkRelationship.mockResolvedValue({ isFollowing: false });

    await expect(chatService.assertCanMessageTarget(USER_ID, TARGET_ID)).resolves.toBeUndefined();
});

test("inferAttachmentType returns expected message type from first attachment", () => {
    expect(chatService.inferAttachmentType([])).toBe("text");
    expect(chatService.inferAttachmentType([{ type: "image/png" }])).toBe("image");
    expect(chatService.inferAttachmentType([{ type: "video/mp4" }])).toBe("video");
    expect(chatService.inferAttachmentType([{ type: "audio/mpeg" }])).toBe("audio");
    expect(chatService.inferAttachmentType([{ type: "application/pdf" }])).toBe("file");
});

test("resolveSharedPostForChat returns null for empty post id", async () => {
    await expect(chatService.resolveSharedPostForChat({
        postId: "",
        senderId: USER_ID,
        chatMembers: [USER_ID, TARGET_ID]
    })).resolves.toBeNull();
});

test("resolveSharedPostForChat rejects unknown post id", async () => {
    Post.findById.mockReturnValue(makeSelectLeanQuery(null));

    await expect(chatService.resolveSharedPostForChat({
        postId: "507f1f77bcf86cd799439099",
        senderId: USER_ID,
        chatMembers: [USER_ID, TARGET_ID]
    })).rejects.toMatchObject({
        message: "Post not found",
        statusCode: 404
    });
});

test("resolveSharedPostForChat validates sender and recipients post access", async () => {
    Post.findById.mockReturnValue(makeSelectLeanQuery({
        _id: "507f1f77bcf86cd799439022",
        status: "active"
    }));
    postService.assertCanAccessPost.mockResolvedValue(undefined);

    const result = await chatService.resolveSharedPostForChat({
        postId: "507f1f77bcf86cd799439022",
        senderId: USER_ID,
        chatMembers: [USER_ID, TARGET_ID, "507f1f77bcf86cd799439013"]
    });

    expect(result).toBe("507f1f77bcf86cd799439022");
    expect(postService.assertCanAccessPost).toHaveBeenCalledTimes(3);
});

test("resolveWorkspaceAccess returns owner privileges when user created workspace", async () => {
    const result = await chatService.resolveWorkspaceAccess(
        "workspace-1",
        USER_ID,
        { _id: "workspace-1", createdBy: USER_ID }
    );

    expect(result).toEqual({
        isMember: true,
        role: "owner",
        source: "workspace",
        canView: true,
        canSend: true
    });
});

test("resolveWorkspaceAccess maps viewer role to read-only access", async () => {
    WorkspaceMember.findOne.mockReturnValue(makeSelectLeanQuery({ role: "viewer" }));

    const result = await chatService.resolveWorkspaceAccess(
        "workspace-1",
        USER_ID,
        { _id: "workspace-1", createdBy: TARGET_ID }
    );

    expect(result).toEqual({
        isMember: true,
        role: "viewer",
        source: "workspace",
        canView: true,
        canSend: false
    });
});

test("resolveTeamAccess returns no-access for empty team list", async () => {
    const result = await chatService.resolveTeamAccess([], USER_ID);

    expect(result).toEqual({
        isMember: false,
        role: null,
        source: "team",
        canView: false,
        canSend: false
    });
});

test("resolveTeamAccess returns team role access for matched member", async () => {
    Team.findOne.mockReturnValue(makeSelectLeanQuery({
        members: [{ user: USER_ID, role: "lead" }]
    }));

    const result = await chatService.resolveTeamAccess(["team-1"], USER_ID);

    expect(result).toEqual({
        isMember: true,
        role: "lead",
        source: "team",
        canView: true,
        canSend: true
    });
});

test("resolveSectionAccessByChat returns non-section defaults when no scope found", async () => {
    jest.spyOn(chatService, "findSectionScopeByChatId").mockResolvedValue(null);

    const result = await chatService.resolveSectionAccessByChat("chat-1", USER_ID);

    expect(result).toEqual({
        isSectionChat: false,
        isMember: true,
        role: null,
        scopeType: null,
        canView: true,
        canSend: true
    });
});

test("assertCanViewSectionChat throws with section membership error code", async () => {
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: true,
        isMember: false,
        canView: false
    });

    await expect(chatService.assertCanViewSectionChat("chat-1", USER_ID))
        .rejects
        .toMatchObject({
            message: "You are not a member of this section chat",
            statusCode: 403,
            code: "SECTION_CHAT_MEMBER_REQUIRED"
        });
});

test("assertCanSendSectionChat throws send-forbidden error code", async () => {
    jest.spyOn(chatService, "assertCanViewSectionChat").mockResolvedValue({
        isSectionChat: true,
        isMember: true,
        canView: true,
        canSend: false
    });

    await expect(chatService.assertCanSendSectionChat("chat-1", USER_ID))
        .rejects
        .toMatchObject({
            message: "You don't have permission to send messages in this section chat",
            statusCode: 403,
            code: "SECTION_CHAT_SEND_FORBIDDEN"
        });
});

test("checkPrivateChatExists returns existing chat id when found", async () => {
    Chat.findOne.mockReturnValue(makeSelectResolvedQuery({ _id: "chat-1" }));

    await expect(chatService.checkPrivateChatExists(USER_ID, TARGET_ID)).resolves.toBe("chat-1");
});

test("getOrCreatePrivateChat rejects self-chat creation", async () => {
    await expect(chatService.getOrCreatePrivateChat(USER_ID, USER_ID))
        .rejects
        .toMatchObject({
            message: "Cannot create a private chat with yourself",
            statusCode: 400
        });
});

test("getOrCreatePrivateChat returns existing private chat", async () => {
    jest.spyOn(chatService, "assertCanMessageTarget").mockResolvedValue(undefined);
    const existingChat = { _id: "chat-1", type: "private" };
    Chat.findOne.mockReturnValue(makeTwoPopulateResolvedQuery(existingChat));

    const result = await chatService.getOrCreatePrivateChat(USER_ID, TARGET_ID);

    expect(Chat.create).not.toHaveBeenCalled();
    expect(result).toEqual(existingChat);
});

test("getOrCreatePrivateChat creates and populates new chat when not found", async () => {
    jest.spyOn(chatService, "assertCanMessageTarget").mockResolvedValue(undefined);
    Chat.findOne.mockReturnValue(makeTwoPopulateResolvedQuery(null));

    const createdChatDoc = {
        _id: "chat-new",
        populate: jest.fn().mockResolvedValue({})
    };
    Chat.create.mockResolvedValue(createdChatDoc);

    const result = await chatService.getOrCreatePrivateChat(USER_ID, TARGET_ID);

    expect(Chat.create).toHaveBeenCalledWith({
        type: "private",
        members: [USER_ID, TARGET_ID]
    });
    expect(createdChatDoc.populate).toHaveBeenCalled();
    expect(result).toBe(createdChatDoc);
});

test("createGroupChat validates minimum name and members", async () => {
    await expect(chatService.createGroupChat(USER_ID, "a", [TARGET_ID, "x"]))
        .rejects
        .toThrow("Group name must be at least 2 characters");

    await expect(chatService.createGroupChat(USER_ID, "Group", [TARGET_ID]))
        .rejects
        .toThrow("A group chat requires at least 2 other members");
});

test("createGroupChat deduplicates members and returns populated chat", async () => {
    Chat.create.mockResolvedValue({ _id: "chat-1" });
    Chat.findById.mockReturnValue(makeTwoPopulateResolvedQuery({
        _id: "chat-1",
        type: "group"
    }));

    const result = await chatService.createGroupChat(USER_ID, " Team Chat ", [TARGET_ID, TARGET_ID]);

    expect(Chat.create).toHaveBeenCalledWith({
        type: "group",
        name: "Team Chat",
        members: [USER_ID, TARGET_ID],
        admin: USER_ID
    });
    expect(result).toEqual({
        _id: "chat-1",
        type: "group"
    });
});

test("getChats returns sorted non-archived chats for user", async () => {
    Chat.find.mockReturnValue(makeQuery([{ _id: "chat-1" }]));

    const result = await chatService.getChats(USER_ID);

    expect(Chat.find).toHaveBeenCalledWith({
        members: USER_ID,
        archived: false
    });
    expect(result).toEqual([{ _id: "chat-1" }]);
});

test("sendMessage rejects empty content when no attachment or shared post", async () => {
    await expect(chatService.sendMessage(USER_ID, "chat-1", "", [], null, null))
        .rejects
        .toMatchObject({
            message: "Message must contain text, attachment, or a shared post",
            statusCode: 400
        });
});

test("sendMessage rejects non-member for non-section chat", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        type: "group",
        members: [TARGET_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: false,
        isMember: true,
        canSend: true
    });

    await expect(chatService.sendMessage(USER_ID, "chat-1", "hello", [], null, null))
        .rejects
        .toMatchObject({
            message: "You are not a member of this chat",
            statusCode: 403
        });
});

test("sendMessage rejects attachments combined with shared post", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        type: "group",
        members: [USER_ID, TARGET_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: false,
        isMember: true,
        canSend: true
    });

    await expect(chatService.sendMessage(
        USER_ID,
        "chat-1",
        "share this",
        [{ url: "https://example.com/file.png", type: "image/png" }],
        null,
        "507f1f77bcf86cd799439099"
    )).rejects.toMatchObject({
        message: "Attachments cannot be combined with a shared post",
        statusCode: 400
    });
});

test("sendMessage creates text message and updates chat lastMessage", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        type: "group",
        members: [USER_ID, TARGET_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: false,
        isMember: true,
        canSend: true
    });
    resolveMentionUsersFromText.mockResolvedValue([]);
    Message.create.mockResolvedValue({
        _id: "msg-1"
    });
    Message.findById.mockReturnValue(makeQuery({
        _id: "msg-1",
        content: "Hello team",
        type: "text"
    }));

    const result = await chatService.sendMessage(
        USER_ID,
        "chat-1",
        " Hello team ",
        [],
        null,
        null
    );

    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
        chatId: "chat-1",
        senderId: USER_ID,
        content: "Hello team",
        status: "active"
    }));
    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-1", { lastMessage: "msg-1" });
    expect(notifyMentionedUsers).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
        _id: "msg-1",
        type: "text"
    }));
});

test("sendMessage auto-adds sender to section chat when access allows membership", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        type: "group",
        members: [TARGET_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: true,
        isMember: true,
        canSend: true
    });
    resolveMentionUsersFromText.mockResolvedValue([]);
    Message.create.mockResolvedValue({ _id: "msg-2" });
    Message.findById.mockReturnValue(makeQuery({ _id: "msg-2", content: "section" }));

    await chatService.sendMessage(USER_ID, "chat-1", "section", [], null, null);

    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-1", {
        $addToSet: { members: USER_ID }
    });
});

test("getMessages enforces membership and returns pagination meta", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: false,
        isMember: true,
        canView: true
    });
    Message.find.mockReturnValue(makeQuery([{ _id: "msg-1" }]));
    Message.countDocuments.mockResolvedValue(3);

    const result = await chatService.getMessages("chat-1", USER_ID, "2", "1");

    expect(result.messages).toEqual([{ _id: "msg-1" }]);
    expect(result.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
        hasMore: true
    });
});

test("getUnreadMentionSummary returns empty payload when user has no chats", async () => {
    Chat.find.mockReturnValue(makeSelectLeanQuery([]));

    const result = await chatService.getUnreadMentionSummary(USER_ID);

    expect(result).toEqual({
        mentions: [],
        byChat: {},
        totalUnreadMentions: 0
    });
});

test("getUnreadCallInviteSummary maps aggregate rows to summary payload", async () => {
    Chat.find.mockReturnValue(makeSelectLeanQuery([{ _id: "chat-1" }]));
    Message.aggregate.mockResolvedValue([
        {
            _id: "chat-1",
            unreadInviteCount: 2,
            nextInviteMessageId: "msg-2",
            nextInviteContent: "Call invite",
            callId: "507f1f77bcf86cd799439099"
        }
    ]);

    const result = await chatService.getUnreadCallInviteSummary(USER_ID, 20);

    expect(result.totalUnreadInvites).toBe(2);
    expect(result.byChat["chat-1"]).toEqual({
        chatId: "chat-1",
        unreadInviteCount: 2,
        nextInviteMessageId: "msg-2",
        nextInviteCreatedAt: null,
        nextInviteContent: "Call invite",
        callId: "507f1f77bcf86cd799439099"
    });
});

test("togglePinMessage evicts oldest pinned message when max reached", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID]
    });
    jest.spyOn(chatService, "assertCanViewSectionChat").mockResolvedValue({
        isSectionChat: false,
        canView: true
    });

    const messageDoc = {
        _id: "msg-1",
        chatId: "chat-1",
        status: "active",
        pinned: false,
        save: jest.fn().mockResolvedValue({})
    };
    Message.findById
        .mockResolvedValueOnce(messageDoc)
        .mockReturnValueOnce(makeQuery({
            _id: "msg-1",
            pinned: true,
            pinnedBy: { _id: USER_ID, name: "User" },
            pinnedAt: new Date("2026-02-01T00:00:00.000Z")
        }));
    Message.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { _id: "oldest-pin" },
                    { _id: "p2" },
                    { _id: "p3" },
                    { _id: "p4" },
                    { _id: "p5" }
                ])
            })
        })
    });
    Message.findByIdAndUpdate.mockResolvedValue({});
    Message.countDocuments.mockResolvedValue(5);

    const result = await chatService.togglePinMessage("msg-1", USER_ID, "chat-1");

    expect(Message.findByIdAndUpdate).toHaveBeenCalledWith("oldest-pin", {
        pinned: false,
        pinnedAt: null,
        pinnedBy: null
    });
    expect(messageDoc.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({
        chatId: "chat-1",
        messageId: "msg-1",
        pinned: true,
        evictedMessageId: "oldest-pin",
        pinnedCount: 5
    }));
});

test("deleteMessage rejects attempts to delete another users message", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID]
    });
    Message.findById.mockResolvedValue({
        _id: "msg-1",
        chatId: "chat-1",
        senderId: TARGET_ID,
        save: jest.fn()
    });

    await expect(chatService.deleteMessage("msg-1", USER_ID, "chat-1"))
        .rejects
        .toThrow("You can only delete your own messages");
});

test("editMessage updates content/mentions and triggers mention notifications", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID, TARGET_ID]
    });
    const messageDoc = {
        _id: "msg-1",
        chatId: "chat-1",
        senderId: USER_ID,
        mentions: [],
        save: jest.fn().mockResolvedValue({})
    };
    Message.findById
        .mockResolvedValueOnce(messageDoc)
        .mockReturnValueOnce(makeQuery({
            _id: "msg-1",
            content: "Updated",
            senderId: { _id: USER_ID, name: "Sender" },
            mentions: [{ _id: TARGET_ID }]
        }));
    resolveMentionUsersFromText.mockResolvedValue([{ _id: TARGET_ID }]);
    notifyMentionedUsers.mockResolvedValue({});

    const result = await chatService.editMessage("msg-1", USER_ID, "chat-1", " Updated ");

    expect(messageDoc.content).toBe("Updated");
    expect(messageDoc.edited).toBe(true);
    expect(messageDoc.status).toBe("edited");
    expect(notifyMentionedUsers).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ _id: "msg-1" }));
});

test("addReaction and removeReaction return repopulated message state", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID]
    });
    const reactionMessage = {
        _id: "msg-1",
        chatId: "chat-1",
        addReaction: jest.fn().mockResolvedValue({}),
        removeReaction: jest.fn().mockResolvedValue({})
    };
    Message.findById
        .mockResolvedValueOnce(reactionMessage)
        .mockReturnValueOnce(makeQuery({ _id: "msg-1", reactions: [{ emoji: "🔥" }] }))
        .mockResolvedValueOnce(reactionMessage)
        .mockReturnValueOnce(makeQuery({ _id: "msg-1", reactions: [] }));

    const afterAdd = await chatService.addReaction("msg-1", USER_ID, "🔥", "chat-1");
    const afterRemove = await chatService.removeReaction("msg-1", USER_ID, "🔥", "chat-1");

    expect(reactionMessage.addReaction).toHaveBeenCalledWith(USER_ID, "🔥");
    expect(reactionMessage.removeReaction).toHaveBeenCalledWith(USER_ID, "🔥");
    expect(afterAdd).toEqual({ _id: "msg-1", reactions: [{ emoji: "🔥" }] });
    expect(afterRemove).toEqual({ _id: "msg-1", reactions: [] });
});

test("group management helpers update/add/remove/leave/toggle/search as expected", async () => {
    const chatDoc = {
        _id: "chat-1",
        type: "group",
        admin: USER_ID,
        members: [USER_ID, TARGET_ID],
        muted: false,
        archived: false,
        save: jest.fn().mockResolvedValue({})
    };
    Chat.findById.mockResolvedValue(chatDoc);

    await expect(chatService.updateGroupChat("chat-1", USER_ID, { name: " New ", avatar: "http://avatar" }))
        .resolves
        .toBe(chatDoc);
    expect(chatDoc.name).toBe("New");

    await expect(chatService.addMembers("chat-1", USER_ID, ["507f1f77bcf86cd799439013"]))
        .resolves
        .toBe(chatDoc);
    expect(chatDoc.members).toContain("507f1f77bcf86cd799439013");

    await expect(chatService.removeMember("chat-1", USER_ID, TARGET_ID))
        .resolves
        .toBe(chatDoc);
    expect(chatDoc.members).not.toContain(TARGET_ID);

    await expect(chatService.toggleMute("chat-1", USER_ID)).resolves.toEqual({
        chatId: "chat-1",
        muted: true
    });
    await expect(chatService.toggleArchive("chat-1", USER_ID)).resolves.toEqual({
        chatId: "chat-1",
        archived: true
    });

    Message.find.mockReturnValue(makeQuery([{ _id: "msg-search" }]));
    const searchResult = await chatService.searchMessages("chat-1", USER_ID, "hello", 10);
    expect(searchResult).toEqual([{ _id: "msg-search" }]);
});

test("leaveGroup deletes chat when last member leaves", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        type: "group",
        admin: USER_ID,
        members: [USER_ID]
    });
    Chat.findByIdAndDelete.mockResolvedValue({});

    const result = await chatService.leaveGroup("chat-1", USER_ID);

    expect(Chat.findByIdAndDelete).toHaveBeenCalledWith("chat-1");
    expect(result).toEqual({ deleted: true });
});

test("assertCanMessageTarget rejects when sender has blocked target via nested id shape", async () => {
    User.findById
        .mockReturnValueOnce(makeSelectLeanQuery({
            _id: USER_ID,
            accountStatus: "active",
            blockedUsers: [{ _id: { toHexString: () => TARGET_ID } }]
        }))
        .mockReturnValueOnce(makeSelectLeanQuery({
            _id: TARGET_ID,
            accountStatus: "active",
            blockedUsers: []
        }));
    Follow.checkRelationship.mockResolvedValue({ isFollowing: true });

    await expect(chatService.assertCanMessageTarget(USER_ID, { _id: { toHexString: () => TARGET_ID } }))
        .rejects
        .toMatchObject({
            message: "Unblock this user before sending a message",
            statusCode: 403
        });
});

test("inferAttachmentType falls back to file when first attachment type is missing", () => {
    expect(chatService.inferAttachmentType([{}])).toBe("file");
});

test("checkPrivateChatExists returns null when private chat does not exist", async () => {
    Chat.findOne.mockReturnValue(makeSelectResolvedQuery(null));
    await expect(chatService.checkPrivateChatExists(USER_ID, TARGET_ID)).resolves.toBeNull();
});

test("sendMessage rejects when chat does not exist", async () => {
    Chat.findById.mockResolvedValue(null);

    await expect(chatService.sendMessage(USER_ID, "chat-missing", "hello", [], null, null))
        .rejects
        .toMatchObject({
            message: "Chat not found",
            statusCode: 404
        });
});

test("sendMessage enforces section membership and section send permission", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        type: "group",
        members: [USER_ID, TARGET_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat")
        .mockResolvedValueOnce({
            isSectionChat: true,
            isMember: false,
            canSend: true
        })
        .mockResolvedValueOnce({
            isSectionChat: true,
            isMember: true,
            canSend: false
        });

    await expect(chatService.sendMessage(USER_ID, "chat-1", "hello", [], null, null))
        .rejects
        .toMatchObject({
            message: "You are not a member of this section chat",
            statusCode: 403
        });

    await expect(chatService.sendMessage(USER_ID, "chat-1", "hello", [], null, null))
        .rejects
        .toMatchObject({
            message: "You don't have permission to send messages in this section chat",
            statusCode: 403
        });
});

test("sendMessage validates reply references for missing or mismatched messages", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        type: "group",
        members: [USER_ID, TARGET_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: false,
        isMember: true,
        canSend: true
    });
    Message.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: "reply-2", chatId: "other-chat" });

    await expect(chatService.sendMessage(USER_ID, "chat-1", "hello", [], "reply-1", null))
        .rejects
        .toMatchObject({
            message: "Invalid reply reference",
            statusCode: 400
        });

    await expect(chatService.sendMessage(USER_ID, "chat-1", "hello", [], "reply-2", null))
        .rejects
        .toMatchObject({
            message: "Invalid reply reference",
            statusCode: 400
        });
});

test("sendMessage supports shared-post payload and increments post shares", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        type: "group",
        members: [USER_ID, TARGET_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: false,
        isMember: true,
        canSend: true
    });
    jest.spyOn(chatService, "resolveSharedPostForChat").mockResolvedValue("post-1");
    resolveMentionUsersFromText.mockResolvedValue([]);
    Message.create.mockResolvedValue({ _id: "msg-post-1" });
    Message.findById.mockReturnValue(makeQuery({
        _id: "msg-post-1",
        type: "post",
        sharedPost: "post-1",
        senderId: { _id: USER_ID, name: "Sender" }
    }));

    const result = await chatService.sendMessage(USER_ID, "chat-1", "", [], null, "post-1");

    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
        type: "post",
        sharedPost: "post-1"
    }));
    expect(Post.findByIdAndUpdate).toHaveBeenCalledWith("post-1", { $inc: { sharesCount: 1 } });
    expect(result).toEqual(expect.objectContaining({
        _id: "msg-post-1",
        type: "post"
    }));
});

test("sendMessage swallows mention notification failures and still returns message", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        type: "group",
        members: [USER_ID, TARGET_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: false,
        isMember: true,
        canSend: true
    });
    resolveMentionUsersFromText.mockResolvedValue([{ _id: TARGET_ID }]);
    Message.create.mockResolvedValue({ _id: "msg-mention-1" });
    Message.findById.mockReturnValue(makeQuery({
        _id: "msg-mention-1",
        senderId: { username: "sender-user" },
        content: "hello @target"
    }));
    notifyMentionedUsers.mockRejectedValue(new Error("notify down"));

    const result = await chatService.sendMessage(USER_ID, "chat-1", "hello @target", [], null, null);

    expect(result).toEqual(expect.objectContaining({ _id: "msg-mention-1" }));
    expect(errorSpy).toHaveBeenCalledWith("chat mention notification error", expect.any(Error));
    errorSpy.mockRestore();
});

test("sendMessage skips private-target assertion when recipient cannot be resolved", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        type: "private",
        members: [USER_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: false,
        isMember: true,
        canSend: true
    });
    const assertCanMessageTargetSpy = jest.spyOn(chatService, "assertCanMessageTarget");
    resolveMentionUsersFromText.mockResolvedValue([]);
    Message.create.mockResolvedValue({ _id: "msg-private-1" });
    Message.findById.mockReturnValue(makeQuery({
        _id: "msg-private-1",
        content: "solo private"
    }));

    await chatService.sendMessage(USER_ID, "chat-1", "solo private", [], null, null);

    expect(assertCanMessageTargetSpy).not.toHaveBeenCalled();
});

test("getMessages rejects missing chats and section viewers without access", async () => {
    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.getMessages("chat-404", USER_ID, 1, 20))
        .rejects
        .toMatchObject({
            message: "Chat not found",
            statusCode: 404
        });

    Chat.findById.mockResolvedValueOnce({
        _id: "chat-1",
        members: [USER_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: true,
        isMember: true,
        canView: false
    });
    await expect(chatService.getMessages("chat-1", USER_ID, 1, 20))
        .rejects
        .toMatchObject({
            message: "You are not a member of this section chat",
            statusCode: 403
        });
});

test("getMessages auto-adds section members and clamps pagination bounds", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [TARGET_ID]
    });
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: true,
        isMember: true,
        canView: true
    });
    Message.find.mockReturnValue(makeQuery([{ _id: "m1" }]));
    Message.countDocuments.mockResolvedValue(1);

    const result = await chatService.getMessages("chat-1", USER_ID, "0", "200");

    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-1", {
        $addToSet: { members: USER_ID }
    });
    expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasMore: false
    });
});

test("getUnreadMentionSummary maps aggregate defaults and applies minimum limit", async () => {
    Chat.find.mockReturnValue(makeSelectLeanQuery([{ _id: "chat-1" }]));
    Message.aggregate.mockResolvedValue([
        {
            _id: "chat-1",
            unreadMentionCount: undefined,
            nextMentionMessageId: null,
            nextMentionCreatedAt: null,
            nextMentionContent: undefined
        }
    ]);

    const result = await chatService.getUnreadMentionSummary(USER_ID, -5);

    expect(Message.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
        { $limit: 1 }
    ]));
    expect(result).toEqual({
        mentions: [{
            chatId: "chat-1",
            unreadMentionCount: 0,
            nextMentionMessageId: null,
            nextMentionCreatedAt: null,
            nextMentionContent: ""
        }],
        byChat: {
            "chat-1": {
                chatId: "chat-1",
                unreadMentionCount: 0,
                nextMentionMessageId: null,
                nextMentionCreatedAt: null,
                nextMentionContent: ""
            }
        },
        totalUnreadMentions: 0
    });
});

test("getUnreadCallInviteSummary returns empty payload when user has no chats", async () => {
    Chat.find.mockReturnValue(makeSelectLeanQuery([]));

    const result = await chatService.getUnreadCallInviteSummary(USER_ID, 25);

    expect(result).toEqual({
        invites: [],
        byChat: {},
        totalUnreadInvites: 0
    });
});

test("assertCanViewSectionChat and assertCanSendSectionChat return pass-through access for allowed flows", async () => {
    jest.spyOn(chatService, "resolveSectionAccessByChat").mockResolvedValue({
        isSectionChat: false,
        isMember: true,
        canView: true,
        canSend: true
    });
    const viewAccess = await chatService.assertCanViewSectionChat("chat-1", USER_ID);
    expect(viewAccess).toEqual({
        isSectionChat: false,
        isMember: true,
        canView: true,
        canSend: true
    });

    jest.spyOn(chatService, "assertCanViewSectionChat").mockResolvedValue({
        isSectionChat: true,
        isMember: true,
        canView: true,
        canSend: true
    });
    const sendAccess = await chatService.assertCanSendSectionChat("chat-1", USER_ID);
    expect(sendAccess).toEqual({
        isSectionChat: true,
        isMember: true,
        canView: true,
        canSend: true
    });
});

test("getUnreadCallInviteSummary applies minimum limit and default field mapping", async () => {
    Chat.find.mockReturnValue(makeSelectLeanQuery([{ _id: "chat-1" }]));
    Message.aggregate.mockResolvedValue([
        {
            _id: "chat-1",
            unreadInviteCount: undefined,
            nextInviteMessageId: null,
            nextInviteCreatedAt: null,
            nextInviteContent: undefined,
            callId: null
        }
    ]);

    const result = await chatService.getUnreadCallInviteSummary(USER_ID, -3);

    expect(Message.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
        { $limit: 1 }
    ]));
    expect(result).toEqual({
        invites: [{
            chatId: "chat-1",
            unreadInviteCount: 0,
            nextInviteMessageId: null,
            nextInviteCreatedAt: null,
            nextInviteContent: "",
            callId: null
        }],
        byChat: {
            "chat-1": {
                chatId: "chat-1",
                unreadInviteCount: 0,
                nextInviteMessageId: null,
                nextInviteCreatedAt: null,
                nextInviteContent: "",
                callId: null
            }
        },
        totalUnreadInvites: 0
    });
});

test("togglePinMessage validates chat, membership, message ownership and status", async () => {
    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.togglePinMessage("msg-1", USER_ID, "chat-1"))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({
        _id: "chat-1",
        members: [TARGET_ID]
    });
    await expect(chatService.togglePinMessage("msg-1", USER_ID, "chat-1"))
        .rejects
        .toMatchObject({ message: "You are not a member of this chat", statusCode: 403 });

    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID]
    });
    jest.spyOn(chatService, "assertCanViewSectionChat").mockResolvedValue({
        isSectionChat: false,
        canView: true
    });

    Message.findById.mockResolvedValueOnce(null);
    await expect(chatService.togglePinMessage("msg-1", USER_ID, "chat-1"))
        .rejects
        .toMatchObject({ message: "Message not found", statusCode: 404 });

    Message.findById.mockResolvedValueOnce({
        _id: "msg-1",
        chatId: "other-chat",
        status: "active"
    });
    await expect(chatService.togglePinMessage("msg-1", USER_ID, "chat-1"))
        .rejects
        .toMatchObject({ message: "Message does not belong to this chat", statusCode: 400 });

    Message.findById.mockResolvedValueOnce({
        _id: "msg-1",
        chatId: "chat-1",
        status: "deleted"
    });
    await expect(chatService.togglePinMessage("msg-1", USER_ID, "chat-1"))
        .rejects
        .toMatchObject({ message: "Only active messages can be pinned", statusCode: 400 });
});

test("togglePinMessage supports unpin flow without eviction", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID]
    });
    jest.spyOn(chatService, "assertCanViewSectionChat").mockResolvedValue({
        isSectionChat: false,
        canView: true
    });

    const messageDoc = {
        _id: "msg-1",
        chatId: "chat-1",
        status: "active",
        pinned: true,
        pinnedAt: new Date("2026-03-01T00:00:00.000Z"),
        pinnedBy: USER_ID,
        save: jest.fn().mockResolvedValue({})
    };
    Message.findById
        .mockResolvedValueOnce(messageDoc)
        .mockReturnValueOnce(makeQuery({
            _id: "msg-1",
            pinned: false,
            pinnedAt: null,
            pinnedBy: null
        }));
    Message.countDocuments.mockResolvedValue(0);

    const result = await chatService.togglePinMessage("msg-1", USER_ID, "chat-1");
    expect(messageDoc.pinned).toBe(false);
    expect(messageDoc.pinnedAt).toBeNull();
    expect(messageDoc.pinnedBy).toBeNull();
    expect(result).toEqual(expect.objectContaining({
        pinned: false,
        evictedMessageId: null,
        pinnedCount: 0
    }));
});

test("deleteMessage validates chat membership/message linkage and supports success path", async () => {
    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.deleteMessage("msg-1", USER_ID, "chat-1"))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({
        _id: "chat-1",
        members: [TARGET_ID]
    });
    await expect(chatService.deleteMessage("msg-1", USER_ID, "chat-1"))
        .rejects
        .toMatchObject({ message: "You are not a member of this chat", statusCode: 403 });

    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID]
    });
    Message.findById.mockResolvedValueOnce(null);
    await expect(chatService.deleteMessage("msg-1", USER_ID, "chat-1"))
        .rejects
        .toMatchObject({ message: "Message not found", statusCode: 404 });

    Message.findById.mockResolvedValueOnce({
        _id: "msg-1",
        chatId: "other-chat",
        senderId: USER_ID
    });
    await expect(chatService.deleteMessage("msg-1", USER_ID, "chat-1"))
        .rejects
        .toMatchObject({ message: "Message does not belong to this chat", statusCode: 400 });

    const ownMessage = {
        _id: "msg-own",
        chatId: "chat-1",
        senderId: USER_ID,
        status: "active",
        save: jest.fn().mockResolvedValue({})
    };
    Message.findById.mockResolvedValueOnce(ownMessage);
    const result = await chatService.deleteMessage("msg-own", USER_ID, "chat-1");
    expect(ownMessage.status).toBe("deleted");
    expect(ownMessage.save).toHaveBeenCalledTimes(1);
    expect(result).toBe(ownMessage);
});

test("editMessage validates preconditions before update", async () => {
    await expect(chatService.editMessage("msg-1", USER_ID, "chat-1", "   "))
        .rejects
        .toMatchObject({ message: "Message content cannot be empty", statusCode: 400 });

    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.editMessage("msg-1", USER_ID, "chat-1", "Hello"))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({
        _id: "chat-1",
        members: [TARGET_ID]
    });
    await expect(chatService.editMessage("msg-1", USER_ID, "chat-1", "Hello"))
        .rejects
        .toMatchObject({ message: "You are not a member of this chat", statusCode: 403 });

    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID, TARGET_ID]
    });
    Message.findById.mockResolvedValueOnce(null);
    await expect(chatService.editMessage("msg-1", USER_ID, "chat-1", "Hello"))
        .rejects
        .toMatchObject({ message: "Message not found", statusCode: 404 });

    Message.findById.mockResolvedValueOnce({
        _id: "msg-1",
        chatId: "other-chat",
        senderId: USER_ID
    });
    await expect(chatService.editMessage("msg-1", USER_ID, "chat-1", "Hello"))
        .rejects
        .toMatchObject({ message: "Message does not belong to this chat", statusCode: 400 });

    Message.findById.mockResolvedValueOnce({
        _id: "msg-1",
        chatId: "chat-1",
        senderId: TARGET_ID
    });
    await expect(chatService.editMessage("msg-1", USER_ID, "chat-1", "Hello"))
        .rejects
        .toMatchObject({ message: "You can only edit your own messages", statusCode: 403 });
});

test("editMessage supports no-mention flow and mention-notification failure fallback", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID, TARGET_ID]
    });

    const noMentionDoc = {
        _id: "msg-2",
        chatId: "chat-1",
        senderId: USER_ID,
        mentions: undefined,
        save: jest.fn().mockResolvedValue({})
    };
    Message.findById
        .mockResolvedValueOnce(noMentionDoc)
        .mockReturnValueOnce(makeQuery({
            _id: "msg-2",
            senderId: { _id: USER_ID, username: "editor-user" },
            mentions: []
        }));
    resolveMentionUsersFromText.mockResolvedValueOnce([]);

    const noMentionResult = await chatService.editMessage("msg-2", USER_ID, "chat-1", "No mentions");
    expect(noMentionResult).toEqual(expect.objectContaining({ _id: "msg-2" }));
    expect(notifyMentionedUsers).not.toHaveBeenCalled();

    const mentionDoc = {
        _id: "msg-3",
        chatId: "chat-1",
        senderId: USER_ID,
        mentions: [],
        save: jest.fn().mockResolvedValue({})
    };
    Message.findById
        .mockResolvedValueOnce(mentionDoc)
        .mockReturnValueOnce(makeQuery({
            _id: "msg-3",
            senderId: {},
            mentions: [{ _id: TARGET_ID }]
        }));
    resolveMentionUsersFromText.mockResolvedValueOnce([{ _id: TARGET_ID }]);
    notifyMentionedUsers.mockRejectedValueOnce(new Error("notify down"));

    const mentionResult = await chatService.editMessage("msg-3", USER_ID, "chat-1", "Ping @target");
    expect(mentionResult).toEqual(expect.objectContaining({ _id: "msg-3" }));
    expect(errorSpy).toHaveBeenCalledWith("chat edited mention notification error", expect.any(Error));

    errorSpy.mockRestore();
});

test("addReaction and removeReaction validate chat and message constraints", async () => {
    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.addReaction("msg-1", USER_ID, "🔥", "chat-1"))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({
        _id: "chat-1",
        members: [TARGET_ID]
    });
    await expect(chatService.addReaction("msg-1", USER_ID, "🔥", "chat-1"))
        .rejects
        .toMatchObject({ message: "You are not a member of this chat", statusCode: 403 });

    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID]
    });
    Message.findById.mockResolvedValueOnce(null);
    await expect(chatService.addReaction("msg-1", USER_ID, "🔥", "chat-1"))
        .rejects
        .toMatchObject({ message: "Message not found", statusCode: 404 });

    Message.findById.mockResolvedValueOnce({
        _id: "msg-1",
        chatId: "other-chat",
        addReaction: jest.fn()
    });
    await expect(chatService.addReaction("msg-1", USER_ID, "🔥", "chat-1"))
        .rejects
        .toMatchObject({ message: "Message does not belong to this chat", statusCode: 400 });

    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.removeReaction("msg-1", USER_ID, "🔥", "chat-1"))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({
        _id: "chat-1",
        members: [TARGET_ID]
    });
    await expect(chatService.removeReaction("msg-1", USER_ID, "🔥", "chat-1"))
        .rejects
        .toMatchObject({ message: "You are not a member of this chat", statusCode: 403 });

    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID]
    });
    Message.findById.mockResolvedValueOnce(null);
    await expect(chatService.removeReaction("msg-1", USER_ID, "🔥", "chat-1"))
        .rejects
        .toMatchObject({ message: "Message not found", statusCode: 404 });

    Message.findById.mockResolvedValueOnce({
        _id: "msg-1",
        chatId: "other-chat",
        removeReaction: jest.fn()
    });
    await expect(chatService.removeReaction("msg-1", USER_ID, "🔥", "chat-1"))
        .rejects
        .toMatchObject({ message: "Message does not belong to this chat", statusCode: 400 });
});

test("group management methods validate chat type/admin constraints", async () => {
    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.updateGroupChat("chat-1", USER_ID, { name: "New" }))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({ _id: "chat-1", type: "private", admin: USER_ID });
    await expect(chatService.updateGroupChat("chat-1", USER_ID, { name: "New" }))
        .rejects
        .toMatchObject({ message: "Cannot update private chats", statusCode: 400 });

    Chat.findById.mockResolvedValueOnce({ _id: "chat-1", type: "group", admin: TARGET_ID });
    await expect(chatService.updateGroupChat("chat-1", USER_ID, { name: "New" }))
        .rejects
        .toMatchObject({ message: "Only the admin can update this group", statusCode: 403 });

    const groupDoc = {
        _id: "chat-1",
        type: "group",
        admin: USER_ID,
        name: "Before",
        avatar: "old.png",
        save: jest.fn().mockResolvedValue({})
    };
    Chat.findById.mockResolvedValueOnce(groupDoc);
    await chatService.updateGroupChat("chat-1", USER_ID, {});
    expect(groupDoc.name).toBe("Before");
    expect(groupDoc.avatar).toBe("old.png");
});

test("addMembers and removeMember validate not-found/type/admin edge cases", async () => {
    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.addMembers("chat-1", USER_ID, [TARGET_ID]))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({ _id: "chat-1", type: "private", admin: USER_ID, members: [USER_ID] });
    await expect(chatService.addMembers("chat-1", USER_ID, [TARGET_ID]))
        .rejects
        .toMatchObject({ message: "Cannot add members to private chats", statusCode: 400 });

    Chat.findById.mockResolvedValueOnce({ _id: "chat-1", type: "group", admin: TARGET_ID, members: [USER_ID] });
    await expect(chatService.addMembers("chat-1", USER_ID, [TARGET_ID]))
        .rejects
        .toMatchObject({ message: "Only the admin can add members", statusCode: 403 });

    Chat.findById.mockResolvedValueOnce({ _id: "chat-1", type: "group", admin: USER_ID, members: [USER_ID, TARGET_ID] });
    await expect(chatService.addMembers("chat-1", USER_ID, [TARGET_ID]))
        .rejects
        .toMatchObject({ message: "All users are already members", statusCode: 400 });

    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.removeMember("chat-1", USER_ID, TARGET_ID))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({ _id: "chat-1", type: "private", admin: USER_ID, members: [USER_ID] });
    await expect(chatService.removeMember("chat-1", USER_ID, TARGET_ID))
        .rejects
        .toMatchObject({ message: "Cannot remove members from private chats", statusCode: 400 });

    Chat.findById.mockResolvedValueOnce({ _id: "chat-1", type: "group", admin: TARGET_ID, members: [USER_ID, TARGET_ID] });
    await expect(chatService.removeMember("chat-1", USER_ID, TARGET_ID))
        .rejects
        .toMatchObject({ message: "Only the admin can remove members", statusCode: 403 });

    Chat.findById.mockResolvedValueOnce({ _id: "chat-1", type: "group", admin: USER_ID, members: [USER_ID, TARGET_ID] });
    await expect(chatService.removeMember("chat-1", USER_ID, USER_ID))
        .rejects
        .toMatchObject({ message: "Cannot remove the admin", statusCode: 400 });
});

test("leaveGroup validates type/not-found and transfers admin when needed", async () => {
    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.leaveGroup("chat-1", USER_ID))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({ _id: "chat-1", type: "private", admin: USER_ID, members: [USER_ID] });
    await expect(chatService.leaveGroup("chat-1", USER_ID))
        .rejects
        .toMatchObject({ message: "Cannot leave private chats", statusCode: 400 });

    const transferDoc = {
        _id: "chat-1",
        type: "group",
        admin: USER_ID,
        members: [USER_ID, TARGET_ID, "507f1f77bcf86cd799439013"],
        save: jest.fn().mockResolvedValue({})
    };
    Chat.findById.mockResolvedValueOnce(transferDoc);
    const result = await chatService.leaveGroup("chat-1", USER_ID);
    expect(transferDoc.admin).toBe(TARGET_ID);
    expect(transferDoc.members).toEqual([TARGET_ID, "507f1f77bcf86cd799439013"]);
    expect(transferDoc.save).toHaveBeenCalledTimes(1);
    expect(result).toBe(transferDoc);
});

test("toggleMute, toggleArchive and searchMessages validate membership constraints", async () => {
    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.toggleMute("chat-1", USER_ID))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({
        _id: "chat-1",
        members: [TARGET_ID]
    });
    await expect(chatService.toggleMute("chat-1", USER_ID))
        .rejects
        .toMatchObject({ message: "You are not a member of this chat", statusCode: 403 });

    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.toggleArchive("chat-1", USER_ID))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({
        _id: "chat-1",
        members: [TARGET_ID]
    });
    await expect(chatService.toggleArchive("chat-1", USER_ID))
        .rejects
        .toMatchObject({ message: "You are not a member of this chat", statusCode: 403 });

    Chat.findById.mockResolvedValueOnce(null);
    await expect(chatService.searchMessages("chat-1", USER_ID, "hi"))
        .rejects
        .toMatchObject({ message: "Chat not found", statusCode: 404 });

    Chat.findById.mockResolvedValueOnce({
        _id: "chat-1",
        members: [TARGET_ID]
    });
    await expect(chatService.searchMessages("chat-1", USER_ID, "hi"))
        .rejects
        .toMatchObject({ message: "You are not a member of this chat", statusCode: 403 });
});
