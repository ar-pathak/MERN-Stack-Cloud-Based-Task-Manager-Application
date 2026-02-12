const Call = require("../../models/call");
const Chat = require("../../models/chat");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");

module.exports = {

    // ========================================================================
    // 1. GET CALL HISTORY
    // ========================================================================
    getCallHistory: async (req, res) => {
        try {
            const userId = req.user._id;
            const { page = 1, limit = 20, type, status } = req.query;

            const query = {
                $or: [
                    { callerId: userId },
                    { "participants.userId": userId }
                ]
            };

            // Filter by call type
            if (type && ["audio", "video"].includes(type)) {
                query.type = type;
            }

            // Filter by status
            if (status) {
                query.status = status;
            }

            const calls = await Call.find(query)
                .populate("callerId", "name avatar")
                .populate("participants.userId", "name avatar")
                .populate("chatId", "name type avatar")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .lean();

            // Get total count for pagination
            const total = await Call.countDocuments(query);

            // Transform calls for better client consumption
            const transformedCalls = calls.map(call => {
                // Determine call direction (incoming/outgoing)
                const isOutgoing = String(call.callerId._id) === String(userId);

                // Get other participant (for 1:1 calls)
                let otherParticipant = null;
                if (call.mode === "one-to-one") {
                    const otherUser = call.participants.find(
                        p => String(p.userId._id) !== String(userId)
                    );
                    if (otherUser) {
                        otherParticipant = otherUser.userId;
                    }
                }

                return {
                    ...call,
                    direction: isOutgoing ? "outgoing" : "incoming",
                    otherParticipant,
                    participantCount: call.participants.length,
                    answered: call.status === "ongoing" || call.status === "ended"
                };
            });

            sendSuccess(res, {
                calls: transformedCalls,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: page * limit < total
                }
            });

        } catch (error) {
            handleError(error, res);
        }
    },

    // ========================================================================
    // 2. GET ACTIVE CALL
    // ========================================================================
    getActiveCall: async (req, res) => {
        try {
            const userId = req.user._id;
            const { chatId } = req.query;

            let activeCall = null;

            // Chat-scoped active call lookup:
            // required for users who open a chat after call already started.
            if (chatId) {
                const chat = await Chat.findById(chatId).select("members");
                if (!chat) {
                    return res.status(404).json({ error: "Chat not found" });
                }

                if (!chat.members.some((m) => String(m) === String(userId))) {
                    return res.status(403).json({ error: "Not authorized" });
                }

                activeCall = await Call.findOne({
                    chatId,
                    status: { $in: ["ringing", "ongoing"] }
                })
                    .populate("callerId", "name avatar")
                    .populate("participants.userId", "name avatar")
                    .populate({
                        path: "chatId",
                        select: "name type avatar members",
                        populate: {
                            path: "members",
                            select: "name username avatar isOnline"
                        }
                    })
                    .sort({ createdAt: -1 })
                    .lean();
            } else {
                activeCall = await Call.findOne({
                    "participants.userId": userId,
                    status: { $in: ["ringing", "ongoing"] }
                })
                    .populate("callerId", "name avatar")
                    .populate("participants.userId", "name avatar")
                    .populate({
                        path: "chatId",
                        select: "name type avatar members",
                        populate: {
                            path: "members",
                            select: "name username avatar isOnline"
                        }
                    })
                    .sort({ createdAt: -1 })
                    .lean();
            }

            if (!activeCall) {
                return sendSuccess(res, { activeCall: null });
            }

            // Filter active participants
            const activeParticipants = activeCall.participants.filter(p => !p.leftAt);

            sendSuccess(res, {
                activeCall: {
                    ...activeCall,
                    activeParticipants
                }
            });

        } catch (error) {
            handleError(error, res);
        }
    },

    // ========================================================================
    // 2B. GET ACTIVE CALLS FOR ALL USER CHATS
    // ========================================================================
    getActiveCalls: async (req, res) => {
        try {
            const userId = req.user._id;

            const userChats = await Chat.find({ members: userId }).select("_id").lean();
            const chatIds = userChats.map((chat) => chat._id);

            if (chatIds.length === 0) {
                return sendSuccess(res, { activeCalls: [] });
            }

            const calls = await Call.find({
                chatId: { $in: chatIds },
                status: { $in: ["ringing", "ongoing"] }
            })
                .populate("callerId", "name avatar")
                .populate("participants.userId", "name avatar")
                .populate({
                    path: "chatId",
                    select: "name type avatar members",
                    populate: {
                        path: "members",
                        select: "name username avatar isOnline"
                    }
                })
                .sort({ createdAt: -1 })
                .lean();

            // Keep one active call per chat (latest), defensive against stale duplicates.
            const latestByChat = new Map();
            for (const call of calls) {
                const id = String(call.chatId?._id || call.chatId);
                if (!latestByChat.has(id)) {
                    latestByChat.set(id, {
                        ...call,
                        activeParticipants: (call.participants || []).filter((p) => !p.leftAt)
                    });
                }
            }

            sendSuccess(res, { activeCalls: Array.from(latestByChat.values()) });
        } catch (error) {
            handleError(error, res);
        }
    },

    // ========================================================================
    // 3. GET CALL DETAILS
    // ========================================================================
    getCallDetails: async (req, res) => {
        try {
            const { callId } = req.params;
            const userId = req.user._id;

            const call = await Call.findById(callId)
                .populate("callerId", "name avatar email")
                .populate("participants.userId", "name avatar email")
                .populate("chatId", "name type avatar")
                .lean();

            if (!call) {
                return res.status(404).json({ error: "Call not found" });
            }

            // Check authorization
            const isParticipant = call.participants.some(
                p => String(p.userId._id) === String(userId)
            );

            if (!isParticipant && String(call.callerId._id) !== String(userId)) {
                return res.status(403).json({ error: "Not authorized" });
            }

            sendSuccess(res, { call });

        } catch (error) {
            handleError(error, res);
        }
    },

    // ========================================================================
    // 4. GET CALL STATISTICS
    // ========================================================================
    getCallStatistics: async (req, res) => {
        try {
            const userId = req.user._id;
            const { period = "30" } = req.query; // days

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(period));

            const calls = await Call.find({
                $or: [
                    { callerId: userId },
                    { "participants.userId": userId }
                ],
                createdAt: { $gte: startDate }
            }).lean();

            // Calculate statistics
            const stats = {
                total: calls.length,
                byType: {
                    audio: calls.filter(c => c.type === "audio").length,
                    video: calls.filter(c => c.type === "video").length
                },
                byStatus: {
                    completed: calls.filter(c => c.status === "ended").length,
                    missed: calls.filter(c => c.status === "missed").length,
                    rejected: calls.filter(c => c.status === "rejected").length,
                    failed: calls.filter(c => c.status === "failed").length
                },
                byMode: {
                    oneToOne: calls.filter(c => c.mode === "one-to-one").length,
                    group: calls.filter(c => c.mode === "group").length
                },
                totalDuration: calls.reduce((sum, call) => sum + (call.duration || 0), 0),
                averageDuration: calls.length > 0
                    ? Math.round(calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length)
                    : 0,
                outgoing: calls.filter(c => String(c.callerId) === String(userId)).length,
                incoming: calls.filter(c => String(c.callerId) !== String(userId)).length
            };

            sendSuccess(res, { stats, period: parseInt(period) });

        } catch (error) {
            handleError(error, res);
        }
    },

    // ========================================================================
    // 5. DELETE CALL FROM HISTORY
    // ========================================================================
    deleteCallHistory: async (req, res) => {
        try {
            const { callId } = req.params;
            const userId = req.user._id;

            const call = await Call.findById(callId);

            if (!call) {
                return res.status(404).json({ error: "Call not found" });
            }

            // Check authorization
            const isParticipant = call.participants.some(
                p => String(p.userId) === String(userId)
            );

            if (!isParticipant && String(call.callerId) !== String(userId)) {
                return res.status(403).json({ error: "Not authorized" });
            }

            await Call.findByIdAndDelete(callId);

            sendSuccess(res, { message: "Call deleted from history" });

        } catch (error) {
            handleError(error, res);
        }
    },

    // ========================================================================
    // 6. CLEAR ALL CALL HISTORY
    // ========================================================================
    clearCallHistory: async (req, res) => {
        try {
            const userId = req.user._id;

            const result = await Call.deleteMany({
                $or: [
                    { callerId: userId },
                    { "participants.userId": userId }
                ],
                status: { $in: ["ended", "missed", "rejected", "failed"] }
            });

            sendSuccess(res, {
                message: "Call history cleared",
                deletedCount: result.deletedCount
            });

        } catch (error) {
            handleError(error, res);
        }
    },

    // ========================================================================
    // 7. GET MISSED CALLS COUNT
    // ========================================================================
    getMissedCallsCount: async (req, res) => {
        try {
            const userId = req.user._id;

            const count = await Call.countDocuments({
                "participants.userId": userId,
                status: "missed",
                callerId: { $ne: userId } // Don't count own missed calls
            });

            sendSuccess(res, { count });

        } catch (error) {
            handleError(error, res);
        }
    },

    // ========================================================================
    // 8. MARK MISSED CALLS AS VIEWED
    // ========================================================================
    markMissedCallsAsViewed: async (req, res) => {
        try {
            const userId = req.user._id;

            // This could be implemented by adding a 'viewed' field to the Call model
            // For now, we'll just return success
            // In production, you might want to add a 'viewedBy' array to track this

            sendSuccess(res, { message: "Missed calls marked as viewed" });

        } catch (error) {
            handleError(error, res);
        }
    },

    // ========================================================================
    // 9. GET CALL LOGS FOR SPECIFIC CHAT
    // ========================================================================
    getChatCallLogs: async (req, res) => {
        try {
            const { chatId } = req.params;
            const userId = req.user._id;
            const { page = 1, limit = 20 } = req.query;

            // Verify user is member of chat
            const chat = await Chat.findById(chatId);
            if (!chat) {
                return res.status(404).json({ error: "Chat not found" });
            }

            if (!chat.members.some(m => String(m) === String(userId))) {
                return res.status(403).json({ error: "Not authorized" });
            }

            const calls = await Call.find({ chatId })
                .populate("callerId", "name avatar")
                .populate("participants.userId", "name avatar")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .lean();

            const total = await Call.countDocuments({ chatId });

            sendSuccess(res, {
                calls,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            handleError(error, res);
        }
    },

    // ========================================================================
    // 10. SUBMIT CALL QUALITY FEEDBACK
    // ========================================================================
    submitCallFeedback: async (req, res) => {
        try {
            const { callId } = req.params;
            const { rating, issues = [] } = req.body;
            const userId = req.user._id;

            const call = await Call.findById(callId);

            if (!call) {
                return res.status(404).json({ error: "Call not found" });
            }

            // Check authorization
            const isParticipant = call.participants.some(
                p => String(p.userId) === String(userId)
            );

            if (!isParticipant) {
                return res.status(403).json({ error: "Not authorized" });
            }

            // Update quality rating
            if (!call.quality) call.quality = {};

            if (rating) {
                // Store average rating (simple approach)
                call.quality.averageRating = rating;
            }

            // Track issues
            if (issues.includes("network")) {
                call.quality.networkIssues = (call.quality.networkIssues || 0) + 1;
            }
            if (issues.includes("reconnection")) {
                call.quality.reconnections = (call.quality.reconnections || 0) + 1;
            }

            await call.save();

            sendSuccess(res, { message: "Feedback submitted", call });

        } catch (error) {
            handleError(error, res);
        }
    }
};
