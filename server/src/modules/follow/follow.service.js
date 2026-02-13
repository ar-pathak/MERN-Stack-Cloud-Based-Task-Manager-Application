const mongoose = require('mongoose');
const Follow = require('../../models/follow');
const User = require('../../models/user');

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
            throw new Error("User IDs are required");
        }

        if (currentUserId.toString() === targetUserId.toString()) {
            throw new Error("You cannot follow yourself");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Check if target user exists and is active
            const targetUser = await User.findById(targetUserId)
                .select('accountStatus isPrivate')
                .session(session);

            if (!targetUser) {
                throw new Error("User not found");
            }

            if (targetUser.accountStatus !== 'active') {
                throw new Error("Cannot follow inactive user");
            }

            const shouldApprove = !targetUser.isPrivate;

            // Check if relationship already exists
            const existingFollow = await Follow.findOne({
                follower: currentUserId,
                following: targetUserId
            }).session(session);

            let isPending = false;
            let shouldIncrementCounts = false;

            if (existingFollow) {
                if (existingFollow.status === 'active') {
                    if (existingFollow.isApproved) {
                        throw new Error("Already following this user");
                    }

                    throw new Error("Follow request already pending");
                } else {
                    // Reactivate relationship from inactive state.
                    existingFollow.status = 'active';
                    existingFollow.isApproved = shouldApprove;
                    await existingFollow.save({ session });

                    isPending = !shouldApprove;
                    shouldIncrementCounts = shouldApprove;
                }
            } else {
                // Create new follow relationship
                await Follow.create([{
                    follower: currentUserId,
                    following: targetUserId,
                    status: 'active',
                    isApproved: shouldApprove // Auto-approve for public accounts
                }], { session });

                isPending = !shouldApprove;
                shouldIncrementCounts = shouldApprove;
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

            // TODO: Trigger notification
            // if (!targetUser.isPrivate || existingFollow) {
            //     await notificationService.send(targetUserId, 'NEW_FOLLOWER', currentUserId);
            // } else {
            //     await notificationService.send(targetUserId, 'FOLLOW_REQUEST', currentUserId);
            // }

            await session.commitTransaction();

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

    /**
     * Get list of followers for a user
     * @param {ObjectId} userId - User ID to get followers for
     * @param {ObjectId} currentUserId - ID of requesting user (optional)
     * @param {Number} page - Page number
     * @param {Number} limit - Results per page
     * @returns {Promise<Object>} Paginated followers list
     */
    async getFollowers(userId, currentUserId = null, page = 1, limit = 20) {
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
        if (currentUserId) {
            const followerIds = followers
                .map((entry) => entry?.follower?._id)
                .filter(Boolean);
            followingStatus = await Follow.checkMultipleRelationships(
                currentUserId,
                followerIds
            );
        }

        // Transform data
        const results = followers
            .filter((entry) => Boolean(entry?.follower?._id))
            .map((entry) => ({
                ...entry.follower,
                followedAt: entry.createdAt,
                isFollowing: currentUserId
                    ? followingStatus[entry.follower._id.toString()]
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
        if (currentUserId && currentUserId.toString() !== userId.toString()) {
            const followingIds = following
                .map((entry) => entry?.following?._id)
                .filter(Boolean);
            followingStatus = await Follow.checkMultipleRelationships(
                currentUserId,
                followingIds
            );
        }

        const results = following
            .filter((entry) => Boolean(entry?.following?._id))
            .map((entry) => ({
                ...entry.following,
                followedAt: entry.createdAt,
                isFollowing: currentUserId
                    ? followingStatus[entry.following._id.toString()]
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

        try {
            const followRequest = await Follow.findOne({
                _id: requestId,
                following: userId,
                isApproved: false
            }).session(session);

            if (!followRequest) {
                throw new Error("Follow request not found");
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

            // TODO: Send approval notification
            // await notificationService.send(followRequest.follower, 'FOLLOW_REQUEST_APPROVED', userId);

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
