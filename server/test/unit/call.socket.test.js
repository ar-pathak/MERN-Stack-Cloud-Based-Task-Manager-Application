jest.mock("../../src/models/call", () => ({
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn()
}));

jest.mock("../../src/models/chat", () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock("../../src/models/message", () => ({
    findById: jest.fn(),
    create: jest.fn()
}));

jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn()
}));

const Call = require("../../src/models/call");
const Chat = require("../../src/models/chat");
const Message = require("../../src/models/message");
const { createNotifications } = require("../../src/modules/notification/notification.service");
const registerCallSocket = require("../../src/modules/call/Call.socket");

const makeSocket = (userId = "user-1", userAgent = "Mozilla/5.0") => {
    const handlers = {};
    const roomEvents = [];
    const socket = {
        userId,
        handshake: {
            headers: {
                "user-agent": userAgent
            }
        },
        on: jest.fn((event, handler) => {
            handlers[event] = handler;
        }),
        emit: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
        to: jest.fn((room) => ({
            emit: jest.fn((event, payload) => {
                roomEvents.push({ room, event, payload });
            })
        }))
    };

    return { socket, handlers, roomEvents };
};

const makeIo = () => {
    const events = [];
    const io = {
        to: jest.fn((room) => ({
            emit: jest.fn((event, payload) => {
                events.push({ room, event, payload });
            })
        }))
    };
    return { io, events };
};

const makePopulateResolved = (value) => ({
    populate: jest.fn().mockResolvedValue(value)
});

const makeSelectLeanResolved = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

const makePopulateThenResolved = (value) => {
    const query = {
        populate: jest.fn()
    };
    query.populate
        .mockImplementationOnce(() => query)
        .mockResolvedValueOnce(value);
    return query;
};

const makePopulateChainLeanResolved = (value) => {
    const query = {
        populate: jest.fn(),
        lean: jest.fn().mockResolvedValue(value)
    };
    query.populate.mockReturnValue(query);
    return query;
};

beforeEach(() => {
    jest.clearAllMocks();
    Chat.findByIdAndUpdate.mockResolvedValue(null);
    createNotifications.mockResolvedValue([]);
});

test("returns early when socket does not have userId", () => {
    const { socket } = makeSocket(null);
    const { io } = makeIo();

    registerCallSocket(io, socket);

    expect(socket.on).not.toHaveBeenCalled();
});

test("call:start emits chat not found error", async () => {
    const { socket, handlers } = makeSocket();
    const { io } = makeIo();
    Chat.findById.mockReturnValue(makePopulateResolved(null));

    registerCallSocket(io, socket);
    await handlers["call:start"]({ chatId: "chat-1" });

    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Chat not found" });
});

test("call:start emits not authorized error for non-member", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        members: [{ _id: "user-2" }]
    }));

    registerCallSocket(io, socket);
    await handlers["call:start"]({ chatId: "chat-1" });

    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Not authorized" });
});

test("call:start rejects when another active call exists", async () => {
    const { socket, handlers } = makeSocket();
    const { io } = makeIo();
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        type: "private",
        name: "Direct",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    }));
    Call.findOne.mockResolvedValue({ _id: "call-existing" });

    registerCallSocket(io, socket);
    await handlers["call:start"]({ chatId: "chat-1", type: "audio" });

    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Call already in progress" });
    expect(Call.create).not.toHaveBeenCalled();
});

