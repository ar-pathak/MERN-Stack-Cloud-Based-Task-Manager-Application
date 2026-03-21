import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { connectSocket, onNotificationNew } from "../../../../../service/Chat.socket.service";
import { getAdvancedDashboard } from "../../../../../service/activity.service";
import { createPost, deletePost, updatePost, getAnalytics } from "../../../../../service/post.service";
import {
    DEFAULT_DAYS,
    DRAFT_STORAGE_KEY,
    INTERACTION_KIND_METRIC_MAP,
    INTERACTION_KINDS,
    MAX_DRAFTS
} from "../constants/dashboard.constants";
import {
    isPostWithinDateFilter,
    readLocalDrafts,
    toInteractionEntry,
    toLocalInputDateTime,
    toNumber
} from "../utils/dashboard.utils";

// Use backend analytics instead of frontend computation
const useAdvancedDashboardBackend = () => {
    const [analytics, setAnalytics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAnalytics = async (statusFilter = 'all', dateFilter = 'all', sortBy = 'date_desc') => {
        try {
            setLoading(true);
            const result = await getAnalytics({
                statusFilter,
                dateFilter,
                sortBy,
                limit: 100
            });
            setAnalytics(result.posts || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    return {
        analytics,
        loading,
        error,
        refetch: fetchAnalytics
    };
};

const buildDefaultComposerState = () => ({
    mode: "create",
    editingPostId: "",
    content: "",
    visibility: "public",
    publishMode: "now",
    scheduledFor: toLocalInputDateTime()
});

const EMPTY_OBJECT = Object.freeze({});

const patchDashboardWithInteraction = (currentDashboard, metricField, postId = "") => {
    if (!currentDashboard?.creator || !metricField) return currentDashboard;

    const nextDashboard = {
        ...currentDashboard,
        creator: {
            ...currentDashboard.creator,
            totals: { ...(currentDashboard.creator.totals || {}) },
            postAnalytics: { ...(currentDashboard.creator.postAnalytics || {}) }
        }
    };

    nextDashboard.creator.totals[metricField] =
        toNumber(nextDashboard.creator.totals[metricField]) + 1;

    const analyticsItems = Array.isArray(nextDashboard.creator.postAnalytics.items)
        ? nextDashboard.creator.postAnalytics.items
        : [];

    if (!postId) {
        nextDashboard.creator.postAnalytics.items = analyticsItems;
        return nextDashboard;
    }

    nextDashboard.creator.postAnalytics.items = analyticsItems.map((post) => {
        if (String(post?._id || "") !== String(postId)) return post;

        const likes = toNumber(post?.likes);
        const comments = toNumber(post?.comments);
        const shares = toNumber(post?.shares);
        const saves = toNumber(post?.saves);
        const nextLikes = metricField === "likes" ? likes + 1 : likes;
        const nextComments = metricField === "comments" ? comments + 1 : comments;
        const nextShares = metricField === "shares" ? shares + 1 : shares;
        const engagementScore = nextLikes + nextComments + nextShares + saves;
        const views = toNumber(post?.views);

        return {
            ...post,
            likes: nextLikes,
            comments: nextComments,
            shares: nextShares,
            engagementScore,
            engagementRate: views ? Number(((engagementScore / views) * 100).toFixed(2)) : 0
        };
    });

    return nextDashboard;
};

const useAdvancedDashboard = ({ profileId = "" } = {}) => {
    const [days, setDays] = useState(DEFAULT_DAYS);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [dashboard, setDashboard] = useState(null);
    const [sortBy, setSortBy] = useState("date_desc");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");
    const [busyPostId, setBusyPostId] = useState("");
    const [drafts, setDrafts] = useState(() => readLocalDrafts());
    const [composer, setComposer] = useState(() => buildDefaultComposerState());
    const [saving, setSaving] = useState(false);
    const [composerError, setComposerError] = useState("");
    const hasWarnedDraftStorageRef = useRef(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            window.localStorage.setItem(
                DRAFT_STORAGE_KEY,
                JSON.stringify(drafts.slice(0, MAX_DRAFTS))
            );
        } catch {
            if (!hasWarnedDraftStorageRef.current) {
                hasWarnedDraftStorageRef.current = true;
                toast.warning("Could not persist drafts in local storage");
            }
        }
    }, [drafts]);

    const loadDashboard = useCallback(async ({ silent = false, range = DEFAULT_DAYS } = {}) => {
        if (!silent) setLoading(true);
        setError("");
        try {
            const payload = await getAdvancedDashboard({ days: range });
            setDashboard(payload);
        } catch (requestError) {
            setDashboard(null);
            setError(requestError?.message || "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard({ range: days });
    }, [days, loadDashboard]);

    useEffect(() => {
        if (!profileId) return undefined;

        connectSocket();
        const offNotification = onNotificationNew(({ notification }) => {
            const kind = String(notification?.metadata?.kind || "");
            if (!INTERACTION_KINDS.has(kind)) return;

            const interaction = toInteractionEntry(notification);

            const metricField = INTERACTION_KIND_METRIC_MAP[kind];
            if (metricField) {
                setDashboard((previous) =>
                    patchDashboardWithInteraction(previous, metricField, interaction.postId)
                );
            }

            toast.message(interaction.title, { description: interaction.message });
        });

        return () => (typeof offNotification === "function" ? offNotification() : undefined);
    }, [profileId]);

    const refresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await loadDashboard({ silent: true, range: days });
        } finally {
            setRefreshing(false);
        }
    }, [days, loadDashboard]);

    const creator = dashboard?.creator || EMPTY_OBJECT;
    const totals = creator?.totals || EMPTY_OBJECT;
    const trends = creator?.trends || EMPTY_OBJECT;
    const growth = creator?.growth || EMPTY_OBJECT;
    const audience = creator?.audience || EMPTY_OBJECT;
    const management = creator?.management || EMPTY_OBJECT;
    const postAnalyticsItems = useMemo(
        () => (Array.isArray(creator?.postAnalytics?.items) ? creator.postAnalytics.items : []),
        [creator?.postAnalytics?.items]
    );

    const filteredPosts = useMemo(() => {
        let rows = [...postAnalyticsItems];
        if (statusFilter !== "all") {
            rows = rows.filter((post) => String(post?.status || "") === statusFilter);
        }
        if (dateFilter !== "all") {
            rows = rows.filter((post) =>
                isPostWithinDateFilter(post?.createdAt, dateFilter)
            );
        }

        if (sortBy === "likes_desc") {
            rows.sort((left, right) => toNumber(right?.likes) - toNumber(left?.likes));
        } else if (sortBy === "comments_desc") {
            rows.sort((left, right) => toNumber(right?.comments) - toNumber(left?.comments));
        } else if (sortBy === "date_asc") {
            rows.sort(
                (left, right) =>
                    new Date(left?.createdAt || 0).getTime() -
                    new Date(right?.createdAt || 0).getTime()
            );
        } else {
            rows.sort(
                (left, right) =>
                    new Date(right?.createdAt || 0).getTime() -
                    new Date(left?.createdAt || 0).getTime()
            );
        }
        return rows;
    }, [dateFilter, postAnalyticsItems, sortBy, statusFilter]);

    const growthRows = useMemo(
        () => [
            {
                label: "Posts",
                today: toNumber(growth?.today?.posts),
                sevenDays: toNumber(growth?.last7Days?.posts),
                thirtyDays: toNumber(growth?.last30Days?.posts)
            },
            {
                label: "Followers",
                today: toNumber(growth?.today?.followers),
                sevenDays: toNumber(growth?.last7Days?.followers),
                thirtyDays: toNumber(growth?.last30Days?.followers)
            },
            {
                label: "Likes",
                today: toNumber(growth?.today?.likes),
                sevenDays: toNumber(growth?.last7Days?.likes),
                thirtyDays: toNumber(growth?.last30Days?.likes)
            },
            {
                label: "Comments",
                today: toNumber(growth?.today?.comments),
                sevenDays: toNumber(growth?.last7Days?.comments),
                thirtyDays: toNumber(growth?.last30Days?.comments)
            },
            {
                label: "Shares",
                today: toNumber(growth?.today?.shares),
                sevenDays: toNumber(growth?.last7Days?.shares),
                thirtyDays: toNumber(growth?.last30Days?.shares)
            }
        ],
        [growth]
    );

    const resetComposer = useCallback(() => {
        setComposer(buildDefaultComposerState());
        setComposerError("");
    }, []);

    const handleEdit = useCallback((post) => {
        setComposer({
            mode: "edit",
            editingPostId: String(post?._id || ""),
            content: String(post?.content || post?.contentPreview || ""),
            visibility: String(post?.visibility || "public"),
            publishMode: post?.status === "scheduled" ? "schedule" : "now",
            scheduledFor: toLocalInputDateTime(post?.scheduledFor)
        });
        setComposerError("");
    }, []);

    const submitComposer = useCallback(async () => {
        const content = String(composer.content || "").trim();
        if (!content) {
            setComposerError("Post content is required");
            toast.error("Post content is required");
            return;
        }

        setSaving(true);
        setComposerError("");
        try {
            const isEditing = composer.mode === "edit" && composer.editingPostId;
            if (composer.mode === "edit" && composer.editingPostId) {
                await updatePost(composer.editingPostId, {
                    content,
                    visibility: composer.visibility
                });
            } else {
                const payload = {
                    content,
                    visibility: composer.visibility,
                    postType: "text"
                };

                if (composer.publishMode === "schedule") {
                    const scheduledDate = new Date(composer.scheduledFor);
                    if (!Number.isFinite(scheduledDate.getTime()) || scheduledDate <= new Date()) {
                        throw new Error("Schedule time must be in the future");
                    }
                    payload.scheduledFor = scheduledDate.toISOString();
                }

                await createPost(payload);
            }

            resetComposer();
            await loadDashboard({ silent: true, range: days });
            if (isEditing) {
                toast.success("Post updated");
            } else if (composer.publishMode === "schedule") {
                toast.success("Post scheduled");
            } else {
                toast.success("Post created");
            }
        } catch (requestError) {
            const message = requestError?.message || "Failed to save post";
            setComposerError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    }, [composer, days, loadDashboard, resetComposer]);

    const deleteOnePost = useCallback(
        async (postId) => {
            if (!postId) return;
            if (typeof window !== "undefined" && !window.confirm("Delete this post?")) return;

            try {
                setBusyPostId(String(postId));
                await deletePost(postId);
                if (String(composer.editingPostId || "") === String(postId)) {
                    resetComposer();
                }
                await loadDashboard({ silent: true, range: days });
                toast.success("Post deleted");
            } catch (requestError) {
                const message = requestError?.message || "Failed to delete post";
                setComposerError(message);
                toast.error(message);
            } finally {
                setBusyPostId("");
            }
        },
        [composer.editingPostId, days, loadDashboard, resetComposer]
    );

    const saveDraft = useCallback(() => {
        const content = String(composer.content || "").trim();
        if (!content) {
            setComposerError("Write something before saving draft");
            toast.error("Write something before saving draft");
            return;
        }

        const draft = {
            id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            content,
            visibility: composer.visibility,
            publishMode: composer.publishMode,
            scheduledFor: composer.scheduledFor,
            updatedAt: new Date().toISOString()
        };
        setDrafts((previous) => [draft, ...previous].slice(0, MAX_DRAFTS));
        setComposerError("");
        toast.success("Draft saved");
    }, [composer]);

    const loadDraft = useCallback((draft) => {
        setComposer({
            mode: "create",
            editingPostId: "",
            content: String(draft?.content || ""),
            visibility: String(draft?.visibility || "public"),
            publishMode: String(draft?.publishMode || "now"),
            scheduledFor: String(draft?.scheduledFor || toLocalInputDateTime())
        });
        setComposerError("");
        toast.message("Draft loaded");
    }, []);

    const removeDraft = useCallback((id) => {
        setDrafts((previous) =>
            previous.filter((draft) => String(draft.id) !== String(id))
        );
        toast.message("Draft removed");
    }, []);

    const followerGrowth = Array.isArray(trends?.followerGrowth) ? trends.followerGrowth : [];
    const likesCommentsTrend = Array.isArray(trends?.likesCommentsTrend)
        ? trends.likesCommentsTrend
        : [];
    const topPerforming = Array.isArray(trends?.topPerformingPosts)
        ? trends.topPerformingPosts
        : [];
    const countryRows = Array.isArray(audience?.followersByCountry)
        ? audience.followersByCountry
        : [];
    const hourlyRows = Array.isArray(audience?.activeTime?.hourlyActivity)
        ? audience.activeTime.hourlyActivity
        : [];
    const userMix = audience?.newVsReturningUsers || EMPTY_OBJECT;
    const scheduledPosts = Array.isArray(management?.scheduledPosts)
        ? management.scheduledPosts
        : [];

    return {
        days,
        loading,
        refreshing,
        error,
        generatedAt: dashboard?.generatedAt || null,
        totals,
        growthRows,
        followerGrowth,
        likesCommentsTrend,
        topPerforming,
        posts: filteredPosts,
        sortBy,
        statusFilter,
        dateFilter,
        busyPostId,
        countryRows,
        hourlyRows,
        userMix,
        bestPostingHour: audience?.activeTime?.bestPostingHour || null,
        scheduledPosts,
        drafts,
        composer,
        saving,
        composerError,
        setDays,
        refresh,
        setSortBy,
        setStatusFilter,
        setDateFilter,
        setComposer,
        handleEdit,
        submitComposer,
        deleteOnePost,
        resetComposer,
        saveDraft,
        loadDraft,
        removeDraft
    };
};

export default useAdvancedDashboard;
