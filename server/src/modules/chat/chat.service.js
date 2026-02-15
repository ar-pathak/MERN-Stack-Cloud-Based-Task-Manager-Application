// modules/chat/chat.service.js (ENHANCED VERSION)
const Chat = require("../../models/chat");
const Message = require("../../models/message");
const User = require("../../models/user");
const Follow = require("../../models/follow");
const Post = require("../../models/post");
const Workspace = require("../../models/workspace");
const WorkspaceMember = require("../../models/workspaceMember");
const Project = require("../../models/project");
const Task = require("../../models/tasks");
const Subtask = require("../../models/subtasks");
const mongoose = require("mongoose");
const postService = require("../posts/post.service");
const {
    resolveMentionUsersFromText,
    notifyMentionedUsers,
    getMentionSnippet
} = require("../utils/mentionService");

const sharedPostPopulate = {
    path: "sharedPost",
    select: "content media author postType visibility status originalPost createdAt",
    populate: [
        { path: "author", select: "name username avatar isVerified" },
        {
            path: "originalPost",
            select: "content media author createdAt",
            populate: { path: "author", select: "name username avatar isVerified" }
        }
    ]
};

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const toIdString = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (value?._id && value._id !== value) return toIdString(value._id);
    if (typeof value?.toHexString === "function") return value.toHexString();
    if (typeof value?.toString === "function") {
        const normalized = value.toString();
        return normalized && normalized !== "[object Object]" ? normalized : "";
    }
    return "";
};

const hasBlockedUser = (userDoc, targetId) => {
    const targetIdString = toIdString(targetId);
    if (!targetIdString) return false;
    return (userDoc?.blockedUsers || []).some((entry) => toIdString(entry) === targetIdString);
};

class ChatService {

    async assertCanMessageTarget(senderId, targetId) {
        const [senderUser, targetUser, followStatus] = await Promise.all([
            User.findById(senderId)
                .select("blockedUsers accountStatus")
                .lean(),
            User.findById(targetId)
                .select("blockedUsers accountStatus isPrivate preferences.privacy.disablePublicMessages")
                .lean(),
            Follow.checkRelationship(senderId, targetId)
        ]);

        if (!senderUser || senderUser.accountStatus !== "active") {
            throw createError("Your account is not active", 403);
        }
        if (!targetUser || targetUser.accountStatus !== "active") {
            throw createError("User not found", 404);
        }

        if (hasBlockedUser(senderUser, targetId)) {
            throw createError("Unblock this user before sending a message", 403);
        }

        if (hasBlockedUser(targetUser, senderId)) {
            throw createError("You cannot message this user", 403);
        }

        const requiresFollowing = Boolean(
            targetUser?.isPrivate || targetUser?.preferences?.privacy?.disablePublicMessages
        );
        if (requiresFollowing && !followStatus?.isFollowing) {
            throw createError(
                "This user accepts messages from followers only",
                403
            );
        }
    }

    inferAttachmentType(attachments = []) {
        if (!attachments?.length) return "text";
        const firstType = attachments[0]?.type || "";
        if (firstType.startsWith("image")) return "image";
        if (firstType.startsWith("video")) return "video";
        if (firstType.startsWith("audio")) return "audio";
        return "file";
    }

    async resolveSharedPostForChat({ postId, senderId, chatMembers }) {
        if (!postId) return null;

        const post = await Post.findById(postId)
            .select("author content media visibility status postType originalPost createdAt")
            .lean();

        if (!post) {
            throw createError("Post not found", 404);
        }

        await postService.assertCanAccessPost(post, senderId, "share this post");

        const memberIds = (chatMembers || [])
            .map((memberId) => toIdString(memberId))
            .filter(Boolean)
            .filter((memberId) => memberId !== toIdString(senderId));

        for (const memberId of memberIds) {
            await postService.assertCanAccessPost(post, memberId, "view this post");
        }

        return post._id;
    }

    async findSectionScopeByChatId(chatId) {
        const [workspace, project, task, subtask] = await Promise.all([
            Workspace.findOne({ chatId })
                .select("_id createdBy")
                .lean(),
            Project.findOne({ chatId })
                .select("_id owner members workspace")
                .lean(),
            Task.findOne({ chatId })
                .select("_id createdBy assignees workspace project")
                .lean(),
            Subtask.findOne({ chatId })
                .select("_id task createdBy assignedTo")
                .lean()
        ]);

        if (workspace) return { type: "workspace", entity: workspace };
        if (project) return { type: "project", entity: project };
        if (task) return { type: "task", entity: task };
        if (subtask) return { type: "subtask", entity: subtask };
        return null;
    }