test("call:start creates call, emits room and user events, and creates notifications", async () => {
    const { socket, handlers } = makeSocket("user-1", "Mozilla/5.0 (iPhone)");
    const { io, events } = makeIo();
    const chat = {
        _id: "chat-1",
        type: "group",
        name: "Ops Room",
        members: [
            { _id: "user-1", name: "Alice", username: "alice", isOnline: true },
            { _id: "user-2", name: "Bob", username: "bob", isOnline: false },
            { _id: "user-3", name: "Cara", username: "cara", isOnline: true }
        ]
    };

    const newCall = {
        _id: "call-1",
        callerId: null,
        chatId: "chat-1",
        type: "video",
        mode: "group",
        status: "ringing",
        participants: [{ userId: "user-1", leftAt: null }],
        populate: jest.fn().mockImplementation(async () => {
            newCall.callerId = { _id: "user-1", name: "Alice", avatar: null };
            return newCall;
        })
    };

    Chat.findById.mockReturnValue(makePopulateResolved(chat));
    Call.findOne.mockResolvedValue(null);
    Call.create.mockResolvedValue(newCall);
    Message.create.mockResolvedValue({ _id: "msg-1" });
    Message.findById.mockReturnValue(makePopulateChainLeanResolved({
        _id: "msg-1",
        content: "Alice started a video call."
    }));

    registerCallSocket(io, socket);
    await handlers["call:start"]({ chatId: "chat-1", type: "video" });

    expect(Call.create).toHaveBeenCalledWith(expect.objectContaining({
        callerId: "user-1",
        chatId: "chat-1",
        mode: "group",
        status: "ringing"
    }));
    expect(socket.join).toHaveBeenCalledWith("chat-1");
    expect(socket.join).toHaveBeenCalledWith("call:call-1");
    expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "chat-1",
            event: "call:initiated"
        }),
        expect.objectContaining({
            room: "user:user-2",
            event: "call:incoming"
        }),
        expect.objectContaining({
            room: "user:user-3",
            event: "call:incoming"
        })
    ]));
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({
        recipientIds: ["user-1", "user-2", "user-3"],
        actorId: "user-1",
        type: "call",
        chatId: "chat-1"
    }));
});

test("call:start still emits initiated event when system message creation fails", async () => {
    const { socket, handlers } = makeSocket();
    const { io, events } = makeIo();
    const chat = {
        _id: "chat-1",
        type: "private",
        name: "Direct",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    };
    const newCall = {
        _id: "call-1",
        callerId: null,
        chatId: "chat-1",
        type: "audio",
        mode: "one-to-one",
        status: "ringing",
        participants: [{ userId: "user-1", leftAt: null }],
        populate: jest.fn().mockImplementation(async () => {
            newCall.callerId = { _id: "user-1", name: "Caller" };
            return newCall;
        })
    };

    Chat.findById.mockReturnValue(makePopulateResolved(chat));
    Call.findOne.mockResolvedValue(null);
    Call.create.mockResolvedValue(newCall);
    Message.create.mockRejectedValue(new Error("message insert failed"));

    registerCallSocket(io, socket);
    await handlers["call:start"]({ chatId: "chat-1", type: "audio" });

    expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "chat-1",
            event: "call:initiated"
        })
    ]));
    expect(socket.emit).not.toHaveBeenCalledWith("call:error", { reason: "Failed to start call" });
});

test("call:start emits generic failure when create throws", async () => {
    const { socket, handlers } = makeSocket();
    const { io } = makeIo();
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        type: "group",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    }));
    Call.findOne.mockResolvedValue(null);
    Call.create.mockRejectedValue(new Error("db down"));

    registerCallSocket(io, socket);
    await handlers["call:start"]({ chatId: "chat-1" });

    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Failed to start call" });
});

test("call:join emits invalid-call error when call does not exist", async () => {
    const { socket, handlers } = makeSocket();
    const { io } = makeIo();
    Call.findById.mockReturnValue(makePopulateResolved(null));

    registerCallSocket(io, socket);
    await handlers["call:join"]({ callId: "call-404" });

    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Call ended or invalid" });
});

