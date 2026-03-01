jest.mock("../../src/models/call", () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn()
}));

jest.mock("../../src/models/chat", () => ({
    find: jest.fn(),
    findById: jest.fn()
}));

jest.mock("../../src/helpers/responseHelper", () => ({
    sendSuccess: jest.fn((res, data = null, message = "Success", statusCode = 200) => (
        res.status(statusCode).json({
            success: true,
            message,
            ...(data !== null ? { data } : {})
        })
    )),
    handleError: jest.fn((error, res) => (
        res.status(error?.statusCode || 500).json({
            success: false,
            message: error?.message || "Internal server error"
        })
    ))
}));

const Call = require("../../src/models/call");
const Chat = require("../../src/models/chat");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const CallController = require("../../src/modules/call/call.controller");

const USER_ID = "507f1f77bcf86cd799439011";
const PEER_ID = "507f1f77bcf86cd799439012";

const makeListQuery = (value) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

const makeFindOneQuery = (value) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

const makeSelectResolved = (value) => ({
    select: jest.fn().mockResolvedValue(value)
});

const createResponse = () => {
    const res = {
        statusCode: null,
        body: null
    };

    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });

    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
});

test("getCallHistory applies filters and transforms entries", async () => {
    Call.find.mockReturnValue(makeListQuery([
        {
            _id: "call-1",
            type: "video",
            mode: "one-to-one",
            status: "ended",
            callerId: { _id: USER_ID },
            participants: [
                { userId: { _id: USER_ID, name: "Me" } },
                { userId: { _id: PEER_ID, name: "Peer" } }
            ]
        }
    ]));
    Call.countDocuments.mockResolvedValue(3);

    const req = {
        user: { _id: USER_ID },
        query: {
            page: "2",
            limit: "1",
            type: "video",
            status: "ended"
        }
    };
    const res = createResponse();

    await CallController.getCallHistory(req, res);

    expect(Call.find).toHaveBeenCalledWith(expect.objectContaining({
        hiddenFor: { $ne: USER_ID },
        type: "video",
        status: "ended",
        $or: [
            { callerId: USER_ID },
            { "participants.userId": USER_ID }
        ]
    }));
    expect(res.statusCode).toBe(200);
    expect(res.body.data.calls).toHaveLength(1);
    expect(res.body.data.calls[0]).toEqual(expect.objectContaining({
        direction: "outgoing",
        participantCount: 2,
        answered: true,
        otherParticipant: expect.objectContaining({ _id: PEER_ID })
    }));
    expect(res.body.data.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
        hasMore: true
    });
});

test("getCallHistory delegates unexpected errors to handleError", async () => {
    const error = new Error("db error");
    Call.find.mockImplementation(() => {
        throw error;
    });

    const req = {
        user: { _id: USER_ID },
        query: {}
    };
    const res = createResponse();

    await CallController.getCallHistory(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(500);
});

test("getActiveCall returns 404 when chat does not exist", async () => {
    Chat.findById.mockReturnValue(makeSelectResolved(null));

    const req = {
        user: { _id: USER_ID },
        query: { chatId: "chat-1" }
    };
    const res = createResponse();

    await CallController.getActiveCall(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Chat not found" });
});

test("getActiveCall returns 403 when requester is not a chat member", async () => {
    Chat.findById.mockReturnValue(makeSelectResolved({
        _id: "chat-1",
        members: [PEER_ID]
    }));

    const req = {
        user: { _id: USER_ID },
        query: { chatId: "chat-1" }
    };
    const res = createResponse();

    await CallController.getActiveCall(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Not authorized" });
});

test("getActiveCall returns null activeCall when nothing is active", async () => {
    Call.findOne.mockReturnValue(makeFindOneQuery(null));

    const req = {
        user: { _id: USER_ID },
        query: {}
    };
    const res = createResponse();

    await CallController.getActiveCall(req, res);

    expect(sendSuccess).toHaveBeenCalledWith(res, { activeCall: null });
    expect(res.statusCode).toBe(200);
});

test("getActiveCall returns active call with activeParticipants only", async () => {
    Call.findOne.mockReturnValue(makeFindOneQuery({
        _id: "call-1",
        participants: [
            { userId: { _id: USER_ID }, leftAt: null },
            { userId: { _id: PEER_ID }, leftAt: new Date("2026-01-01T00:00:00.000Z") }
        ]
    }));

    const req = {
        user: { _id: USER_ID },
        query: {}
    };
    const res = createResponse();

    await CallController.getActiveCall(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.activeCall.activeParticipants).toHaveLength(1);
    expect(String(res.body.data.activeCall.activeParticipants[0].userId._id)).toBe(USER_ID);
});

test("getActiveCalls returns empty list when user has no chats", async () => {
    Chat.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
        })
    });

    const req = {
        user: { _id: USER_ID }
    };
    const res = createResponse();

    await CallController.getActiveCalls(req, res);

    expect(sendSuccess).toHaveBeenCalledWith(res, { activeCalls: [] });
    expect(Call.find).not.toHaveBeenCalled();
});

