const User = require('../../models/user');
const Follow = require('../../models/follow');
const Chat = require('../../models/chat');
const WorkspaceMember = require('../../models/workspaceMember');
const Project = require('../../models/project');
const Task = require('../../models/tasks');
const Subtask = require('../../models/subtasks');

class UserService {
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
            .select("username name bio headline location website avatar coverImage followersCount followingCount postsCount isPrivate isVerified createdAt accountStatus");

        if (!user) {
            throw new Error("User not found");
        }

        if (user.accountStatus !== 'active') {
            throw new Error("User not found");
        }

        const profile = user.toPublicJSON();

        // Add relationship information if currentUserId is provided
        if (currentUserId && currentUserId.toString() !== targetUserId.toString()) {
            const [followStatus, reverseFollowStatus] = await Promise.all([
                Follow.checkRelationship(currentUserId, targetUserId),
                Follow.checkRelationship(targetUserId, currentUserId)
            ]);

            profile.relationship = {
                isFollowing: followStatus.isFollowing,
                isFollowedBy: reverseFollowStatus.isFollowing,
                isPending: followStatus.isFollowing && !followStatus.isApproved
            };
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

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-passwordHash -refreshToken -resetPasswordToken");

        if (!user) {
            throw new Error("User not found");
        }

        return user.toProfileJSON();
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
            .select("username name avatar isOnline")
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
                isOnline: user.isOnline
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
            'preferences.privacy.allowMentions'
        ];

        const updates = {};

        // Flatten and filter preferences
        const flattenPreferences = (obj, prefix = '') => {
            Object.keys(obj).forEach(key => {
                const path = prefix ? `${prefix}.${key}` : key;
                if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    flattenPreferences(obj[key], path);
                } else if (allowedPreferences.includes(path)) {
                    updates[path] = obj[key];
                }
            });
        };

        flattenPreferences(preferences);

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
     * Block a user (prevent them from seeing your content)
     * @param {ObjectId} userId - Current user ID
     * @param {ObjectId} targetUserId - User to block
     * @returns {Promise<Object>} Result
     */
    async blockUser(userId, targetUserId) {
        // TODO: Implement blocking system
        // This would require a separate Block model or field
        throw new Error("Block feature not yet implemented");
    }
}

module.exports = new UserService();