    async resolveWorkspaceAccess(workspaceId, userId, workspaceDoc = null) {
        const workspace = workspaceDoc || (await Workspace.findById(workspaceId).select("_id createdBy").lean());
        if (!workspace) {
            return { isMember: false, role: null, source: "workspace" };
        }

        if (String(workspace.createdBy) === String(userId)) {
            return { isMember: true, role: "owner", source: "workspace" };
        }

        const membership = await WorkspaceMember.findOne({
            workspace: workspace._id,
            user: userId,
            status: "active"
        })
            .select("role")
            .lean();

        if (!membership) {
            return { isMember: false, role: null, source: "workspace" };
        }

        return {
            isMember: true,
            role: String(membership.role || "member"),
            source: "workspace"
        };
    }

    async resolveProjectAccess(projectDoc, userId) {
        const project = projectDoc || null;
        if (!project) {
            return { isMember: false, role: null, source: "project" };
        }

        if (String(project.owner) === String(userId)) {
            return { isMember: true, role: "owner", source: "project" };
        }

        const member = (project.members || []).find(
            (entry) => String(entry?.user) === String(userId)
        );
        if (member) {
            return {
                isMember: true,
                role: String(member.role || "member"),
                source: "project"
            };
        }

        if (!project.workspace) {
            return { isMember: false, role: null, source: "project" };
        }

        const workspaceAccess = await this.resolveWorkspaceAccess(project.workspace, userId);
        if (!workspaceAccess.isMember) {
            return { isMember: false, role: null, source: "project" };
        }

        return workspaceAccess;
    }

    async resolveTaskAccess(taskDoc, userId) {
        const task = taskDoc || null;
        if (!task) {
            return { isMember: false, role: null, source: "task" };
        }

        if (String(task.createdBy) === String(userId)) {
            return { isMember: true, role: "creator", source: "task" };
        }

        const isAssignee = (task.assignees || []).some(
            (assigneeId) => String(assigneeId) === String(userId)
        );
        if (isAssignee) {
            return { isMember: true, role: "assignee", source: "task" };
        }

        if (task.project) {
            const project = await Project.findById(task.project)
                .select("_id owner members workspace")
                .lean();
            const projectAccess = await this.resolveProjectAccess(project, userId);
            if (projectAccess.isMember) {
                return projectAccess;
            }
        }

        if (task.workspace) {
            return this.resolveWorkspaceAccess(task.workspace, userId);
        }

        return { isMember: false, role: null, source: "task" };
    }

    async resolveSubtaskAccess(subtaskDoc, userId) {
        const subtask = subtaskDoc || null;
        if (!subtask) {
            return { isMember: false, role: null, source: "subtask" };
        }

        if (String(subtask.createdBy) === String(userId)) {
            return { isMember: true, role: "creator", source: "subtask" };
        }

        const isAssigned = (subtask.assignedTo || []).some(
            (assigneeId) => String(assigneeId) === String(userId)
        );
        if (isAssigned) {
            return { isMember: true, role: "assignee", source: "subtask" };
        }

        if (!subtask.task) {
            return { isMember: false, role: null, source: "subtask" };
        }

        const task = await Task.findById(subtask.task)
            .select("_id createdBy assignees workspace project")
            .lean();

        return this.resolveTaskAccess(task, userId);
    }

    async resolveSectionAccessByChat(chatId, userId) {
        const sectionScope = await this.findSectionScopeByChatId(chatId);
        if (!sectionScope) {
            return { isSectionChat: false, isMember: true, role: null, scopeType: null };
        }

        let access = { isMember: false, role: null, source: sectionScope.type };
        if (sectionScope.type === "workspace") {
            access = await this.resolveWorkspaceAccess(sectionScope.entity._id, userId, sectionScope.entity);
        } else if (sectionScope.type === "project") {
            access = await this.resolveProjectAccess(sectionScope.entity, userId);
        } else if (sectionScope.type === "task") {
            access = await this.resolveTaskAccess(sectionScope.entity, userId);
        } else if (sectionScope.type === "subtask") {
            access = await this.resolveSubtaskAccess(sectionScope.entity, userId);
        }

        return {
            ...access,
            isSectionChat: true,
            scopeType: sectionScope.type
        };
    }

