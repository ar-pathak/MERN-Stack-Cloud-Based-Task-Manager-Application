const Activity = require("../../models/activity");
const Like = require("../../models/like");
const Comment = require("../../models/comment");
const Post = require("../../models/post");
const PostSave = require("../../models/postSave");
const Follow = require("../../models/follow");
const Workspace = require("../../models/workspace");
const WorkspaceMember = require("../../models/workspaceMember");
const Project = require("../../models/project");
const Task = require("../../models/tasks");
const Subtask = require("../../models/subtasks");
const User = require("../../models/user");
const RefreshToken = require("../../models/RefreshToken");
const postService = require("../posts/post.service");

const escapeRegex = (value = "") =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toIdString = (value) => String(value?._id || value || "");

const mergeObjectIds = (...lists) => {
    const map = new Map();
    lists.flat().forEach((entry) => {
        const key = toIdString(entry);
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, entry?._id || entry);
        }
    });
    return Array.from(map.values());
};

const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeLimit = (value, fallback = 6) =>
    Math.min(20, Math.max(1, toFiniteNumber(value, fallback)));

const normalizeWindowDays = (value, fallback = 30) =>
    Math.min(30, Math.max(7, toFiniteNumber(value, fallback)));

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

const TIME_SOURCE_KEYS = ["planner", "likes", "comments", "reposts", "presence"];

const createTimeSourceCounter = () => ({
    planner: 0,
    likes: 0,
    comments: 0,
    reposts: 0,
    presence: 0
});