test("call:join updates media, emits joined payload, and notifies room", async () => {
    const { socket, handlers, roomEvents } = makeSocket();
    const { io } = makeIo();
    const joinCallDoc = {
        _id: "call-1",
        status: "ringing",
        chatId: { _id: "chat-1" },
        participants: [{ userId: "user-1", leftAt: null }],
        addParticipant: jest.fn().mockResolvedValue(null),
        updateParticipantMedia: jest.fn().mockResolvedValue(null)
    };
    const updatedCallDoc = {
        _id: "call-1",
        participants: [
            { userId: { _id: "user-1", name: "Alice" }, leftAt: null },
            { userId: { _id: "user-2", name: "Bob" }, leftAt: null }
        ]
    };

    Call.findById
        .mockImplementationOnce(() => makePopulateResolved(joinCallDoc))
        .mockImplementationOnce(() => makePopulateChainLeanResolved(updatedCallDoc));
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    }));

    registerCallSocket(io, socket);
    await handlers["call:join"]({ callId: "call-1", mediaState: { audio: false } });

    expect(joinCallDoc.addParticipant).toHaveBeenCalledWith("user-1", expect.objectContaining({
        deviceType: "desktop"
    }));
    expect(joinCallDoc.updateParticipantMedia).toHaveBeenCalledWith("user-1", { audio: false });
    expect(socket.emit).toHaveBeenCalledWith("call:joined", expect.objectContaining({
        callId: "call-1",
        participants: expect.any(Array)
    }));
    expect(roomEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "call:call-1",
            event: "call:participant-joined"
        })
    ]));
});

test("call:invite validates call id and mode before proceeding", async () => {
    const { socket, handlers } = makeSocket();
    const { io } = makeIo();

    registerCallSocket(io, socket);
    await handlers["call:invite"]({ callId: null });

    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Invalid call" });

    Call.findById.mockReturnValue(makePopulateThenResolved({
        _id: "call-1",
        status: "ongoing",
        mode: "one-to-one"
    }));
    await handlers["call:invite"]({ callId: "call-1", targetUserId: "user-2" });

    expect(socket.emit).toHaveBeenCalledWith("call:error", {
        reason: "Invites are only available in group calls"
    });
});

test("call:invite enforces active participant and target selection checks", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();

    Call.findById.mockReturnValue(makePopulateThenResolved({
        _id: "call-1",
        chatId: "chat-1",
        status: "ongoing",
        mode: "group",
        type: "video",
        callerId: { _id: "user-3", name: "Host" },
        participants: [{ userId: { _id: "user-3" }, leftAt: null }]
    }));
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        members: [{ _id: "user-1" }, { _id: "user-2" }, { _id: "user-3" }]
    }));

    registerCallSocket(io, socket);
    await handlers["call:invite"]({ callId: "call-1", targetUserIds: ["user-2"] });

    expect(socket.emit).toHaveBeenCalledWith("call:error", {
        reason: "Join the call before inviting others"
    });

    Call.findById.mockReturnValue(makePopulateThenResolved({
        _id: "call-1",
        chatId: "chat-1",
        status: "ongoing",
        mode: "group",
        type: "video",
        callerId: { _id: "user-3", name: "Host" },
        participants: [{ userId: { _id: "user-1" }, leftAt: null }]
    }));
    await handlers["call:invite"]({ callId: "call-1", targetUserIds: [] });

    expect(socket.emit).toHaveBeenCalledWith("call:error", {
        reason: "Select at least one user to invite"
    });
});