    async assertCanViewSectionChat(chatId, userId) {
        const access = await this.resolveSectionAccessByChat(chatId, userId);
        if (!access.isSectionChat) return access;

        if (!access.isMember) {
            const error = createError("You are not a member of this section chat", 403);
            error.code = "SECTION_CHAT_MEMBER_REQUIRED";
            throw error;
        }

        return access;
    }

    async assertCanSendSectionChat(chatId, userId) {
        const access = await this.assertCanViewSectionChat(chatId, userId);
        if (!access.isSectionChat) return access;

        if (String(access.role || "").toLowerCase() === "viewer") {
            const error = createError(
                "You don't have permission to send messages in this section chat",
                403
            );
            error.code = "SECTION_CHAT_SEND_FORBIDDEN";
            throw error;
        }

        return access;
    }

    // -----------------------------------------------------------------------
    //  Check Private Chat Exists
    // -----------------------------------------------------------------------

    async checkPrivateChatExists(userA, userB) {
        const chat = await Chat.findOne({
            type: "private",
            members: { $all: [userA, userB], $size: 2 }
        }).select("_id");

        return chat ? chat._id : null;
    }

    // -----------------------------------------------------------------------
    // 1. Create / Get — Private Chat
    // -----------------------------------------------------------------------

    async getOrCreatePrivateChat(userA, userB) {
        // Guard: a user cannot open a private chat with themselves
        if (String(userA) === String(userB)) {
            throw createError("Cannot create a private chat with yourself", 400);
        }

        await this.assertCanMessageTarget(userA, userB);

        let chat = await Chat.findOne({
            type: "private",
            members: { $all: [userA, userB], $size: 2 }
        })
            .populate("members", "name username avatar email")
            .populate({
                path: "lastMessage",
                populate: [
                    { path: "senderId", select: "name username avatar" },
                    sharedPostPopulate
                ]
            });

        if (!chat) {
            chat = await Chat.create({
                type: "private",
                members: [userA, userB]
            });

            // Populate after creation
            await chat.populate("members", "name username avatar email");
        }

        return chat;
    }

    // -----------------------------------------------------------------------
    // 2. Create — Group Chat
    // -----------------------------------------------------------------------
    async createGroupChat(adminId, name, members) {
        // Validate name
        if (!name || name.trim().length < 2) {
            throw new Error("Group name must be at least 2 characters");
        }

        if (!members || members.length < 2) {
            throw new Error("A group chat requires at least 2 other members");
        }

        // Deduplicate and always include the creator
        const uniqueMembers = [...new Set([String(adminId), ...members.map(String)])];

        const chat = await Chat.create({
            type: "group",
            name: name.trim(),
            members: uniqueMembers,
            admin: adminId
        });

        // Populate and return
        return Chat.findById(chat._id)
            .populate("members", "name username avatar email")
            .populate("admin", "name avatar");
    }

    // -----------------------------------------------------------------------
    // 3. Get User Chats — Inbox
    // -----------------------------------------------------------------------
    async getChats(userId) {
        return Chat.find({
            members: userId,
            archived: false  // Don't show archived chats by default
        })
            .populate("members", "name username avatar email")
            .populate({
                path: "lastMessage",
                populate: [
                    { path: "senderId", select: "name username avatar" },
                    sharedPostPopulate
                ]
            })
            .sort({ updatedAt: -1 })
            .lean();
    }

    // -----------------------------------------------------------------------
    // 4. Send Message — with membership check
    // -----------------------------------------------------------------------
    async sendMessage(senderId, chatId, content, attachments = [], replyTo = null, postId = null) {
        // Validate content
        const hasPostShare = Boolean(postId);
        if (
            (!content || content.trim().length === 0) &&
            (!attachments || attachments.length === 0) &&
            !hasPostShare
        ) {
            throw createError("Message must contain text, attachment, or a shared post", 400);
        }

        // Verify the sender is actually a member of this chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw createError("Chat not found", 404);
        }
        if (!chat.members.some((id) => String(id) === String(senderId))) {
            throw createError("You are not a member of this chat", 403);
        }

