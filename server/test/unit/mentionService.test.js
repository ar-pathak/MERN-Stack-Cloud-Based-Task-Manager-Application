jest.mock("../../src/models/user", () => ({
    find: jest.fn()
}));

jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn()
}));

const User = require("../../src/models/user");
const { createNotifications } = require("../../src/modules/notification/notification.service");
const {
    extractMentionUsernames,
    extractMentionUsernamesFromTexts,
    resolveMentionUsersFromText,
    notifyMentionedUsers,
    getMentionSnippet
} = require("../../src/modules/utils/mentionService");

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

test("extractMentionUsernames parses usernames and removes duplicates", () => {
    const usernames = extractMentionUsernames(
        "Hi @alice, please pair with (@bob). Repeat @ALICE and ignore email a@b.com"
    );

    expect(usernames).toEqual(["alice", "bob"]);
});

test("extractMentionUsernamesFromTexts combines multiple text inputs", () => {
    const usernames = extractMentionUsernamesFromTexts([
        "First @alpha",
        "Second @beta and @alpha",
        "No mention"
    ]);

    expect(usernames).toEqual(["alpha", "beta"]);
});

test("resolveMentionUsersFromText returns users in mention order with exclusions", async () => {
    User.find.mockReturnValue(makeQuery([
        { _id: "u1", username: "beta", name: "Beta" },
        { _id: "u2", username: "alpha", name: "Alpha" }
    ]));

    const users = await resolveMentionUsersFromText("Ping @alpha and @beta", {
        allowedUserIds: ["u1", "u2", "u3"],
        excludeUserIds: ["u1"]
    });

    expect(User.find).toHaveBeenCalledWith({
        username: { $in: ["alpha", "beta"] },
        accountStatus: "active",
        "preferences.privacy.allowMentions": { $ne: false },
        _id: { $in: ["u1", "u2", "u3"] }
    });
    expect(users).toEqual([
        { _id: "u2", username: "alpha", name: "Alpha" }
    ]);
});

test("resolveMentionUsersFromText skips lookup when text has no mentions", async () => {
    const users = await resolveMentionUsersFromText("plain text only");
    expect(users).toEqual([]);
    expect(User.find).not.toHaveBeenCalled();
});

test("getMentionSnippet returns trimmed or truncated message", () => {
    expect(getMentionSnippet("  hello  ")).toBe("hello");
    const truncated = getMentionSnippet("123456", 5);
    expect(truncated.startsWith("1234")).toBe(true);
    expect(truncated).toHaveLength(5);
    expect(getMentionSnippet("")).toBe("");
});

test("notifyMentionedUsers returns empty list when no recipients", async () => {
    const result = await notifyMentionedUsers({
        actorId: "actor-1",
        mentionUsers: []
    });

    expect(result).toEqual([]);
    expect(createNotifications).not.toHaveBeenCalled();
});

test("notifyMentionedUsers forwards payload to notification service", async () => {
    createNotifications.mockResolvedValue([{ _id: "n1" }]);

    const result = await notifyMentionedUsers({
        actorId: "actor-1",
        mentionUsers: [
            { _id: "u1", username: "alpha" },
            { _id: "u2", username: "beta" }
        ],
        title: "Mention alert",
        message: "You were mentioned in a task comment.",
        entityType: "task",
        entityId: "task-1",
        metadata: { source: "comment" }
    });

    expect(createNotifications).toHaveBeenCalledWith({
        recipientIds: ["u1", "u2"],
        actorId: "actor-1",
        title: "Mention alert",
        message: "You were mentioned in a task comment.",
        type: "activity",
        category: "system",
        priority: "normal",
        entityType: "task",
        entityId: "task-1",
        workspaceId: null,
        projectId: null,
        taskId: null,
        subtaskId: null,
        chatId: null,
        callId: null,
        link: "/main",
        metadata: {
            mentionUsernames: ["alpha", "beta"],
            source: "comment"
        },
        dedupeKey: null,
        session: null
    });
    expect(result).toEqual([{ _id: "n1" }]);
});

test("extractMentionUsernames and extractMentionUsernamesFromTexts handle default and single-string inputs", () => {
    expect(extractMentionUsernames()).toEqual([]);
    expect(extractMentionUsernamesFromTexts("Ping @alpha then @ALPHA")).toEqual(["alpha"]);
});

test("resolveMentionUsersFromText returns empty array when lookup has no matching users", async () => {
    User.find.mockReturnValue(makeQuery([]));

    const users = await resolveMentionUsersFromText("@alpha @beta", {
        allowedUserIds: [],
        excludeUserIds: []
    });

    expect(User.find).toHaveBeenCalledWith({
        username: { $in: ["alpha", "beta"] },
        accountStatus: "active",
        "preferences.privacy.allowMentions": { $ne: false }
    });
    expect(users).toEqual([]);
});

test("resolveMentionUsersFromText applies session and excludes ids passed as objects", async () => {
    const session = { id: "session-1" };
    const query = makeQuery([
        { _id: "u1", username: "alpha", name: "Alpha" },
        { _id: "u2", username: "beta", name: "Beta" }
    ]);
    User.find.mockReturnValue(query);

    const users = await resolveMentionUsersFromText("@alpha @beta", {
        excludeUserIds: [{ _id: "u2" }],
        session
    });

    expect(query.session).toHaveBeenCalledWith(session);
    expect(users).toEqual([
        { _id: "u1", username: "alpha", name: "Alpha" }
    ]);
});

test("notifyMentionedUsers supports primitive recipient ids and missing usernames", async () => {
    createNotifications.mockResolvedValue([{ _id: "n2" }]);

    const result = await notifyMentionedUsers({
        actorId: "actor-2",
        mentionUsers: ["u1", { _id: "u2" }]
    });

    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({
        recipientIds: ["u1", "u2"],
        metadata: {
            mentionUsernames: []
        }
    }));
    expect(result).toEqual([{ _id: "n2" }]);
});