test("call:invite emits invite events and creates notifications for eligible targets", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io, events } = makeIo();
    const callDoc = {
        _id: "call-1",
        chatId: "chat-1",
        status: "ongoing",
        mode: "group",
        type: "video",
        callerId: { _id: "user-1", name: "Alice", username: "alice" },
        participants: [{ userId: { _id: "user-1" }, leftAt: null }]
    };
    const chat = {
        _id: "chat-1",
        name: "Ops Room",
        members: [
            { _id: "user-1", name: "Alice", username: "alice", avatar: null, isOnline: true },
            { _id: "user-2", name: "Bob", username: "bob", avatar: null, isOnline: false },
            { _id: "user-3", name: "Cara", username: "cara", avatar: null, isOnline: true },
            { _id: "user-4", name: "Dan", username: "dan", avatar: null, isOnline: true }
        ]
    };

    Call.findById
        .mockImplementationOnce(() => makePopulateThenResolved(callDoc))
        .mockImplementationOnce(() => makePopulateChainLeanResolved({
            _id: "call-1",
            participants: callDoc.participants
        }));
    Chat.findById.mockReturnValue(makePopulateResolved(chat));
    Message.create.mockResolvedValue({ _id: "msg-invite" });
    Message.findById.mockReturnValue(makePopulateChainLeanResolved({
        _id: "msg-invite",
        content: "Alice invited @bob, @cara, and @dan to join the video call."
    }));

    registerCallSocket(io, socket);
    await handlers["call:invite"]({
        callId: "call-1",
        targetUserIds: ["user-2", "user-3", "user-4"]
    });

    expect(socket.emit).toHaveBeenCalledWith("call:invite:sent", expect.objectContaining({
        callId: "call-1",
        invitedUserIds: ["user-2", "user-3", "user-4"]
    }));
    expect(events.filter((event) => event.event === "call:invited")).toHaveLength(3);
    expect(events.filter((event) => event.event === "call:incoming")).toHaveLength(3);
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({
        recipientIds: ["user-2", "user-3", "user-4"],
        actorId: "user-1",
        type: "call",
        chatId: "chat-1"
    }));
});

test("call:offer rejects invalid signaling payload and unavailable call", async () => {
    const { socket, handlers } = makeSocket();
    const { io } = makeIo();

    registerCallSocket(io, socket);
    await handlers["call:offer"]({ callId: null, targetUserId: "user-2", offer: {} });

    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Invalid signaling payload" });

    Call.findById.mockReturnValue(makeSelectLeanResolved({
        _id: "call-1",
        status: "ended",
        participants: []
    }));
    await handlers["call:offer"]({ callId: "call-1", targetUserId: "user-2", offer: {} });

    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Call not available" });
});

test("call signaling enforces participant authorization and relays on success", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io, events } = makeIo();

    registerCallSocket(io, socket);

    Call.findById.mockReturnValue(makeSelectLeanResolved({
        _id: "call-1",
        status: "ringing",
        participants: [
            { userId: "user-2", leftAt: null },
            { userId: "user-3", leftAt: null }
        ]
    }));
    await handlers["call:answer"]({ callId: "call-1", targetUserId: "user-2", answer: {} });
    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Not authorized for this call" });

    Call.findById.mockReturnValue(makeSelectLeanResolved({
        _id: "call-1",
        status: "ongoing",
        participants: [
            { userId: "user-1", leftAt: null },
            { userId: "user-3", leftAt: null }
        ]
    }));
    await handlers["call:answer"]({ callId: "call-1", targetUserId: "user-2", answer: {} });
    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Target user is not in this call" });

    Call.findById.mockReturnValue(makeSelectLeanResolved({
        _id: "call-1",
        status: "ongoing",
        participants: [
            { userId: "user-1", leftAt: null },
            { userId: "user-2", leftAt: null }
        ]
    }));
    await handlers["call:answer"]({ callId: "call-1", targetUserId: "user-2", answer: { sdp: "ok" } });

    expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "user:user-2",
            event: "call:answer",
            payload: expect.objectContaining({
                callId: "call-1",
                fromUserId: "user-1"
            })
        })
    ]));
});

test("call:ice-candidate emits relay error when signaling lookup fails", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();
    Call.findById.mockImplementation(() => {
        throw new Error("lookup failed");
    });

    registerCallSocket(io, socket);
    await handlers["call:ice-candidate"]({
        callId: "call-1",
        targetUserId: "user-2",
        candidate: {}
    });

    expect(socket.emit).toHaveBeenCalledWith("call:error", {
        reason: "Failed to relay ICE candidate"
    });
});