        await this.assertCanSendSectionChat(chatId, senderId);

        if (chat.type === "private") {
            const recipientId = chat.members.find((memberId) => String(memberId) !== String(senderId));
            if (recipientId) {
                await this.assertCanMessageTarget(senderId, recipientId);
            }
        }

        if (hasPostShare && attachments?.length) {
            throw createError("Attachments cannot be combined with a shared post", 400);
        }

        // Verify replyTo message exists if provided
        if (replyTo) {
            const replyMessage = await Message.findById(replyTo);
            if (!replyMessage || String(replyMessage.chatId) !== String(chatId)) {
                throw createError("Invalid reply reference", 400);
            }
        }

        const cleanContent = content ? content.trim() : "";
        const sharedPostId = hasPostShare
            ? await this.resolveSharedPostForChat({
                postId,
                senderId,
                chatMembers: chat.members
            })
            : null;

        const mentionUsers = cleanContent
            ? await resolveMentionUsersFromText([cleanContent], {
                allowedUserIds: chat.members,
                excludeUserIds: [senderId]
            })
            : [];

        // Create message
        const messageData = {
            chatId,
            senderId,
            content: cleanContent,
            status: "active"
        };

        if (mentionUsers.length) {
            messageData.mentions = mentionUsers.map((user) => user._id);
        }

        if (sharedPostId) {
            messageData.type = "post";
            messageData.sharedPost = sharedPostId;
        } else if (attachments && attachments.length > 0) {
            messageData.attachments = attachments;
            messageData.type = this.inferAttachmentType(attachments);
        }

        if (replyTo) {
            messageData.replyTo = replyTo;
        }

        const message = await Message.create(messageData);

        if (sharedPostId) {
            await Post.findByIdAndUpdate(sharedPostId, { $inc: { sharesCount: 1 } });
        }

        // Bump lastMessage pointer (also updates the chat's updatedAt via
        // Mongoose timestamps so the inbox sort stays correct)
        await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

        const populatedMessage = await Message.findById(message._id)
            .populate("senderId", "name username avatar")
            .populate({
                path: "replyTo",
                select: "content senderId type sharedPost",
                populate: [
                    { path: "senderId", select: "name username avatar" },
                    sharedPostPopulate
                ]
            })
            .populate(sharedPostPopulate)
            .populate("mentions", "username name avatar")
            .lean();

        if (mentionUsers.length) {
            const senderLabel = populatedMessage?.senderId?.name
                || populatedMessage?.senderId?.username
                || "Someone";

            try {
                await notifyMentionedUsers({
                    actorId: senderId,
                    mentionUsers,
                    title: "You were mentioned in chat",
                    message: `${senderLabel} mentioned you: "${getMentionSnippet(cleanContent)}"`,
                    type: "chat",
                    category: "chat",
                    priority: "high",
                    entityType: "chat",
                    entityId: chatId,
                    chatId,
                    link: "/main",
                    metadata: {
                        source: "chat.message",
                        messageId: message._id
                    },
                    dedupeKey: `mention:chat:${String(message._id)}`
                });
            } catch (mentionError) {
                console.error("chat mention notification error", mentionError);
            }
        }

