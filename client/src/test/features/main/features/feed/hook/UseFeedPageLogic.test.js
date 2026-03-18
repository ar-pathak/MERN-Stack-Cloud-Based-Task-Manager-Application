import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const {
    useNavigateMock,
    navigateMock,
    useAuthMock,
    addCommentMock,
    deleteCommentMock,
    deletePostMock,
    getCommentRepliesMock,
    getBookmarkedPostsMock,
    getExploreFeedMock,
    getPostCommentsMock,
    getUserFeedMock,
    likeCommentMock,
    likePostMock,
    repostPostMock,
    savePostMock,
    unlikeCommentMock,
    unlikePostMock,
    unsavePostMock,
    sendChatMessageMock,
    getOverviewActivityMock,
    followUserMock,
    unfollowUserMock,
    getStoryFeedMock,
    markStoryViewedMock,
    reactToStoryMock,
    deleteStoryRequestMock,
    getStoryDetailsMock
} = vi.hoisted(() => ({
    useNavigateMock: vi.fn(),
    navigateMock: vi.fn(),
    useAuthMock: vi.fn(),
    addCommentMock: vi.fn(),
    deleteCommentMock: vi.fn(),
    deletePostMock: vi.fn(),
    getCommentRepliesMock: vi.fn(),
    getBookmarkedPostsMock: vi.fn(),
    getExploreFeedMock: vi.fn(),
    getPostCommentsMock: vi.fn(),
    getUserFeedMock: vi.fn(),
    likeCommentMock: vi.fn(),
    likePostMock: vi.fn(),
    repostPostMock: vi.fn(),
    savePostMock: vi.fn(),
    unlikeCommentMock: vi.fn(),
    unlikePostMock: vi.fn(),
    unsavePostMock: vi.fn(),
    sendChatMessageMock: vi.fn(),
    getOverviewActivityMock: vi.fn(),
    followUserMock: vi.fn(),
    unfollowUserMock: vi.fn(),
    getStoryFeedMock: vi.fn(),
    markStoryViewedMock: vi.fn(),
    reactToStoryMock: vi.fn(),
    deleteStoryRequestMock: vi.fn(),
    getStoryDetailsMock: vi.fn()
}));

vi.mock("react-router", () => ({
    useNavigate: useNavigateMock
}));

vi.mock("../../../../../../context/AuthContext", () => ({
    useAuth: useAuthMock
}));

vi.mock("../../../../../../service/post.service", () => ({
    addComment: addCommentMock,
    deleteComment: deleteCommentMock,
    deletePost: deletePostMock,
    getCommentReplies: getCommentRepliesMock,
    getBookmarkedPosts: getBookmarkedPostsMock,
    getExploreFeed: getExploreFeedMock,
    getPostComments: getPostCommentsMock,
    getUserFeed: getUserFeedMock,
    likeComment: likeCommentMock,
    likePost: likePostMock,
    repostPost: repostPostMock,
    savePost: savePostMock,
    unlikeComment: unlikeCommentMock,
    unlikePost: unlikePostMock,
    unsavePost: unsavePostMock
}));

vi.mock("../../../../../../service/chat.service", () => ({
    sendMessage: sendChatMessageMock
}));

vi.mock("../../../../../../service/overview.service", () => ({
    getOverviewActivity: getOverviewActivityMock
}));

vi.mock("../../../../../../service/follow.service", () => ({
    followUser: followUserMock,
    unfollowUser: unfollowUserMock
}));

vi.mock("../../../../../../service/story.service", () => ({
    getStoryFeed: getStoryFeedMock,
    markStoryViewed: markStoryViewedMock,
    reactToStory: reactToStoryMock,
    deleteStory: deleteStoryRequestMock,
    getStoryById: getStoryDetailsMock
}));

import { PAGE_SIZE } from "../../../../../../features/main/features/feed/constants/feed.constants.js";
import useFeedPageLogic from "../../../../../../features/main/features/feed/hook/useFeedPageLogic.js";

