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
