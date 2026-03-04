const mongoose = require("mongoose");
const Notification = require("../../src/models/notification");

const newId = () => new mongoose.Types.ObjectId();

const createNotification = (overrides = {}) => new Notification({
    user: newId(),
    title: "Task updated",
    message: "A task was updated",
    ...overrides
});

const getNotificationPreSaveHook = () => Notification.schema.s.hooks._pres.get("save")
    .find((entry) => String(entry.fn).includes("isModified(\"read\")"))
    .fn;

afterEach(() => {
    jest.restoreAllMocks();
});

test("pre-save read hook does nothing when read flag is unchanged", () => {
    const hook = getNotificationPreSaveHook();
    const existingReadAt = new Date("2026-01-01T10:00:00.000Z");
    const doc = createNotification({ read: false, readAt: existingReadAt });
    doc.isModified = jest.fn().mockReturnValue(false);

    hook.call(doc);

    expect(doc.readAt).toEqual(existingReadAt);
});

test("pre-save read hook sets readAt when notification becomes read", () => {
    const hook = getNotificationPreSaveHook();
    const doc = createNotification({ read: true, readAt: null });
    doc.isModified = jest.fn().mockReturnValue(true);

    hook.call(doc);

    expect(doc.readAt).toBeInstanceOf(Date);
});

test("pre-save read hook clears readAt when notification is marked unread", () => {
    const hook = getNotificationPreSaveHook();
    const doc = createNotification({
        read: false,
        readAt: new Date("2026-01-01T10:00:00.000Z")
    });
    doc.isModified = jest.fn().mockReturnValue(true);

    hook.call(doc);

    expect(doc.readAt).toBeNull();
});