test("call:media-state no-ops when call is missing and updates when present", async () => {
    const { socket, handlers, roomEvents } = makeSocket("user-1");
    const { io } = makeIo();
    const callDoc = {
        updateParticipantMedia: jest.fn().mockResolvedValue(null)
    };

    Call.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(callDoc);

    registerCallSocket(io, socket);
    await handlers["call:media-state"]({ callId: "call-404", mediaState: { video: false } });
    await handlers["call:media-state"]({ callId: "call-1", mediaState: { video: false } });

    expect(callDoc.updateParticipantMedia).toHaveBeenCalledWith("user-1", { video: false });
    expect(roomEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "call:call-1",
            event: "call:participant-media-update"
        })
    ]));
});

test("call:leave ends call when everyone has left", async () => {
    const { socket, handlers, roomEvents } = makeSocket("user-1");
    const { io, events } = makeIo();
    const callDoc = {
        _id: "call-1",
        chatId: "chat-1",
        callerId: "user-1",
        participants: [{ userId: "user-1", leftAt: null }],
        removeParticipant: jest.fn().mockImplementation(async () => {
            callDoc.participants[0].leftAt = new Date("2026-01-01T00:00:00.000Z");
        }),
        save: jest.fn().mockResolvedValue(null)
    };

    Call.findById.mockResolvedValue(callDoc);
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        members: [{ _id: "user-1", name: "Alice" }, { _id: "user-2", name: "Bob" }]
    }));
    Message.create.mockResolvedValue({ _id: "msg-end" });
    Message.findById.mockReturnValue(makePopulateChainLeanResolved({
        _id: "msg-end",
        content: "Call ended because everyone left."
    }));

    registerCallSocket(io, socket);
    await handlers["call:leave"]({ callId: "call-1" });

    expect(callDoc.removeParticipant).toHaveBeenCalledWith("user-1");
    expect(callDoc.save).toHaveBeenCalledTimes(1);
    expect(roomEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "call:call-1",
            event: "call:participant-left"
        })
    ]));
    expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "call:call-1",
            event: "call:ended"
        })
    ]));
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({
        actorId: "user-1",
        metadata: { reason: "all_left" }
    }));
});

test("call:end only allows the host to terminate call", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io, events } = makeIo();
    const hostCall = {
        _id: "call-1",
        chatId: "chat-1",
        callerId: "user-1",
        participants: [{ userId: "user-1", leftAt: null }],
        save: jest.fn().mockResolvedValue(null)
    };

    Call.findById.mockResolvedValue(hostCall);
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        members: [{ _id: "user-1", name: "Alice" }]
    }));
    Message.create.mockResolvedValue({ _id: "msg-host-end" });
    Message.findById.mockReturnValue(makePopulateChainLeanResolved({
        _id: "msg-host-end",
        content: "Alice ended the call."
    }));

    registerCallSocket(io, socket);
    await handlers["call:end"]({ callId: "call-1" });

    expect(hostCall.save).toHaveBeenCalledTimes(1);
    expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "call:call-1",
            event: "call:ended"
        })
    ]));

    const nonHostCall = {
        _id: "call-2",
        callerId: "user-2",
        save: jest.fn()
    };
    Call.findById.mockResolvedValueOnce(nonHostCall);
    await handlers["call:end"]({ callId: "call-2" });

    expect(nonHostCall.save).not.toHaveBeenCalled();
});