test("getActiveCalls keeps latest active call per chat", async () => {
    Chat.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                { _id: "chat-1" },
                { _id: "chat-2" }
            ])
        })
    });
    Call.find.mockReturnValue(makeListQuery([
        {
            _id: "call-new",
            chatId: { _id: "chat-1" },
            participants: [{ userId: USER_ID, leftAt: null }]
        },
        {
            _id: "call-old",
            chatId: { _id: "chat-1" },
            participants: [{ userId: USER_ID, leftAt: null }]
        },
        {
            _id: "call-chat2",
            chatId: { _id: "chat-2" },
            participants: [{ userId: USER_ID, leftAt: null }]
        }
    ]));

    const req = {
        user: { _id: USER_ID }
    };
    const res = createResponse();

    await CallController.getActiveCalls(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.activeCalls).toHaveLength(2);
    expect(res.body.data.activeCalls.map((entry) => entry._id)).toEqual(["call-new", "call-chat2"]);
});

test("getCallDetails returns 404 for unknown call", async () => {
    Call.findOne.mockReturnValue(makeListQuery(null));

    const req = {
        user: { _id: USER_ID },
        params: { callId: "call-404" }
    };
    const res = createResponse();

    await CallController.getCallDetails(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Call not found" });
});

test("getCallDetails rejects unauthorized requester", async () => {
    Call.findOne.mockReturnValue(makeListQuery({
        _id: "call-1",
        callerId: { _id: PEER_ID },
        participants: [{ userId: { _id: "other-user" } }]
    }));

    const req = {
        user: { _id: USER_ID },
        params: { callId: "call-1" }
    };
    const res = createResponse();

    await CallController.getCallDetails(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Not authorized" });
});

test("getCallDetails returns call for participant", async () => {
    Call.findOne.mockReturnValue(makeListQuery({
        _id: "call-1",
        callerId: { _id: PEER_ID },
        participants: [{ userId: { _id: USER_ID } }]
    }));

    const req = {
        user: { _id: USER_ID },
        params: { callId: "call-1" }
    };
    const res = createResponse();

    await CallController.getCallDetails(req, res);

    expect(sendSuccess).toHaveBeenCalledWith(res, {
        call: expect.objectContaining({ _id: "call-1" })
    });
    expect(res.statusCode).toBe(200);
});

test("getCallStatistics calculates aggregated counters", async () => {
    Call.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
            { type: "audio", status: "ended", mode: "one-to-one", duration: 100, callerId: USER_ID },
            { type: "video", status: "missed", mode: "group", duration: 20, callerId: PEER_ID },
            { type: "video", status: "failed", mode: "group", duration: 10, callerId: PEER_ID }
        ])
    });

    const req = {
        user: { _id: USER_ID },
        query: { period: "7" }
    };
    const res = createResponse();

    await CallController.getCallStatistics(req, res);

    expect(Call.find).toHaveBeenCalledWith(expect.objectContaining({
        hiddenFor: { $ne: USER_ID },
        createdAt: { $gte: expect.any(Date) }
    }));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(expect.objectContaining({
        period: 7,
        stats: expect.objectContaining({
            total: 3,
            totalDuration: 130,
            averageDuration: 43,
            outgoing: 1,
            incoming: 2,
            byType: { audio: 1, video: 2 },
            byStatus: {
                completed: 1,
                missed: 1,
                rejected: 0,
                failed: 1
            }
        })
    }));
});