        return populatedMessage;
    }

    // 5. Get Messages — with membership check & safe pagination
    // -----------------------------------------------------------------------
    async getMessages(chatId, userId, page, limit) {
        // Coerce to numbers defensively (query-string values are strings)
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
        const skip = (safePage - 1) * safeLimit;

        // Verify the requester is a member of this chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw createError("Chat not found", 404);
        }
        if (!chat.members.some((id) => String(id) === String(userId))) {
            throw createError("You are not a member of this chat", 403);
        }

        await this.assertCanViewSectionChat(chatId, userId);

        const messages = await Message.find({ chatId, status: { $in: ["active", "edited"] } })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .populate("senderId", "name avatar")
            .populate({
                path: "replyTo",
                select: "content senderId type sharedPost",
                populate: [
                    { path: "senderId", select: "name avatar" },
                    sharedPostPopulate
                ]
            })
            .populate(sharedPostPopulate)
            .populate("reactions.userId", "name avatar")
            .populate("mentions", "username name avatar")
            .lean();

        // Get total count for pagination info
        const total = await Message.countDocuments({
            chatId,
            status: { $in: ["active", "edited"] }
        });

        return {
            messages,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit),
                hasMore: skip + messages.length < total
            }
        };
    }

    // -----------------------------------------------------------------------
    // 5b. Get Unread Mention Summary (grouped by chat)
    // -----------------------------------------------------------------------
    async getUnreadMentionSummary(userId, limit = 200) {
        const userObjectId = new mongoose.Types.ObjectId(String(userId));
        const chats = await Chat.find({ members: userObjectId }).select("_id").lean();
        const chatIds = chats.map((chat) => chat._id);

        if (!chatIds.length) {
            return {
                mentions: [],
                byChat: {},
                totalUnreadMentions: 0
            };
        }

        const summary = await Message.aggregate([
            {
                $match: {
                    chatId: { $in: chatIds },
                    mentions: userObjectId,
                    senderId: { $ne: userObjectId },
                    status: { $in: ["active", "edited"] },
                    "readBy.userId": { $ne: userObjectId }
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$chatId",
                    unreadMentionCount: { $sum: 1 },
                    nextMentionMessageId: { $first: "$_id" },
                    nextMentionCreatedAt: { $first: "$createdAt" },
                    nextMentionContent: { $first: "$content" }
                }
            },
            { $sort: { nextMentionCreatedAt: -1 } },
            { $limit: Math.min(500, Math.max(1, Number(limit) || 200)) }
        ]);

        const mentions = summary.map((item) => ({
            chatId: String(item._id),
            unreadMentionCount: item.unreadMentionCount || 0,
            nextMentionMessageId: item.nextMentionMessageId ? String(item.nextMentionMessageId) : null,
            nextMentionCreatedAt: item.nextMentionCreatedAt || null,
            nextMentionContent: item.nextMentionContent || ""
        }));

        const byChat = {};
        let totalUnreadMentions = 0;
        mentions.forEach((item) => {
            byChat[item.chatId] = item;
            totalUnreadMentions += Number(item.unreadMentionCount || 0);
        });

        return {
            mentions,
            byChat,
            totalUnreadMentions
        };
    }

    // -----------------------------------------------------------------------
    // 5c. Get Unread Call Invite Summary (grouped by chat)
    // -----------------------------------------------------------------------
    async getUnreadCallInviteSummary(userId, limit = 200) {
        const userObjectId = new mongoose.Types.ObjectId(String(userId));
        const chats = await Chat.find({ members: userObjectId }).select("_id").lean();
        const chatIds = chats.map((chat) => chat._id);

        if (!chatIds.length) {
            return {
                invites: [],
                byChat: {},
                totalUnreadInvites: 0
            };
        }

        const summary = await Message.aggregate([
            {
                $match: {
                    chatId: { $in: chatIds },
                    senderId: { $ne: userObjectId },
                    status: { $in: ["active", "edited"] },
                    isSystem: true,
                    mentions: userObjectId,
                    "meta.activityType": "call_invite",
                    "readBy.userId": { $ne: userObjectId }
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$chatId",
                    unreadInviteCount: { $sum: 1 },
                    nextInviteMessageId: { $first: "$_id" },
                    nextInviteCreatedAt: { $first: "$createdAt" },
                    nextInviteContent: { $first: "$content" },
                    callId: { $first: "$meta.callId" }
                }
            },
            { $sort: { nextInviteCreatedAt: -1 } },
            { $limit: Math.min(500, Math.max(1, Number(limit) || 200)) }
        ]);

        const invites = summary.map((item) => ({
            chatId: String(item._id),
            unreadInviteCount: item.unreadInviteCount || 0,
            nextInviteMessageId: item.nextInviteMessageId ? String(item.nextInviteMessageId) : null,
            nextInviteCreatedAt: item.nextInviteCreatedAt || null,
            nextInviteContent: item.nextInviteContent || "",
            callId: item.callId ? String(item.callId) : null
        }));

        const byChat = {};
        let totalUnreadInvites = 0;
        invites.forEach((item) => {
            byChat[item.chatId] = item;
            totalUnreadInvites += Number(item.unreadInviteCount || 0);
        });

        return {
            invites,
            byChat,
            totalUnreadInvites
        };
    }

    // -----------------------------------------------------------------------
    // 6. Pin/Unpin Message
    // -----------------------------------------------------------------------
    async togglePinMessage(messageId, userId, chatId) {
        // Verify membership
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }
        if (!chat.members.some((id) => String(id) === String(userId))) {
            throw new Error("You are not a member of this chat");
        }

        const message = await Message.findById(messageId);
        if (!message) {
            throw new Error("Message not found");
        }
        if (String(message.chatId) !== String(chatId)) {
            throw new Error("Message does not belong to this chat");
        }

        message.pinned = !message.pinned;
        await message.save();

        return message;
    }

    // -----------------------------------------------------------------------
    // 7. Delete Message (soft delete)
    // -----------------------------------------------------------------------
    async deleteMessage(messageId, userId, chatId) {
        // Verify membership
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }
        if (!chat.members.some((id) => String(id) === String(userId))) {
            throw new Error("You are not a member of this chat");
        }

        const message = await Message.findById(messageId);
        if (!message) {
            throw new Error("Message not found");
        }
        if (String(message.chatId) !== String(chatId)) {
            throw new Error("Message does not belong to this chat");
        }

        // Only the sender can delete their own message
        if (String(message.senderId) !== String(userId)) {
            throw new Error("You can only delete your own messages");
        }

        message.status = "deleted";
        await message.save();

        return message;
    }

    // -----------------------------------------------------------------------
    // 8. Edit Message
    // -----------------------------------------------------------------------
    async editMessage(messageId, userId, chatId, newContent) {
        if (!newContent || newContent.trim().length === 0) {
            throw new Error("Message content cannot be empty");
        }

        // Verify membership
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }
        if (!chat.members.some((id) => String(id) === String(userId))) {
            throw new Error("You are not a member of this chat");
        }

        const message = await Message.findById(messageId);
        if (!message) {
            throw new Error("Message not found");
        }
        if (String(message.chatId) !== String(chatId)) {
            throw new Error("Message does not belong to this chat");
        }

        // Only the sender can edit their own message
        if (String(message.senderId) !== String(userId)) {
            throw new Error("You can only edit your own messages");
        }

        const cleanContent = newContent.trim();
        const mentionUsers = await resolveMentionUsersFromText([cleanContent], {
            allowedUserIds: chat.members,
            excludeUserIds: [userId]
        });

        const previousMentionIds = new Set((message.mentions || []).map((id) => String(id)));

        message.content = cleanContent;
        message.edited = true;
        message.editedAt = new Date();
        message.status = "edited";
        message.mentions = mentionUsers.map((user) => user._id);
        await message.save();

        const newlyMentionedUsers = mentionUsers.filter((user) => !previousMentionIds.has(String(user._id)));

        const populatedMessage = await Message.findById(message._id)
            .populate("senderId", "name username avatar")
            .populate(sharedPostPopulate)
            .populate("mentions", "username name avatar")
            .lean();

        if (newlyMentionedUsers.length) {
            const senderLabel = populatedMessage?.senderId?.name
                || populatedMessage?.senderId?.username
                || "Someone";

            try {
                await notifyMentionedUsers({
                    actorId: userId,
                    mentionUsers: newlyMentionedUsers,
                    title: "You were mentioned in edited message",
                    message: `${senderLabel} mentioned you: "${getMentionSnippet(cleanContent)}"`,
                    type: "chat",
                    category: "chat",
                    priority: "high",
                    entityType: "chat",
                    entityId: chatId,
                    chatId,
                    link: "/main",
                    metadata: {
                        source: "chat.message.edit",
                        messageId: message._id
                    },
                    dedupeKey: `mention:chat:edit:${String(message._id)}`
                });
            } catch (mentionError) {
                console.error("chat edited mention notification error", mentionError);
            }
        }

        return populatedMessage;
    }
    // 9. Add Reaction
    // -----------------------------------------------------------------------
    async addReaction(messageId, userId, emoji, chatId) {
        // Verify membership
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }
        if (!chat.members.some((id) => String(id) === String(userId))) {
            throw new Error("You are not a member of this chat");
        }

        const message = await Message.findById(messageId);
        if (!message) {
            throw new Error("Message not found");
        }
        if (String(message.chatId) !== String(chatId)) {
            throw new Error("Message does not belong to this chat");
        }

        await message.addReaction(userId, emoji);
        return Message.findById(message._id)
            .populate("senderId", "name username avatar")
            .populate(sharedPostPopulate)
            .populate("reactions.userId", "name username avatar")
            .populate("mentions", "username name avatar")
            .lean();
    }

    // -----------------------------------------------------------------------
    // 10. Remove Reaction
    // -----------------------------------------------------------------------
    async removeReaction(messageId, userId, emoji, chatId) {
        // Verify membership
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }
        if (!chat.members.some((id) => String(id) === String(userId))) {
            throw new Error("You are not a member of this chat");
        }

        const message = await Message.findById(messageId);
        if (!message) {
            throw new Error("Message not found");
        }
        if (String(message.chatId) !== String(chatId)) {
            throw new Error("Message does not belong to this chat");
        }

        await message.removeReaction(userId, emoji);
        return Message.findById(message._id)
            .populate("senderId", "name username avatar")
            .populate(sharedPostPopulate)
            .populate("reactions.userId", "name username avatar")
            .populate("mentions", "username name avatar")
            .lean();
    }

    // -----------------------------------------------------------------------
    // 11. Update Group Chat
    // -----------------------------------------------------------------------
    async updateGroupChat(chatId, userId, updates) {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }

        // Only group chats can be updated
        if (chat.type !== "group") {
            throw new Error("Cannot update private chats");
        }

        // Only admin can update group
        if (String(chat.admin) !== String(userId)) {
            throw new Error("Only the admin can update this group");
        }

        // Update allowed fields
        if (updates.name) chat.name = updates.name.trim();
        if (updates.avatar) chat.avatar = updates.avatar;

        await chat.save();
        return chat;
    }

    // -----------------------------------------------------------------------
    // 12. Add Members to Group
    // -----------------------------------------------------------------------
    async addMembers(chatId, userId, newMembers) {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }

        if (chat.type !== "group") {
            throw new Error("Cannot add members to private chats");
        }

        // Only admin can add members
        if (String(chat.admin) !== String(userId)) {
            throw new Error("Only the admin can add members");
        }

        // Add new members (avoid duplicates)
        const currentMembers = chat.members.map(m => String(m));
        const membersToAdd = newMembers.filter(m => !currentMembers.includes(String(m)));

        if (membersToAdd.length === 0) {
            throw new Error("All users are already members");
        }

        chat.members.push(...membersToAdd);
        await chat.save();

        return chat;
    }

    // -----------------------------------------------------------------------
    // 13. Remove Member from Group
    // -----------------------------------------------------------------------
    async removeMember(chatId, userId, memberToRemove) {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }

        if (chat.type !== "group") {
            throw new Error("Cannot remove members from private chats");
        }

        // Only admin can remove members
        if (String(chat.admin) !== String(userId)) {
            throw new Error("Only the admin can remove members");
        }

        // Cannot remove admin
        if (String(memberToRemove) === String(chat.admin)) {
            throw new Error("Cannot remove the admin");
        }

        chat.members = chat.members.filter(m => String(m) !== String(memberToRemove));
        await chat.save();

        return chat;
    }

    // -----------------------------------------------------------------------
    // 14. Leave Group
    // -----------------------------------------------------------------------
    async leaveGroup(chatId, userId) {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }

        if (chat.type !== "group") {
            throw new Error("Cannot leave private chats");
        }

        // If admin is leaving, transfer admin to first member
        if (String(chat.admin) === String(userId)) {
            const otherMembers = chat.members.filter(m => String(m) !== String(userId));
            if (otherMembers.length > 0) {
                chat.admin = otherMembers[0];
            }
        }

        chat.members = chat.members.filter(m => String(m) !== String(userId));

        // If no members left, delete the chat
        if (chat.members.length === 0) {
            await Chat.findByIdAndDelete(chatId);
            return { deleted: true };
        }

        await chat.save();
        return chat;
    }

    // -----------------------------------------------------------------------
    // 15. Search Messages
    // -----------------------------------------------------------------------
    async searchMessages(chatId, userId, query, limit = 20) {
        // Verify membership
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }
        if (!chat.members.some((id) => String(id) === String(userId))) {
            throw new Error("You are not a member of this chat");
        }

        return Message.find({
            chatId,
            status: "active",
            content: { $regex: query, $options: "i" }
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("senderId", "name avatar")
            .populate("mentions", "username name avatar")
            .lean();
    }
}

module.exports = new ChatService();