test("disconnect cleans up active calls and tolerates call mutation errors", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io, events } = makeIo();
    const cleanableCall = {
        _id: "call-1",
        chatId: "chat-1",
        callerId: "user-1",
        participants: [{ userId: "user-1", leftAt: null }],
        removeParticipant: jest.fn().mockImplementation(async () => {
            cleanableCall.participants[0].leftAt = new Date("2026-01-01T00:00:00.000Z");
        }),
        save: jest.fn().mockResolvedValue(null)
    };
    const errorCall = {
        _id: "call-2",
        participants: [{ userId: "user-1", leftAt: null }],
        removeParticipant: jest.fn().mockRejectedValue(new Error("transient mutation failure"))
    };

    Call.find.mockResolvedValue([cleanableCall, errorCall]);
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        members: [{ _id: "user-1", name: "Alice" }]
    }));
    Message.create.mockResolvedValue({ _id: "msg-disconnect-end" });
    Message.findById.mockReturnValue(makePopulateChainLeanResolved({
        _id: "msg-disconnect-end",
        content: "Call ended because everyone left."
    }));

    registerCallSocket(io, socket);
    await handlers.disconnect();

    expect(cleanableCall.removeParticipant).toHaveBeenCalledWith("user-1");
    expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "call:call-1",
            event: "call:ended"
        })
    ]));
});

test("call:start timeout marks ringing call as missed when nobody joins", async () => {
    jest.useFakeTimers();
    const { socket, handlers } = makeSocket("user-1");
    const { io, events } = makeIo();
    const newCall = {
        _id: "call-1",
        callerId: null,
        chatId: "chat-1",
        type: "video",
        mode: "one-to-one",
        status: "ringing",
        participants: [{ userId: "user-1", leftAt: null }],
        populate: jest.fn().mockImplementation(async () => {
            newCall.callerId = { _id: "user-1", name: "Caller" };
            return newCall;
        })
    };
    const ringingCallDoc = {
        _id: "call-1",
        callerId: "user-1",
        chatId: "chat-1",
        status: "ringing",
        participants: [{ userId: "user-1", leftAt: null }],
        save: jest.fn().mockResolvedValue(null)
    };

    Chat.findById
        .mockReturnValueOnce(makePopulateResolved({
            _id: "chat-1",
            type: "private",
            members: [{ _id: "user-1" }, { _id: "user-2" }]
        }))
        .mockReturnValueOnce(makePopulateResolved(null));
    Call.findOne.mockResolvedValue(null);
    Call.create.mockResolvedValue(newCall);
    Call.findById.mockResolvedValue(ringingCallDoc);
    Message.create.mockRejectedValue(new Error("skip system message"));

    registerCallSocket(io, socket);
    await handlers["call:start"]({ chatId: "chat-1", type: "video" });
    await jest.runOnlyPendingTimersAsync();

    expect(ringingCallDoc.status).toBe("missed");
    expect(ringingCallDoc.save).toHaveBeenCalledTimes(1);
    expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "call:call-1",
            event: "call:ended",
            payload: expect.objectContaining({ reason: "timeout" })
        })
    ]));

    jest.useRealTimers();
});

test("call:start timeout leaves active call untouched when another participant joined", async () => {
    jest.useFakeTimers();
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();
    const newCall = {
        _id: "call-1",
        callerId: null,
        chatId: "chat-1",
        type: "video",
        mode: "group",
        status: "ringing",
        participants: [{ userId: "user-1", leftAt: null }],
        populate: jest.fn().mockImplementation(async () => {
            newCall.callerId = { _id: "user-1", name: "Caller" };
            return newCall;
        })
    };
    const ongoingCallDoc = {
        _id: "call-1",
        status: "ringing",
        participants: [
            { userId: "user-1", leftAt: null },
            { userId: "user-2", leftAt: null }
        ],
        save: jest.fn()
    };

    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        type: "group",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    }));
    Call.findOne.mockResolvedValue(null);
    Call.create.mockResolvedValue(newCall);
    Call.findById.mockResolvedValue(ongoingCallDoc);
    Message.create.mockRejectedValue(new Error("skip system message"));

    registerCallSocket(io, socket);
    await handlers["call:start"]({ chatId: "chat-1", type: "video" });
    await jest.runOnlyPendingTimersAsync();

    expect(ongoingCallDoc.save).not.toHaveBeenCalled();
    jest.useRealTimers();
});

