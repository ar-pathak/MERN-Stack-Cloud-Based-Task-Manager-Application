const User = require('../../models/user');
const Follow = require('../../models/follow');
const Chat = require('../../models/chat');
const WorkspaceMember = require('../../models/workspaceMember');
const Project = require('../../models/project');
const Task = require('../../models/tasks');
const Subtask = require('../../models/subtasks');
const mongoose = require('mongoose');

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

class UserService {
    async autoApprovePendingFollowRequests(userId, session = null) {
        const pendingRequests = await Follow.find({
            following: userId,
            status: "active",
            isApproved: false
        })
            .select("_id follower")
            .session(session)
            .lean();

        if (!pendingRequests.length) {
            return { autoApprovedFollowRequests: 0 };
        }

        const followerIds = Array.from(
            new Set(
                pendingRequests
                    .map((entry) => toIdString(entry?.follower))
                    .filter(Boolean)
            )
        );

        const requestIds = pendingRequests
            .map((entry) => entry?._id)
            .filter(Boolean);

        await Follow.updateMany(
            { _id: { $in: requestIds } },
            { $set: { isApproved: true } },
            { session }
        );

        if (followerIds.length > 0) {
            await User.updateMany(
                { _id: { $in: followerIds } },
                { $inc: { followingCount: 1 } },
                { session }
            );
            await User.findByIdAndUpdate(
                userId,
                { $inc: { followersCount: followerIds.length } },
                { session }
            );
        }

        return {
            autoApprovedFollowRequests: followerIds.length
        };
    }

    /**
     * Get user's own profile information
     * @param {ObjectId} userId - User ID
     * @returns {Promise<Object>} User profile
     */
    async getUserInfo(userId) {
        const user = await User.findById(userId)
            .select("-passwordHash -refreshToken -__v -resetPasswordToken -loginAttempts -lockUntil");

        if (!user) {
            throw new Error("User not found");
        }

        if (user.accountStatus !== 'active') {
            throw new Error("Account is not active");
        }

        return user.toProfileJSON();
    }

    /**
     * Get public profile of a user
     * @param {ObjectId} targetUserId - Target user ID
     * @param {ObjectId} currentUserId - Current user ID (optional)
     * @returns {Promise<Object>} Public profile
     */
    async getPublicProfile(targetUserId, currentUserId = null) {
        const user = await User.findById(targetUserId)
            .select("email username name bio headline location website avatar coverImage followersCount followingCount postsCount isPrivate isVerified isOnline lastSeen createdAt accountStatus preferences.privacy.disablePublicMessages preferences.privacy.showEmail preferences.privacy.showOnlineStatus blockedUsers");

        if (!user) {
            throw new Error("User not found");
        }

        if (user.accountStatus !== 'active') {
            throw new Error("User not found");
        }

        const profile = user.toPublicJSON();
        const isSelfView = Boolean(currentUserId) && String(currentUserId) === String(targetUserId);
        let relationship = null;

        // Add relationship information if currentUserId is provided
        if (currentUserId && !isSelfView) {
            const [currentUser, followStatus, reverseFollowStatus] = await Promise.all([
                User.findById(currentUserId).select("blockedUsers").lean(),
                Follow.checkRelationship(currentUserId, targetUserId),
                Follow.checkRelationship(targetUserId, currentUserId)
            ]);

            const blockedByMe = hasBlockedUser(currentUser, targetUserId);
            const blockedMe = hasBlockedUser(user, currentUserId);
            const requiresFollowForMessages = Boolean(
                user?.isPrivate || user?.preferences?.privacy?.disablePublicMessages
            );
            const canMessage = !blockedByMe && !blockedMe && (
                !requiresFollowForMessages || Boolean(followStatus?.isFollowing)
            );

            relationship = {
                isFollowing: Boolean(followStatus?.isFollowing),
                isFollowedBy: Boolean(reverseFollowStatus?.isFollowing),
                isPending: Boolean(followStatus?.isPending),
                blockedByMe,
                blockedMe,
                canMessage
            };
            profile.relationship = relationship;
        }

        const isBlockedContext = Boolean(relationship?.blockedByMe || relationship?.blockedMe);
        const canViewFullProfile = Boolean(
            (isSelfView || !user?.isPrivate || relationship?.isFollowing) && !isBlockedContext
        );
        const isBasicPrivateView = Boolean(
            !isBlockedContext &&
            !isSelfView &&
            user?.isPrivate &&
            !relationship?.isFollowing
        );

        profile.access = {
            canViewFullProfile
        };

        if (canViewFullProfile && (isSelfView || user?.preferences?.privacy?.showEmail)) {
            profile.email = user.email || "";
        }

        if (canViewFullProfile && (isSelfView || user?.preferences?.privacy?.showOnlineStatus !== false)) {
            profile.isOnline = Boolean(user?.isOnline);
            profile.lastSeen = user?.lastSeen || null;
        } else {
            profile.isOnline = false;
            profile.lastSeen = null;
        }

        if (!canViewFullProfile) {
            if (!isBasicPrivateView) {
                profile.bio = "";
            }
            profile.headline = "";
            profile.location = "";
            profile.website = "";
            profile.coverImage = "";
            profile.followersCount = 0;
            profile.followingCount = 0;
            profile.postsCount = 0;
        }

        return profile;
    }

