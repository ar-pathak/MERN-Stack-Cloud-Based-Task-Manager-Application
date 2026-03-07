const mongoose = require("mongoose");
const Chat = require("../../src/models/chat");

const newId = () => new mongoose.Types.ObjectId();

test("private chats do not require group fields and expose memberCount virtual", () => {
    const privateChat = new Chat({
        type: "private",
        members: [newId(), newId()]
    });

    expect(privateChat.validateSync()).toBeUndefined();
    expect(privateChat.memberCount).toBe(2);
    expect(privateChat.toJSON()).toEqual(expect.objectContaining({
        memberCount: 2
    }));

    const emptyPrivateChat = new Chat({
        type: "private",
        members: []
    });
    expect(emptyPrivateChat.memberCount).toBe(0);
});

test("group chats require name and admin fields", () => {
    const invalidGroup = new Chat({
        type: "group",
        members: [newId()]
    });
    const invalidError = invalidGroup.validateSync();

    expect(invalidError.errors.name).toBeDefined();
    expect(invalidError.errors.admin).toBeDefined();

    const validGroup = new Chat({
        type: "group",
        name: "General",
        admin: newId(),
        members: [newId(), newId()]
    });

    expect(validGroup.validateSync()).toBeUndefined();
    expect(validGroup.toObject()).toEqual(expect.objectContaining({
        memberCount: 2
    }));
});
