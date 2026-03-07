const mongoose = require("mongoose");
const Message = require("../../src/models/message");

const newId = () => new mongoose.Types.ObjectId();

const createMessage = (overrides = {}) => new Message({
    chatId: newId(),
    senderId: newId(),
    content: "Hello",
    ...overrides
});

afterEach(() => {
    jest.restoreAllMocks();
});

test("markReadUpTo throws when the anchor message is missing", async () => {
    jest.spyOn(Message, "findById").mockResolvedValue(null);

    await expect(Message.markReadUpTo("chat-1", "user-1", "msg-404"))
        .rejects
        .toThrow("Message not found");
});

test("markReadUpTo updates unread messages up to the anchor timestamp", async () => {
    const anchor = { createdAt: new Date("2026-03-01T00:00:00.000Z") };
    const updateSpy = jest.spyOn(Message, "updateMany").mockResolvedValue({ modifiedCount: 2 });

    jest.spyOn(Message, "findById").mockResolvedValue(anchor);

    const result = await Message.markReadUpTo("chat-1", "user-1", "msg-1");

    expect(updateSpy).toHaveBeenCalledWith(
        {
            chatId: "chat-1",
            createdAt: { $lte: anchor.createdAt },
            "readBy.userId": { $ne: "user-1" }
        },
        {
            $push: {
                readBy: {
                    userId: "user-1",
                    readAt: expect.any(Date)
                }
            }
        }
    );
    expect(result).toEqual({ modifiedCount: 2 });
});

test("addReaction skips duplicate reactions and removeReaction persists filtered reactions", async () => {
    const userId = newId();
    const otherUserId = newId();
    const message = createMessage({
        reactions: [
            { userId, emoji: ":fire:" },
            { userId: otherUserId, emoji: ":wave:" }
        ]
    });

    const saveSpy = jest.spyOn(message, "save").mockResolvedValue(message);

    const duplicateResult = await message.addReaction(userId, ":fire:");
    expect(duplicateResult).toBe(message);
    expect(saveSpy).not.toHaveBeenCalled();

    const addedResult = await message.addReaction(userId, ":star:");
    expect(addedResult).toBe(message);
    expect(message.reactions).toEqual(expect.arrayContaining([
        expect.objectContaining({ emoji: ":star:" })
    ]));
    expect(saveSpy).toHaveBeenCalledTimes(1);

    saveSpy.mockClear();

    const removedResult = await message.removeReaction(userId, ":fire:");
    expect(removedResult).toBe(message);
    expect(message.reactions).toHaveLength(2);
    expect(message.reactions.find((entry) => entry.emoji === ":fire:")).toBeUndefined();
    expect(message.reactions.find((entry) => entry.emoji === ":wave:")).toBeDefined();
    expect(saveSpy).toHaveBeenCalledTimes(1);
});