    /**
     * Update user profile
     * @param {ObjectId} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated user
     */
    async updateProfile(userId, updateData) {
        // Fields that are allowed to be updated
        const allowedUpdates = [
            'name',
            'bio',
            'headline',
            'location',
            'website',
            'avatar',
            'coverImage',
            'isPrivate'
        ];
        const updates = {};

        // Filter only allowed fields
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = updateData[key];
            }
        });

        // Additional validation
        if (updates.bio && updates.bio.length > 160) {
            throw new Error("Bio cannot exceed 160 characters");
        }

        if (updates.headline && updates.headline.length > 80) {
            throw new Error("Headline cannot exceed 80 characters");
        }

        if (updates.location && updates.location.length > 80) {
            throw new Error("Location cannot exceed 80 characters");
        }

        if (updates.name && updates.name.length > 50) {
            throw new Error("Name cannot exceed 50 characters");
        }

        if (Object.keys(updates).length === 0) {
            throw createError("No valid profile fields provided", 400);
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const currentUser = await User.findById(userId)
                .select("isPrivate")
                .session(session);

            if (!currentUser) {
                throw createError("User not found", 404);
            }

            const wasPrivate = Boolean(currentUser.isPrivate);

            await User.findByIdAndUpdate(
                userId,
                { $set: updates },
                { runValidators: true, session }
            );

            let privacySync = null;
            const becamePublic = updates.isPrivate === false && wasPrivate;

            if (becamePublic) {
                privacySync = await this.autoApprovePendingFollowRequests(userId, session);
            }

            await session.commitTransaction();

            const user = await User.findById(userId)
                .select("-passwordHash -refreshToken -resetPasswordToken");

            if (!user) {
                throw createError("User not found", 404);
            }

            return {
                user: user.toProfileJSON(),
                privacySync: privacySync || { autoApprovedFollowRequests: 0 }
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Search users by username or name
     * @param {String} query - Search query
     * @param {Number} page - Page number
     * @param {Number} limit - Results per page
     * @param {ObjectId} currentUserId - Current user ID (optional)
     * @returns {Promise<Object>} Search results with pagination
     */
    async searchUsers(query, page = 1, limit = 10, currentUserId = null) {
        if (!query || query.trim().length === 0) {
            throw new Error("Search query is required");
        }

        const skip = (page - 1) * limit;
        const regex = new RegExp(query.trim(), 'i');

        // Build search query
        const searchQuery = {
            $or: [
                { username: regex },
                { name: regex }
            ],
            accountStatus: 'active'
        };

        // Get total count
        const total = await User.countDocuments(searchQuery);

        // Get users
        const users = await User.find(searchQuery)
            .select("username name avatar isVerified followersCount followingCount")
            .sort({ followersCount: -1, createdAt: -1 }) // Popular users first
            .skip(skip)
            .limit(limit)
            .lean();

        // Add relationship information if currentUserId is provided
        let results = users;
        if (currentUserId) {
            const userIds = users.map(u => u._id);
            const followingStatus = await Follow.checkMultipleRelationships(
                currentUserId,
                userIds
            );

            results = users.map(user => ({
                ...user,
                isFollowing: followingStatus[user._id.toString()]
            }));
        }

        return {
            users: results,
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
     * Search mention candidates for @mentions
     * @param {String} query - current text after @
     * @param {ObjectId} currentUserId - requester user id
     * @param {Object} scope - optional scope identifiers
     * @returns {Promise<{users: Array}>}
     */
    async searchMentionCandidates(query = "", currentUserId, scope = {}) {
        const searchToken = String(query || "").trim().toLowerCase();
        const limit = Math.min(20, Math.max(1, Number(scope.limit) || 8));

        const collectScopeUserIds = async () => {
            if (scope.chatId) {
                const chat = await Chat.findById(scope.chatId).select("members").lean();
                return (chat?.members || []).map((id) => String(id));
            }

            if (scope.subtaskId) {
                const subtask = await Subtask.findById(scope.subtaskId)
                    .select("assignedTo createdBy task")
                    .lean();

                if (!subtask) return [];

                const task = subtask.task
                    ? await Task.findById(subtask.task).select("assignees createdBy").lean()
                    : null;

                return [
                    ...(subtask.assignedTo || []),
                    subtask.createdBy,
                    ...(task?.assignees || []),
                    task?.createdBy
                ]
                    .filter(Boolean)
                    .map((id) => String(id));
            }

            if (scope.taskId) {
                const task = await Task.findById(scope.taskId)
                    .select("assignees createdBy")
                    .lean();

                if (!task) return [];

                return [
                    ...(task.assignees || []),
                    task.createdBy
                ]
                    .filter(Boolean)
                    .map((id) => String(id));
            }

            if (scope.projectId) {
                const project = await Project.findById(scope.projectId)
                    .select("owner members.user")
                    .lean();

                if (!project) return [];

                return [
                    project.owner,
                    ...((project.members || []).map((member) => member.user))
                ]
                    .filter(Boolean)
                    .map((id) => String(id));
            }

            if (scope.workspaceId) {
                const members = await WorkspaceMember.find({
                    workspace: scope.workspaceId,
                    status: "active"
                })
                    .select("user")
                    .lean();

                return members.map((member) => String(member.user));
            }

            return null;
        };

        const allowedUserIds = await collectScopeUserIds();
        const currentUserIdString = String(currentUserId);
        const normalizedAllowedUserIds = Array.isArray(allowedUserIds)
            ? Array.from(new Set(allowedUserIds.map((id) => String(id))))
            : null;

        if (Array.isArray(normalizedAllowedUserIds)) {
            if (normalizedAllowedUserIds.length === 0) {
                return { users: [] };
            }

            // Prevent scope probing: requester must be part of the resolved scope.
            if (!normalizedAllowedUserIds.includes(currentUserIdString)) {
                return { users: [] };
            }
        }

        const escapedToken = searchToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = escapedToken ? new RegExp(escapedToken, "i") : null;

        const filter = {
            accountStatus: "active",
            "preferences.privacy.allowMentions": { $ne: false },
            _id: { $ne: currentUserId }
        };

        if (Array.isArray(normalizedAllowedUserIds) && normalizedAllowedUserIds.length > 0) {
            filter._id.$in = normalizedAllowedUserIds;
        }

        if (regex) {
            filter.$or = [
                { username: regex },
                { name: regex }
            ];
        }

        const users = await User.find(filter)
            .select("username name avatar isOnline preferences.privacy.showOnlineStatus")
            .limit(regex ? limit * 4 : limit)
            .lean();

        const scored = users
            .map((user) => {
                const username = String(user.username || "").toLowerCase();
                const name = String(user.name || "").toLowerCase();

                let score = 0;
                if (searchToken) {
                    if (username === searchToken) score += 100;
                    if (username.startsWith(searchToken)) score += 70;
                    if (name.startsWith(searchToken)) score += 45;
                    if (username.includes(searchToken)) score += 20;
                    if (name.includes(searchToken)) score += 10;
                } else {
                    score += 5;
                }

                if (user.isOnline) score += 8;

                return { ...user, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((user) => ({
                _id: user._id,
                username: user.username,
                name: user.name,
                avatar: user.avatar,
                isOnline: user?.preferences?.privacy?.showOnlineStatus === false ? false : user.isOnline
            }));

        return { users: scored };
    }
    /**
     * Update user preferences
     * @param {ObjectId} userId - User ID
     * @param {Object} preferences - Preferences to update
     * @returns {Promise<Object>} Updated preferences
     */
    async updatePreferences(userId, preferences) {
        const allowedPreferences = [
            'preferences.language',
            'preferences.notifications.email',
            'preferences.notifications.push',
            'preferences.notifications.follows',
            'preferences.notifications.comments',
            'preferences.notifications.likes',
            'preferences.privacy.showEmail',
            'preferences.privacy.showOnlineStatus',
            'preferences.privacy.allowTagging',
            'preferences.privacy.allowMentions',
            'preferences.privacy.disablePublicMessages'
        ];

        const updates = {};

        // Flatten and filter preferences
        const flattenPreferences = (obj, prefix = '') => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
            Object.keys(obj).forEach(key => {
                const path = prefix ? `${prefix}.${key}` : key;
                if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    flattenPreferences(obj[key], path);
                } else if (allowedPreferences.includes(path)) {
                    updates[path] = obj[key];
                }
            });
        };

        // Accept both payload shapes:
        // { notifications: {...}, privacy: {...} } and { preferences: {...} }
        const normalizedRoot = preferences?.preferences && typeof preferences.preferences === 'object'
            ? preferences.preferences
            : preferences;
        flattenPreferences(normalizedRoot, 'preferences');

        if (Object.keys(updates).length === 0) {
            throw createError("No valid preferences provided", 400);
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true }
        ).select('preferences');

        if (!user) {
            throw new Error("User not found");
        }

        return user.preferences;
    }

    /**
     * Check username availability
     * @param {String} username - Username to check
     * @returns {Promise<Boolean>} Availability status
     */
    async checkUsernameAvailability(username) {
        const available = await User.isUsernameAvailable(username);
        return { available, username };
    }

    /**
     * Get user statistics
     * @param {ObjectId} userId - User ID
     * @returns {Promise<Object>} User statistics
     */
    async getUserStats(userId) {
        const user = await User.findById(userId)
            .select('followersCount followingCount postsCount createdAt');

        if (!user) {
            throw new Error("User not found");
        }

        // Calculate account age
        const accountAge = Math.floor(
            (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
            followers: user.followersCount,
            following: user.followingCount,
            posts: user.postsCount,
            accountAgeDays: accountAge,
            joinedAt: user.createdAt
        };
    }

    /**
     * Update user activity (last seen, online status)
     * @param {ObjectId} userId - User ID
     * @param {Boolean} isOnline - Online status
     * @returns {Promise<void>}
     */
    async updateActivity(userId, isOnline = true) {
        await User.findByIdAndUpdate(userId, {
            $set: {
                isOnline,
                lastSeen: Date.now(),
                lastActive: Date.now()
            }
        });
    }

    /**
     * Deactivate user account
     * @param {ObjectId} userId - User ID
     * @returns {Promise<Object>} Result
     */
    async deactivateAccount(userId) {
        const user = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    accountStatus: 'deactivated',
                    isOnline: false
                }
            },
            { new: true }
        );

        if (!user) {
            throw new Error("User not found");
        }

        // TODO: Handle cleanup (remove sessions, etc.)
        return { success: true, message: "Account deactivated" };
    }

    /**
     * Reactivate user account
     * @param {ObjectId} userId - User ID
     * @returns {Promise<Object>} Result
     */
    async reactivateAccount(userId) {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { accountStatus: 'active' } },
            { new: true }
        );

        if (!user) {
            throw new Error("User not found");
        }

        return { success: true, message: "Account reactivated" };
    }

    /**
     * Get popular/trending users
     * @param {Number} limit - Number of users to return
     * @returns {Promise<Array>} Popular users
     */
    async getPopularUsers(limit = 10) {
        const users = await User.find({
            accountStatus: 'active',
            followersCount: { $gt: 0 }
        })
            .select('username name avatar isVerified followersCount')
            .sort({ followersCount: -1, isVerified: -1 })
            .limit(limit)
            .lean();

        return users;
    }

    /**
     * Get blocked users list
     * @param {ObjectId} userId - Current user ID
     * @param {Number} page - Page number
     * @param {Number} limit - Results per page
     * @returns {Promise<Object>} Paginated blocked users
     */
    async getBlockedUsers(userId, page = 1, limit = 20) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
        const skip = (safePage - 1) * safeLimit;

        const user = await User.findById(userId).select("blockedUsers").lean();
        if (!user) {
            throw createError("User not found", 404);
        }

        const blockedIds = Array.isArray(user.blockedUsers)
            ? user.blockedUsers.map((entry) => toIdString(entry)).filter(Boolean)
            : [];
        const total = blockedIds.length;
        const pagedIds = blockedIds.slice(skip, skip + safeLimit);

        if (!pagedIds.length) {
            return {
                users: [],
                pagination: {
                    page: safePage,
                    limit: safeLimit,
                    total,
                    pages: Math.max(1, Math.ceil(total / safeLimit)),
                    hasMore: false
                }
            };
        }

        const blockedUsers = await User.find({
            _id: { $in: pagedIds }
        })
            .select("username name avatar isVerified followersCount followingCount accountStatus")
            .lean();

        const orderMap = new Map(pagedIds.map((id, index) => [id, index]));
        const normalizedUsers = blockedUsers
            .map((entry) => ({
                _id: entry._id,
                username: entry.username,
                name: entry.name,
                avatar: entry.avatar,
                isVerified: entry.isVerified,
                followersCount: entry.followersCount,
                followingCount: entry.followingCount,
                accountStatus: entry.accountStatus
            }))
            .sort((a, b) => {
                const aIndex = orderMap.get(toIdString(a._id)) ?? Number.MAX_SAFE_INTEGER;
                const bIndex = orderMap.get(toIdString(b._id)) ?? Number.MAX_SAFE_INTEGER;
                return aIndex - bIndex;
            });

        return {
            users: normalizedUsers,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                pages: Math.max(1, Math.ceil(total / safeLimit)),
                hasMore: skip + normalizedUsers.length < total
            }
        };
    }

    /**
     * Block a user (remove follow relationships and prevent future interactions)
     * @param {ObjectId} userId - Current user ID
     * @param {ObjectId} targetUserId - User to block
     * @returns {Promise<Object>} Result
     */
    async blockUser(userId, targetUserId) {
        if (!userId || !targetUserId) {
            throw createError("User IDs are required", 400);
        }

        if (String(userId) === String(targetUserId)) {
            throw createError("You cannot block yourself", 400);
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const [currentUser, targetUser] = await Promise.all([
                User.findById(userId).select("blockedUsers").session(session),
                User.findById(targetUserId).select("accountStatus").session(session)
            ]);

            if (!currentUser) throw createError("User not found", 404);
            if (!targetUser || targetUser.accountStatus !== "active") {
                throw createError("User not found", 404);
            }

            if (hasBlockedUser(currentUser, targetUserId)) {
                await session.commitTransaction();
                return { success: true, alreadyBlocked: true };
            }

            const relations = await Follow.find({
                $or: [
                    { follower: userId, following: targetUserId },
                    { follower: targetUserId, following: userId }
                ]
            }).session(session);

            let currentFollowingDelta = 0;
            let currentFollowersDelta = 0;
            let targetFollowingDelta = 0;
            let targetFollowersDelta = 0;

            relations.forEach((relation) => {
                if (!relation?.isApproved) return;
                const followerId = toIdString(relation.follower);
                if (followerId === toIdString(userId)) {
                    currentFollowingDelta -= 1;
                    targetFollowersDelta -= 1;
                } else {
                    currentFollowersDelta -= 1;
                    targetFollowingDelta -= 1;
                }
            });

            if (relations.length) {
                await Follow.deleteMany({
                    _id: { $in: relations.map((relation) => relation._id) }
                }).session(session);
            }

            const currentInc = {};
            if (currentFollowersDelta) currentInc.followersCount = currentFollowersDelta;
            if (currentFollowingDelta) currentInc.followingCount = currentFollowingDelta;

            const currentUpdate = {
                $addToSet: { blockedUsers: targetUserId }
            };
            if (Object.keys(currentInc).length > 0) {
                currentUpdate.$inc = currentInc;
            }

            await User.findByIdAndUpdate(userId, currentUpdate, { session });

            const targetInc = {};
            if (targetFollowersDelta) targetInc.followersCount = targetFollowersDelta;
            if (targetFollowingDelta) targetInc.followingCount = targetFollowingDelta;

            if (Object.keys(targetInc).length > 0) {
                await User.findByIdAndUpdate(targetUserId, { $inc: targetInc }, { session });
            }

            await session.commitTransaction();
            return { success: true, alreadyBlocked: false };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Unblock a user
     * @param {ObjectId} userId - Current user ID
     * @param {ObjectId} targetUserId - User to unblock
     * @returns {Promise<Object>} Result
     */
    async unblockUser(userId, targetUserId) {
        if (!userId || !targetUserId) {
            throw createError("User IDs are required", 400);
        }

        if (String(userId) === String(targetUserId)) {
            throw createError("Invalid operation", 400);
        }

        const result = await User.updateOne(
            { _id: userId },
            { $pull: { blockedUsers: targetUserId } }
        );

        if (!result.matchedCount) {
            throw createError("User not found", 404);
        }

        if (!result.modifiedCount) {
            throw createError("User is not in your block list", 400);
        }

        return { success: true };
    }
}

module.exports = new UserService();