const now = new Date("2026-03-18T11:00:00.000Z").getTime();

const isoMinutesAgo = (minutes) => new Date(now - minutes * 60 * 1000).toISOString();

const createPost = (id, overrides = {}) => ({
    _id: id,
    content: `Post ${id}`,
    contentPreview: `Post ${id}`,
    createdAt: isoMinutesAgo(60),
    hashtags: [],
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    repostsCount: 0,
    viewsCount: 0,
    userEngagement: {
        hasLiked: false,
        hasSaved: false,
        hasReposted: false,
        isFollowingAuthor: false,
        isFollowRequestPending: false
    },
    author: {
        _id: `author-${id}`,
        name: `Author ${id}`,
        username: `author_${id}`
    },
    ...overrides
});

const createStoryGroups = () => ([
    {
        user: { _id: "author-a", name: "A" },
        unseenCount: 1,
        hasViewedAll: false,
        stories: [
            { _id: "story-1", hasViewed: false, createdAt: isoMinutesAgo(40) },
            { _id: "story-2", hasViewed: true, createdAt: isoMinutesAgo(20) }
        ]
    },
    {
        user: { _id: "author-b", name: "B" },
        unseenCount: 0,
        hasViewedAll: true,
        stories: [{ _id: "story-3", hasViewed: true, createdAt: isoMinutesAgo(10) }]
    }
]);

const initialFollowingPosts = () => [
    createPost("post-1", {
        content: "React launch update",
        createdAt: isoMinutesAgo(15),
        hashtags: ["react", "launch"],
        likesCount: 2,
        commentsCount: 1,
        viewsCount: 40,
        author: { _id: "author-1", name: "Alice" }
    }),
    createPost("post-2", {
        content: "MERN planning",
        createdAt: isoMinutesAgo(2000),
        hashtags: ["mern"],
        likesCount: 8,
        commentsCount: 3,
        sharesCount: 1,
        repostsCount: 1,
        viewsCount: 200,
        author: { _id: "author-2", name: "Bob" }
    })
];

const renderFeedHook = () => renderHook(() => useFeedPageLogic());

const waitForInitialLoad = async () => {
    await waitFor(() => expect(getUserFeedMock).toHaveBeenCalled());
    await waitFor(() => expect(getStoryFeedMock).toHaveBeenCalled());
};

