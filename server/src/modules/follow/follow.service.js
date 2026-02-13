const mongoose = require('mongoose');
const Follow = require('../../models/follow');
const User = require('../../models/user');
const notificationService = require('../notification/notification.service');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const toIdString = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (value?._id && value._id !== value) return toIdString(value._id);
    if (typeof value?.toHexString === "function") return value.toHexString();
    if (typeof value?.toString === "function") {
        const normalized = value.toString();
        return normalized && normalized !== "[object Object]" ? normalized : "";
    }
    return "";
};

const hasBlockedUser = (userDoc, targetId) => {
    const targetIdString = toIdString(targetId);
    if (!targetIdString) return false;
    return (userDoc?.blockedUsers || []).some((entry) => toIdString(entry) === targetIdString);
};

class FollowService {

    /**
     * Follow a user with transaction support
     * @param {ObjectId} currentUserId - ID of user who wants to follow
     * @param {ObjectId} targetUserId - ID of user to be followed
     * @returns {Promise<Object>} Result object with success status
     */
    async followUser(currentUserId, targetUserId) {
        // Input validation
        if (!currentUserId || !targetUserId) {
            throw createError("User IDs are required", 400);
        }

        if (currentUserId.toString() === targetUserId.toString()) {
            throw createError("You cannot follow yourself", 400);
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        let notificationPayload = null;

        try {
            const [currentUser, targetUser] = await Promise.all([
                User.findById(currentUserId)
                    .select('name username blockedUsers accountStatus')
                    .session(session),
                User.findById(targetUserId)
                    .select('name username accountStatus isPrivate blockedUsers preferences.notifications.follows')
                    .session(session)
            ]);

            if (!currentUser) {
                throw createError("User not found", 404);
            }
            if (!targetUser) {
                throw createError("User not found", 404);
            }

            if (currentUser.accountStatus !== 'active') {
                throw createError("Your account is not active", 403);
            }

            if (targetUser.accountStatus !== 'active') {
                throw createError("Cannot follow inactive user", 403);
            }

            if (hasBlockedUser(currentUser, targetUserId)) {
                throw createError("Unblock this user before following", 403);
            }

            if (hasBlockedUser(targetUser, currentUserId)) {
                throw createError("You cannot follow this user", 403);
            }

            const shouldApprove = !targetUser.isPrivate;

            const reverseFollowRelation = await Follow.findOne({
                follower: targetUserId,
                following: currentUserId,
                status: 'active'
            }).session(session);

            // Check if relationship already exists
            const existingFollow = await Follow.findOne({
                follower: currentUserId,
                following: targetUserId
            }).session(session);

            let isPending = false;
            let shouldIncrementCounts = false;
            let followRequestId = null;

            if (existingFollow) {
                if (existingFollow.status === 'active') {
                    if (existingFollow.isApproved) {
                        throw createError("Already following this user", 409);
                    }

                    throw createError("Follow request already pending", 409);
                } else {
                    // Reactivate relationship from inactive state.
                    existingFollow.status = 'active';
                    existingFollow.isApproved = shouldApprove;
                    await existingFollow.save({ session });

                    isPending = !shouldApprove;
                    shouldIncrementCounts = shouldApprove;
                    followRequestId = isPending ? existingFollow._id : null;
                }
            } else {
                // Create new follow relationship
                const [createdFollow] = await Follow.create([{
                    follower: currentUserId,
                    following: targetUserId,
                    status: 'active',
                    isApproved: shouldApprove // Auto-approve for public accounts
                }], { session });

                isPending = !shouldApprove;
                shouldIncrementCounts = shouldApprove;
                followRequestId = isPending ? createdFollow?._id : null;
            }

            // Update counts only for approved follow relationships.
            if (shouldIncrementCounts) {
                await User.findByIdAndUpdate(
                    currentUserId,
                    { $inc: { followingCount: 1 } },
                    { session }
                );

                await User.findByIdAndUpdate(
                    targetUserId,
                    { $inc: { followersCount: 1 } },
                    { session }
                );
            }

            const actorLabel = currentUser?.name || currentUser?.username || "Someone";

            if (targetUser?.preferences?.notifications?.follows !== false) {
                if (isPending) {
                    notificationPayload = {
                        recipientIds: [targetUserId],
                        actorId: currentUserId,
                        title: "Follow request",
                        message: `${actorLabel} requested to follow you`,
                        type: "activity",
                        category: "social",
                        priority: "high",
                        entityType: "user",
                        entityId: currentUserId,
                        link: `/profile/${currentUserId}`,
                        metadata: {
                            kind: "follow_request",
                            actorId: toIdString(currentUserId),
                            requestId: toIdString(followRequestId)
                        },
                        dedupeKey: `social:follow_request:${toIdString(currentUserId)}:${toIdString(targetUserId)}`
                    };
                } else {
                    notificationPayload = {
                        recipientIds: [targetUserId],
                        actorId: currentUserId,
                        title: "New follower",
                        message: `${actorLabel} started following you`,
                        type: "activity",
                        category: "social",
                        priority: "normal",
                        entityType: "user",
                        entityId: currentUserId,
                        link: `/profile/${currentUserId}`,
                        metadata: {
                            kind: "followed_you",
                            actorId: toIdString(currentUserId),
                            followActionState: reverseFollowRelation?.isApproved
                                ? "following"
                                : reverseFollowRelation
                                    ? "requested"
                                    : ""
                        },
                        dedupeKey: `social:follow:${toIdString(currentUserId)}:${toIdString(targetUserId)}`
                    };
                }
            }

            await session.commitTransaction();

            if (notificationPayload) {
                try {
                    await notificationService.createNotifications(notificationPayload);
                } catch (notificationError) {
                    console.error("follow notification error", notificationError);
                }
            }

            return {
                success: true,
                isPending
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Unfollow a user with transaction support
     * @param {ObjectId} currentUserId - ID of user who wants to unfollow
     * @param {ObjectId} targetUserId - ID of user to be unfollowed
     * @returns {Promise<Object>} Result object with success status
     */
    async unfollowUser(currentUserId, targetUserId) {
        if (!currentUserId || !targetUserId) {
            throw new Error("User IDs are required");
        }

        if (currentUserId.toString() === targetUserId.toString()) {
            throw new Error("Invalid operation");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const followRelation = await Follow.findOne({
                follower: currentUserId,
                following: targetUserId
            }).session(session);

            if (!followRelation) {
                throw new Error("You are not following this user");
            }

            // Delete the follow relationship
            await Follow.findByIdAndDelete(followRelation._id).session(session);

            // Decrement counts only if the follow was approved
            if (followRelation.isApproved) {
                await User.findByIdAndUpdate(
                    currentUserId,
                    { $inc: { followingCount: -1 } },
                    { session }
                );

                await User.findByIdAndUpdate(
                    targetUserId,
                    { $inc: { followersCount: -1 } },
                    { session }
                );
            }

            // TODO: Trigger notification removal
            // await notificationService.remove(targetUserId, 'NEW_FOLLOWER', currentUserId);

            await session.commitTransaction();
            return { success: true };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async assertCanViewConnections(targetUserId, requesterUserId) {
        if (!targetUserId) {
            throw createError("User not found", 404);
        }

        if (!requesterUserId) {
            throw createError("Authentication required", 401);
        }

        if (toIdString(targetUserId) === toIdString(requesterUserId)) {
            return;
        }

        const [targetUser, requesterUser] = await Promise.all([
            User.findById(targetUserId)
                .select("accountStatus isPrivate blockedUsers")
                .lean(),
            User.findById(requesterUserId)
                .select("accountStatus blockedUsers")
                .lean()
        ]);

        if (!targetUser || targetUser.accountStatus !== "active") {
            throw createError("User not found", 404);
        }

        if (!requesterUser || requesterUser.accountStatus !== "active") {
            throw createError("User not found", 404);
        }

        if (hasBlockedUser(targetUser, requesterUserId) || hasBlockedUser(requesterUser, targetUserId)) {
            throw createError("You cannot view this profile", 403);
        }

        if (!targetUser.isPrivate) {
            return;
        }

        const isApprovedFollower = await Follow.exists({
            follower: requesterUserId,
            following: targetUserId,
            status: "active",
            isApproved: true
        });

        if (!isApprovedFollower) {
            throw createError("This account is private", 403);
        }
    }

    /**
     * Get list of followers for a user
     * @param {ObjectId} userId - User ID to get followers for
     * @param {ObjectId} currentUserId - ID of requesting user (optional)
     * @param {Number} page - Page number
     * @param {Number} limit - Results per page
     * @returns {Promise<Object>} Paginated followers list
     */
    async getFollowers(userId, currentUserId = null, page = 1, limit = 20) {
        await this.assertCanViewConnections(userId, currentUserId);

        const skip = (page - 1) * limit;

        // Build query
        const query = {
            following: userId,
            status: 'active',
            isApproved: true // Only show approved followers
        };

        // Get total count for pagination
        const total = await Follow.countDocuments(query);

        // Get followers with user details
        const followers = await Follow.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'follower',
                select: 'username name avatar isVerified followersCount followingCount'
            })
            .lean();

        // Check if current user is following each follower
        let followingStatus = {};
        let followedByStatus = new Set();
        if (currentUserId) {
            const followerIds = followers
                .map((entry) => entry?.follower?._id)
                .filter(Boolean);
            followingStatus = await Follow.checkMultipleRelationships(
                currentUserId,
                followerIds
            );

            if (followerIds.length) {
                const reverseRelationships = await Follow.find({
                    follower: { $in: followerIds },
                    following: currentUserId,
                    status: 'active',
                    isApproved: true
                })
                    .select('follower')
                    .lean();
                followedByStatus = new Set(
                    reverseRelationships.map((entry) => toIdString(entry.follower))
                );
            }
        }

        // Transform data
        const results = followers
            .filter((entry) => Boolean(entry?.follower?._id))
            .map((entry) => ({
                ...entry.follower,
                followedAt: entry.createdAt,
                isFollowing: currentUserId
                    ? followingStatus[entry.follower._id.toString()]
                    : undefined,
                isFollowedBy: currentUserId
                    ? followedByStatus.has(entry.follower._id.toString())
                    : undefined
            }));

        return {
            followers: results,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Get list of users that a user is following
     * @param {ObjectId} userId - User ID to get following list for
     * @param {ObjectId} currentUserId - ID of requesting user (optional)
     * @param {Number} page - Page number
     * @param {Number} limit - Results per page
     * @returns {Promise<Object>} Paginated following list
     */
    async getFollowing(userId, currentUserId = null, page = 1, limit = 20) {
        await this.assertCanViewConnections(userId, currentUserId);

        const skip = (page - 1) * limit;

        const query = {
            follower: userId,
            status: 'active',
            isApproved: true
        };

        const total = await Follow.countDocuments(query);

        const following = await Follow.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'following',
                select: 'username name avatar isVerified followersCount followingCount'
            })
            .lean();

        // Check if current user is following each user
        let followingStatus = {};
        let followedByStatus = new Set();
        if (currentUserId) {
            const followingIds = following
                .map((entry) => entry?.following?._id)
                .filter(Boolean);

            if (currentUserId.toString() === userId.toString()) {
                followingIds.forEach((entryId) => {
                    const key = toIdString(entryId);
                    if (key) followingStatus[key] = true;
                });
            } else {
                followingStatus = await Follow.checkMultipleRelationships(
                    currentUserId,
                    followingIds
                );
            }

            if (followingIds.length) {
                const reverseRelationships = await Follow.find({
                    follower: { $in: followingIds },
                    following: currentUserId,
                    status: 'active',
                    isApproved: true
                })
                    .select('follower')
                    .lean();
                followedByStatus = new Set(
                    reverseRelationships.map((entry) => toIdString(entry.follower))
                );
            }
        }

        const results = following
            .filter((entry) => Boolean(entry?.following?._id))
            .map((entry) => ({
                ...entry.following,
                followedAt: entry.createdAt,
                isFollowing: currentUserId
                    ? followingStatus[entry.following._id.toString()]
                    : undefined,
                isFollowedBy: currentUserId
                    ? followedByStatus.has(entry.following._id.toString())
                    : undefined
            }));

        return {
            following: results,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Check if user A is following user B
     * @param {ObjectId} currentUserId - Follower user ID
     * @param {ObjectId} targetUserId - Following user ID
     * @returns {Promise<Object>} Relationship status
     */
    async checkIsFollowing(currentUserId, targetUserId) {
        if (!currentUserId || !targetUserId) {
            return { isFollowing: false, isApproved: false };
        }

        if (currentUserId.toString() === targetUserId.toString()) {
            return { isFollowing: false, isApproved: false };
        }

        return await Follow.checkRelationship(currentUserId, targetUserId);
    }

    /**
     * Get mutual followers (users who follow both A and B)
     * @param {ObjectId} userAId - First user ID
     * @param {ObjectId} userBId - Second user ID
     * @returns {Promise<Array>} List of mutual followers
     */
    async getMutualFollowers(userAId, userBId) {
        await this.assertCanViewConnections(userBId, userAId);

        const userAFollowers = await Follow.find({
            following: userAId,
            status: 'active',
            isApproved: true
        }).distinct('follower');

        const mutualFollowers = await Follow.find({
            following: userBId,
            follower: { $in: userAFollowers },
            status: 'active',
            isApproved: true
        })
            .populate('follower', 'username name avatar isVerified')
            .lean();

        return mutualFollowers.map(f => f.follower);
    }

    /**
     * Get follow suggestions based on followers of followed users
     * @param {ObjectId} userId - Current user ID
     * @param {Number} limit - Number of suggestions
     * @returns {Promise<Array>} List of suggested users
     */
    async getFollowSuggestions(userId, limit = 10) {
        // Get users that current user is following
        const following = await Follow.find({
            follower: userId,
            status: 'active',
            isApproved: true
        }).distinct('following');

        // Get users followed by those users (2nd degree connections)
        const suggestions = await Follow.aggregate([
            {
                $match: {
                    follower: { $in: following },
                    following: { $ne: userId }, // Exclude self
                    status: 'active',
                    isApproved: true
                }
            },
            {
                $group: {
                    _id: '$following',
                    count: { $sum: 1 } // Count mutual connections
                }
            },
            { $sort: { count: -1 } },
            { $limit: limit * 2 } // Get extra to filter
        ]);

        // Exclude users already followed
        const alreadyFollowing = await Follow.find({
            follower: userId,
            following: { $in: suggestions.map(s => s._id) }
        }).distinct('following');

        const suggestionIds = suggestions
            .filter(s => !alreadyFollowing.some(af => af.equals(s._id)))
            .slice(0, limit)
            .map(s => s._id);

        // Populate user details
        const users = await User.find({
            _id: { $in: suggestionIds },
            accountStatus: 'active'
        })
            .select('username name avatar isVerified followersCount')
            .lean();

        return users;
    }

    /**
     * Remove a follower (block them from following you)
     * @param {ObjectId} currentUserId - Current user ID
     * @param {ObjectId} followerId - Follower to remove
     * @returns {Promise<Object>} Result object
     */
    async removeFollower(currentUserId, followerId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const followRelation = await Follow.findOne({
                follower: followerId,
                following: currentUserId
            }).session(session);

            if (!followRelation) {
                throw new Error("This user is not following you");
            }

            await Follow.findByIdAndDelete(followRelation._id).session(session);

            // Update counts
            if (followRelation.isApproved) {
                await User.findByIdAndUpdate(
                    followerId,
                    { $inc: { followingCount: -1 } },
                    { session }
                );

                await User.findByIdAndUpdate(
                    currentUserId,
                    { $inc: { followersCount: -1 } },
                    { session }
                );
            }

            await session.commitTransaction();
            return { success: true };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get pending follow requests (for private accounts)
     * @param {ObjectId} userId - User ID
     * @param {Number} page - Page number
     * @param {Number} limit - Results per page
     * @returns {Promise<Object>} Paginated pending requests
     */
    async getPendingRequests(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const query = {
            following: userId,
            isApproved: false,
            status: 'active'
        };

        const total = await Follow.countDocuments(query);

        const requests = await Follow.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('follower', 'username name avatar isVerified')
            .lean();

        return {
            requests: requests.map(r => ({
                ...r.follower,
                requestedAt: r.createdAt,
                requestId: r._id
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Approve a follow request
     * @param {ObjectId} userId - User ID approving the request
     * @param {ObjectId} requestId - Follow request ID
     * @returns {Promise<Object>} Result object
     */
    async approveFollowRequest(userId, requestId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        let notificationPayload = null;

        try {
            const followRequest = await Follow.findOne({
                _id: requestId,
                following: userId,
                isApproved: false
            }).session(session);

            if (!followRequest) {
                throw createError("Follow request not found", 404);
            }

            const [approverUser, requesterUser] = await Promise.all([
                User.findById(userId)
                    .select("name username blockedUsers")
                    .session(session),
                User.findById(followRequest.follower)
                    .select("name username blockedUsers preferences.notifications.follows")
                    .session(session)
            ]);

            if (!approverUser || !requesterUser) {
                throw createError("User not found", 404);
            }

            if (hasBlockedUser(approverUser, followRequest.follower) || hasBlockedUser(requesterUser, userId)) {
                throw createError("Cannot approve request because one of you has blocked the other", 403);
            }

            followRequest.isApproved = true;
            await followRequest.save({ session });

            // Update counts
            await User.findByIdAndUpdate(
                followRequest.follower,
                { $inc: { followingCount: 1 } },
                { session }
            );

            await User.findByIdAndUpdate(
                userId,
                { $inc: { followersCount: 1 } },
                    { session }
                );

            if (requesterUser?.preferences?.notifications?.follows !== false) {
                const actorLabel = approverUser?.name || approverUser?.username || "Someone";
                notificationPayload = {
                    recipientIds: [followRequest.follower],
                    actorId: userId,
                    title: "Follow request accepted",
                    message: `${actorLabel} accepted your follow request`,
                    type: "activity",
                    category: "social",
                    priority: "normal",
                    entityType: "user",
                    entityId: userId,
                    link: `/profile/${userId}`,
                    metadata: {
                        kind: "follow_request_accepted",
                        actorId: toIdString(userId)
                    },
                    dedupeKey: `social:follow_request_accepted:${toIdString(userId)}:${toIdString(followRequest.follower)}`
                };
            }

            await session.commitTransaction();

            if (notificationPayload) {
                try {
                    await notificationService.createNotifications(notificationPayload);
                } catch (notificationError) {
                    console.error("follow approval notification error", notificationError);
                }
            }

            return { success: true };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Reject a follow request
     * @param {ObjectId} userId - User ID rejecting the request
     * @param {ObjectId} requestId - Follow request ID
     * @returns {Promise<Object>} Result object
     */
    async rejectFollowRequest(userId, requestId) {
        const followRequest = await Follow.findOne({
            _id: requestId,
            following: userId,
            isApproved: false
        });

        if (!followRequest) {
            throw new Error("Follow request not found");
        }

        await Follow.findByIdAndDelete(requestId);

        return { success: true };
    }
}

module.exports = new FollowService();
