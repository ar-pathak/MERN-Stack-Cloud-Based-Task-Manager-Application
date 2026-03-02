const assert = require("node:assert/strict");

const validation = require("../../src/modules/notification/notification.validation");

const VALID_ID = "507f1f77bcf86cd799439011";

test("notificationParamSchema accepts valid object id", () => {
    const parsed = validation.notificationParamSchema.parse({
        notificationId: VALID_ID
    });
    assert.equal(parsed.notificationId, VALID_ID);
});

test("notificationParamSchema rejects invalid object id", () => {
    assert.throws(
        () => validation.notificationParamSchema.parse({ notificationId: "bad-id" }),
        /Invalid ObjectId/
    );
});

test("listNotificationsQuerySchema parses optional filters", () => {
    const parsed = validation.listNotificationsQuerySchema.parse({
        page: "2",
        limit: "25",
        read: "false",
        category: "social",
        type: "activity",
        priority: "high",
        entityType: "task",
        search: "mention"
    });

    assert.equal(parsed.page, 2);
    assert.equal(parsed.limit, 25);
    assert.equal(parsed.read, "false");
});

test("bulkActionSchema validates action and ids list", () => {
    const parsed = validation.bulkActionSchema.parse({
        action: "read",
        notificationIds: [VALID_ID]
    });
    assert.equal(parsed.action, "read");
    assert.equal(parsed.notificationIds.length, 1);

    assert.throws(
        () => validation.bulkActionSchema.parse({
            action: "archive",
            notificationIds: [VALID_ID]
        }),
        /Invalid option/
    );
});

test("markAllReadSchema accepts empty and scoped payloads", () => {
    const empty = validation.markAllReadSchema.parse({});
    assert.deepEqual(empty, {});

    const scoped = validation.markAllReadSchema.parse({
        category: "system",
        type: "activity",
        entityType: "workspace"
    });
    assert.equal(scoped.category, "system");
    assert.equal(scoped.type, "activity");
    assert.equal(scoped.entityType, "workspace");
});