beforeEach(() => {
    vi.clearAllMocks();

    window.innerWidth = 1400;

    useNavigateMock.mockReturnValue(navigateMock);
    useAuthMock.mockReturnValue({
        user: {
            _id: "me",
            name: "Riya"
        }
    });

    getUserFeedMock.mockResolvedValue({
        posts: initialFollowingPosts(),
        pagination: { page: 1, pages: 2, total: 2, hasMore: true }
    });
    getExploreFeedMock.mockResolvedValue({
        posts: [createPost("explore-1", { content: "Explore item", hashtags: ["discover"] })],
        pagination: { page: 1, pages: 1, total: 1, hasMore: false }
    });
    getBookmarkedPostsMock.mockResolvedValue({
        posts: [
            createPost("bookmark-1", {
                content: "Saved one",
                userEngagement: { hasSaved: true }
            })
        ],
        pagination: { page: 1, pages: 1, total: 1, hasMore: false }
    });

    getStoryFeedMock.mockResolvedValue({ stories: createStoryGroups() });
    markStoryViewedMock.mockResolvedValue({ _id: "story-1", hasViewed: true });
    reactToStoryMock.mockResolvedValue({ _id: "story-1", myReaction: "fire" });
    getStoryDetailsMock.mockResolvedValue({
        _id: "story-1",
        viewers: [{ _id: "viewer-1" }],
        reactions: [{ emoji: "fire", count: 1 }]
    });
    deleteStoryRequestMock.mockResolvedValue({ success: true });

    getOverviewActivityMock.mockResolvedValue([
        {
            _id: "chat-a",
            type: "chat",
            name: "General",
            updatedAt: isoMinutesAgo(5),
            lastMessage: { content: "Latest chat" }
        },
        {
            _id: "workspace-1",
            type: "workspace",
            name: "Workspace Root",
            updatedAt: isoMinutesAgo(12),
            projects: [
                {
                    _id: "project-a",
                    type: "project",
                    chatId: "chat-b",
                    name: "Roadmap",
                    updatedAt: isoMinutesAgo(8),
                    lastMessage: { content: "Project chat" }
                }
            ]
        }
    ]);

    addCommentMock.mockImplementation(async (_postId, payload) => {
        if (payload?.parentCommentId) {
            return {
                _id: `reply-${payload.parentCommentId}`,
                content: payload.content,
                likesCount: 0,
                userEngagement: { hasLiked: false }
            };
        }

        return {
            _id: "comment-created",
            content: payload.content,
            likesCount: 0,
            replies: [],
            repliesCount: 0,
            userEngagement: { hasLiked: false }
        };
    });

    getPostCommentsMock.mockResolvedValue({
        comments: [
            {
                _id: "comment-1",
                content: "First comment",
                likesCount: 1,
                repliesCount: 3,
                replies: [
                    {
                        _id: "reply-1",
                        content: "First reply",
                        likesCount: 0,
                        userEngagement: { hasLiked: false }
                    }
                ],
                userEngagement: { hasLiked: false }
            }
        ]
    });

    getCommentRepliesMock.mockResolvedValue({
        replies: [
            {
                _id: "reply-2",
                content: "More reply",
                likesCount: 0,
                userEngagement: { hasLiked: false }
            }
        ],
        pagination: { hasMore: false }
    });

    likeCommentMock.mockResolvedValue({ liked: true });
    unlikeCommentMock.mockResolvedValue({ liked: false });
    likePostMock.mockResolvedValue({ liked: true });
    unlikePostMock.mockResolvedValue({ liked: false });

    savePostMock.mockResolvedValue({ success: true });
    unsavePostMock.mockResolvedValue({ success: true });

    followUserMock.mockResolvedValue({ isPending: true });
    unfollowUserMock.mockResolvedValue({ success: true });

    deletePostMock.mockResolvedValue({ success: true });
    deleteCommentMock.mockResolvedValue({ success: true });

    repostPostMock.mockResolvedValue({ _id: "repost-created" });

    sendChatMessageMock.mockResolvedValue({ _id: "msg-1" });
});

test("loads initial feed/stories and supports filters with mobile resize", async () => {
    const { result } = renderFeedHook();

    await waitForInitialLoad();

    expect(getUserFeedMock).toHaveBeenCalledWith({ page: 1, limit: PAGE_SIZE });
    expect(result.current.filteredPosts).toHaveLength(2);
    expect(result.current.storyGroups).toHaveLength(2);
    expect(result.current.storyStats).toEqual({ totalStories: 3, unseen: 1 });
    expect(result.current.topHashtags).toEqual(
        expect.arrayContaining([
            ["react", 1],
            ["launch", 1],
            ["mern", 1]
        ])
    );

    act(() => {
        result.current.setSearchTerm("react");
    });
    expect(result.current.filteredPosts).toHaveLength(1);

    act(() => {
        result.current.setSearchTerm("");
        result.current.setSortMode("popular");
    });
    expect(result.current.filteredPosts[0]._id).toBe("post-2");

    expect(result.current.shouldShowBottomNav).toBe(false);
    act(() => {
        window.innerWidth = 540;
        window.dispatchEvent(new Event("resize"));
    });
    expect(result.current.shouldShowBottomNav).toBe(true);
});