const aggregateDailyActions = (Model, match = {}) =>
    Model.aggregate([
        { $match: match },
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

const addDailySourceRows = (dailyMap, rows = [], sourceKey = "planner") => {
    rows.forEach((row) => {
        const dateKey = String(row?._id || "");
        if (!dateKey) return;

        const firstAt = row?.firstAt ? new Date(row.firstAt) : null;
        const lastAt = row?.lastAt ? new Date(row.lastAt) : null;
        const actions = Math.max(0, Number(row?.actions || 0));

        if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, {
                date: dateKey,
                firstAt: null,
                lastAt: null,
                actions: 0,
                sourceActions: createTimeSourceCounter()
            });
        }

        const bucket = dailyMap.get(dateKey);
        if (firstAt && (!bucket.firstAt || firstAt < bucket.firstAt)) {
            bucket.firstAt = firstAt;
        }
        if (lastAt && (!bucket.lastAt || lastAt > bucket.lastAt)) {
            bucket.lastAt = lastAt;
        }
        bucket.actions += actions;
        bucket.sourceActions[sourceKey] =
            Number(bucket.sourceActions?.[sourceKey] || 0) + actions;
    });
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

const formatActionLabel = (value = "") => {
    const normalized = String(value || "").trim();
    if (!normalized) return "Other";

    return normalized
        .split(/[_\s-]+/)
        .filter(Boolean)
        .slice(0, 5)
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
        .join(" ");
};

const buildDateSeries = (startDate, days, buildRow) => {
    const safeDays = Math.max(1, Number(days) || 1);
    const anchor = new Date(startDate);
    anchor.setUTCHours(0, 0, 0, 0);

    const rows = [];
    for (let offset = 0; offset < safeDays; offset += 1) {
        const date = new Date(anchor);
        date.setUTCDate(anchor.getUTCDate() + offset);
        const dateKey = date.toISOString().slice(0, 10);
        rows.push(buildRow(dateKey, date, offset) || { date: dateKey });
    }
    return rows;
};

const buildTimeSpentStats = async (userId, userDoc = null) => {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ));

    const startOfMonth = new Date(startOfToday);
    startOfMonth.setUTCDate(startOfMonth.getUTCDate() - 29);

    const matchWindow = { createdAt: { $gte: startOfMonth } };
    const [plannerRows, likeRows, commentRows, repostRows] = await Promise.all([
        aggregateDailyActions(Activity, {
            user: userId,
            ...matchWindow
        }),
        aggregateDailyActions(Like, {
            user: userId,
            post: { $type: "objectId" },
            ...matchWindow
        }),
        aggregateDailyActions(Comment, {
            author: userId,
            status: "active",
            post: { $type: "objectId" },
            ...matchWindow
        }),
        aggregateDailyActions(Post, {
            author: userId,
            status: "active",
            postType: { $in: ["repost", "quote"] },
            ...matchWindow
        })
    ]);

    const dailyMap = new Map();
    addDailySourceRows(dailyMap, plannerRows, "planner");
    addDailySourceRows(dailyMap, likeRows, "likes");
    addDailySourceRows(dailyMap, commentRows, "comments");
    addDailySourceRows(dailyMap, repostRows, "reposts");

    const latestSignalAt = userDoc?.lastActive || userDoc?.lastSeen || null;
    if (!dailyMap.size && latestSignalAt) {
        const signalDate = new Date(latestSignalAt);
        if (!Number.isNaN(signalDate.getTime()) && signalDate >= startOfMonth) {
            const signalKey = signalDate.toISOString().slice(0, 10);
            dailyMap.set(signalKey, {
                date: signalKey,
                firstAt: signalDate,
                lastAt: signalDate,
                actions: 1,
                sourceActions: {
                    ...createTimeSourceCounter(),
                    presence: 1
                }
            });
        }
    }

    const estimateMinutesForDay = (row) => {
        const firstAt = row?.firstAt ? new Date(row.firstAt) : null;
        const lastAt = row?.lastAt ? new Date(row.lastAt) : null;
        const actions = Math.max(1, Number(row?.actions || 0));
        const sourceCount = TIME_SOURCE_KEYS.filter(
            (source) => Number(row?.sourceActions?.[source] || 0) > 0
        ).length;

        if (!firstAt || !lastAt) return 0;

        const spanMinutes = Math.max(
            1,
            Math.round((lastAt.getTime() - firstAt.getTime()) / 60000)
        );
        const interactionBonus = Math.min(180, actions * 2 + sourceCount * 4);
        const baseMinutes = actions >= 6 ? 15 : actions >= 3 ? 8 : 5;
        return Math.min(10 * 60, Math.max(baseMinutes, spanMinutes + interactionBonus));
    };

    const sourceBreakdown = createTimeSourceCounter();
    const dailyEstimates = Array.from(dailyMap.values())
        .map((row) => {
            TIME_SOURCE_KEYS.forEach((source) => {
                sourceBreakdown[source] += Number(row?.sourceActions?.[source] || 0);
            });

            return {
                date: row.date,
                actions: Number(row?.actions || 0),
                sourceActions: row?.sourceActions || createTimeSourceCounter(),
                estimatedMinutes: estimateMinutesForDay(row)
            };
        })
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const dailyEstimateMap = new Map(
        dailyEstimates.map((row) => [String(row.date), row])
    );
    const buildRangeBreakdown = (days = 7) => {
        const rangeStart = new Date(startOfToday);
        rangeStart.setUTCDate(rangeStart.getUTCDate() - (Math.max(1, days) - 1));

        return buildDateSeries(rangeStart, days, (dateKey, date) => {
            const row = dailyEstimateMap.get(dateKey);
            return {
                date: dateKey,
                label: date.toLocaleDateString("en-US", { weekday: "short" }),
                day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                minutes: Number(row?.estimatedMinutes || 0),
                actions: Number(row?.actions || 0),
                plannerActions: Number(row?.sourceActions?.planner || 0),
                likesActions: Number(row?.sourceActions?.likes || 0),
                commentsActions: Number(row?.sourceActions?.comments || 0),
                repostsActions: Number(row?.sourceActions?.reposts || 0),
                presenceActions: Number(row?.sourceActions?.presence || 0)
            };
        });
    };

    const dailyBreakdownLast7 = buildRangeBreakdown(7);
    const dailyBreakdownLast30 = buildRangeBreakdown(30);

    const todayMinutes = Number(
        dailyBreakdownLast7[dailyBreakdownLast7.length - 1]?.minutes || 0
    );
    const weekMinutes = dailyBreakdownLast7.reduce(
        (sum, row) => sum + Number(row?.minutes || 0),
        0
    );
    const monthMinutes = dailyBreakdownLast30.reduce(
        (sum, row) => sum + Number(row?.minutes || 0),
        0
    );

    const dataSources = TIME_SOURCE_KEYS.filter(
        (source) => Number(sourceBreakdown[source] || 0) > 0
    );
    const note = dataSources.length
        ? `Estimated from ${dataSources.join(", ")} activity signals.`
        : "No activity signals found in the last 30 days yet.";

    const averageDailyMinutes = Math.round(monthMinutes / 30);
    const activeDays = dailyBreakdownLast30.filter(
        (row) => Number(row?.actions || 0) > 0 || Number(row?.minutes || 0) > 0
    ).length;
    const averageActiveDayMinutes = activeDays
        ? Math.round(monthMinutes / activeDays)
        : 0;

    return {
        estimated: true,
        note,
        todayMinutes,
        todayLabel: formatDuration(todayMinutes),
        last7DaysMinutes: weekMinutes,
        last7DaysLabel: formatDuration(weekMinutes),
        last30DaysMinutes: monthMinutes,
        last30DaysLabel: formatDuration(monthMinutes),
        averageDailyMinutes,
        averageDailyLabel: formatDuration(averageDailyMinutes),
        averageActiveDayMinutes,
        averageActiveDayLabel: formatDuration(averageActiveDayMinutes),
        activeDaysLast30: activeDays,
        sourceBreakdown,
        dataSources,
        dailyBreakdownLast7,
        dailyBreakdownLast30,
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

const buildAnalyticsDashboard = async ({
    userId,
    timeSpent = null,
    totalLikes = 0,
    totalComments = 0,
    totalReposts = 0,
    windowDays = 30
}) => {
    const safeWindowDays = normalizeWindowDays(windowDays, 30);
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWindow = new Date(startOfToday);
    startOfWindow.setDate(startOfWindow.getDate() - (safeWindowDays - 1));

    const [levelRows, actionRows] = await Promise.all([
        Activity.aggregate([
            {
                $match: {
                    user: userId,
                    createdAt: { $gte: startOfWindow }
                }
            },
            {
                $group: {
                    _id: "$level",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]),
        Activity.aggregate([
            {
                $match: {
                    user: userId,
                    createdAt: { $gte: startOfWindow }
                }
            },
            {
                $group: {
                    _id: "$action",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ])
    ]);

    const sourceDaily = Array.isArray(timeSpent?.dailyBreakdownLast30)
        ? timeSpent.dailyBreakdownLast30.slice(-safeWindowDays)
        : [];

    const dailyMap = new Map(sourceDaily.map((row) => [String(row?.date || ""), row]));
    const dailyTrend = buildDateSeries(startOfWindow, safeWindowDays, (dateKey, date) => {
        const row = dailyMap.get(dateKey);
        return {
            date: dateKey,
            label: date.toLocaleDateString("en-US", { weekday: "short" }),
            day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            actions: Number(row?.actions || 0),
            minutes: Number(row?.minutes || 0),
            plannerActions: Number(row?.plannerActions || 0),
            likesActions: Number(row?.likesActions || 0),
            commentsActions: Number(row?.commentsActions || 0),
            repostsActions: Number(row?.repostsActions || 0),
            presenceActions: Number(row?.presenceActions || 0)
        };
    });

    const totalActions = dailyTrend.reduce((sum, row) => sum + Number(row?.actions || 0), 0);
    const totalMinutes = dailyTrend.reduce((sum, row) => sum + Number(row?.minutes || 0), 0);
    const plannerActions = dailyTrend.reduce(
        (sum, row) =>
            sum +
            Number(row?.plannerActions || 0) +
            Number(row?.presenceActions || 0),
        0
    );
    const socialActions = dailyTrend.reduce(
        (sum, row) =>
            sum +
            Number(row?.likesActions || 0) +
            Number(row?.commentsActions || 0) +
            Number(row?.repostsActions || 0),
        0
    );

    const activeDays = dailyTrend.filter((row) => Number(row?.actions || 0) > 0).length;
    const averageActionsPerDay = Math.round(totalActions / Math.max(1, safeWindowDays));
    const averageMinutesPerDay = Math.round(totalMinutes / Math.max(1, safeWindowDays));

    const peakDay = dailyTrend.reduce((best, row) => {
        const bestActions = Number(best?.actions || 0);
        const rowActions = Number(row?.actions || 0);
        return rowActions > bestActions ? row : best;
    }, null);

    let streakDays = 0;
    for (let index = dailyTrend.length - 1; index >= 0; index -= 1) {
        if (Number(dailyTrend[index]?.actions || 0) <= 0) break;
        streakDays += 1;
    }

    const sourceBreakdown = {
        ...createTimeSourceCounter(),
        ...(timeSpent?.sourceBreakdown || {})
    };
    const sourceDistribution = [
        { key: "planner", label: "Planner", value: Number(sourceBreakdown.planner || 0) },
        { key: "likes", label: "Likes", value: Number(sourceBreakdown.likes || 0) },
        { key: "comments", label: "Comments", value: Number(sourceBreakdown.comments || 0) },
        { key: "reposts", label: "Reposts", value: Number(sourceBreakdown.reposts || 0) },
        { key: "presence", label: "Presence", value: Number(sourceBreakdown.presence || 0) }
    ].filter((entry) => entry.value > 0);

    const totalLevelActions = levelRows.reduce(
        (sum, row) => sum + Number(row?.count || 0),
        0
    );
    const levelDistribution = levelRows.map((row) => {
        const key = String(row?._id || "system");
        const value = Number(row?.count || 0);
        return {
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value,
            share: totalLevelActions
                ? Number(((value / totalLevelActions) * 100).toFixed(1))
                : 0
        };
    });

    const totalTopActions = actionRows.reduce(
        (sum, row) => sum + Number(row?.count || 0),
        0
    );
    const actionDistribution = actionRows.map((row) => {
        const value = Number(row?.count || 0);
        return {
            key: String(row?._id || ""),
            label: formatActionLabel(row?._id),
            value,
            share: totalTopActions
                ? Number(((value / totalTopActions) * 100).toFixed(1))
                : 0
        };
    });

    const engagementSummary = [
        { key: "likes", label: "Likes", value: Number(totalLikes || 0) },
        { key: "comments", label: "Comments", value: Number(totalComments || 0) },
        { key: "reposts", label: "Reposts", value: Number(totalReposts || 0) }
    ];
    const totalEngagement = engagementSummary.reduce(
        (sum, row) => sum + Number(row?.value || 0),
        0
    );
    const engagementRate = totalActions
        ? Number(((totalEngagement / totalActions) * 100).toFixed(1))
        : 0;

    return {
        rangeDays: safeWindowDays,
        kpis: {
            totalActions,
            totalMinutes,
            plannerActions,
            socialActions,
            averageActionsPerDay,
            averageMinutesPerDay,
            activeDays,
            streakDays,
            totalEngagement,
            engagementRate,
            peakDay: peakDay
                ? {
                    date: peakDay.date,
                    label: peakDay.day || peakDay.date,
                    actions: Number(peakDay.actions || 0)
                }
                : null,
            topAction: actionDistribution[0] || null
        },
        charts: {
            dailyTrend,
            sourceDistribution,
            levelDistribution,
            actionDistribution,
            engagementSummary
        }
    };
};

const buildSocialInsights = async ({ userId, startOfWindow, windowDays = 30 }) => {
    const [totalsRows, postTypeRows, visibilityRows, dailyRows, topPosts] = await Promise.all([
        Post.aggregate([
            {
                $match: {
                    author: userId,
                    status: "active"
                }
            },
            {
                $group: {
                    _id: null,
                    posts: { $sum: 1 },
                    views: { $sum: { $ifNull: ["$viewsCount", 0] } },
                    likes: { $sum: { $ifNull: ["$likesCount", 0] } },
                    comments: { $sum: { $ifNull: ["$commentsCount", 0] } },
                    shares: { $sum: { $ifNull: ["$sharesCount", 0] } },
                    reposts: { $sum: { $ifNull: ["$repostsCount", 0] } }
                }
            }
        ]),
        Post.aggregate([
            {
                $match: {
                    author: userId,
                    status: "active"
                }
            },
            {
                $group: {
                    _id: "$postType",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]),
        Post.aggregate([
            {
                $match: {
                    author: userId,
                    status: "active"
                }
            },
            {
                $group: {
                    _id: "$visibility",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]),
        Post.aggregate([
            {
                $match: {
                    author: userId,
                    status: "active",
                    createdAt: { $gte: startOfWindow }
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
                    posts: { $sum: 1 },
                    views: { $sum: { $ifNull: ["$viewsCount", 0] } },
                    likes: { $sum: { $ifNull: ["$likesCount", 0] } },
                    comments: { $sum: { $ifNull: ["$commentsCount", 0] } },
                    shares: { $sum: { $ifNull: ["$sharesCount", 0] } },
                    reposts: { $sum: { $ifNull: ["$repostsCount", 0] } }
                }
            }
        ]),
        Post.find({
            author: userId,
            status: "active"
        })
            .sort({
                viewsCount: -1,
                likesCount: -1,
                commentsCount: -1,
                sharesCount: -1,
                repostsCount: -1,
                createdAt: -1
            })
            .limit(5)
            .select(
                "content createdAt postType visibility viewsCount likesCount commentsCount sharesCount repostsCount"
            )
            .lean()
    ]);

    const totals = totalsRows[0] || {};
    const totalViews = Number(totals.views || 0);
    const totalLikes = Number(totals.likes || 0);
    const totalComments = Number(totals.comments || 0);
    const totalShares = Number(totals.shares || 0);
    const totalReposts = Number(totals.reposts || 0);
    const totalEngagement = totalLikes + totalComments + totalShares + totalReposts;

    const dailyMap = new Map(dailyRows.map((row) => [String(row?._id || ""), row]));
    const dailyTrend = buildDateSeries(startOfWindow, windowDays, (dateKey, date) => {
        const row = dailyMap.get(dateKey);
        const views = Number(row?.views || 0);
        const likes = Number(row?.likes || 0);
        const comments = Number(row?.comments || 0);
        const shares = Number(row?.shares || 0);
        const reposts = Number(row?.reposts || 0);
        return {
            date: dateKey,
            label: date.toLocaleDateString("en-US", { weekday: "short" }),
            day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            posts: Number(row?.posts || 0),
            views,
            likes,
            comments,
            shares,
            reposts,
            engagement: likes + comments + shares + reposts
        };
    });

    const postTypeDistribution = postTypeRows.map((row) => ({
        key: String(row?._id || "text"),
        label: formatActionLabel(row?._id || "text"),
        value: Number(row?.count || 0)
    }));

    const visibilityLabelMap = {
        public: "Public",
        followers: "Followers",
        private: "Private",
        unlisted: "Unlisted"
    };
    const visibilityDistribution = visibilityRows.map((row) => {
        const key = String(row?._id || "public");
        return {
            key,
            label: visibilityLabelMap[key] || formatActionLabel(key),
            value: Number(row?.count || 0)
        };
    });

    const normalizedTopPosts = topPosts.map((post) => {
        const likesCount = Number(post?.likesCount || 0);
        const commentsCount = Number(post?.commentsCount || 0);
        const sharesCount = Number(post?.sharesCount || 0);
        const repostsCount = Number(post?.repostsCount || 0);
        const viewsCount = Number(post?.viewsCount || 0);
        const engagementScore = likesCount + commentsCount + sharesCount + repostsCount;

        return {
            _id: post?._id,
            createdAt: post?.createdAt || null,
            postType: post?.postType || "text",
            visibility: post?.visibility || "public",
            contentPreview: toPreviewText(post?.content, 140),
            viewsCount,
            likesCount,
            commentsCount,
            sharesCount,
            repostsCount,
            engagementScore,
            engagementRate: viewsCount
                ? Number(((engagementScore / viewsCount) * 100).toFixed(2))
                : 0
        };
    });

    return {
        totals: {
            posts: Number(totals.posts || 0),
            views: totalViews,
            reach: totalViews,
            likes: totalLikes,
            comments: totalComments,
            shares: totalShares,
            reposts: totalReposts,
            totalEngagement,
            engagementRate: totalViews
                ? Number(((totalEngagement / totalViews) * 100).toFixed(2))
                : 0
        },
        dailyTrend,
        postTypeDistribution,
        visibilityDistribution,
        topPosts: normalizedTopPosts,
        reachNote: "Reach is estimated from total post views."
    };
};

const buildCreatorInsights = async ({
    userId,
    userDoc = null,
    startOfWindow,
    windowDays = 30,
    social = {}
}) => {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ));

    const startOfLast7 = new Date(startOfToday);
    startOfLast7.setUTCDate(startOfLast7.getUTCDate() - 6);

    const startOfLast30 = new Date(startOfToday);
    startOfLast30.setUTCDate(startOfLast30.getUTCDate() - 29);

    const trendWindowStart = startOfWindow < startOfLast30 ? startOfWindow : startOfLast30;
    const postListLimit = 120;

    const dateGroupId = (path = "$createdAt") => ({
        $dateToString: {
            format: "%Y-%m-%d",
            date: path
        }
    });

    const [
        totalPostCount,
        totalFollowersCount,
        totalFollowingCount,
        totalSavesRows,
        postAnalyticsDocs,
        postCreatedRows,
        followerDailyRows,
        likesDailyRows,
        commentsDailyRows,
        shareDailyRows,
        followersByCountryRows,
        postingHourRows
    ] = await Promise.all([
        Post.countDocuments({
            author: userId,
            status: { $in: ["active", "scheduled"] }
        }),
        Follow.countDocuments({
            following: userId,
            status: "active",
            isApproved: true
        }),
        Follow.countDocuments({
            follower: userId,
            status: "active",
            isApproved: true
        }),
        PostSave.aggregate([
            {
                $lookup: {
                    from: "posts",
                    localField: "post",
                    foreignField: "_id",
                    as: "postDoc"
                }
            },
            {
                $unwind: "$postDoc"
            },
            {
                $match: {
                    "postDoc.author": userId,
                    "postDoc.status": "active"
                }
            },
            {
                $count: "total"
            }
        ]),
        Post.find({
            author: userId,
            status: { $in: ["active", "scheduled"] }
        })
            .sort({ createdAt: -1 })
            .limit(postListLimit)
            .select(
                "_id content createdAt status scheduledFor visibility postType viewsCount likesCount commentsCount sharesCount repostsCount"
            )
            .lean(),
        Post.aggregate([
            {
                $match: {
                    author: userId,
                    status: { $in: ["active", "scheduled"] },
                    createdAt: { $gte: trendWindowStart }
                }
            },
            {
                $group: {
                    _id: dateGroupId("$createdAt"),
                    count: { $sum: 1 }
                }
            }
        ]),
        Follow.aggregate([
            {
                $match: {
                    following: userId,
                    status: "active",
                    isApproved: true,
                    createdAt: { $gte: trendWindowStart }
                }
            },
            {
                $group: {
                    _id: dateGroupId("$createdAt"),
                    count: { $sum: 1 }
                }
            }
        ]),
        Like.aggregate([
            {
                $match: {
                    post: { $type: "objectId" },
                    createdAt: { $gte: trendWindowStart }
                }
            },
            {
                $lookup: {
                    from: "posts",
                    localField: "post",
                    foreignField: "_id",
                    as: "postDoc"
                }
            },
            {
                $unwind: "$postDoc"
            },
            {
                $match: {
                    "postDoc.author": userId,
                    "postDoc.status": "active"
                }
            },
            {
                $group: {
                    _id: dateGroupId("$createdAt"),
                    count: { $sum: 1 }
                }
            }
        ]),
        Comment.aggregate([
            {
                $match: {
                    status: "active",
                    post: { $type: "objectId" },
                    createdAt: { $gte: trendWindowStart }
                }
            },
            {
                $lookup: {
                    from: "posts",
                    localField: "post",
                    foreignField: "_id",
                    as: "postDoc"
                }
            },
            {
                $unwind: "$postDoc"
            },
            {
                $match: {
                    "postDoc.author": userId,
                    "postDoc.status": "active"
                }
            },
            {
                $group: {
                    _id: dateGroupId("$createdAt"),
                    count: { $sum: 1 }
                }
            }
        ]),
        Post.aggregate([
            {
                $match: {
                    postType: { $in: ["repost", "quote"] },
                    status: "active",
                    originalPost: { $type: "objectId" },
                    createdAt: { $gte: trendWindowStart }
                }
            },
            {
                $lookup: {
                    from: "posts",
                    localField: "originalPost",
                    foreignField: "_id",
                    as: "originalDoc"
                }
            },
            {
                $unwind: "$originalDoc"
            },
            {
                $match: {
                    "originalDoc.author": userId,
                    "originalDoc.status": "active"
                }
            },
            {
                $group: {
                    _id: dateGroupId("$createdAt"),
                    count: { $sum: 1 }
                }
            }
        ]),
        Follow.aggregate([
            {
                $match: {
                    following: userId,
                    status: "active",
                    isApproved: true
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "follower",
                    foreignField: "_id",
                    as: "followerDoc"
                }
            },
            {
                $unwind: {
                    path: "$followerDoc",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: {
                        $ifNull: ["$followerDoc.metadata.location.country", "Unknown"]
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    count: -1,
                    _id: 1
                }
            },
            {
                $limit: 8
            }
        ]),
        Post.aggregate([
            {
                $match: {
                    author: userId,
                    status: "active",
                    createdAt: { $gte: trendWindowStart }
                }
            },
            {
                $group: {
                    _id: { $hour: "$createdAt" },
                    posts: { $sum: 1 },
                    likes: { $sum: { $ifNull: ["$likesCount", 0] } },
                    comments: { $sum: { $ifNull: ["$commentsCount", 0] } },
                    shares: { $sum: { $ifNull: ["$sharesCount", 0] } },
                    reposts: { $sum: { $ifNull: ["$repostsCount", 0] } }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ])
    ]);

    const postIds = postAnalyticsDocs.map((post) => post?._id).filter(Boolean);
    const saveRows = postIds.length
        ? await PostSave.aggregate([
            {
                $match: {
                    post: { $in: postIds }
                }
            },
            {
                $group: {
                    _id: "$post",
                    count: { $sum: 1 }
                }
            }
        ])
        : [];

    const toCountMap = (rows = []) =>
        new Map(
            rows.map((row) => [String(row?._id || ""), Number(row?.count || 0)])
        );

    const postCreatedMap = toCountMap(postCreatedRows);
    const followerMap = toCountMap(followerDailyRows);
    const likesMap = toCountMap(likesDailyRows);
    const commentsMap = toCountMap(commentsDailyRows);
    const sharesMap = toCountMap(shareDailyRows);
    const saveMap = toCountMap(saveRows);

    const sumLastDays = (map, days = 1) => {
        const safeDays = Math.max(1, Number(days) || 1);
        let total = 0;

        for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
            const date = new Date(startOfToday);
            date.setUTCDate(date.getUTCDate() - offset);
            const dateKey = date.toISOString().slice(0, 10);
            total += Number(map.get(dateKey) || 0);
        }

        return total;
    };

    const safeWindowDays = Math.max(7, Math.min(30, Number(windowDays) || 30));
    const followerGrowthAddedInWindow = sumLastDays(followerMap, safeWindowDays);
    const followerBaseline = Math.max(0, Number(totalFollowersCount || 0) - followerGrowthAddedInWindow);

    let cumulativeFollowers = followerBaseline;
    const followerGrowth = buildDateSeries(startOfWindow, safeWindowDays, (dateKey, date) => {
        const gained = Number(followerMap.get(dateKey) || 0);
        cumulativeFollowers += gained;
        return {
            date: dateKey,
            label: date.toLocaleDateString("en-US", { weekday: "short" }),
            day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            followers: cumulativeFollowers,
            gained
        };
    });

    const likesCommentsTrend = buildDateSeries(startOfWindow, safeWindowDays, (dateKey, date) => ({
        date: dateKey,
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        likes: Number(likesMap.get(dateKey) || 0),
        comments: Number(commentsMap.get(dateKey) || 0)
    }));

    const postAnalytics = postAnalyticsDocs.map((post) => {
        const postId = String(post?._id || "");
        const views = Number(post?.viewsCount || 0);
        const likes = Number(post?.likesCount || 0);
        const comments = Number(post?.commentsCount || 0);
        const shares = Number(post?.sharesCount || 0);
        const saves = Number(saveMap.get(postId) || 0);
        const engagementScore = likes + comments + shares + saves;

        return {
            _id: post?._id,
            createdAt: post?.createdAt || null,
            status: post?.status || "active",
            scheduledFor: post?.scheduledFor || null,
            visibility: post?.visibility || "public",
            postType: post?.postType || "text",
            content: String(post?.content || ""),
            contentPreview: toPreviewText(post?.content, 140),
            views,
            likes,
            comments,
            shares,
            saves,
            engagementScore,
            engagementRate: views
                ? Number(((engagementScore / views) * 100).toFixed(2))
                : 0
        };
    });

    const topPerformingPosts = [...postAnalytics]
        .filter((post) => post.status === "active")
        .sort((a, b) => {
            const scoreDiff = Number(b?.engagementScore || 0) - Number(a?.engagementScore || 0);
            if (scoreDiff !== 0) return scoreDiff;
            return Number(b?.views || 0) - Number(a?.views || 0);
        })
        .slice(0, 7)
        .map((post) => ({
            _id: post._id,
            label: toPreviewText(post?.contentPreview || "Post", 38),
            engagementScore: Number(post?.engagementScore || 0),
            likes: Number(post?.likes || 0),
            comments: Number(post?.comments || 0),
            shares: Number(post?.shares || 0),
            saves: Number(post?.saves || 0),
            views: Number(post?.views || 0)
        }));

    const normalizeCountry = (value = "") => {
        const normalized = String(value || "").trim();
        return normalized || "Unknown";
    };

    const followersByCountry = followersByCountryRows.map((row) => ({
        country: normalizeCountry(row?._id),
        value: Number(row?.count || 0)
    }));

    const formatHourLabel = (hourValue) => {
        const hour = Math.max(0, Math.min(23, Number(hourValue) || 0));
        const suffix = hour >= 12 ? "PM" : "AM";
        const normalizedHour = hour % 12 || 12;
        return `${normalizedHour}:00 ${suffix}`;
    };

    const postingHours = postingHourRows.map((row) => {
        const hour = Number(row?._id || 0);
        const posts = Number(row?.posts || 0);
        const likes = Number(row?.likes || 0);
        const comments = Number(row?.comments || 0);
        const shares = Number(row?.shares || 0);
        const reposts = Number(row?.reposts || 0);
        const engagement = likes + comments + shares + reposts;
        const averageEngagement = posts
            ? Number((engagement / posts).toFixed(2))
            : 0;

        return {
            hour,
            label: formatHourLabel(hour),
            posts,
            engagement,
            averageEngagement
        };
    });

    const bestPostingHour = postingHours.reduce((best, current) => {
        if (!best) return current;
        const currentAverage = Number(current?.averageEngagement || 0);
        const bestAverage = Number(best?.averageEngagement || 0);
        if (currentAverage > bestAverage) return current;
        if (currentAverage === bestAverage) {
            return Number(current?.posts || 0) > Number(best?.posts || 0) ? current : best;
        }
        return best;
    }, null);

    const growth = {
        today: {
            posts: sumLastDays(postCreatedMap, 1),
            followers: sumLastDays(followerMap, 1),
            likes: sumLastDays(likesMap, 1),
            comments: sumLastDays(commentsMap, 1),
            shares: sumLastDays(sharesMap, 1)
        },
        last7Days: {
            posts: sumLastDays(postCreatedMap, 7),
            followers: sumLastDays(followerMap, 7),
            likes: sumLastDays(likesMap, 7),
            comments: sumLastDays(commentsMap, 7),
            shares: sumLastDays(sharesMap, 7)
        },
        last30Days: {
            posts: sumLastDays(postCreatedMap, 30),
            followers: sumLastDays(followerMap, 30),
            likes: sumLastDays(likesMap, 30),
            comments: sumLastDays(commentsMap, 30),
            shares: sumLastDays(sharesMap, 30)
        }
    };

    const newFollowersLast30 = growth.last30Days.followers;
    const returningFollowers = Math.max(0, Number(totalFollowersCount || 0) - newFollowersLast30);
    const totalAudienceUsers = newFollowersLast30 + returningFollowers;

    const scheduledPosts = postAnalytics
        .filter((post) => post.status === "scheduled")
        .sort((a, b) => new Date(a?.scheduledFor || 0).getTime() - new Date(b?.scheduledFor || 0).getTime())
        .slice(0, 12)
        .map((post) => ({
            _id: post._id,
            contentPreview: post.contentPreview,
            visibility: post.visibility,
            scheduledFor: post.scheduledFor
        }));

    return {
        totals: {
            posts: Number(totalPostCount || 0),
            followers: Number(totalFollowersCount || userDoc?.followersCount || 0),
            following: Number(totalFollowingCount || userDoc?.followingCount || 0),
            likes: Number(social?.totals?.likes || 0),
            comments: Number(social?.totals?.comments || 0),
            shares: Number(social?.totals?.shares || 0),
            saves: Number(totalSavesRows?.[0]?.total || 0)
        },
        growth,
        trends: {
            followerGrowth,
            likesCommentsTrend,
            topPerformingPosts
        },
        postAnalytics: {
            total: Number(totalPostCount || 0),
            hasMore: Number(totalPostCount || 0) > postListLimit,
            limitedTo: postListLimit,
            items: postAnalytics
        },
        audience: {
            followersByCountry,
            activeTime: {
                bestPostingHour: bestPostingHour
                    ? {
                        hour: Number(bestPostingHour.hour || 0),
                        label: bestPostingHour.label,
                        averageEngagement: Number(bestPostingHour.averageEngagement || 0),
                        posts: Number(bestPostingHour.posts || 0)
                    }
                    : null,
                hourlyActivity: postingHours
            },
            newVsReturningUsers: {
                newUsers: Number(newFollowersLast30 || 0),
                returningUsers: Number(returningFollowers || 0),
                totalUsers: Number(totalAudienceUsers || 0),
                newUsersShare: totalAudienceUsers
                    ? Number(((newFollowersLast30 / totalAudienceUsers) * 100).toFixed(1))
                    : 0
            }
        },
        management: {
            scheduledPosts,
            draftCount: 0
        }
    };
};

const buildProductivityInsights = async ({
    userId,
    startOfWindow,
    now,
    windowDays = 30
}) => {
    const [memberWorkspaceIds, ownedWorkspaceIds] = await Promise.all([
        WorkspaceMember.find({
            user: userId,
            status: "active"
        }).distinct("workspace"),
        Workspace.find({ createdBy: userId }).distinct("_id")
    ]);

    const workspaceIds = mergeObjectIds(memberWorkspaceIds, ownedWorkspaceIds);
    const projectOr = [
        { owner: userId },
        { "members.user": userId }
    ];
    if (workspaceIds.length) {
        projectOr.unshift({ workspace: { $in: workspaceIds } });
    }
    const projectFilter = { $or: projectOr };

    const taskOr = [
        { createdBy: userId },
        { assignees: userId }
    ];
    if (workspaceIds.length) {
        taskOr.unshift({ workspace: { $in: workspaceIds } });
    }
    const taskFilter = { $or: taskOr };

    const taskIds = await Task.find(taskFilter).distinct("_id");

    const subtaskOr = [
        { createdBy: userId },
        { assignedTo: userId }
    ];
    if (taskIds.length) {
        subtaskOr.unshift({ task: { $in: taskIds } });
    }
    const subtaskFilter = { $or: subtaskOr };

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [
        projectStatusRows,
        taskStatusRows,
        taskTotalsRows,
        tasksCreatedRows,
        tasksCompletedRows,
        subtaskTotalsRows,
        subtasksCompletedRows
    ] = await Promise.all([
        Project.aggregate([
            { $match: projectFilter },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]),
        Task.aggregate([
            { $match: taskFilter },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]),
        Task.aggregate([
            { $match: taskFilter },
            {
                $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    activeTasks: {
                        $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
                    },
                    completedTasks: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                    },
                    overdueTasks: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$status", "active"] },
                                        { $ne: ["$dueDate", null] },
                                        { $lt: ["$dueDate", now] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    dueSoonTasks: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$status", "active"] },
                                        { $ne: ["$dueDate", null] },
                                        { $gte: ["$dueDate", now] },
                                        { $lte: ["$dueDate", nextWeek] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    highPriorityTasks: {
                        $sum: { $cond: [{ $eq: ["$isHighPriority", true] }, 1, 0] }
                    }
                }
            }
        ]),
        Task.aggregate([
            {
                $match: {
                    ...taskFilter,
                    createdAt: { $gte: startOfWindow }
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
                    count: { $sum: 1 }
                }
            }
        ]),
        Task.aggregate([
            {
                $match: {
                    ...taskFilter,
                    status: "completed",
                    updatedAt: { $gte: startOfWindow }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$updatedAt"
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]),
        Subtask.aggregate([
            { $match: subtaskFilter },
            {
                $group: {
                    _id: null,
                    totalSubtasks: { $sum: 1 },
                    completedSubtasks: {
                        $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] }
                    }
                }
            }
        ]),
        Subtask.aggregate([
            {
                $match: {
                    ...subtaskFilter,
                    completed: true,
                    completedAt: { $gte: startOfWindow }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$completedAt"
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    const taskCreatedMap = new Map(
        tasksCreatedRows.map((row) => [String(row?._id || ""), Number(row?.count || 0)])
    );
    const taskCompletedMap = new Map(
        tasksCompletedRows.map((row) => [String(row?._id || ""), Number(row?.count || 0)])
    );
    const subtaskCompletedMap = new Map(
        subtasksCompletedRows.map((row) => [String(row?._id || ""), Number(row?.count || 0)])
    );

    const dailyTrend = buildDateSeries(startOfWindow, windowDays, (dateKey, date) => ({
        date: dateKey,
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        tasksCreated: Number(taskCreatedMap.get(dateKey) || 0),
        tasksCompleted: Number(taskCompletedMap.get(dateKey) || 0),
        subtasksCompleted: Number(subtaskCompletedMap.get(dateKey) || 0)
    }));

    const taskTotals = taskTotalsRows[0] || {};
    const subtaskTotals = subtaskTotalsRows[0] || {};
    const ownedSet = new Set(ownedWorkspaceIds.map((entry) => toIdString(entry)));

    const projectStatusDistribution = projectStatusRows.map((row) => ({
        key: String(row?._id || "active"),
        label: formatActionLabel(row?._id || "active"),
        value: Number(row?.count || 0)
    }));
    const taskStatusDistribution = taskStatusRows.map((row) => ({
        key: String(row?._id || "active"),
        label: formatActionLabel(row?._id || "active"),
        value: Number(row?.count || 0)
    }));

    const projectCount = projectStatusDistribution.reduce(
        (sum, row) => sum + Number(row?.value || 0),
        0
    );

    return {
        totals: {
            workspaces: workspaceIds.length,
            ownedWorkspaces: ownedWorkspaceIds.length,
            memberWorkspaces: workspaceIds.filter((entry) => !ownedSet.has(toIdString(entry))).length,
            projects: projectCount,
            tasks: Number(taskTotals.totalTasks || 0),
            activeTasks: Number(taskTotals.activeTasks || 0),
            completedTasks: Number(taskTotals.completedTasks || 0),
            overdueTasks: Number(taskTotals.overdueTasks || 0),
            dueSoonTasks: Number(taskTotals.dueSoonTasks || 0),
            highPriorityTasks: Number(taskTotals.highPriorityTasks || 0),
            subtasks: Number(subtaskTotals.totalSubtasks || 0),
            completedSubtasks: Number(subtaskTotals.completedSubtasks || 0)
        },
        taskStatusDistribution,
        projectStatusDistribution,
        dailyTrend
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

    const analytics = await buildAnalyticsDashboard({
        userId,
        timeSpent,
        totalLikes,
        totalComments,
        totalReposts,
        windowDays: 30
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
        accountHistory: buildAccountHistory({ userDoc, latestSession }),
        analytics
    };
};

const getAdvancedDashboard = async (userId, query = {}) => {
    const windowDays = normalizeWindowDays(query.days, 30);
    const now = new Date();
    const startOfToday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ));
    const startOfWindow = new Date(startOfToday);
    startOfWindow.setUTCDate(startOfWindow.getUTCDate() - (windowDays - 1));

    const userDoc = await User.findById(userId)
        .select("name username email createdAt updatedAt lastSeen lastActive isOnline emailVerified accountStatus")
        .lean();

    if (!userDoc) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const [timeSpent, actionLikeCount, actionCommentCount, actionRepostCount, social, productivity] =
        await Promise.all([
            buildTimeSpentStats(userId, userDoc),
            Like.countDocuments({
                user: userId,
                post: { $type: "objectId" }
            }),
            Comment.countDocuments({
                author: userId,
                status: "active",
                post: { $type: "objectId" }
            }),
            Post.countDocuments({
                author: userId,
                status: "active",
                postType: { $in: ["repost", "quote"] }
            }),
            buildSocialInsights({ userId, startOfWindow, windowDays }),
            buildProductivityInsights({ userId, startOfWindow, now, windowDays })
        ]);

    const activity = await buildAnalyticsDashboard({
        userId,
        timeSpent,
        totalLikes: actionLikeCount,
        totalComments: actionCommentCount,
        totalReposts: actionRepostCount,
        windowDays
    });

    const creator = await buildCreatorInsights({
        userId,
        userDoc,
        startOfWindow,
        windowDays,
        social
    });

    return {
        rangeDays: windowDays,
        generatedAt: now,
        social,
        productivity,
        activity,
        creator
    };
};

module.exports = {
    listMyActivities,
    getMyActivityDashboard,
    getAdvancedDashboard
};
