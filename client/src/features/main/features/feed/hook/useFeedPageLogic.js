import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../../../../../context/AuthContext";
import {
    addComment,
    deleteComment,
    deletePost,
    getCommentReplies,
    getBookmarkedPosts,
    getExploreFeed,
    getPostComments,
    getUserFeed,
    likeComment,
    likePost,
    repostPost,
    savePost,
    sharePost,
    unlikeComment,
    unlikePost,
    unsavePost
} from "../../../../../service/post.service";
import {
    followUser,
    unfollowUser
} from "../../../../../service/follow.service";
import {
    getStoryFeed,
    markStoryViewed,
    reactToStory,
    deleteStory as deleteStoryRequest,
    getStoryById as getStoryDetails
} from "../../../../../service/story.service";
import {
    DEFAULT_PAGINATION,
    MOBILE_BREAKPOINT,
    PAGE_SIZE
} from "../constants/feed.constants";
import {
    extractTopHashtags,
    getStoryStats,
    mergeUniquePosts,
    normalizePagination,
    postMatchesQuery,
    scorePost
} from "../utils/feed.helpers";

const FEED_FETCHERS = {
    following: getUserFeed,
    explore: getExploreFeed,
    bookmarks: getBookmarkedPosts
};

const REPLY_PAGE_SIZE = 6;

const normalizeComment = (comment) => {
    if (!comment?._id) return null;

    const replies = Array.isArray(comment?.replies)
        ? comment.replies.filter((reply) => reply?._id).map((reply) => ({
              ...reply,
              likesCount: Number(reply?.likesCount || 0),
              userEngagement: {
                  ...(reply?.userEngagement || {}),
                  hasLiked: Boolean(reply?.userEngagement?.hasLiked)
              }
          }))
        : [];

    const repliesCount = Math.max(
        Number(comment?.repliesCount || 0),
        replies.length
    );

    return {
        ...comment,
        likesCount: Number(comment?.likesCount || 0),
        repliesCount,
        replies,
        hasMoreReplies:
            typeof comment?.hasMoreReplies === "boolean"
                ? comment.hasMoreReplies
                : repliesCount > replies.length,
        userEngagement: {
            ...(comment?.userEngagement || {}),
            hasLiked: Boolean(comment?.userEngagement?.hasLiked)
        }
    };
};

const normalizeComments = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((comment) => normalizeComment(comment))
        .filter(Boolean);

const mergeUniqueComments = (items = []) => {
    const byId = new Map();
    items.forEach((comment) => {
        if (!comment?._id) return;
        byId.set(String(comment._id), normalizeComment(comment));
    });
    return Array.from(byId.values()).filter(Boolean);
};

const updateCommentThread = (comments = [], commentId, updater) => {
    const targetKey = String(commentId || "");
    const list = Array.isArray(comments) ? comments : [];
    let hasChange = false;

    const nextComments = list.map((comment) => {
        if (String(comment?._id || "") === targetKey) {
            hasChange = true;
            return updater(comment);
        }

        const replies = Array.isArray(comment?.replies) ? comment.replies : [];
        if (!replies.length) return comment;

        let hasReplyChange = false;
        const nextReplies = replies.map((reply) => {
            if (String(reply?._id || "") !== targetKey) return reply;
            hasReplyChange = true;
            hasChange = true;
            return updater(reply);
        });

        if (!hasReplyChange) return comment;
        return {
            ...comment,
            replies: nextReplies
        };
    });

    return hasChange ? nextComments : list;
};

const getLoadedCommentTreeCount = (comment) => {
    if (!comment?._id) return 0;

    const replies = Array.isArray(comment?.replies) ? comment.replies : [];
    return 1 + replies.reduce((total, reply) => total + getLoadedCommentTreeCount(reply), 0);
};

const removeCommentFromThread = (comments = [], commentId) => {
    const targetKey = String(commentId || "");
    const list = Array.isArray(comments) ? comments : [];
    let removedCount = 0;

    const nextComments = list
        .map((comment) => {
            if (String(comment?._id || "") === targetKey) {
                removedCount += getLoadedCommentTreeCount(comment);
                return null;
            }

            const replies = Array.isArray(comment?.replies) ? comment.replies : [];
            if (!replies.length) return comment;

            const nestedResult = removeCommentFromThread(replies, commentId);
            if (!nestedResult.removedCount) return comment;

            removedCount += nestedResult.removedCount;
            const directRepliesRemoved = replies.length - nestedResult.comments.length;

            return {
                ...comment,
                replies: nestedResult.comments,
                repliesCount: Math.max(
                    0,
                    Number(comment?.repliesCount || replies.length) - directRepliesRemoved
                ),
                hasMoreReplies: Boolean(comment?.hasMoreReplies)
            };
        })
        .filter(Boolean);

    return {
        comments: nextComments,
        removedCount
    };
};

