const User = require("../../models/user");
const { createNotifications } = require("../notification/notification.service");

const mentionRegex = /(^|[\s([{\"'`.,!?;:\-])@([a-z0-9_]{3,20})/gi;

const normalizeIdString = (value) => {
    if (!value) return null;
    return String(value._id || value);
};

const uniqueStrings = (values = []) => {
    const set = new Set();
    values.forEach((value) => {
        const normalized = String(value || "").trim();
        if (normalized) set.add(normalized);
    });
    return Array.from(set);
};

const extractMentionUsernames = (text = "") => {
    const source = String(text || "");
    if (!source.includes("@")) return [];

    const matches = [];
    let match;

    while ((match = mentionRegex.exec(source)) !== null) {
        const username = String(match[2] || "").toLowerCase().trim();
        if (username) matches.push(username);
    }

    return uniqueStrings(matches);
};

const extractMentionUsernamesFromTexts = (texts = []) => {
    const values = Array.isArray(texts) ? texts : [texts];
    const all = [];

    values.forEach((value) => {
        all.push(...extractMentionUsernames(value));
    });

    return uniqueStrings(all);
};

const withSession = (query, session) => (session ? query.session(session) : query);

const resolveMentionUsersFromText = async (
    texts,
    {
        allowedUserIds = null,
        excludeUserIds = [],
        session = null
    } = {}
) => {
    const usernames = extractMentionUsernamesFromTexts(texts);
    if (!usernames.length) {
        return [];
    }

    const query = {
        username: { $in: usernames },
        accountStatus: "active",
        "preferences.privacy.allowMentions": { $ne: false }
    };

    if (Array.isArray(allowedUserIds) && allowedUserIds.length > 0) {
        query._id = { $in: allowedUserIds };
    }

    const usersQuery = User.find(query)
        .select("_id username name avatar");

    const users = await withSession(usersQuery, session).lean();
    if (!users.length) return [];

    const excludeSet = new Set((excludeUserIds || []).map((id) => normalizeIdString(id)).filter(Boolean));
    const byUsername = new Map(users.map((user) => [String(user.username || "").toLowerCase(), user]));

    const ordered = usernames
        .map((username) => byUsername.get(String(username).toLowerCase()))
        .filter(Boolean)
        .filter((user) => !excludeSet.has(String(user._id)));

    return ordered;
};

const getMentionSnippet = (text = "", maxLength = 140) => {
    const source = String(text || "").trim();
    if (!source) return "";
    if (source.length <= maxLength) return source;
    return `${source.slice(0, maxLength - 1)}…`;
};

const notifyMentionedUsers = async ({
    actorId,
    mentionUsers = [],
    title = "You were mentioned",
    message = "You were mentioned in a message.",
    type = "activity",
    category = "system",
    priority = "normal",
    entityType = "none",
    entityId = null,
    workspaceId = null,
    projectId = null,
    taskId = null,
    subtaskId = null,
    chatId = null,
    callId = null,
    link = "/main",
    metadata = {},
    dedupeKey = null,
    session = null
}) => {
    const recipientIds = (mentionUsers || []).map((user) => user._id || user).filter(Boolean);
    if (!recipientIds.length) return [];

    return createNotifications({
        recipientIds,
        actorId,
        title,
        message,
        type,
        category,
        priority,
        entityType,
        entityId,
        workspaceId,
        projectId,
        taskId,
        subtaskId,
        chatId,
        callId,
        link,
        metadata: {
            mentionUsernames: mentionUsers
                .map((user) => (typeof user === "object" ? user.username : null))
                .filter(Boolean),
            ...metadata
        },
        dedupeKey,
        session
    });
};

module.exports = {
    extractMentionUsernames,
    extractMentionUsernamesFromTexts,
    resolveMentionUsersFromText,
    notifyMentionedUsers,
    getMentionSnippet
};

