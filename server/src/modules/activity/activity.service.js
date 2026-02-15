const Activity = require("../../models/activity");
const Like = require("../../models/like");
const Comment = require("../../models/comment");
const Post = require("../../models/post");
const User = require("../../models/user");
const RefreshToken = require("../../models/RefreshToken");
const postService = require("../posts/post.service");

const escapeRegex = (value = "") =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toIdString = (value) => String(value?._id || value || "");

const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeLimit = (value, fallback = 6) =>
    Math.min(20, Math.max(1, toFiniteNumber(value, fallback)));

const toPreviewText = (value, max = 160) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, max - 1)}...`;
};

const formatDuration = (minutes = 0) => {
    const safeMinutes = Math.max(0, Math.round(toFiniteNumber(minutes, 0)));
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    return `${hours}h ${mins}m`;
};

const serializeUser = (user) => {
    if (!user) return null;
    return {
        _id: user._id,
        name: user.name || "",
        username: user.username || "",
        avatar: user.avatar || "",
        isVerified: Boolean(user.isVerified)
    };
};

const serializePostSummary = (post = {}, depth = 0) => {
    if (!post?._id || depth > 2) return null;

    return {
        _id: post._id,
        content: post.content || "",
        contentPreview: toPreviewText(post.content, 180),
        postType: post.postType || "text",
        createdAt: post.createdAt || null,
        likesCount: toFiniteNumber(post.likesCount, 0),
        commentsCount: toFiniteNumber(post.commentsCount, 0),
        repostsCount: toFiniteNumber(post.repostsCount, 0),
        author: serializeUser(post.author),
        originalPost: post.originalPost
            ? serializePostSummary(post.originalPost, depth + 1)
            : null
    };
};

const buildTimeSpentStats = async (userId, userDoc = null) => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    const perDay = await Activity.aggregate([
        {
            $match: {
                user: userId,
                createdAt: { $gte: startOfMonth }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt"
                    }
                },
                firstAt: { $min: "$createdAt" },
                lastAt: { $max: "$createdAt" },
                actions: { $sum: 1 }
            }
        }
    ]);

    const estimateMinutesForDay = (row) => {
        const firstAt = row?.firstAt ? new Date(row.firstAt) : null;
        const lastAt = row?.lastAt ? new Date(row.lastAt) : null;
        const actions = Math.max(1, Number(row?.actions || 0));

        if (!firstAt || !lastAt) return 0;

        const spanMinutes = Math.max(
            1,
            Math.round((lastAt.getTime() - firstAt.getTime()) / 60000)
        );
        const interactionBonus = Math.min(120, actions * 2);
        return Math.min(8 * 60, Math.max(5, spanMinutes + interactionBonus));
    };

    const dailyEstimates = perDay.map((row) => ({
        date: row._id,
        actions: Number(row.actions || 0),
        estimatedMinutes: estimateMinutesForDay(row)
    }));

    const todayKey = startOfToday.toISOString().slice(0, 10);
    const weekStartKey = startOfWeek.toISOString().slice(0, 10);

    const todayMinutes = dailyEstimates
        .filter((row) => row.date === todayKey)
        .reduce((sum, row) => sum + row.estimatedMinutes, 0);

    const weekMinutes = dailyEstimates
        .filter((row) => row.date >= weekStartKey)
        .reduce((sum, row) => sum + row.estimatedMinutes, 0);

    const monthMinutes = dailyEstimates
        .reduce((sum, row) => sum + row.estimatedMinutes, 0);

    return {
        estimated: true,
        note: "Estimated from your recent in-app actions.",
        todayMinutes,
        todayLabel: formatDuration(todayMinutes),
        last7DaysMinutes: weekMinutes,
        last7DaysLabel: formatDuration(weekMinutes),
        last30DaysMinutes: monthMinutes,
        last30DaysLabel: formatDuration(monthMinutes),
        averageDailyMinutes: Math.round(monthMinutes / 30),
        averageDailyLabel: formatDuration(Math.round(monthMinutes / 30)),
        activeDaysLast30: dailyEstimates.length,
        lastActiveAt: userDoc?.lastActive || userDoc?.lastSeen || null
    };
};

const buildAccountHistory = ({ userDoc, latestSession }) => {
    const events = [];

    if (userDoc?.createdAt) {
        events.push({
            type: "account_created",
            title: "Account created",
            description: "Your account was created.",
            at: userDoc.createdAt
        });
    }

    if (latestSession?.createdAt) {
        events.push({
            type: "last_sign_in",
            title: "Last sign in",
            description: "Latest authenticated session detected.",
            at: latestSession.createdAt
        });
    }

    if (userDoc?.updatedAt && userDoc?.createdAt) {
        const updatedAt = new Date(userDoc.updatedAt).getTime();
        const createdAt = new Date(userDoc.createdAt).getTime();
        if (updatedAt - createdAt > 60000) {
            events.push({
                type: "profile_updated",
                title: "Profile updated",
                description: "Your profile details were updated.",
                at: userDoc.updatedAt
            });
        }
    }

    if (userDoc?.lastSeen) {
        events.push({
            type: "last_seen",
            title: userDoc?.isOnline ? "Currently online" : "Last seen",
            description: userDoc?.isOnline
                ? "You are active right now."
                : "Most recent activity timestamp.",
            at: userDoc.lastSeen
        });
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
        summary: {
            accountStatus: userDoc?.accountStatus || "active",
            emailVerified: Boolean(userDoc?.emailVerified),
            isOnline: Boolean(userDoc?.isOnline),
            joinedAt: userDoc?.createdAt || null,
            lastSeen: userDoc?.lastSeen || null,
            lastActive: userDoc?.lastActive || null,
            activeSessionStartedAt: latestSession?.createdAt || null,
            activeSessionExpiresAt: latestSession?.expiresAt || null
        },
        events
    };
};

const buildEntity = (activity = {}) => {
    if (activity.subtask) {
        return {
            type: "subtask",
            id: toIdString(activity.subtask),
            name: activity.subtask.title || "Subtask"
        };
    }

    if (activity.task) {
        return {
            type: "task",
            id: toIdString(activity.task),
            name: activity.task.title || "Task"
        };
    }

    if (activity.project) {
        return {
            type: "project",
            id: toIdString(activity.project),
            name: activity.project.name || "Project"
        };
    }

    if (activity.workspace) {
        return {
            type: "workspace",
            id: toIdString(activity.workspace),
            name: activity.workspace.name || "Workspace"
        };
    }

    if (activity.chatId) {
        return {
            type: "chat",
            id: toIdString(activity.chatId),
            name: activity.chatId.name || "Chat"
        };
    }

    return null;
};

const listMyActivities = async (userId, query = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const filters = { user: userId };

    if (query.level && query.level !== "all") {
        filters.level = query.level;
    }

    const actionToken = String(query.action || "").trim();
    if (actionToken) {
        filters.action = { $regex: escapeRegex(actionToken), $options: "i" };
    }

    const searchToken = String(query.search || "").trim();
    if (searchToken) {
        const searchRegex = { $regex: escapeRegex(searchToken), $options: "i" };
        filters.$or = [
            { action: searchRegex },
            { message: searchRegex }
        ];
    }

    const activityQuery = Activity.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("workspace", "name")
        .populate("project", "name")
        .populate("task", "title status")
        .populate("subtask", "title completed")
        .populate("chatId", "name type")
        .lean();

    const [activities, total] = await Promise.all([
        activityQuery,
        Activity.countDocuments(filters)
    ]);

    const normalizedActivities = activities.map((activity) => ({
        ...activity,
        entity: buildEntity(activity)
    }));

    return {
        activities: normalizedActivities,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + normalizedActivities.length < total
        }
    };
};

const getMyActivityDashboard = async (userId, query = {}) => {
    const limit = normalizeLimit(query.limit, 6);

    const userDoc = await User.findById(userId)
        .select("name username email createdAt updatedAt lastSeen lastActive isOnline emailVerified accountStatus")
        .lean();

    if (!userDoc) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const [
        likeDocs,
        totalLikes,
        commentDocs,
        totalComments,
        repostDocs,
        totalReposts,
        latestSession,
        timeSpent
    ] = await Promise.all([
        Like.find({
            user: userId,
            post: { $type: "objectId" }
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate({
                path: "post",
                populate: [
                    { path: "author", select: "name username avatar isVerified" },
                    {
                        path: "originalPost",
                        populate: { path: "author", select: "name username avatar isVerified" }
                    }
                ]
            })
            .lean(),
        Like.countDocuments({
            user: userId,
            post: { $type: "objectId" }
        }),
        Comment.find({
            author: userId,
            status: "active",
            post: { $type: "objectId" }
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate({
                path: "post",
                populate: [
                    { path: "author", select: "name username avatar isVerified" },
                    {
                        path: "originalPost",
                        populate: { path: "author", select: "name username avatar isVerified" }
                    }
                ]
            })
            .lean(),
        Comment.countDocuments({
            author: userId,
            status: "active",
            post: { $type: "objectId" }
        }),
        Post.find({
            author: userId,
            status: "active",
            postType: { $in: ["repost", "quote"] }
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("author", "name username avatar isVerified")
            .populate({
                path: "originalPost",
                populate: [
                    { path: "author", select: "name username avatar isVerified" },
                    {
                        path: "originalPost",
                        populate: { path: "author", select: "name username avatar isVerified" }
                    }
                ]
            })
            .lean(),
        Post.countDocuments({
            author: userId,
            status: "active",
            postType: { $in: ["repost", "quote"] }
        }),
        RefreshToken.findOne({ user: userId })
            .sort({ createdAt: -1 })
            .select("createdAt expiresAt")
            .lean(),
        buildTimeSpentStats(userId, userDoc)
    ]);

    const likedPosts = likeDocs
        .map((entry) => entry?.post)
        .filter((post) => post && post.status === "active");
    const accessibleLikedPosts = await postService.filterAccessiblePosts(likedPosts, userId);
    const accessibleLikedSet = new Set(accessibleLikedPosts.map((post) => toIdString(post?._id)));

    const likes = likeDocs
        .filter((entry) => accessibleLikedSet.has(toIdString(entry?.post?._id)))
        .map((entry) => ({
            _id: entry._id,
            likedAt: entry.createdAt,
            post: serializePostSummary(entry.post)
        }))
        .filter((entry) => entry.post);

    const commentedPosts = commentDocs
        .map((entry) => entry?.post)
        .filter((post) => post && post.status === "active");
    const accessibleCommentedPosts = await postService.filterAccessiblePosts(commentedPosts, userId);
    const accessibleCommentedSet = new Set(
        accessibleCommentedPosts.map((post) => toIdString(post?._id))
    );

    const comments = commentDocs
        .filter((entry) => accessibleCommentedSet.has(toIdString(entry?.post?._id)))
        .map((entry) => ({
            _id: entry._id,
            content: entry.content || "",
            contentPreview: toPreviewText(entry.content, 120),
            commentedAt: entry.createdAt,
            post: serializePostSummary(entry.post)
        }))
        .filter((entry) => entry.post);

    const repostOriginalPosts = repostDocs
        .map((entry) => entry?.originalPost)
        .filter((post) => post && post.status === "active");
    const accessibleOriginalPosts = await postService.filterAccessiblePosts(
        repostOriginalPosts,
        userId
    );
    const accessibleOriginalMap = new Map(
        accessibleOriginalPosts.map((post) => [toIdString(post?._id), post])
    );

    const reposts = repostDocs.map((entry) => {
        const originalPostId = toIdString(entry?.originalPost?._id);
        const accessibleOriginal = accessibleOriginalMap.get(originalPostId) || null;

        return {
            _id: entry._id,
            repostedAt: entry.createdAt,
            mode: entry.postType || "repost",
            content: entry.content || "",
            contentPreview: toPreviewText(entry.content, 140),
            post: serializePostSummary(entry),
            originalPost: serializePostSummary(accessibleOriginal || entry.originalPost || null)
        };
    });

    return {
        likes: {
            count: totalLikes,
            items: likes
        },
        comments: {
            count: totalComments,
            items: comments
        },
        reposts: {
            count: totalReposts,
            items: reposts
        },
        timeSpent,
        accountHistory: buildAccountHistory({ userDoc, latestSession })
    };
};

module.exports = {
    listMyActivities,
    getMyActivityDashboard
};
