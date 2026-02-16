import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
    Activity,
    ArrowLeft,
    BarChart3,
    Calendar,
    Check,
    Copy,
    ExternalLink,
    LifeBuoy,
    Loader2,
    Lock,
    MapPin,
    MessageSquare,
    MoreHorizontal,
    Settings,
    ShieldCheck,
    UserX,
    UserPlus2,
    UserRound,
    Users
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import MobileBottomNav from "../main/components/navigation/MobileBottomNav";
import {
    blockUser as blockUserRequest,
    getUserById,
    unblockUser as unblockUserRequest,
    updateProfile as updateProfileRequest
} from "../../service/user.service";
import { deletePost, getPostLikes, getUserPosts } from "../../service/post.service";
import {
    approveFollowRequest,
    followUser,
    getFollowers,
    getFollowing,
    getFollowSuggestions,
    getMutualFollowers,
    getPendingRequests,
    rejectFollowRequest,
    unfollowUser
} from "../../service/follow.service";
import ProfileEditModal from "./components/ProfileEditModal";
import PostDetailModal from "./components/PostDetailModal";
import PostLikesModal from "./components/PostLikesModal";
import ProfilePostsTab from "./components/ProfilePostsTab";
import RelationshipModal from "./components/RelationshipModal";
import {
    FOLLOW_LIST_PAGE_SIZE,
    MOBILE_BREAKPOINT,
    POSTS_PAGE_SIZE,
    PROFILE_TABS,
    getFollowButtonState,
    getJoinedLabel,
    mergeConnections,
    normalizeConnection,
    normalizePagination,
    toDisplayName,
    toId
} from "./utils/profile.helpers";

const MotionDiv = motion.div;

const UserProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, refreshUser } = useAuth();

    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [postsPagination, setPostsPagination] = useState(normalizePagination({}, 1, POSTS_PAGE_SIZE));
    const [postsLoadingMore, setPostsLoadingMore] = useState(false);
    const [postsAccessMessage, setPostsAccessMessage] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [flashMessage, setFlashMessage] = useState("");
    const [activeTab, setActiveTab] = useState("posts");

    const [followLoading, setFollowLoading] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(
        typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
    );

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [blockActionLoading, setBlockActionLoading] = useState(false);

    const [graphModal, setGraphModal] = useState({ open: false, type: "followers" });
    const [graphUsers, setGraphUsers] = useState([]);
    const [graphPagination, setGraphPagination] = useState(normalizePagination({}, 1));
    const [graphLoading, setGraphLoading] = useState(false);
    const [graphActionLoadingId, setGraphActionLoadingId] = useState("");

    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionActionLoadingId, setSuggestionActionLoadingId] = useState("");

    const [mutualFollowers, setMutualFollowers] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [pendingActionLoadingId, setPendingActionLoadingId] = useState("");
    const [postActionLoadingId, setPostActionLoadingId] = useState("");
    const [selectedPost, setSelectedPost] = useState(null);
    const [likesModal, setLikesModal] = useState({ open: false, postId: "", postAuthorId: "" });
    const [likedUsers, setLikedUsers] = useState([]);
    const [likesPagination, setLikesPagination] = useState(normalizePagination({}, 1));
    const [likesLoading, setLikesLoading] = useState(false);

    const menuRef = useRef(null);
    const flashTimeoutRef = useRef(null);

    const currentUserId = toId(currentUser);
    const profileId = toId(profile) || String(id || "");
    const isOwnProfile = Boolean(currentUserId) && currentUserId === String(id || "");
    const isBlockedByMe = Boolean(profile?.relationship?.blockedByMe);
    const isBlockedMe = Boolean(profile?.relationship?.blockedMe);
    const hasPrivateProfileAccess = Boolean(
        isOwnProfile ||
        !profile?.isPrivate ||
        profile?.relationship?.isFollowing ||
        profile?.access?.canViewFullProfile
    );
    const canViewProtectedContent = Boolean(
        !isBlockedByMe && !isBlockedMe && hasPrivateProfileAccess
    );
    const canInteractWithProfile = !isBlockedByMe && !isBlockedMe;
    const canMessageProfile = profile?.relationship?.canMessage !== false && canInteractWithProfile;
    const followButtonState = getFollowButtonState(profile?.relationship);
    const showOwnMobileMenu = isOwnProfile && isMobileViewport;
    const visibleTabs = canViewProtectedContent
        ? PROFILE_TABS
        : PROFILE_TABS.filter((tab) => tab.id === "posts");

    const mediaPosts = useMemo(
        () =>
            posts.flatMap((post) =>
                (post?.media || []).map((mediaEntry, index) => ({
                    key: `${toId(post)}:${index}`,
                    url: mediaEntry?.url
                }))
            ),
        [posts]
    );

    const profileCompletion = useMemo(() => {
        const checks = [
            Boolean(profile?.avatar),
            Boolean(profile?.coverImage),
            Boolean(profile?.bio),
            Boolean(profile?.headline),
            Boolean(profile?.location),
            Boolean(profile?.website)
        ];
        return Math.round((checks.filter(Boolean).length / checks.length) * 100);
    }, [profile]);

    const setFlash = useCallback((message) => {
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        setFlashMessage(message);
        flashTimeoutRef.current = setTimeout(() => setFlashMessage(""), 2500);
    }, []);

    const getUserInitial = useCallback((entry) => {
        const label = entry?.name || entry?.username || "U";
        return String(label).trim().charAt(0).toUpperCase();
    }, []);

    const getPostDateLabel = useCallback((value) => {
        if (!value) return "";
        try {
            return new Date(value).toLocaleString();
        } catch {
            return "";
        }
    }, []);

    useEffect(() => {
        return () => {
            if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        if (!canViewProtectedContent && activeTab !== "posts") {
            setActiveTab("posts");
        }
    }, [activeTab, canViewProtectedContent]);

    useEffect(() => {
        const onClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    useEffect(() => {
        if (!selectedPost && !likesModal.open) return undefined;

        const onKeyDown = (event) => {
            if (event.key !== "Escape") return;
            if (likesModal.open) {
                setLikesModal({ open: false, postId: "", postAuthorId: "" });
                return;
            }
            setSelectedPost(null);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [likesModal.open, selectedPost]);

    useEffect(() => {
        const hasOverlay = Boolean(selectedPost) || likesModal.open;
        if (!hasOverlay) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [likesModal.open, selectedPost]);

    const loadPosts = useCallback(
        async (page = 1, append = false) => {
            if (!id) return;
            if (append) setPostsLoadingMore(true);
            try {
                const payload = await getUserPosts(id, { page, limit: POSTS_PAGE_SIZE });
                const nextPosts = Array.isArray(payload?.posts) ? payload.posts : [];
                setPosts((previous) => (append ? [...previous, ...nextPosts] : nextPosts));
                setPostsPagination(normalizePagination(payload?.pagination, page, POSTS_PAGE_SIZE));
            } catch (error) {
                if (String(error?.message || "").toLowerCase().includes("private")) {
                    setPostsAccessMessage(error?.message || "This profile is private.");
                    setPosts([]);
                } else {
                    throw error;
                }
            } finally {
                if (append) setPostsLoadingMore(false);
            }
        },
        [id]
    );

    const handleLoadMorePosts = useCallback(async () => {
        if (postsLoadingMore) return;
        await loadPosts(Number(postsPagination?.page || 1) + 1, true);
    }, [loadPosts, postsLoadingMore, postsPagination?.page]);

    const loadProfile = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        setErrorMessage("");
        try {
            const payload = await getUserById(id);
            setProfile(payload?.user || payload);
            setPostsAccessMessage("");
            await loadPosts(1, false);
        } catch (error) {
            setErrorMessage(error?.message || "Failed to load profile");
        } finally {
            setIsLoading(false);
        }
    }, [id, loadPosts]);

    const loadSuggestions = useCallback(async () => {
        setSuggestionsLoading(true);
        try {
            const payload = await getFollowSuggestions(8);
            const raw = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
            setSuggestions(
                raw.map((entry) => normalizeConnection(entry)).filter((entry) => entry._id !== currentUserId)
            );
        } catch {
            setSuggestions([]);
        } finally {
            setSuggestionsLoading(false);
        }
    }, [currentUserId]);

    const loadMutualFollowers = useCallback(async () => {
        if (!id || !currentUserId || isOwnProfile || !canViewProtectedContent) {
            setMutualFollowers([]);
            return;
        }
        try {
            const payload = await getMutualFollowers(id);
            const raw = Array.isArray(payload?.mutualFollowers) ? payload.mutualFollowers : [];
            setMutualFollowers(raw.map((entry) => normalizeConnection(entry)));
        } catch {
            setMutualFollowers([]);
        }
    }, [canViewProtectedContent, currentUserId, id, isOwnProfile]);

    const loadPendingRequestsList = useCallback(async () => {
        if (!isOwnProfile || !profile?.isPrivate) {
            setPendingRequests([]);
            return;
        }
        setPendingLoading(true);
        try {
            const payload = await getPendingRequests({ page: 1, limit: 8 });
            const raw = Array.isArray(payload?.requests) ? payload.requests : [];
            setPendingRequests(raw.map((entry) => normalizeConnection(entry)));
        } catch {
            setPendingRequests([]);
        } finally {
            setPendingLoading(false);
        }
    }, [isOwnProfile, profile?.isPrivate]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        setSelectedPost(null);
        setLikesModal({ open: false, postId: "", postAuthorId: "" });
        setLikedUsers([]);
        setLikesPagination(normalizePagination({}, 1));
    }, [id]);

    useEffect(() => {
        if (!currentUserId) return;
        loadSuggestions();
    }, [currentUserId, loadSuggestions]);

    useEffect(() => {
        loadMutualFollowers();
    }, [loadMutualFollowers]);

    useEffect(() => {
        loadPendingRequestsList();
    }, [loadPendingRequestsList]);

    const loadPostLikesList = useCallback(
        async (postId, page = 1, append = false) => {
            if (!postId) return;
            setLikesLoading(true);
            try {
                const payload = await getPostLikes(postId, { page, limit: FOLLOW_LIST_PAGE_SIZE });
                const rawLikes = Array.isArray(payload?.likes) ? payload.likes : [];
                const normalizedLikes = rawLikes.map((entry) => ({
                    ...normalizeConnection(entry),
                    likedAt: entry?.likedAt || entry?.createdAt || ""
                }));
                setLikedUsers((previous) =>
                    append ? mergeConnections(previous, normalizedLikes) : normalizedLikes
                );
                setLikesPagination(normalizePagination(payload?.pagination, page));
            } catch (error) {
                if (!append) setLikedUsers([]);
                setFlash(error?.message || "Could not load likes list");
            } finally {
                setLikesLoading(false);
            }
        },
        [setFlash]
    );

    const handleOpenPostModal = useCallback((post) => {
        if (!post) return;
        setSelectedPost(post);
    }, []);

    const handleOpenLikesModal = useCallback(
        async (post, event) => {
            event?.stopPropagation?.();
            const postId = toId(post);
            if (!postId) return;
            setLikesModal({ open: true, postId, postAuthorId: toId(post?.author) });
            setLikedUsers([]);
            setLikesPagination(normalizePagination({}, 1));
            await loadPostLikesList(postId, 1, false);
        },
        [loadPostLikesList]
    );

    const handleCloseLikesModal = useCallback(() => {
        setLikesModal({ open: false, postId: "", postAuthorId: "" });
        setLikedUsers([]);
        setLikesPagination(normalizePagination({}, 1));
    }, []);

    const handleLoadMoreLikes = useCallback(async () => {
        if (!likesModal.open || likesLoading || !likesPagination?.hasMore) return;
        await loadPostLikesList(likesModal.postId, Number(likesPagination?.page || 1) + 1, true);
    }, [likesLoading, likesModal, likesPagination, loadPostLikesList]);

    const handleDeleteProfilePost = useCallback(
        async (post, event) => {
            event?.stopPropagation?.();
            const postId = toId(post);
            const postAuthorId = toId(post?.author);
            const canDelete = Boolean(
                postId &&
                currentUserId &&
                (isOwnProfile || String(currentUserId) === String(postAuthorId))
            );
            if (!canDelete || postActionLoadingId === postId) return;
            if (!window.confirm("Delete this post?")) return;

            setPostActionLoadingId(postId);
            try {
                await deletePost(postId);
                setPosts((previous) => previous.filter((entry) => toId(entry) !== postId));
                setPostsPagination((previous) => ({
                    ...previous,
                    total: Math.max(0, Number(previous?.total || 0) - 1)
                }));
                setProfile((previous) =>
                    previous
                        ? {
                            ...previous,
                            postsCount: Math.max(0, Number(previous?.postsCount || 0) - 1)
                        }
                        : previous
                );
                setSelectedPost((previous) => (toId(previous) === postId ? null : previous));
                setLikesModal((previous) =>
                    previous.postId === postId
                        ? { open: false, postId: "", postAuthorId: "" }
                        : previous
                );
                setFlash("Post deleted");
            } catch (error) {
                setFlash(error?.message || "Could not delete post");
            } finally {
                setPostActionLoadingId("");
            }
        },
        [currentUserId, isOwnProfile, postActionLoadingId, setFlash]
    );

    const handleOpenLikedUserProfile = useCallback(
        (entry) => {
            const targetId = toId(entry);
            if (!targetId) return;
            handleCloseLikesModal();
            setSelectedPost(null);
            navigate(`/profile/${targetId}`);
        },
        [handleCloseLikesModal, navigate]
    );

    const loadGraphUsers = useCallback(
        async (type, page = 1, append = false) => {
            if (!profileId || !canViewProtectedContent) return;
            setGraphLoading(true);
            try {
                const payload =
                    type === "followers"
                        ? await getFollowers(profileId, { page, limit: FOLLOW_LIST_PAGE_SIZE })
                        : await getFollowing(profileId, { page, limit: FOLLOW_LIST_PAGE_SIZE });

                const raw = type === "followers" ? payload?.followers || [] : payload?.following || [];
                const normalized = raw.map((entry) => normalizeConnection(entry));
                setGraphUsers((previous) => (append ? mergeConnections(previous, normalized) : normalized));
                setGraphPagination(normalizePagination(payload?.pagination, page));
            } catch {
                if (!append) setGraphUsers([]);
            } finally {
                setGraphLoading(false);
            }
        },
        [canViewProtectedContent, profileId]
    );

    const updateProfileRelationship = useCallback((patch, followersDelta = 0) => {
        setProfile((previous) =>
            previous
                ? {
                    ...previous,
                    followersCount: Math.max(0, Number(previous?.followersCount || 0) + followersDelta),
                    relationship: { ...(previous?.relationship || {}), ...patch }
                }
                : previous
        );
    }, []);

    const toggleFollowTarget = useCallback(
        async (targetId, relationship = {}) => {
            const nextId = toId(targetId);
            if (!nextId || nextId === currentUserId) return null;

            if (relationship?.isFollowing || relationship?.isPending) {
                await unfollowUser(nextId);
                return {
                    isFollowing: false,
                    isPending: false,
                    followersDelta: relationship?.isFollowing ? -1 : 0
                };
            }

            const result = await followUser(nextId);
            const isPending = Boolean(result?.isPending);
            return { isFollowing: !isPending, isPending, followersDelta: isPending ? 0 : 1 };
        },
        [currentUserId]
    );

    const handleFollowAction = async () => {
        if (!profile || isOwnProfile || followLoading) return;
        if (!canInteractWithProfile) {
            setFlash(isBlockedByMe ? "Unblock this user to follow" : "You cannot follow this user");
            return;
        }
        setFollowLoading(true);
        try {
            const next = await toggleFollowTarget(id, profile?.relationship || {});
            if (!next) return;
            updateProfileRelationship(
                { isFollowing: next.isFollowing, isPending: next.isPending },
                next.followersDelta
            );
            setFlash(
                next.isFollowing
                    ? "Now following user"
                    : next.isPending
                        ? "Follow request sent"
                        : "Unfollowed"
            );
            loadMutualFollowers();
            loadSuggestions();
        } catch (error) {
            setFlash(error?.message || "Could not update follow status");
        } finally {
            setFollowLoading(false);
        }
    };

    const handleToggleGraphConnection = async (entry) => {
        const targetId = toId(entry);
        if (!targetId || graphActionLoadingId === targetId) return;
        setGraphActionLoadingId(targetId);
        try {
            const next = await toggleFollowTarget(targetId, entry);
            if (!next) return;
            setGraphUsers((previous) =>
                previous.map((user) => (toId(user) === targetId ? { ...user, ...next } : user))
            );
        } catch (error) {
            setFlash(error?.message || "Action failed");
        } finally {
            setGraphActionLoadingId("");
        }
    };

    const handleToggleSuggestionFollow = async (entry) => {
        const targetId = toId(entry);
        if (!targetId || suggestionActionLoadingId === targetId) return;
        setSuggestionActionLoadingId(targetId);
        try {
            const next = await toggleFollowTarget(targetId, entry);
            if (!next) return;
            setSuggestions((previous) =>
                previous.map((user) => (toId(user) === targetId ? { ...user, ...next } : user))
            );
        } catch (error) {
            setFlash(error?.message || "Could not update follow state");
        } finally {
            setSuggestionActionLoadingId("");
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 1500);
            setFlash("Profile link copied");
        } catch {
            setFlash("Could not copy link");
        }
        setIsMenuOpen(false);
    };

    const handleSaveProfile = async (updates) => {
        setEditSaving(true);
        try {
            const payload = await updateProfileRequest(updates);
            const updated = payload?.user || payload;
            setProfile((previous) => ({ ...(previous || {}), ...(updated || {}) }));
            await refreshUser?.();
            setIsEditModalOpen(false);
            setFlash("Profile updated");
        } catch (error) {
            setFlash(error?.message || "Profile update failed");
        } finally {
            setEditSaving(false);
        }
    };

    const handleToggleBlock = async () => {
        if (!id || isOwnProfile || blockActionLoading) return;
        const wasBlocked = isBlockedByMe;
        setBlockActionLoading(true);
        try {
            if (wasBlocked) {
                await unblockUserRequest(id);
            } else {
                await blockUserRequest(id);
            }
            setIsMenuOpen(false);
            await loadProfile();
            setFlash(wasBlocked ? "User unblocked" : "User blocked");
        } catch (error) {
            setFlash(error?.message || "Could not update block status");
        } finally {
            setBlockActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
        );
    }

    if (errorMessage || !profile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
                <p className="text-sm text-slate-300">{errorMessage || "Profile not found"}</p>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-slate-950 ${showOwnMobileMenu ? "pb-[5.25rem]" : "pb-10"}`}>
            <div className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-3 py-2.5 sm:px-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back
                    </button>
                    <p className="text-xs font-medium text-slate-400">@{profile?.username || "profile"}</p>
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen((previous) => !previous)}
                            className="rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-slate-300 hover:bg-slate-800"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                            {isMenuOpen && (
                                <MotionDiv
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 6 }}
                                    className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-800 bg-slate-900 shadow-xl"
                                >
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"
                                    >
                                        {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                        Copy profile link
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            navigate("/main/support");
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"
                                    >
                                        <LifeBuoy className="h-4 w-4" />
                                        Help & Support
                                    </button>
                                    {isOwnProfile && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    navigate("/main/activity");
                                                }}
                                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"
                                            >
                                                <Activity className="h-4 w-4" />
                                                Activity
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    navigate("/main/dashboard");
                                                }}
                                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"
                                            >
                                                <BarChart3 className="h-4 w-4" />
                                                Dashboard
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    navigate("/main/settings");
                                                }}
                                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"
                                            >
                                                <Settings className="h-4 w-4" />
                                                Settings
                                            </button>
                                        </>
                                    )}
                                    {!isOwnProfile && (
                                        <button
                                            type="button"
                                            onClick={handleToggleBlock}
                                            disabled={blockActionLoading}
                                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-slate-800 disabled:opacity-60 ${isBlockedByMe ? "text-emerald-300" : "text-rose-300"
                                                }`}
                                        >
                                            {blockActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                                            {isBlockedByMe ? "Unblock user" : "Block user"}
                                        </button>
                                    )}
                                </MotionDiv>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="mx-auto w-full max-w-5xl px-3 pt-3 sm:px-4 sm:pt-4">
                <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                    {profile?.coverImage ? (
                        <img src={profile.coverImage} alt="Cover" className="h-40 w-full object-cover sm:h-56" />
                    ) : (
                        <div className="h-40 w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_rgba(15,23,42,1)_60%)] sm:h-56" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 sm:bottom-4 sm:left-4 sm:right-4">
                        <div className="flex items-end gap-3">
                            <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-slate-950 bg-slate-800 sm:h-28 sm:w-28">
                                {profile?.avatar ? (
                                    <img src={profile.avatar} alt={toDisplayName(profile)} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-200">
                                        {toDisplayName(profile).charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="pb-1">
                                <div className="flex items-center gap-1.5">
                                    <h1 className="text-lg font-bold text-slate-100 sm:text-2xl">{toDisplayName(profile)}</h1>
                                    {profile?.isVerified && (
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
                                            <Check className="h-3 w-3" />
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-300 sm:text-sm">@{profile?.username}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isOwnProfile ? (
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="rounded-lg border border-slate-700 bg-slate-900/85 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 sm:text-sm"
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <>
                                    {isBlockedByMe ? (
                                        <span className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
                                            User blocked
                                        </span>
                                    ) : isBlockedMe ? (
                                        <span className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-300">
                                            You are blocked
                                        </span>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleFollowAction}
                                                disabled={followLoading}
                                                className={`inline-flex min-w-[6.8rem] items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold ${followButtonState.tone === "following"
                                                        ? "border-slate-700 bg-slate-900/85 text-slate-200"
                                                        : followButtonState.tone === "pending"
                                                            ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                                                            : "border-sky-500/50 bg-sky-500/20 text-sky-200"
                                                    }`}
                                            >
                                                {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : followButtonState.label}
                                            </button>
                                            {canMessageProfile && (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/chat/${id}`, { state: { targetUser: profile } })}
                                                    className="rounded-lg border border-slate-700 bg-slate-900/85 p-2 text-slate-200 hover:bg-slate-800"
                                                >
                                                    <MessageSquare className="h-4 w-4" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
                    <>
                        {canViewProtectedContent && profile?.headline && (
                            <p className="text-sm font-medium text-slate-200">{profile.headline}</p>
                        )}
                        <p className="mt-1 text-sm text-slate-300">
                            {profile?.bio || (isBlockedByMe || isBlockedMe ? "Profile details are hidden." : "No bio added yet.")}
                        </p>
                    </>
                    {canViewProtectedContent ? (
                        <>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                                {profile?.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>}
                                {profile?.email && <span className="inline-flex items-center gap-1.5">{profile.email}</span>}
                                {profile?.website && <a href={profile.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sky-300 hover:text-sky-200"><ExternalLink className="h-3.5 w-3.5" />{profile.website.replace(/^https?:\/\//, "")}</a>}
                                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Joined {getJoinedLabel(profile?.createdAt)}</span>
                                {profile?.isPrivate && <span className="inline-flex items-center gap-1.5 text-amber-300"><Lock className="h-3.5 w-3.5" />Private account</span>}
                                {!isOwnProfile && !canMessageProfile && !isBlockedByMe && !isBlockedMe && (
                                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        Messages restricted
                                    </span>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-center">
                            <Lock className="mx-auto h-5 w-5 text-slate-500" />
                            <p className="mt-2 text-sm font-semibold text-slate-200">
                                {isBlockedByMe
                                    ? "You blocked this user"
                                    : isBlockedMe
                                        ? "You cannot view this profile"
                                        : "This account is private"}
                            </p>
                            {!isBlockedByMe && !isBlockedMe && (
                                <p className="mt-1 text-xs text-slate-400">
                                    Follow this account to view full profile, posts, and connections.
                                </p>
                            )}
                        </div>
                    )}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            disabled={!canViewProtectedContent}
                            onClick={() => {
                                if (!canViewProtectedContent) {
                                    setFlash("Follow this account to view followers.");
                                    return;
                                }
                                setGraphModal({ open: true, type: "followers" });
                                loadGraphUsers("followers", 1, false);
                            }}
                            className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <p className="text-xs text-slate-400">Followers</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-100">{Number(profile?.followersCount || 0).toLocaleString()}</p>
                        </button>
                        <button
                            type="button"
                            disabled={!canViewProtectedContent}
                            onClick={() => {
                                if (!canViewProtectedContent) {
                                    setFlash("Follow this account to view following.");
                                    return;
                                }
                                setGraphModal({ open: true, type: "following" });
                                loadGraphUsers("following", 1, false);
                            }}
                            className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <p className="text-xs text-slate-400">Following</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-100">{Number(profile?.followingCount || 0).toLocaleString()}</p>
                        </button>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-2">
                            <p className="text-xs text-slate-400">Posts</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-100">{Number(profile?.postsCount || posts.length).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/55">
                    <div className="flex gap-2 overflow-x-auto border-b border-slate-800 px-2 py-1.5">
                        {visibleTabs.map((tab) => (
                            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${activeTab === tab.id ? "bg-sky-500/15 text-sky-300" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="p-3 sm:p-4">
                        {activeTab === "posts" && (
                            <ProfilePostsTab
                                canViewProtectedContent={canViewProtectedContent}
                                isBlockedByMe={isBlockedByMe}
                                isBlockedMe={isBlockedMe}
                                posts={posts}
                                postsAccessMessage={postsAccessMessage}
                                onOpenPost={handleOpenPostModal}
                                onDeletePost={handleDeleteProfilePost}
                                onOpenLikes={handleOpenLikesModal}
                                isOwnProfile={isOwnProfile}
                                currentUserId={currentUserId}
                                postActionLoadingId={postActionLoadingId}
                                getPostDateLabel={getPostDateLabel}
                                postsPagination={postsPagination}
                                postsLoadingMore={postsLoadingMore}
                                onLoadMorePosts={handleLoadMorePosts}
                            />
                        )}
                        {activeTab === "media" && <div>{!canViewProtectedContent ? <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center"><Lock className="mx-auto h-6 w-6 text-slate-500" /><p className="mt-2 text-sm font-medium text-slate-300">{isBlockedByMe ? "You blocked this user" : isBlockedMe ? "You cannot view this profile" : "Media is hidden"}</p></div> : mediaPosts.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No media posts yet.</p> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{mediaPosts.map((media) => <div key={media.key} className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900"><img src={media.url} alt="Media" className="h-36 w-full object-cover" /></div>)}</div>}</div>}
                        {activeTab === "about" && <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Profile Quality</p><p className="mt-1 text-2xl font-bold text-slate-100">{profileCompletion}%</p></div><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Account Type</p><p className="mt-1 text-sm font-semibold text-slate-200">{profile?.isPrivate ? "Private account" : "Public account"}</p></div><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Highlights</p><div className="mt-2 grid gap-2 text-sm text-slate-300 sm:grid-cols-2"><p className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-sky-400" />{profile?.isVerified ? "Verified profile" : "Standard profile"}</p><p className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-sky-400" />{Number(profile?.followersCount || 0).toLocaleString()} followers</p><p className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-sky-400" />{Number(profile?.followingCount || 0).toLocaleString()} following</p><p className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-sky-400" />Joined {getJoinedLabel(profile?.createdAt)}</p></div></div></div>}
                        {activeTab === "connections" && <div className="space-y-3"><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Suggested For You</p><button type="button" onClick={loadSuggestions} className="text-xs font-medium text-sky-300 hover:text-sky-200">Refresh</button></div>{suggestionsLoading ? <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div> : suggestions.length === 0 ? <p className="py-5 text-center text-xs text-slate-500">No suggestions right now.</p> : <div className="mt-2 space-y-2">{suggestions.slice(0, 6).map((entry) => { const targetId = toId(entry); const state = getFollowButtonState(entry); return <div key={targetId} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2"><div className="flex min-w-0 items-center gap-2"><div className="h-8 w-8 overflow-hidden rounded-full bg-slate-800">{entry?.avatar ? <img src={entry.avatar} alt={entry?.name || "User"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-500"><UserRound className="h-3.5 w-3.5" /></div>}</div><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">{entry?.name || entry?.username}</p><p className="truncate text-[11px] text-slate-500">@{entry?.username || "user"}</p></div></div><button type="button" disabled={suggestionActionLoadingId === targetId} onClick={() => handleToggleSuggestionFollow(entry)} className={`inline-flex min-w-[5.2rem] items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${state.tone === "following" ? "border-slate-700 bg-slate-800 text-slate-200" : state.tone === "pending" ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-sky-500/40 bg-sky-500/15 text-sky-300"}`}>{suggestionActionLoadingId === targetId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state.label}</button></div>; })}</div>}</div>{isOwnProfile && profile?.isPrivate && <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pending Follow Requests</p>{pendingLoading ? <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div> : pendingRequests.length === 0 ? <p className="py-5 text-center text-xs text-slate-500">No pending requests.</p> : <div className="mt-2 space-y-2">{pendingRequests.map((request) => { const requestId = toId(request?.requestId || request?._id); const loading = pendingActionLoadingId === requestId; return <div key={requestId} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2"><div className="flex min-w-0 items-center gap-2"><div className="h-8 w-8 overflow-hidden rounded-full bg-slate-800">{request?.avatar ? <img src={request.avatar} alt={request?.name || "User"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-500"><UserRound className="h-3.5 w-3.5" /></div>}</div><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">{request?.name || request?.username}</p><p className="truncate text-[11px] text-slate-500">@{request?.username || "user"}</p></div></div><div className="flex items-center gap-1.5"><button type="button" disabled={loading} onClick={async () => { setPendingActionLoadingId(requestId); try { await rejectFollowRequest(requestId); setPendingRequests((previous) => previous.filter((entry) => toId(entry?.requestId || entry?._id) !== requestId)); } finally { setPendingActionLoadingId(""); } }} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-800">Reject</button><button type="button" disabled={loading} onClick={async () => { setPendingActionLoadingId(requestId); try { await approveFollowRequest(requestId); setPendingRequests((previous) => previous.filter((entry) => toId(entry?.requestId || entry?._id) !== requestId)); setProfile((previous) => previous ? { ...previous, followersCount: Number(previous.followersCount || 0) + 1 } : previous); } finally { setPendingActionLoadingId(""); } }} className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/25">{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus2 className="h-3 w-3" />}Approve</button></div></div>; })}</div>}</div>}</div>}
                    </div>
                </div>
            </div>

            <PostDetailModal
                open={Boolean(selectedPost)}
                post={selectedPost}
                onClose={() => setSelectedPost(null)}
                isOwnProfile={isOwnProfile}
                currentUserId={currentUserId}
                postActionLoadingId={postActionLoadingId}
                onDeletePost={handleDeleteProfilePost}
                onOpenLikes={handleOpenLikesModal}
                getPostDateLabel={getPostDateLabel}
            />

            <PostLikesModal
                open={likesModal.open}
                postAuthorId={likesModal.postAuthorId}
                likedUsers={likedUsers}
                likesLoading={likesLoading}
                likesPagination={likesPagination}
                onClose={handleCloseLikesModal}
                onLoadMore={handleLoadMoreLikes}
                onUserClick={handleOpenLikedUserProfile}
                getUserInitial={getUserInitial}
                getPostDateLabel={getPostDateLabel}
            />

            <AnimatePresence>
                {flashMessage && (
                    <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={`fixed z-50 rounded-lg border border-sky-500/35 bg-slate-900/95 px-3 py-2 text-xs font-semibold text-sky-200 shadow-xl ${showOwnMobileMenu ? "bottom-[5.7rem] left-1/2 -translate-x-1/2" : "bottom-5 left-1/2 -translate-x-1/2"}`}>
                        {flashMessage}
                    </MotionDiv>
                )}
            </AnimatePresence>

            <RelationshipModal
                open={graphModal.open}
                title={graphModal.type === "followers" ? "Followers" : "Following"}
                users={graphUsers}
                loading={graphLoading}
                pagination={graphPagination}
                actionLoadingId={graphActionLoadingId}
                currentUserId={currentUserId}
                onClose={() => setGraphModal((previous) => ({ ...previous, open: false }))}
                onToggleFollow={handleToggleGraphConnection}
                onLoadMore={() => loadGraphUsers(graphModal.type, Number(graphPagination?.page || 1) + 1, true)}
                onUserClick={(entry) => {
                    const targetId = toId(entry);
                    if (!targetId) return;
                    setGraphModal((previous) => ({ ...previous, open: false }));
                    navigate(`/profile/${targetId}`);
                }}
            />

            <ProfileEditModal
                open={isEditModalOpen}
                profile={profile}
                saving={editSaving}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveProfile}
            />

            {showOwnMobileMenu && <MobileBottomNav activeTab="me" profileId={profileId} />}
        </div>
    );
};

export default UserProfile;