test("handles story open, navigation, view, react, inspect, and delete flows", async () => {
    const { result } = renderFeedHook();
    await waitForInitialLoad();

    act(() => {
        result.current.handleOpenStoryGroup(0);
    });
    expect(result.current.storyViewer).toEqual({ groupIndex: 0, storyIndex: 0 });

    act(() => {
        result.current.handleNavigateStory(1);
    });
    expect(result.current.storyViewer).toEqual({ groupIndex: 0, storyIndex: 1 });

    act(() => {
        result.current.handleNavigateStory(1);
    });
    expect(result.current.storyViewer).toEqual({ groupIndex: 1, storyIndex: 0 });

    await act(async () => {
        await result.current.handleMarkStoryViewed(0, 0);
    });
    expect(markStoryViewedMock).toHaveBeenCalledWith("story-1");

    await act(async () => {
        await result.current.handleMarkStoryViewed(0, 0);
    });
    expect(markStoryViewedMock).toHaveBeenCalledTimes(1);

    await act(async () => {
        await result.current.handleReactToStory("story-1", "fire");
    });
    expect(result.current.toast).toMatchObject({ message: "Reaction sent", kind: "success" });

    reactToStoryMock.mockRejectedValueOnce(new Error("Bad emoji"));
    await act(async () => {
        await result.current.handleReactToStory("story-1", "x");
    });
    expect(result.current.toast).toMatchObject({ message: "Bad emoji", kind: "error" });

    await act(async () => {
        await result.current.handleInspectStoryAudience("story-1");
    });
    expect(getStoryDetailsMock).toHaveBeenCalledWith("story-1");
    expect(result.current.storyAudienceLoading).toBe(false);

    await act(async () => {
        await result.current.handleDeleteStory("story-1");
    });
    expect(deleteStoryRequestMock).toHaveBeenCalledWith("story-1");
    expect(result.current.storyDeletingId).toBe("");
    expect(result.current.storyGroups[0].stories.some((entry) => entry._id === "story-1")).toBe(false);
});

test("loads share targets and handles partial then successful share to chats", async () => {
    const { result } = renderFeedHook();
    await waitForInitialLoad();

    const post = result.current.filteredPosts[0];

    await act(async () => {
        await result.current.handleSharePost(post);
    });

    await waitFor(() => {
        expect(result.current.shareComposer.loadingTargets).toBe(false);
    });
    expect(result.current.shareComposer.postId).toBe("post-1");
    expect(result.current.shareComposer.targets.length).toBeGreaterThan(0);

    const workspaceTarget = result.current.shareComposer.targets.find((entry) => entry.type === "workspace");
    const chatTarget = result.current.shareComposer.targets.find((entry) => entry.type === "chat");

    act(() => {
        result.current.handleShareTargetPress(workspaceTarget);
    });
    expect(result.current.shareComposer.expandedNodeIds[workspaceTarget.id]).toBe(true);

    act(() => {
        result.current.handleShareTargetPress(workspaceTarget.children[0]);
        result.current.handleShareTargetPress(chatTarget);
        result.current.handleShareNoteChange("Please review this");
    });

    expect(result.current.shareComposer.selectedChatIds.sort()).toEqual(["chat-a", "chat-b"]);

    sendChatMessageMock
        .mockResolvedValueOnce({ _id: "ok" })
        .mockRejectedValueOnce(new Error("chat failed"));

    await act(async () => {
        await result.current.submitShareToChat();
    });

    expect(sendChatMessageMock).toHaveBeenCalledTimes(2);
    expect(result.current.shareComposer.selectedChatIds).toHaveLength(1);
    expect(result.current.filteredPosts.find((entry) => entry._id === "post-1")?.sharesCount).toBe(1);
    expect(result.current.toast.kind).toBe("error");

    sendChatMessageMock.mockResolvedValueOnce({ _id: "retry-ok" });
    await act(async () => {
        await result.current.submitShareToChat();
    });

    expect(result.current.shareComposer.postId).toBeNull();
    expect(result.current.toast.message).toBe("Post shared in chat");
});