test("call:start timeout ignores VersionError mutation failures", async () => {
    jest.useFakeTimers();
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();
    const newCall = {
        _id: "call-1",
        callerId: null,
        chatId: "chat-1",
        type: "audio",
        mode: "one-to-one",
        status: "ringing",
        participants: [{ userId: "user-1", leftAt: null }],
        populate: jest.fn().mockImplementation(async () => {
            newCall.callerId = { _id: "user-1", name: "Caller" };
            return newCall;
        })
    };
    const versionError = new Error("no matching document found for id");
    versionError.name = "VersionError";

    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        type: "private",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    }));
    Call.findOne.mockResolvedValue(null);
    Call.create.mockResolvedValue(newCall);
    Call.findById.mockRejectedValue(versionError);
    Message.create.mockRejectedValue(new Error("skip system message"));

    registerCallSocket(io, socket);
    await handlers["call:start"]({ chatId: "chat-1", type: "audio" });
    await jest.runOnlyPendingTimersAsync();

    expect(socket.emit).not.toHaveBeenCalledWith("call:error", { reason: "Failed to start call" });
    jest.useRealTimers();
});

test("call:join emits generic join failure on lookup exception", async () => {
    const { socket, handlers } = makeSocket();
    const { io } = makeIo();
    Call.findById.mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error("join lookup failed"))
    });

    registerCallSocket(io, socket);
    await handlers["call:join"]({ callId: "call-1" });

    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Failed to join call" });
});

test("call:invite rejects ended calls and no-eligible selection", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();

    Call.findById.mockReturnValue(makePopulateThenResolved({
        _id: "call-ended",
        status: "ended",
        mode: "group"
    }));

    registerCallSocket(io, socket);
    await handlers["call:invite"]({ callId: "call-ended", targetUserIds: ["user-2"] });
    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Call ended or invalid" });

    Call.findById.mockReturnValue(makePopulateThenResolved({
        _id: "call-1",
        chatId: "chat-1",
        status: "ongoing",
        mode: "group",
        type: "video",
        callerId: { _id: "user-1", name: "Host" },
        participants: [
            { userId: { _id: "user-1" }, leftAt: null },
            { userId: { _id: "user-2" }, leftAt: null }
        ]
    }));
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        members: [{ _id: "user-1" }, { _id: "user-2" }]
    }));

    await handlers["call:invite"]({ callId: "call-1", targetUserIds: ["user-1", "user-2"] });
    expect(socket.emit).toHaveBeenCalledWith("call:error", {
        reason: "Selected users are already in call or not available"
    });
});

test("call:invite uses single-target format and surfaces invite pipeline failures", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();

    Call.findById.mockReturnValue(makePopulateThenResolved({
        _id: "call-1",
        chatId: "chat-1",
        status: "ongoing",
        mode: "group",
        type: "video",
        callerId: { _id: "user-1", name: "Alice", username: "alice" },
        participants: [{ userId: { _id: "user-1" }, leftAt: null }]
    }));
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        name: "Ops Room",
        members: [
            { _id: "user-1", name: "Alice", username: "alice" },
            { _id: "user-2", name: "Bob", username: "bob" }
        ]
    }));
    Message.create.mockRejectedValue(new Error("invite message failed"));

    registerCallSocket(io, socket);
    await handlers["call:invite"]({ callId: "call-1", targetUserIds: ["user-2"] });

    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
        content: "Alice invited @bob to join the video call."
    }));
    expect(socket.emit).toHaveBeenCalledWith("call:error", {
        reason: "Failed to send call invite"
    });
});

test("call:offer relays to target on successful authorization", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io, events } = makeIo();
    Call.findById.mockReturnValue(makeSelectLeanResolved({
        _id: "call-1",
        status: "ongoing",
        participants: [
            { userId: "user-1", leftAt: null },
            { userId: "user-2", leftAt: null }
        ]
    }));

    registerCallSocket(io, socket);
    await handlers["call:offer"]({ callId: "call-1", targetUserId: "user-2", offer: { sdp: "x" } });

    expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
            room: "user:user-2",
            event: "call:offer",
            payload: expect.objectContaining({ fromUserId: "user-1" })
        })
    ]));
});