test("deleteCallHistory returns 404 when call does not exist", async () => {
    Call.findOne.mockResolvedValue(null);

    const req = {
        user: { _id: USER_ID },
        params: { callId: "call-404" }
    };
    const res = createResponse();

    await CallController.deleteCallHistory(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Call not found" });
});

test("deleteCallHistory rejects unauthorized user", async () => {
    Call.findOne.mockResolvedValue({
        _id: "call-1",
        callerId: PEER_ID,
        participants: [{ userId: "other-user" }]
    });

    const req = {
        user: { _id: USER_ID },
        params: { callId: "call-1" }
    };
    const res = createResponse();

    await CallController.deleteCallHistory(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Not authorized" });
});

test("deleteCallHistory hides call for authorized user", async () => {
    Call.findOne.mockResolvedValue({
        _id: "call-1",
        callerId: USER_ID,
        participants: [{ userId: USER_ID }]
    });
    Call.updateOne.mockResolvedValue({ acknowledged: true });

    const req = {
        user: { _id: USER_ID },
        params: { callId: "call-1" }
    };
    const res = createResponse();

    await CallController.deleteCallHistory(req, res);

    expect(Call.updateOne).toHaveBeenCalledWith(
        { _id: "call-1" },
        { $addToSet: { hiddenFor: USER_ID } }
    );
    expect(sendSuccess).toHaveBeenCalledWith(res, { message: "Call removed from your history" });
});

test("clearCallHistory maps modifiedCount to updatedCount", async () => {
    Call.updateMany.mockResolvedValue({ modifiedCount: 2 });

    const req = {
        user: { _id: USER_ID }
    };
    const res = createResponse();

    await CallController.clearCallHistory(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({
        message: "Call history cleared",
        updatedCount: 2,
        deletedCount: 2
    });
});

test("clearCallHistory maps legacy nModified when modifiedCount is absent", async () => {
    Call.updateMany.mockResolvedValue({ nModified: 3 });

    const req = {
        user: { _id: USER_ID }
    };
    const res = createResponse();

    await CallController.clearCallHistory(req, res);

    expect(res.body.data.updatedCount).toBe(3);
});

test("getMissedCallsCount returns count payload", async () => {
    Call.countDocuments.mockResolvedValue(4);

    const req = {
        user: { _id: USER_ID }
    };
    const res = createResponse();

    await CallController.getMissedCallsCount(req, res);

    expect(Call.countDocuments).toHaveBeenCalledWith({
        hiddenFor: { $ne: USER_ID },
        "participants.userId": USER_ID,
        status: "missed",
        callerId: { $ne: USER_ID }
    });
    expect(res.body.data).toEqual({ count: 4 });
});

test("markMissedCallsAsViewed returns success message", async () => {
    const req = {
        user: { _id: USER_ID }
    };
    const res = createResponse();

    await CallController.markMissedCallsAsViewed(req, res);

    expect(sendSuccess).toHaveBeenCalledWith(res, { message: "Missed calls marked as viewed" });
});

test("getChatCallLogs returns 404 when chat does not exist", async () => {
    Chat.findById.mockResolvedValue(null);

    const req = {
        user: { _id: USER_ID },
        params: { chatId: "chat-404" },
        query: {}
    };
    const res = createResponse();

    await CallController.getChatCallLogs(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Chat not found" });
});

test("getChatCallLogs returns 403 for non-member", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [PEER_ID]
    });

    const req = {
        user: { _id: USER_ID },
        params: { chatId: "chat-1" },
        query: {}
    };
    const res = createResponse();

    await CallController.getChatCallLogs(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Not authorized" });
});

test("getChatCallLogs returns paginated call logs for chat member", async () => {
    Chat.findById.mockResolvedValue({
        _id: "chat-1",
        members: [USER_ID, PEER_ID]
    });
    Call.find.mockReturnValue(makeListQuery([{ _id: "call-1" }]));
    Call.countDocuments.mockResolvedValue(3);

    const req = {
        user: { _id: USER_ID },
        params: { chatId: "chat-1" },
        query: { page: "2", limit: "1" }
    };
    const res = createResponse();

    await CallController.getChatCallLogs(req, res);

    expect(Call.find).toHaveBeenCalledWith({
        chatId: "chat-1",
        hiddenFor: { $ne: USER_ID }
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3
    });
});

test("submitCallFeedback returns 404 for unknown call", async () => {
    Call.findById.mockResolvedValue(null);

    const req = {
        user: { _id: USER_ID },
        params: { callId: "call-404" },
        body: {}
    };
    const res = createResponse();

    await CallController.submitCallFeedback(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Call not found" });
});

test("submitCallFeedback rejects non-participants", async () => {
    Call.findById.mockResolvedValue({
        _id: "call-1",
        participants: [{ userId: PEER_ID }]
    });

    const req = {
        user: { _id: USER_ID },
        params: { callId: "call-1" },
        body: {}
    };
    const res = createResponse();

    await CallController.submitCallFeedback(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Not authorized" });
});

test("submitCallFeedback persists rating and issue counters", async () => {
    const callDoc = {
        _id: "call-1",
        participants: [{ userId: USER_ID }],
        quality: {
            networkIssues: 1,
            reconnections: 0
        },
        save: jest.fn().mockResolvedValue({})
    };
    Call.findById.mockResolvedValue(callDoc);

    const req = {
        user: { _id: USER_ID },
        params: { callId: "call-1" },
        body: {
            rating: 5,
            issues: ["network", "reconnection"]
        }
    };
    const res = createResponse();

    await CallController.submitCallFeedback(req, res);

    expect(callDoc.quality.averageRating).toBe(5);
    expect(callDoc.quality.networkIssues).toBe(2);
    expect(callDoc.quality.reconnections).toBe(1);
    expect(callDoc.save).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Success");
    expect(res.body.data.message).toBe("Feedback submitted");
});
