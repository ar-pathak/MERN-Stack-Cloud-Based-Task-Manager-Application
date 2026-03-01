const assert = require("node:assert/strict");

const validation = require("../../src/modules/chat/chat.validation");

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";
const OTHER_OBJECT_ID = "507f1f77bcf86cd799439012";

test("sendMessageSchema accepts text-only payload and applies defaults", () => {
    const parsed = validation.sendMessageSchema.parse({
        chatId: VALID_OBJECT_ID,
        content: " hello world "
    });

    assert.equal(parsed.chatId, VALID_OBJECT_ID);
    assert.equal(parsed.content, "hello world");
    assert.deepEqual(parsed.attachments, []);
});

test("sendMessageSchema rejects empty payload without text, attachment or post", () => {
    assert.throws(
        () => validation.sendMessageSchema.parse({
            chatId: VALID_OBJECT_ID,
            content: "   ",
            attachments: []
        }),
        /Message must contain text, attachment, or a shared post/
    );
});

test("sendMessageSchema rejects attachments combined with shared post", () => {
    assert.throws(
        () => validation.sendMessageSchema.parse({
            chatId: VALID_OBJECT_ID,
            attachments: [
                {
                    url: "https://example.com/image.png",
                    type: "image/png",
                    name: "image.png"
                }
            ],
            postId: OTHER_OBJECT_ID
        }),
        /Attachments cannot be combined with a shared post/
    );
});

test("groupChatSchema validates member count constraints", () => {
    assert.throws(
        () => validation.groupChatSchema.parse({
            name: "Team",
            members: [OTHER_OBJECT_ID]
        }),
        /A group chat requires at least 2 other members/
    );

    const parsed = validation.groupChatSchema.parse({
        name: " Team Room ",
        members: [OTHER_OBJECT_ID, "507f1f77bcf86cd799439013"]
    });
    assert.equal(parsed.name, "Team Room");
    assert.equal(parsed.members.length, 2);
});

test("chatIdParamSchema rejects invalid object id", () => {
    assert.throws(
        () => validation.chatIdParamSchema.parse({ chatId: "bad-id" }),
        /Invalid ObjectId/
    );
});

test("pagination and summary schemas coerce numeric query strings", () => {
    const pagination = validation.paginationSchema.parse({
        page: "2",
        limit: "20"
    });
    assert.equal(pagination.page, 2);
    assert.equal(pagination.limit, 20);

    const mentionSummary = validation.mentionSummarySchema.parse({ limit: "250" });
    assert.equal(mentionSummary.limit, 250);
});

