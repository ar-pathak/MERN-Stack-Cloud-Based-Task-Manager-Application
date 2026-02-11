const Activity = require("../../models/activity");
const Message = require("../../models/message");
const Chat = require("../../models/chat");
const User = require("../../models/user");
const { createActivityNotifications } = require("../notification/notification.service");

const normalizeId = (id) => {
    if (!id) return null;
    return id._id ? id._id : id;
};

const normalizeIdString = (id) => {
    const normalized = normalizeId(id);
    return normalized ? String(normalized) : null;
};

const uniqueIds = (ids = []) => {
    const set = new Set();
    ids.forEach((id) => {
        const str = normalizeIdString(id);
        if (str) set.add(str);
    });
    return Array.from(set);
};

const applySession = (query, session) => (session ? query.session(session) : query);

const createWithSession = async (Model, doc, session) => {
    if (!session) return Model.create(doc);
    const created = await Model.create([doc], { session });
    return created[0];
};

const getUserLabel = async (userId, session = null) => {
    const id = normalizeId(userId);
    if (!id) return "User";

    const query = User.findById(id).select("name username email");
    const user = await applySession(query, session).lean();

    if (!user) return "User";
    return user.name || user.username || user.email || "User";
};

const getUserLabels = async (userIds = [], session = null) => {
    const ids = uniqueIds(userIds);
    if (!ids.length) return [];

    const query = User.find({ _id: { $in: ids } }).select("name username email");
    const users = await applySession(query, session).lean();
    const byId = new Map(users.map((user) => [String(user._id), user]));

    return ids.map((id) => {
        const user = byId.get(id);
        return user?.name || user?.username || user?.email || "User";
    });
};

const formatUserList = (labels = []) => {
    if (!labels.length) return "user";
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
};

const postMessageToChat = async ({ chatId, senderId, content, isSystem = false, session = null }) => {
    const normalizedChatId = normalizeId(chatId);
    const normalizedSenderId = normalizeId(senderId);

    if (!normalizedChatId || !normalizedSenderId || !content) return null;

    const chatQuery = Chat.findById(normalizedChatId).select("_id");
    const chat = await applySession(chatQuery, session).lean();
    if (!chat) return null;

    const message = await createWithSession(
        Message,
        {
            chatId: normalizedChatId,
            senderId: normalizedSenderId,
            content,
            type: "text",
            isSystem: Boolean(isSystem),
            status: "active"
        },
        session
    );

    const updateQuery = Chat.findByIdAndUpdate(normalizedChatId, { lastMessage: message._id });
    if (session) {
        await updateQuery.session(session);
    } else {
        await updateQuery;
    }

    return message;
};

const logActivity = async ({
    actorId,
    action,
    message,
    level = "system",
    workspaceId = null,
    projectId = null,
    taskId = null,
    subtaskId = null,
    chatId = null,
    mirrorChatIds = [],
    meta = {},
    session = null
}) => {
    const normalizedActorId = normalizeId(actorId);
    if (!normalizedActorId || !action || !message) return null;

    const normalizedChatId = normalizeId(chatId);
    const chatsToPost = uniqueIds([normalizedChatId, ...(mirrorChatIds || [])]);

    const activity = await createWithSession(
        Activity,
        {
            user: normalizedActorId,
            workspace: normalizeId(workspaceId),
            project: normalizeId(projectId),
            task: normalizeId(taskId),
            subtask: normalizeId(subtaskId),
            chatId: normalizedChatId,
            level,
            action,
            message,
            meta
        },
        session
    );

    for (const targetChatId of chatsToPost) {
        await postMessageToChat({
            chatId: targetChatId,
            senderId: normalizedActorId,
            content: message,
            isSystem: true,
            session
        });
    }

    await createActivityNotifications({
        actorId: normalizedActorId,
        action,
        message,
        level,
        workspaceId,
        projectId,
        taskId,
        subtaskId,
        chatId: normalizedChatId,
        meta,
        session
    });

    return activity;
};

module.exports = {
    logActivity,
    getUserLabel,
    getUserLabels,
    formatUserList,
    normalizeIdString,
    uniqueIds
};
