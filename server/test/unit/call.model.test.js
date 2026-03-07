const mongoose = require("mongoose");
const Call = require("../../src/models/call");

const newId = () => new mongoose.Types.ObjectId();

const getCallSaveHook = () => {
    const hooks = Call.schema.s.hooks._pres.get("save");
    const hook = hooks.find((entry) => String(entry.fn).includes("this.duration = Math.floor"))
        || hooks.find((entry) => String(entry.fn).includes("this.startedAt"))
        || hooks[0];
    return hook.fn;
};

afterEach(() => {
    jest.restoreAllMocks();
});

test("pre-save hook calculates duration only when start and end are present", () => {
    const saveHook = getCallSaveHook();

    const finishedCall = new Call({
        callerId: newId(),
        chatId: newId(),
        mode: "group"
    });
    finishedCall.startedAt = new Date("2026-03-07T10:00:00.000Z");
    finishedCall.endedAt = new Date("2026-03-07T10:02:05.000Z");

    saveHook.call(finishedCall);
    expect(finishedCall.duration).toBe(125);

    const pendingCall = new Call({
        callerId: newId(),
        chatId: newId(),
        mode: "group"
    });
    saveHook.call(pendingCall);
    expect(pendingCall.duration).toBe(0);
});

test("getUserCallHistory applies default and custom pagination", async () => {
    const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: "call-1" }])
    };
    const findSpy = jest.spyOn(Call, "find").mockReturnValue(chain);
    const userId = newId();

    const defaultResult = await Call.getUserCallHistory(userId);
    const customResult = await Call.getUserCallHistory(userId, 2, 5);

    expect(findSpy).toHaveBeenNthCalledWith(1, {
        $or: [
            { callerId: userId },
            { "participants.userId": userId }
        ]
    });
    expect(chain.skip).toHaveBeenNthCalledWith(1, 0);
    expect(chain.limit).toHaveBeenNthCalledWith(1, 20);
    expect(chain.skip).toHaveBeenNthCalledWith(2, 5);
    expect(chain.limit).toHaveBeenNthCalledWith(2, 5);
    expect(defaultResult).toEqual([{ _id: "call-1" }]);
    expect(customResult).toEqual([{ _id: "call-1" }]);
});

test("addParticipant returns existing call without saving when participant is already active", async () => {
    const userId = newId();
    const call = new Call({
        callerId: newId(),
        chatId: newId(),
        mode: "group",
        participants: [{ userId }]
    });
    call.save = jest.fn();

    const result = await call.addParticipant(userId);

    expect(result).toBe(call);
    expect(call.save).not.toHaveBeenCalled();
});

test("addParticipant initializes metadata and starts call for first join", async () => {
    const userId = newId();
    const call = new Call({
        callerId: newId(),
        chatId: newId(),
        mode: "group",
        status: "initiating",
        participants: []
    });
    call.save = jest.fn().mockResolvedValue(call);

    await call.addParticipant(userId);

    expect(call.participants).toHaveLength(1);
    expect(String(call.participants[0].userId)).toBe(String(userId));
    expect(call.metadata.totalJoins).toBe(1);
    expect(call.metadata.peakConcurrentUsers).toBe(1);
    expect(call.startedAt).toBeInstanceOf(Date);
    expect(call.status).toBe("ongoing");
    expect(call.save).toHaveBeenCalledTimes(1);
});

test("addParticipant respects existing metadata and startedAt", async () => {
    const originalStartedAt = new Date("2026-03-07T09:00:00.000Z");
    const call = new Call({
        callerId: newId(),
        chatId: newId(),
        mode: "group",
        status: "ongoing",
        participants: [
            { userId: newId() },
            { userId: newId() }
        ],
        metadata: {
            totalJoins: 4,
            peakConcurrentUsers: 2
        }
    });
    call.startedAt = originalStartedAt;
    call.save = jest.fn().mockResolvedValue(call);

    await call.addParticipant(newId(), { browser: "Chrome" });

    expect(call.metadata.totalJoins).toBe(5);
    expect(call.metadata.peakConcurrentUsers).toBe(3);
    expect(call.startedAt).toBe(originalStartedAt);
    expect(call.save).toHaveBeenCalledTimes(1);
});

test("removeParticipant marks leftAt and tracks drops when participant exists", async () => {
    const userId = newId();
    const call = new Call({
        callerId: newId(),
        chatId: newId(),
        mode: "group",
        participants: [{ userId }]
    });
    call.save = jest.fn().mockResolvedValue(call);

    await call.removeParticipant(userId);

    expect(call.participants[0].leftAt).toBeInstanceOf(Date);
    expect(call.metadata.totalDrops).toBe(1);
    expect(call.save).toHaveBeenCalledTimes(1);
});

test("removeParticipant saves even when participant is missing", async () => {
    const call = new Call({
        callerId: newId(),
        chatId: newId(),
        mode: "group",
        participants: [{ userId: newId(), leftAt: new Date() }],
        metadata: { totalDrops: 2 }
    });
    call.save = jest.fn().mockResolvedValue(call);

    await call.removeParticipant(newId());

    expect(call.metadata.totalDrops).toBe(2);
    expect(call.save).toHaveBeenCalledTimes(1);
});

test("updateParticipantMedia merges state for active participants and no-ops otherwise", async () => {
    const activeUserId = newId();
    const call = new Call({
        callerId: newId(),
        chatId: newId(),
        mode: "group",
        participants: [
            {
                userId: activeUserId,
                mediaState: {
                    video: true,
                    audio: true,
                    screenShare: false
                }
            }
        ]
    });
    call.save = jest.fn().mockResolvedValue(call);

    await call.updateParticipantMedia(activeUserId, { video: false, screenShare: true });
    await call.updateParticipantMedia(newId(), { audio: false });

    expect(call.participants[0].mediaState).toMatchObject({
        video: false,
        audio: true,
        screenShare: true
    });
    expect(call.save).toHaveBeenCalledTimes(2);
});
