const validation = require("../../src/modules/call/Call.validation");

const validObjectId = "507f1f77bcf86cd799439011";

test("startCallSchema accepts valid payload and defaults type to video", () => {
    const parsed = validation.startCallSchema.parse({
        chatId: validObjectId
    });

    expect(parsed).toEqual({
        chatId: validObjectId,
        type: "video"
    });
});

test("startCallSchema rejects invalid chatId", () => {
    expect(() => validation.startCallSchema.parse({
        chatId: "invalid",
        type: "audio"
    })).toThrow("Invalid ObjectId");
});

test("joinCallSchema accepts optional mediaState flags", () => {
    const parsed = validation.joinCallSchema.parse({
        callId: validObjectId,
        mediaState: {
            video: false,
            audio: true
        }
    });

    expect(parsed).toEqual({
        callId: validObjectId,
        mediaState: {
            video: false,
            audio: true
        }
    });
});

test("offerSchema requires structured SDP offer and target user id", () => {
    const parsed = validation.offerSchema.parse({
        callId: validObjectId,
        offer: {
            type: "offer",
            sdp: "v=0..."
        },
        targetUserId: validObjectId
    });

    expect(parsed.offer.type).toBe("offer");
    expect(parsed.targetUserId).toBe(validObjectId);
});

test("answerSchema rejects invalid answer payload", () => {
    expect(() => validation.answerSchema.parse({
        callId: validObjectId,
        answer: {
            type: "wrong",
            sdp: "v=0..."
        },
        targetUserId: validObjectId
    })).toThrow();
});

test("iceCandidateSchema allows nullable candidate fields and optional target", () => {
    const parsed = validation.iceCandidateSchema.parse({
        callId: validObjectId,
        candidate: {
            candidate: "candidate:1",
            sdpMLineIndex: null,
            sdpMid: null
        }
    });

    expect(parsed.targetUserId).toBeUndefined();
    expect(parsed.candidate.sdpMLineIndex).toBeNull();
});

test("callFeedbackSchema validates rating range and issue enums", () => {
    const parsed = validation.callFeedbackSchema.parse({
        rating: 4,
        issues: ["network", "reconnection"]
    });

    expect(parsed).toEqual({
        rating: 4,
        issues: ["network", "reconnection"]
    });

    expect(() => validation.callFeedbackSchema.parse({
        rating: 6
    })).toThrow();
});

test("callHistoryQuerySchema coerces values and applies defaults", () => {
    const parsed = validation.callHistoryQuerySchema.parse({
        page: "3",
        limit: "15",
        type: "audio"
    });

    expect(parsed).toEqual({
        page: 3,
        limit: 15,
        type: "audio"
    });
});

test("chatCallLogsQuerySchema enforces page and limit bounds", () => {
    const parsed = validation.chatCallLogsQuerySchema.parse({
        page: "1",
        limit: "20"
    });

    expect(parsed).toEqual({
        page: 1,
        limit: 20
    });

    expect(() => validation.chatCallLogsQuerySchema.parse({
        page: 0,
        limit: 100
    })).toThrow();
});

test("callStatsQuerySchema enforces period range", () => {
    expect(validation.callStatsQuerySchema.parse({ period: "30" })).toEqual({ period: 30 });
    expect(() => validation.callStatsQuerySchema.parse({ period: 400 })).toThrow();
});

test("param schemas validate callId and chatId object ids", () => {
    expect(validation.callIdParamSchema.parse({ callId: validObjectId })).toEqual({
        callId: validObjectId
    });
    expect(validation.chatIdParamSchema.parse({ chatId: validObjectId })).toEqual({
        chatId: validObjectId
    });

    expect(() => validation.callIdParamSchema.parse({ callId: "bad-id" })).toThrow("Invalid ObjectId");
    expect(() => validation.chatIdParamSchema.parse({ chatId: "bad-id" })).toThrow("Invalid ObjectId");
});