test("toggles like/save/follow and handles bookmark unsave removal", async () => {
    const { result } = renderFeedHook();
    await waitForInitialLoad();

    await act(async () => {
        await result.current.handleToggleLike(result.current.filteredPosts[0]);
    });
    expect(likePostMock).toHaveBeenCalledWith("post-1");
    expect(result.current.filteredPosts[0].userEngagement.hasLiked).toBe(true);
    expect(result.current.filteredPosts[0].likesCount).toBe(3);

    await act(async () => {
        await result.current.handleToggleLike(result.current.filteredPosts[0]);
    });
    expect(unlikePostMock).toHaveBeenCalledWith("post-1");
    expect(result.current.filteredPosts[0].userEngagement.hasLiked).toBe(false);

    await act(async () => {
        await result.current.handleToggleSave(result.current.filteredPosts[0]);
    });
    expect(savePostMock).toHaveBeenCalledWith("post-1");
    expect(result.current.filteredPosts[0].userEngagement.hasSaved).toBe(true);

    await act(async () => {
        await result.current.handleToggleFollowAuthor(result.current.filteredPosts[0]);
    });
    expect(followUserMock).toHaveBeenCalledWith("author-1");
    expect(result.current.filteredPosts[0].userEngagement).toMatchObject({
        isFollowingAuthor: false,
        isFollowRequestPending: true
    });

    await act(async () => {
        await result.current.handleToggleFollowAuthor(result.current.filteredPosts[0]);
    });
    expect(unfollowUserMock).toHaveBeenCalledWith("author-1");
    expect(result.current.filteredPosts[0].userEngagement).toMatchObject({
        isFollowingAuthor: false,
        isFollowRequestPending: false
    });

    await act(async () => {
        result.current.setActiveTab("bookmarks");
    });

    await waitFor(() => {
        expect(result.current.filteredPosts[0]?._id).toBe("bookmark-1");
    });

    await act(async () => {
        await result.current.handleToggleSave(result.current.filteredPosts[0]);
    });
    expect(unsavePostMock).toHaveBeenCalledWith("bookmark-1");
    expect(result.current.filteredPosts).toHaveLength(0);
    expect(result.current.pagination.total).toBe(0);
});

test("loads comments, submits comment/reply, likes reply, loads more, and deletes comment thread", async () => {
    const { result } = renderFeedHook();
    await waitForInitialLoad();

    await act(async () => {
        await result.current.handleToggleComments("post-1");
    });

    await waitFor(() => {
        expect(getPostCommentsMock).toHaveBeenCalledWith("post-1", {
            page: 1,
            limit: 8,
            sortBy: "recent"
        });
    });

    expect(result.current.commentsByPost["post-1"]).toHaveLength(1);

    act(() => {
        result.current.handleCommentDraftChange("post-1", "New top comment");
    });

    await act(async () => {
        await result.current.handleSubmitComment("post-1");
    });

    expect(addCommentMock).toHaveBeenCalledWith("post-1", { content: "New top comment" });
    expect(result.current.commentDrafts["post-1"]).toBe("");

    act(() => {
        result.current.handleToggleReplyComposer("comment-1");
        result.current.handleReplyDraftChange("comment-1", "Reply body");
    });

    await act(async () => {
        await result.current.handleSubmitReply("post-1", "comment-1");
    });

    expect(addCommentMock).toHaveBeenCalledWith("post-1", {
        content: "Reply body",
        parentCommentId: "comment-1"
    });

    const parentComment = result.current.commentsByPost["post-1"].find((entry) => entry._id === "comment-1");
    const reply = parentComment.replies.find((entry) => entry._id === "reply-comment-1");

    await act(async () => {
        await result.current.handleToggleCommentLike("post-1", reply);
    });

    expect(likeCommentMock).toHaveBeenCalledWith("reply-comment-1");

    await act(async () => {
        await result.current.handleLoadMoreReplies("post-1", "comment-1");
    });

    expect(getCommentRepliesMock).toHaveBeenCalledWith("comment-1", {
        page: 2,
        limit: 6
    });

    await act(async () => {
        await result.current.handleDeleteComment("post-1", { _id: "comment-1" });
    });

    expect(deleteCommentMock).toHaveBeenCalledWith("comment-1");
    expect(result.current.commentsByPost["post-1"].some((entry) => entry._id === "comment-1")).toBe(false);
    expect(result.current.toast.message).toBe("Comment deleted");
});

