const { z } = require("zod");
const mongoose = require("mongoose");

// ============================================================================
// HELPER VALIDATORS
// ============================================================================

const objectId = z.string().refine(
    (v) => mongoose.Types.ObjectId.isValid(v),
    { message: "Invalid ObjectId" }
);

// ============================================================================
// CALL VALIDATION SCHEMAS
// ============================================================================

// Start call validation
const startCallSchema = z.object({
    chatId: objectId,
    type: z.enum(["audio", "video"]).default("video")
});

// Join call validation
const joinCallSchema = z.object({
    callId: objectId,
    mediaState: z.object({
        video: z.boolean().optional(),
        audio: z.boolean().optional(),
        screenShare: z.boolean().optional()
    }).optional()
});

// WebRTC signaling validation
const offerSchema = z.object({
    callId: objectId,
    offer: z.object({
        type: z.literal("offer"),
        sdp: z.string()
    }),
    targetUserId: objectId
});

const answerSchema = z.object({
    callId: objectId,
    answer: z.object({
        type: z.literal("answer"),
        sdp: z.string()
    }),
    targetUserId: objectId
});

const iceCandidateSchema = z.object({
    callId: objectId,
    candidate: z.object({
        candidate: z.string(),
        sdpMLineIndex: z.number().nullable().optional(),
        sdpMid: z.string().nullable().optional()
    }),
    targetUserId: objectId.optional()
});

// Media state update validation
const mediaStateSchema = z.object({
    callId: objectId,
    mediaState: z.object({
        video: z.boolean().optional(),
        audio: z.boolean().optional(),
        screenShare: z.boolean().optional()
    })
});

// Screen sharing validation
const screenShareSchema = z.object({
    callId: objectId
});

// Layout change validation
const layoutSchema = z.object({
    callId: objectId,
    layout: z.enum(["grid", "speaker", "sidebar"])
});

// Connection quality validation
const qualityUpdateSchema = z.object({
    callId: objectId,
    quality: z.enum(["excellent", "good", "poor", "disconnected"])
});

// Call action validation (reject, leave, end)
const callActionSchema = z.object({
    callId: objectId
});

// Call feedback validation
const callFeedbackSchema = z.object({
    rating: z.number().min(1).max(5).optional(),
    issues: z.array(z.enum(["network", "audio", "video", "reconnection", "other"])).optional()
});

// Query validation
const callHistoryQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    type: z.enum(["audio", "video"]).optional(),
    status: z.enum(["initiating", "ringing", "ongoing", "ended", "missed", "rejected", "failed"]).optional()
});

const callStatsQuerySchema = z.object({
    period: z.coerce.number().int().min(1).max(365).default(30)
});

// Param validation
const callIdParamSchema = z.object({
    callId: objectId
});

const chatIdParamSchema = z.object({
    chatId: objectId
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    startCallSchema,
    joinCallSchema,
    offerSchema,
    answerSchema,
    iceCandidateSchema,
    mediaStateSchema,
    screenShareSchema,
    layoutSchema,
    qualityUpdateSchema,
    callActionSchema,
    callFeedbackSchema,
    callHistoryQuerySchema,
    callStatsQuerySchema,
    callIdParamSchema,
    chatIdParamSchema
};