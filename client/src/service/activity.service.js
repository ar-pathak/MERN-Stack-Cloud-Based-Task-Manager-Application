import api from "../config/axios";

const BASE = "/api/activity";

export const getMyActivities = async (params = {}) => {
    const response = await api.get(`${BASE}/me`, { params });
    const payload = response.data?.data || response.data || {};

    return {
        activities: Array.isArray(payload?.activities) ? payload.activities : [],
        pagination: payload?.pagination || {
            page: 1,
            limit: 25,
            total: 0,
            totalPages: 0,
            hasMore: false
        }
    };
};

export const getActivityDashboard = async (params = {}) => {
    const response = await api.get(`${BASE}/dashboard`, { params });
    const payload = response.data?.data || response.data || {};

    return {
        likes: {
            count: Number(payload?.likes?.count || 0),
            items: Array.isArray(payload?.likes?.items) ? payload.likes.items : []
        },
        comments: {
            count: Number(payload?.comments?.count || 0),
            items: Array.isArray(payload?.comments?.items) ? payload.comments.items : []
        },
        reposts: {
            count: Number(payload?.reposts?.count || 0),
            items: Array.isArray(payload?.reposts?.items) ? payload.reposts.items : []
        },
        timeSpent: payload?.timeSpent || null,
        accountHistory: payload?.accountHistory || { summary: null, events: [] },
        analytics: payload?.analytics || null
    };
};

export const getAdvancedDashboard = async (params = {}) => {
    const response = await api.get(`${BASE}/advanced`, { params });
    const payload = response.data?.data || response.data || {};

    return {
        rangeDays: Number(payload?.rangeDays || 30),
        generatedAt: payload?.generatedAt || null,
        social: payload?.social || {
            totals: {},
            dailyTrend: [],
            postTypeDistribution: [],
            visibilityDistribution: [],
            topPosts: []
        },
        productivity: payload?.productivity || {
            totals: {},
            taskStatusDistribution: [],
            projectStatusDistribution: [],
            dailyTrend: []
        },
        activity: payload?.activity || {
            kpis: {},
            charts: {
                dailyTrend: [],
                sourceDistribution: [],
                levelDistribution: [],
                actionDistribution: [],
                engagementSummary: []
            }
        },
        creator: payload?.creator || {
            totals: {
                posts: 0,
                followers: 0,
                following: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                saves: 0
            },
            growth: {
                today: {
                    posts: 0,
                    followers: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0
                },
                last7Days: {
                    posts: 0,
                    followers: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0
                },
                last30Days: {
                    posts: 0,
                    followers: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0
                }
            },
            trends: {
                followerGrowth: [],
                likesCommentsTrend: [],
                topPerformingPosts: []
            },
            postAnalytics: {
                total: 0,
                hasMore: false,
                limitedTo: 120,
                items: []
            },
            audience: {
                followersByCountry: [],
                activeTime: {
                    bestPostingHour: null,
                    hourlyActivity: []
                },
                newVsReturningUsers: {
                    newUsers: 0,
                    returningUsers: 0,
                    totalUsers: 0,
                    newUsersShare: 0
                }
            },
            management: {
                scheduledPosts: [],
                draftCount: 0
            }
        }
    };
};