test("supports repost, load more, refresh, and feed-error fallback", async () => {
    getUserFeedMock.mockImplementation(async ({ page }) => {
        if (page === 2) {
            return {
                posts: [createPost("post-3", { content: "Appended item", createdAt: isoMinutesAgo(1) })],
                pagination: { page: 2, pages: 2, total: 3, hasMore: false }
            };
        }

        return {
            posts: initialFollowingPosts(),
            pagination: { page: 1, pages: 2, total: 2, hasMore: true }
        };
    });

    const { result } = renderFeedHook();
    await waitForInitialLoad();

    act(() => {
        result.current.openRepostComposer(result.current.filteredPosts[0]);
    });

    expect(result.current.repostComposer.postId).toBe("post-1");

    await act(async () => {
        await result.current.submitRepost("quote");
    });
    expect(result.current.toast).toMatchObject({
        message: "Quote repost needs content",
        kind: "error"
    });

    act(() => {
        result.current.setRepostComposer((previous) => ({
            ...previous,
            quoteText: "Repost message",
            visibility: "followers"
        }));
    });

    repostPostMock.mockResolvedValueOnce({ _id: "repost-created", content: "Shared from repost" });

    await act(async () => {
        await result.current.submitRepost("quote");
    });

    expect(repostPostMock).toHaveBeenCalledWith("post-1", {
        mode: "quote",
        content: "Repost message",
        visibility: "followers"
    });
    expect(result.current.repostComposer.postId).toBeNull();
    expect(result.current.filteredPosts.some((entry) => entry._id === "repost-created")).toBe(true);

    await act(async () => {
        result.current.handleLoadMore();
    });

    await waitFor(() => {
        expect(getUserFeedMock).toHaveBeenCalledWith({ page: 2, limit: PAGE_SIZE });
    });
    expect(result.current.filteredPosts.some((entry) => entry._id === "post-3")).toBe(true);

    await act(async () => {
        await result.current.handleRefresh();
    });

    expect(result.current.toast.message).toBe("Feed refreshed");

    getExploreFeedMock.mockRejectedValueOnce(new Error("Explore failed"));
    await act(async () => {
        result.current.setActiveTab("explore");
    });

    await waitFor(() => {
        expect(result.current.feedLoading).toBe(false);
    });

    expect(result.current.filteredPosts).toEqual([]);
    expect(result.current.toast).toMatchObject({ message: "Explore failed", kind: "error" });
});

test("deletes post and clears comment-related local caches", async () => {
    const { result } = renderFeedHook();
    await waitForInitialLoad();

    await act(async () => {
        await result.current.handleToggleComments("post-1");
    });

    act(() => {
        result.current.handleCommentDraftChange("post-1", "Temp");
    });

    await act(async () => {
        await result.current.handleDeletePost(result.current.filteredPosts[0]);
    });

    expect(deletePostMock).toHaveBeenCalledWith("post-1");
    expect(result.current.filteredPosts.some((entry) => entry._id === "post-1")).toBe(false);
    expect(result.current.commentsByPost["post-1"]).toBeUndefined();
    expect(result.current.commentsLoadingByPost["post-1"]).toBeFalsy();
    expect(result.current.commentDrafts["post-1"]).toBeFalsy();
    expect(result.current.toast.message).toBe("Post deleted");
});