const useFeedPageLogic = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const profileId = user?._id || user?.id;

    const [isMobileViewport, setIsMobileViewport] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
    );
    const [activeTab, setActiveTab] = useState("following");
    const [sortMode, setSortMode] = useState("latest");
    const [searchTerm, setSearchTerm] = useState("");

    const [posts, setPosts] = useState([]);
    const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
    const [feedLoading, setFeedLoading] = useState(true);
    const [feedLoadingMore, setFeedLoadingMore] = useState(false);

    const [storiesLoading, setStoriesLoading] = useState(false);
    const [storyGroups, setStoryGroups] = useState([]);
    const [storyViewer, setStoryViewer] = useState(null);
    const [storyAudienceLoading, setStoryAudienceLoading] = useState(false);
    const [storyDeletingId, setStoryDeletingId] = useState("");

    const [commentsByPost, setCommentsByPost] = useState({});
    const [commentsLoadingByPost, setCommentsLoadingByPost] = useState({});
    const [commentsSubmittingByPost, setCommentsSubmittingByPost] = useState({});
    const [commentDrafts, setCommentDrafts] = useState({});
    const [replyDraftsByComment, setReplyDraftsByComment] = useState({});
    const [replyComposerByComment, setReplyComposerByComment] = useState({});
    const [replySubmittingByComment, setReplySubmittingByComment] = useState({});
    const [replyLoadingByComment, setReplyLoadingByComment] = useState({});
    const [replyPaginationByComment, setReplyPaginationByComment] = useState({});
    const [expandedCommentsPostId, setExpandedCommentsPostId] = useState(null);

    const [actionState, setActionState] = useState({});
    const [toast, setToast] = useState(null);

    const [repostComposer, setRepostComposer] = useState({
        postId: null,
        quoteText: "",
        visibility: "public",
        submitting: false
    });

    const toastTimeoutRef = useRef(null);
    const feedRequestRef = useRef(0);
    const storyRequestRef = useRef(0);
    const viewedStoryIdsRef = useRef(new Set());
    const storyGroupsRef = useRef([]);

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        storyGroupsRef.current = storyGroups;
    }, [storyGroups]);

    const showToast = useCallback((message, kind = "success") => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        setToast({ message, kind });
        toastTimeoutRef.current = setTimeout(() => setToast(null), 2400);
    }, []);

    const patchPost = useCallback((postId, updater) => {
        const key = String(postId);
        setPosts((previous) =>
            previous.map((post) => {
                if (String(post?._id || "") === key) {
                    return updater(post);
                }

                if (String(post?.originalPost?._id || "") === key) {
                    return {
                        ...post,
                        originalPost: updater(post.originalPost)
                    };
                }

                return post;
            })
        );
    }, []);

    const patchAuthorEngagement = useCallback((authorId, updater) => {
        const key = String(authorId || "");
        if (!key) return;

        setPosts((previous) =>
            previous.map((post) => {
                const postAuthorId = String(
                    post?.author?._id || post?.author?.id || post?.author || ""
                );

                if (postAuthorId !== key) return post;

                return {
                    ...post,
                    userEngagement: updater(post?.userEngagement || {})
                };
            })
        );
    }, []);

    const loadStories = useCallback(
        async ({ silent = false } = {}) => {
            const requestId = ++storyRequestRef.current;
            if (!silent) setStoriesLoading(true);

            try {
                const payload = await getStoryFeed();
                if (requestId !== storyRequestRef.current) return;

                const groups = Array.isArray(payload?.stories) ? payload.stories : [];
                setStoryGroups(groups);
                const seenStoryIds = new Set();
                groups.forEach((group) => {
                    (group?.stories || []).forEach((story) => {
                        if (!story?._id || !story?.hasViewed) return;
                        seenStoryIds.add(String(story._id));
                    });
                });
                viewedStoryIdsRef.current = seenStoryIds;
            } catch (error) {
                if (requestId !== storyRequestRef.current) return;
                showToast(error?.message || "Failed to load stories", "error");
            } finally {
                if (requestId === storyRequestRef.current && !silent) {
                    setStoriesLoading(false);
                }
            }
        },
        [showToast]
    );

    const loadFeed = useCallback(
        async ({ page = 1, append = false } = {}) => {
            const requestId = ++feedRequestRef.current;
            if (append) {
                setFeedLoadingMore(true);
            } else {
                setFeedLoading(true);
            }

            try {
                const fetcher = FEED_FETCHERS[activeTab] || getUserFeed;
                const payload = await fetcher({ page, limit: PAGE_SIZE });
                if (requestId !== feedRequestRef.current) return;

                const nextPosts = Array.isArray(payload?.posts) ? payload.posts : [];
                const nextPagination = normalizePagination(payload?.pagination, page, nextPosts.length);

                setPosts((previous) =>
                    append ? mergeUniquePosts([...previous, ...nextPosts]) : nextPosts
                );
                setPagination(nextPagination);
            } catch (error) {
                if (requestId !== feedRequestRef.current) return;
                if (!append) {
                    setPosts([]);
                    setPagination(DEFAULT_PAGINATION);
                }
                showToast(error?.message || "Failed to load feed", "error");
            } finally {
                if (requestId === feedRequestRef.current) {
                    setFeedLoading(false);
                    setFeedLoadingMore(false);
                }
            }
        },
        [activeTab, showToast]
    );

    useEffect(() => {
        setExpandedCommentsPostId(null);
        setCommentDrafts({});
        setCommentsByPost({});
        setCommentsLoadingByPost({});
        setReplyDraftsByComment({});
        setReplyComposerByComment({});
        setReplySubmittingByComment({});
        setReplyLoadingByComment({});
        setReplyPaginationByComment({});
        loadFeed({ page: 1, append: false });
    }, [activeTab, loadFeed]);

    useEffect(() => {
        loadStories();
    }, [loadStories]);

    const filteredPosts = useMemo(() => {
        const filtered = posts.filter((post) => postMatchesQuery(post, searchTerm));
        if (sortMode === "popular") {
            return [...filtered].sort((a, b) => scorePost(b) - scorePost(a));
        }
        return [...filtered].sort(
            (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
        );
    }, [posts, searchTerm, sortMode]);

    const topHashtags = useMemo(() => extractTopHashtags(filteredPosts), [filteredPosts]);
    const storyStats = useMemo(() => getStoryStats(storyGroups), [storyGroups]);

    const handleOpenStoryGroup = useCallback(
        (groupIndex) => {
            const group = storyGroups?.[groupIndex];
            if (!group?.stories?.length) return;
            const unseenIndex = group.stories.findIndex((story) => !story?.hasViewed);
            setStoryViewer({
                groupIndex,
                storyIndex: unseenIndex >= 0 ? unseenIndex : 0
            });
        },
        [storyGroups]
    );

    const handleNavigateStory = useCallback(
        (direction) => {
            setStoryViewer((previous) => {
                if (!previous) return previous;

                const currentGroup = storyGroups?.[previous.groupIndex];
                if (!currentGroup?.stories?.length) return null;

                if (direction > 0) {
                    if (previous.storyIndex < currentGroup.stories.length - 1) {
                        return {
                            groupIndex: previous.groupIndex,
                            storyIndex: previous.storyIndex + 1
                        };
                    }

                    const nextGroupIndex = previous.groupIndex + 1;
                    if (nextGroupIndex >= storyGroups.length) return null;

                    const nextGroup = storyGroups[nextGroupIndex];
                    const nextUnseen = nextGroup?.stories?.findIndex((story) => !story?.hasViewed);
                    return {
                        groupIndex: nextGroupIndex,
                        storyIndex: nextUnseen >= 0 ? nextUnseen : 0
                    };
                }

                if (previous.storyIndex > 0) {
                    return {
                        groupIndex: previous.groupIndex,
                        storyIndex: previous.storyIndex - 1
                    };
                }

                const previousGroupIndex = previous.groupIndex - 1;
                if (previousGroupIndex < 0) return previous;
                const prevGroup = storyGroups[previousGroupIndex];
                return {
                    groupIndex: previousGroupIndex,
                    storyIndex: Math.max(0, (prevGroup?.stories?.length || 1) - 1)
                };
            });
        },
        [storyGroups]
    );

    const markStorySeenLocally = useCallback((groupIndex, storyIndex) => {
        setStoryGroups((previous) =>
            previous.map((group, groupPosition) => {
                if (groupPosition !== groupIndex) return group;
                const stories = (group?.stories || []).map((story, position) =>
                    position === storyIndex ? { ...story, hasViewed: true } : story
                );
                const unseenCount = stories.reduce(
                    (accumulator, story) => accumulator + (story?.hasViewed ? 0 : 1),
                    0
                );
                return {
                    ...group,
                    stories,
                    unseenCount,
                    hasViewedAll: unseenCount === 0
                };
            })
        );
    }, []);

    const handleMarkStoryViewed = useCallback(
        async (groupIndex, storyIndex) => {
            const story = storyGroups?.[groupIndex]?.stories?.[storyIndex];
            if (!story?._id) return;

            const storyId = String(story._id);
            if (viewedStoryIdsRef.current.has(storyId)) return;

            markStorySeenLocally(groupIndex, storyIndex);

            viewedStoryIdsRef.current.add(storyId);

            try {
                const updated = await markStoryViewed(storyId);
                if (!updated?._id) return;

                setStoryGroups((previous) =>
                    previous.map((group) => ({
                        ...group,
                        stories: (group?.stories || []).map((entry) =>
                            String(entry?._id || "") === storyId
                                ? { ...entry, ...updated, hasViewed: true }
                                : entry
                        )
                    }))
                );
            } catch {
                // Keep optimistic local state for smooth viewer flow.
            }
        },
        [markStorySeenLocally, storyGroups]
    );

    const handleReactToStory = useCallback(
        async (storyId, emoji) => {
            if (!storyId || !emoji) return;
            try {
                const updated = await reactToStory(storyId, emoji);
                if (updated?._id) {
                    setStoryGroups((previous) =>
                        previous.map((group) => ({
                            ...group,
                            stories: (group?.stories || []).map((entry) =>
                                String(entry?._id || "") === String(updated?._id)
                                    ? { ...entry, ...updated }
                                    : entry
                            )
                        }))
                    );
                }
                showToast(updated?.myReaction ? "Reaction sent" : "Reaction removed");
            } catch (error) {
                showToast(error?.message || "Could not react to story", "error");
            }
        },
        [showToast]
    );

    const handleInspectStoryAudience = useCallback(
        async (storyId) => {
            if (!storyId) return;

            setStoryAudienceLoading(true);
            try {
                const storyIdKey = String(storyId);
                const updated = await getStoryDetails(storyIdKey);

                if (!updated?._id) return;

                const updatedStoryIdKey = String(updated._id);
                setStoryGroups((previous) =>
                    previous.map((group) => {
                        const stories = (group?.stories || []).map((entry) => {
                            if (String(entry?._id || "") !== updatedStoryIdKey) return entry;
                            return {
                                ...entry,
                                ...updated,
                                hasViewed: Boolean(entry?.hasViewed || updated?.hasViewed)
                            };
                        });

                        const unseenCount = stories.reduce(
                            (accumulator, story) => accumulator + (story?.hasViewed ? 0 : 1),
                            0
                        );

                        return {
                            ...group,
                            stories,
                            unseenCount,
                            hasViewedAll: unseenCount === 0
                        };
                    })
                );
            } catch (error) {
                showToast(error?.message || "Could not load story viewers", "error");
            } finally {
                setStoryAudienceLoading(false);
            }
        },
        [showToast]
    );

    const handleDeleteStory = useCallback(
        async (storyId) => {
            if (!storyId || storyDeletingId === String(storyId)) return;

            const storyIdKey = String(storyId);
            setStoryDeletingId(storyIdKey);
            try {
                await deleteStoryRequest(storyIdKey);

                const nextGroups = storyGroupsRef.current
                    .map((group) => ({
                        ...group,
                        stories: (group?.stories || []).filter(
                            (story) => String(story?._id || "") !== storyIdKey
                        )
                    }))
                    .filter((group) => (group?.stories || []).length > 0)
                    .map((group) => {
                        const stories = group.stories || [];
                        const unseenCount = stories.reduce(
                            (accumulator, story) => accumulator + (story?.hasViewed ? 0 : 1),
                            0
                        );
                        return {
                            ...group,
                            unseenCount,
                            hasViewedAll: unseenCount === 0,
                            lastStoryAt:
                                stories[stories.length - 1]?.createdAt || group?.lastStoryAt
                        };
                    });

                setStoryGroups(nextGroups);
                storyGroupsRef.current = nextGroups;
                viewedStoryIdsRef.current.delete(storyIdKey);

                setStoryViewer((previous) => {
                    if (!previous) return previous;
                    if (!nextGroups.length) return null;

                    const groupIndex = Math.min(previous.groupIndex, nextGroups.length - 1);
                    const maxStoryIndex = (nextGroups[groupIndex]?.stories || []).length - 1;
                    if (maxStoryIndex < 0) return null;

                    return {
                        groupIndex,
                        storyIndex: Math.min(previous.storyIndex, maxStoryIndex)
                    };
                });

                showToast("Story deleted");
            } catch (error) {
                showToast(error?.message || "Failed to delete story", "error");
            } finally {
                setStoryDeletingId("");
            }
        },
        [showToast, storyDeletingId]
    );

    const setActionLoading = useCallback((key, value) => {
        setActionState((previous) => ({ ...previous, [key]: value }));
    }, []);

    const handleToggleLike = useCallback(
        async (post) => {
            const postId = post?._id;
            if (!postId) return;
            const key = `like:${postId}`;
            if (actionState[key]) return;

            setActionLoading(key, true);
            const currentlyLiked = Boolean(post?.userEngagement?.hasLiked);

            try {
                const result = currentlyLiked
                    ? await unlikePost(postId)
                    : await likePost(postId);

                patchPost(postId, (entry) => {
                    const entryLiked = Boolean(entry?.userEngagement?.hasLiked);
                    const nextLiked =
                        typeof result?.liked === "boolean"
                            ? result.liked
                            : !entryLiked;
                    const likeDelta = nextLiked === entryLiked ? 0 : nextLiked ? 1 : -1;

                    return {
                        ...entry,
                        likesCount: Math.max(
                            0,
                            Number(entry?.likesCount || 0) + likeDelta
                        ),
                        userEngagement: {
                            ...(entry?.userEngagement || {}),
                            hasLiked: nextLiked
                        }
                    };
                });
            } catch (error) {
                showToast(error?.message || "Could not update like", "error");
            } finally {
                setActionLoading(key, false);
            }
        },
        [actionState, patchPost, setActionLoading, showToast]
    );

    const handleToggleSave = useCallback(
        async (post) => {
            const postId = post?._id;
            if (!postId) return;
            const key = `save:${postId}`;
            if (actionState[key]) return;

            setActionLoading(key, true);
            const currentlySaved = Boolean(post?.userEngagement?.hasSaved);

            try {
                if (currentlySaved) {
                    await unsavePost(postId);
                } else {
                    await savePost(postId);
                }

                if (activeTab === "bookmarks" && currentlySaved) {
                    setPosts((previous) =>
                        previous.filter((entry) => String(entry?._id || "") !== String(postId))
                    );
                    setPagination((previous) => ({
                        ...previous,
                        total: Math.max(0, Number(previous?.total || 0) - 1)
                    }));
                } else {
                    patchPost(postId, (entry) => ({
                        ...entry,
                        userEngagement: {
                            ...(entry?.userEngagement || {}),
                            hasSaved: !currentlySaved
                        }
                    }));
                }

                showToast(currentlySaved ? "Removed from saved" : "Saved post");
            } catch (error) {
                showToast(error?.message || "Could not update save state", "error");
            } finally {
                setActionLoading(key, false);
            }
        },
        [actionState, activeTab, patchPost, setActionLoading, showToast]
    );

    const handleSharePost = useCallback(
        async (post) => {
            const postId = post?._id;
            if (!postId) return;
            const key = `share:${postId}`;
            if (actionState[key]) return;

            setActionLoading(key, true);
            try {
                await sharePost(postId, "copy_link");
                patchPost(postId, (entry) => ({
                    ...entry,
                    sharesCount: Number(entry?.sharesCount || 0) + 1
                }));

                const shareUrl =
                    typeof window !== "undefined"
                        ? `${window.location.origin}/post/${postId}`
                        : `/post/${postId}`;

                if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(shareUrl);
                }

                showToast("Post link copied");
            } catch (error) {
                showToast(error?.message || "Could not share post", "error");
            } finally {
                setActionLoading(key, false);
            }
        },
        [actionState, patchPost, setActionLoading, showToast]
    );

    const handleToggleFollowAuthor = useCallback(
        async (post) => {
            const authorId = String(post?.author?._id || post?.author?.id || "");
            if (!authorId || authorId === String(profileId || "")) return;

            const key = `follow:${authorId}`;
            if (actionState[key]) return;

            const isFollowing = Boolean(post?.userEngagement?.isFollowingAuthor);
            const isPending = Boolean(post?.userEngagement?.isFollowRequestPending);

            setActionLoading(key, true);
            try {
                if (isFollowing || isPending) {
                    await unfollowUser(authorId);
                    patchAuthorEngagement(authorId, (engagement) => ({
                        ...engagement,
                        isFollowingAuthor: false,
                        isFollowRequestPending: false
                    }));
                    showToast(isPending ? "Follow request cancelled" : "Unfollowed");
                } else {
                    const result = await followUser(authorId);
                    const nextPending = Boolean(result?.isPending);

                    patchAuthorEngagement(authorId, (engagement) => ({
                        ...engagement,
                        isFollowingAuthor: !nextPending,
                        isFollowRequestPending: nextPending
                    }));

                    showToast(nextPending ? "Follow request sent" : "Now following");
                }
            } catch (error) {
                showToast(error?.message || "Could not update follow status", "error");
            } finally {
                setActionLoading(key, false);
            }
        },
        [actionState, patchAuthorEngagement, profileId, setActionLoading, showToast]
    );

    const handleDeletePost = useCallback(
        async (post) => {
            const postId = String(post?._id || "");
            if (!postId) return;

            const key = `post-delete:${postId}`;
            if (actionState[key]) return;

            setActionLoading(key, true);
            try {
                await deletePost(postId);

                setPosts((previous) =>
                    previous.filter((entry) => String(entry?._id || "") !== postId)
                );
                setPagination((previous) => ({
                    ...previous,
                    total: Math.max(0, Number(previous?.total || 0) - 1)
                }));
                setExpandedCommentsPostId((previous) =>
                    previous === postId ? null : previous
                );
                setCommentsByPost((previous) => {
                    if (!previous?.[postId]) return previous;
                    const next = { ...previous };
                    delete next[postId];
                    return next;
                });
                setCommentsLoadingByPost((previous) => {
                    if (!previous?.[postId]) return previous;
                    const next = { ...previous };
                    delete next[postId];
                    return next;
                });
                setCommentsSubmittingByPost((previous) => {
                    if (!previous?.[postId]) return previous;
                    const next = { ...previous };
                    delete next[postId];
                    return next;
                });
                setCommentDrafts((previous) => {
                    if (!previous?.[postId]) return previous;
                    const next = { ...previous };
                    delete next[postId];
                    return next;
                });

                showToast("Post deleted");
            } catch (error) {
                showToast(error?.message || "Could not delete post", "error");
            } finally {
                setActionLoading(key, false);
            }
        },
        [actionState, setActionLoading, showToast]
    );

    const handleDeleteComment = useCallback(
        async (postId, comment) => {
            const postIdKey = String(postId || "");
            const commentId = String(comment?._id || "");
            if (!postIdKey || !commentId) return;

            const key = `comment-delete:${commentId}`;
            if (actionState[key]) return;

            setActionLoading(key, true);
            try {
                await deleteComment(commentId);

                let removedCount = 1;
                setCommentsByPost((previous) => {
                    const existingComments = previous?.[postIdKey] || [];
                    const result = removeCommentFromThread(existingComments, commentId);
                    removedCount = Math.max(1, Number(result?.removedCount || 0));

                    if (!result?.removedCount) return previous;
                    return {
                        ...previous,
                        [postIdKey]: result.comments
                    };
                });

                patchPost(postIdKey, (entry) => ({
                    ...entry,
                    commentsCount: Math.max(
                        0,
                        Number(entry?.commentsCount || 0) - removedCount
                    )
                }));

                showToast("Comment deleted");
            } catch (error) {
                showToast(error?.message || "Could not delete comment", "error");
            } finally {
                setActionLoading(key, false);
            }
        },
        [actionState, patchPost, setActionLoading, showToast]
    );

    const openRepostComposer = useCallback((post) => {
        setRepostComposer({
            postId: post?._id || null,
            quoteText: "",
            visibility: "public",
            submitting: false
        });
    }, []);

    const closeRepostComposer = useCallback(() => {
        setRepostComposer({
            postId: null,
            quoteText: "",
            visibility: "public",
            submitting: false
        });
    }, []);

    const repostTargetPost = useMemo(
        () =>
            posts.find(
                (entry) => String(entry?._id || "") === String(repostComposer?.postId || "")
            ) || null,
        [posts, repostComposer?.postId]
    );

    const submitRepost = useCallback(
        async (mode) => {
            const postId = repostComposer?.postId;
            if (!postId || repostComposer?.submitting) return;

            const quoteText = String(repostComposer?.quoteText || "").trim();
            if (mode === "quote" && !quoteText) {
                showToast("Quote repost needs content", "error");
                return;
            }

            setRepostComposer((previous) => ({ ...previous, submitting: true }));

            try {
                const created = await repostPost(postId, {
                    mode,
                    content: mode === "quote" ? quoteText : undefined,
                    visibility: repostComposer?.visibility || "public"
                });

                const alreadyReposted = Boolean(created?.alreadyReposted);

                patchPost(postId, (entry) => ({
                    ...entry,
                    repostsCount:
                        Number(entry?.repostsCount || 0) +
                        (Boolean(entry?.userEngagement?.hasReposted) || alreadyReposted ? 0 : 1),
                    userEngagement: {
                        ...(entry?.userEngagement || {}),
                        hasReposted: true
                    }
                }));

                if (created?._id && activeTab !== "bookmarks" && !alreadyReposted) {
                    setPosts((previous) => mergeUniquePosts([created, ...previous]));
                }

                if (alreadyReposted) {
                    showToast("Already reposted");
                } else {
                    showToast(mode === "quote" ? "Quote repost published" : "Reposted");
                }
                closeRepostComposer();
            } catch (error) {
                showToast(error?.message || "Could not repost", "error");
                setRepostComposer((previous) => ({ ...previous, submitting: false }));
            }
        },
        [activeTab, closeRepostComposer, patchPost, repostComposer, showToast]
    );

    const loadCommentsForPost = useCallback(
        async (postId) => {
            if (!postId) return;
            setCommentsLoadingByPost((previous) => ({ ...previous, [postId]: true }));
            try {
                const result = await getPostComments(postId, {
                    page: 1,
                    limit: 8,
                    sortBy: "recent"
                });
                const nextComments = normalizeComments(result?.comments || []);

                setCommentsByPost((previous) => ({
                    ...previous,
                    [postId]: nextComments
                }));

                setReplyPaginationByComment((previous) => {
                    const next = { ...previous };
                    nextComments.forEach((comment) => {
                        const commentId = String(comment?._id || "");
                        if (!commentId) return;

                        const replies = Array.isArray(comment?.replies) ? comment.replies : [];
                        const repliesCount = Number(comment?.repliesCount || replies.length);
                        next[commentId] = {
                            page: 1,
                            hasMore:
                                typeof comment?.hasMoreReplies === "boolean"
                                    ? comment.hasMoreReplies
                                    : replies.length < repliesCount
                        };
                    });
                    return next;
                });
            } catch (error) {
                showToast(error?.message || "Failed to load comments", "error");
            } finally {
                setCommentsLoadingByPost((previous) => ({ ...previous, [postId]: false }));
            }
        },
        [showToast]
    );

    const handleToggleComments = useCallback(
        async (postId) => {
            const nextOpen = expandedCommentsPostId === postId ? null : postId;
            setExpandedCommentsPostId(nextOpen);
            if (!nextOpen) return;
            if (!commentsByPost[postId]) {
                await loadCommentsForPost(postId);
            }
        },
        [commentsByPost, expandedCommentsPostId, loadCommentsForPost]
    );

    const handleToggleCommentLike = useCallback(
        async (postId, comment) => {
            const commentId = comment?._id;
            if (!postId || !commentId) return;

            const key = `comment-like:${commentId}`;
            if (actionState[key]) return;

            setActionLoading(key, true);
            const currentlyLiked = Boolean(comment?.userEngagement?.hasLiked);

            try {
                const result = currentlyLiked
                    ? await unlikeComment(commentId)
                    : await likeComment(commentId);

                setCommentsByPost((previous) => ({
                    ...previous,
                    [postId]: updateCommentThread(
                        previous?.[postId] || [],
                        commentId,
                        (entry) => {
                            const entryLiked = Boolean(entry?.userEngagement?.hasLiked);
                            const nextLiked =
                                typeof result?.liked === "boolean"
                                    ? result.liked
                                    : !entryLiked;
                            const delta =
                                nextLiked === entryLiked ? 0 : nextLiked ? 1 : -1;

                            return {
                                ...entry,
                                likesCount: Math.max(
                                    0,
                                    Number(entry?.likesCount || 0) + delta
                                ),
                                userEngagement: {
                                    ...(entry?.userEngagement || {}),
                                    hasLiked: nextLiked
                                }
                            };
                        }
                    )
                }));
            } catch (error) {
                showToast(error?.message || "Could not update comment like", "error");
            } finally {
                setActionLoading(key, false);
            }
        },
        [actionState, setActionLoading, showToast]
    );

    const handleToggleReplyComposer = useCallback((commentId) => {
        if (!commentId) return;
        setReplyComposerByComment((previous) => ({
            ...previous,
            [commentId]: !previous?.[commentId]
        }));
    }, []);

    const handleReplyDraftChange = useCallback((commentId, value) => {
        if (!commentId) return;
        setReplyDraftsByComment((previous) => ({
            ...previous,
            [commentId]: value
        }));
    }, []);

    const handleSubmitComment = useCallback(
        async (postId) => {
            const value = String(commentDrafts?.[postId] || "").trim();
            if (!value) return;

            setCommentsSubmittingByPost((previous) => ({ ...previous, [postId]: true }));

            try {
                const comment = normalizeComment(
                    await addComment(postId, { content: value })
                );
                if (!comment) return;

                setCommentsByPost((previous) => ({
                    ...previous,
                    [postId]: [comment, ...(previous?.[postId] || [])]
                }));
                setCommentDrafts((previous) => ({ ...previous, [postId]: "" }));

                patchPost(postId, (entry) => ({
                    ...entry,
                    commentsCount: Number(entry?.commentsCount || 0) + 1
                }));
            } catch (error) {
                showToast(error?.message || "Failed to comment", "error");
            } finally {
                setCommentsSubmittingByPost((previous) => ({ ...previous, [postId]: false }));
            }
        },
        [commentDrafts, patchPost, showToast]
    );

    const handleSubmitReply = useCallback(
        async (postId, parentCommentId) => {
            const parentId = String(parentCommentId || "");
            const value = String(replyDraftsByComment?.[parentId] || "").trim();
            if (!postId || !parentId || !value || replySubmittingByComment?.[parentId]) {
                return;
            }

            setReplySubmittingByComment((previous) => ({
                ...previous,
                [parentId]: true
            }));

            try {
                const reply = normalizeComment(
                    await addComment(postId, {
                        content: value,
                        parentCommentId: parentId
                    })
                );

                if (!reply) return;

                setCommentsByPost((previous) => ({
                    ...previous,
                    [postId]: (previous?.[postId] || []).map((comment) => {
                        if (String(comment?._id || "") !== parentId) return comment;

                        const existingReplies = Array.isArray(comment?.replies)
                            ? comment.replies
                            : [];

                        return {
                            ...comment,
                            replies: mergeUniqueComments([...existingReplies, reply]),
                            repliesCount:
                                Number(comment?.repliesCount || existingReplies.length) + 1
                        };
                    })
                }));

                setReplyDraftsByComment((previous) => ({
                    ...previous,
                    [parentId]: ""
                }));
                setReplyComposerByComment((previous) => ({
                    ...previous,
                    [parentId]: false
                }));

                patchPost(postId, (entry) => ({
                    ...entry,
                    commentsCount: Number(entry?.commentsCount || 0) + 1
                }));
            } catch (error) {
                showToast(error?.message || "Failed to post reply", "error");
            } finally {
                setReplySubmittingByComment((previous) => ({
                    ...previous,
                    [parentId]: false
                }));
            }
        },
        [patchPost, replyDraftsByComment, replySubmittingByComment, showToast]
    );

    const handleLoadMoreReplies = useCallback(
        async (postId, parentCommentId) => {
            const parentId = String(parentCommentId || "");
            if (!postId || !parentId || replyLoadingByComment?.[parentId]) return;

            const currentPagination = replyPaginationByComment?.[parentId];
            const hasMore =
                typeof currentPagination?.hasMore === "boolean"
                    ? currentPagination.hasMore
                    : true;
            if (!hasMore) return;

            const nextPage = Number(currentPagination?.page || 1) + 1;
            setReplyLoadingByComment((previous) => ({ ...previous, [parentId]: true }));

            try {
                const result = await getCommentReplies(parentId, {
                    page: nextPage,
                    limit: REPLY_PAGE_SIZE
                });
                const nextReplies = normalizeComments(result?.replies || []);
                const nextHasMore =
                    typeof result?.pagination?.hasMore === "boolean"
                        ? result.pagination.hasMore
                        : nextReplies.length >= REPLY_PAGE_SIZE;

                setCommentsByPost((previous) => ({
                    ...previous,
                    [postId]: (previous?.[postId] || []).map((comment) => {
                        if (String(comment?._id || "") !== parentId) return comment;

                        const existingReplies = Array.isArray(comment?.replies)
                            ? comment.replies
                            : [];
                        const mergedReplies = mergeUniqueComments([
                            ...existingReplies,
                            ...nextReplies
                        ]);

                        return {
                            ...comment,
                            replies: mergedReplies,
                            repliesCount: Math.max(
                                Number(comment?.repliesCount || 0),
                                mergedReplies.length
                            ),
                            hasMoreReplies: nextHasMore
                        };
                    })
                }));

                setReplyPaginationByComment((previous) => ({
                    ...previous,
                    [parentId]: {
                        page: nextPage,
                        hasMore: nextHasMore
                    }
                }));
            } catch (error) {
                showToast(error?.message || "Failed to load more replies", "error");
            } finally {
                setReplyLoadingByComment((previous) => ({
                    ...previous,
                    [parentId]: false
                }));
            }
        },
        [replyLoadingByComment, replyPaginationByComment, showToast]
    );

    const handleCommentDraftChange = useCallback((postId, value) => {
        setCommentDrafts((previous) => ({ ...previous, [postId]: value }));
    }, []);

    const handleLoadMore = useCallback(() => {
        if (!pagination?.hasMore || feedLoadingMore) return;
        loadFeed({ page: Number(pagination?.page || 1) + 1, append: true });
    }, [feedLoadingMore, loadFeed, pagination]);

    const handleRefresh = useCallback(async () => {
        await Promise.all([loadFeed({ page: 1, append: false }), loadStories()]);
        showToast("Feed refreshed");
    }, [loadFeed, loadStories, showToast]);

    const shouldShowBottomNav = isMobileViewport;

    return {
        navigate,
        user,
        activeTab,
        setActiveTab,
        sortMode,
        setSortMode,
        searchTerm,
        setSearchTerm,
        pagination,
        feedLoading,
        feedLoadingMore,
        storiesLoading,
        storyGroups,
        storyViewer,
        setStoryViewer,
        storyAudienceLoading,
        storyDeletingId,
        commentsByPost,
        commentsLoadingByPost,
        commentsSubmittingByPost,
        commentDrafts,
        replyDraftsByComment,
        replyComposerByComment,
        replySubmittingByComment,
        replyLoadingByComment,
        expandedCommentsPostId,
        actionState,
        toast,
        repostComposer,
        setRepostComposer,
        repostTargetPost,
        filteredPosts,
        topHashtags,
        storyStats,
        profileId,
        shouldShowBottomNav,
        handleOpenStoryGroup,
        handleNavigateStory,
        handleMarkStoryViewed,
        handleReactToStory,
        handleInspectStoryAudience,
        handleDeleteStory,
        handleToggleLike,
        handleToggleSave,
        handleSharePost,
        handleToggleFollowAuthor,
        handleDeletePost,
        handleDeleteComment,
        openRepostComposer,
        closeRepostComposer,
        submitRepost,
        handleToggleComments,
        handleToggleCommentLike,
        handleToggleReplyComposer,
        handleSubmitComment,
        handleCommentDraftChange,
        handleReplyDraftChange,
        handleSubmitReply,
        handleLoadMoreReplies,
        handleLoadMore,
        handleRefresh
    };
};

export default useFeedPageLogic;