test("call:offer and call:answer emit relay failures when authorization lookup throws", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();
    Call.findById.mockImplementation(() => {
        throw new Error("authorization query failed");
    });

    registerCallSocket(io, socket);
    await handlers["call:offer"]({ callId: "call-1", targetUserId: "user-2", offer: {} });
    await handlers["call:answer"]({ callId: "call-1", targetUserId: "user-2", answer: {} });

    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Failed to relay call offer" });
    expect(socket.emit).toHaveBeenCalledWith("call:error", { reason: "Failed to relay call answer" });
});

test("call:leave skips call termination when at least one participant remains", async () => {
    const { socket, handlers, roomEvents } = makeSocket("user-1");
    const { io, events } = makeIo();
    const callDoc = {
        _id: "call-1",
        chatId: "chat-1",
        callerId: "user-1",
        participants: [
            { userId: "user-1", leftAt: null },
            { userId: "user-2", leftAt: null }
        ],
        removeParticipant: jest.fn().mockImplementation(async () => {
            callDoc.participants[0].leftAt = new Date("2026-01-01T00:00:00.000Z");
        }),
        save: jest.fn()
    };

    Call.findById.mockResolvedValue(callDoc);
    registerCallSocket(io, socket);
    await handlers["call:leave"]({ callId: "call-1" });

    expect(callDoc.save).not.toHaveBeenCalled();
    expect(roomEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ event: "call:participant-left" })
    ]));
    expect(events.find((entry) => entry.event === "call:ended")).toBeUndefined();
});

test("call:leave and call:end ignore missing call records", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();
    Call.findById.mockResolvedValue(null);

    registerCallSocket(io, socket);
    await handlers["call:leave"]({ callId: "call-missing" });
    await handlers["call:end"]({ callId: "call-missing" });

    expect(socket.leave).not.toHaveBeenCalled();
});

test("call:end uses host fallback message when caller identity is not resolvable in chat", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();
    const hostCall = {
        _id: "call-1",
        chatId: "chat-1",
        callerId: "user-1",
        participants: [{ userId: "user-1", leftAt: null }],
        save: jest.fn().mockResolvedValue(null)
    };

    Call.findById.mockResolvedValue(hostCall);
    Chat.findById.mockReturnValue(makePopulateResolved({
        _id: "chat-1",
        members: [{ _id: "user-2", name: "Bob", username: "bob" }]
    }));
    Message.create.mockResolvedValue({ _id: "msg-end" });
    Message.findById.mockReturnValue(makePopulateChainLeanResolved(null));

    registerCallSocket(io, socket);
    await handlers["call:end"]({ callId: "call-1" });

    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
        content: "The host ended the call."
    }));
});

test("disconnect swallows top-level lookup failures (ignorable and generic)", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();

    registerCallSocket(io, socket);

    const ignorable = new Error("no matching document found for id");
    ignorable.name = "VersionError";
    Call.find.mockRejectedValueOnce(ignorable);
    await expect(handlers.disconnect()).resolves.toBeUndefined();

    Call.find.mockRejectedValueOnce(new Error("network glitch"));
    await expect(handlers.disconnect()).resolves.toBeUndefined();
});

test("disconnect ignores per-call mutation VersionError", async () => {
    const { socket, handlers } = makeSocket("user-1");
    const { io } = makeIo();
    const versionError = new Error("version mismatch");
    versionError.name = "VersionError";

    Call.find.mockResolvedValue([{
        _id: "call-1",
        participants: [{ userId: "user-1", leftAt: null }],
        removeParticipant: jest.fn().mockRejectedValue(versionError)
    }]);

    registerCallSocket(io, socket);
    await expect(handlers.disconnect()).resolves.toBeUndefined();
});
