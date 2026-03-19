import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  useFeedPageLogicMock,
  navigateMock,
  useLocationMock,
  useAuthMock,
  getPostByIdMock,
  getPostCommentsMock,
} = vi.hoisted(() => ({
  useFeedPageLogicMock: vi.fn(),
  navigateMock: vi.fn(),
  useLocationMock: vi.fn(),
  useAuthMock: vi.fn(),
  getPostByIdMock: vi.fn(),
  getPostCommentsMock: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => useLocationMock(),
    useParams: () => ({ id: "post-1" }),
  };
});

vi.mock("../../../../../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../../../../service/post.service", () => ({
  getPostById: getPostByIdMock,
  getPostComments: getPostCommentsMock,
}));

vi.mock("../../../../../../features/main/features/feed/hook/useFeedPageLogic", () => ({
  default: () => useFeedPageLogicMock(),
}));

vi.mock("../../../../../../features/main/components/navigation/MobileBottomNav", () => ({
  default: ({ activeTab, hidden, profileId }) => (
    <div data-testid="mobile-bottom-nav">
      {activeTab}:{hidden ? "hidden" : "shown"}:{profileId}
    </div>
  ),
}));

vi.mock("../../../../../../features/main/features/feed/components/FeedTopBar", () => ({
  default: ({ onCreate, onRefresh }) => (
    <div>
      <button onClick={onCreate}>Create Feed</button>
      <button onClick={onRefresh}>Refresh Feed</button>
    </div>
  ),
}));

vi.mock("../../../../../../features/main/features/feed/components/FeedFilters", () => ({
  default: ({ activeTab, sortMode }) => <div>Filters:{activeTab}:{sortMode}</div>,
}));

vi.mock("../../../../../../features/main/features/feed/components/StoryRail", () => ({
  default: ({ groups }) => <div>Stories:{groups.length}</div>,
}));

vi.mock("../../../../../../features/main/features/feed/components/FeedSkeletonList", () => ({
  default: () => <div>Feed Skeleton</div>,
}));

vi.mock("../../../../../../features/main/features/feed/components/FeedEmptyState", () => ({
  default: ({ activeTab }) => <div>Empty:{activeTab}</div>,
}));

vi.mock("../../../../../../features/main/features/feed/components/FeedPostCard", () => ({
  default: ({ post }) => <div>Post Card:{post.content}</div>,
}));

vi.mock("../../../../../../features/main/features/feed/components/FeedSidebar", () => ({
  default: ({ topHashtags }) => <div>Sidebar:{topHashtags.length}</div>,
}));

vi.mock("../../../../../../features/main/features/feed/components/FeedToast", () => ({
  default: ({ toast }) => <div>Toast:{toast?.message || "none"}</div>,
}));

vi.mock("../../../../../../features/main/features/feed/components/RepostComposerModal", () => ({
  default: ({ post, visibility }) => <div>Repost Modal:{post?.content}:{visibility}</div>,
}));

vi.mock("../../../../../../features/main/features/feed/components/SharePostModal", () => ({
  default: ({ isOpen, postId }) => <div>Share Modal:{isOpen ? postId : "closed"}</div>,
}));

vi.mock("../../../../../../features/main/features/feed/components/StoryViewerModal", () => ({
  default: ({ viewer }) => <div>Story Viewer:{viewer ? "open" : "closed"}</div>,
}));

import FeedPage from "../../../../../../features/main/features/feed/pages/FeedPage";
import PostDetailPage from "../../../../../../features/main/features/feed/pages/PostDetailPage";

describe("feed pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.innerWidth = 500;
    useLocationMock.mockReturnValue({ state: { fromNotification: true } });
    useAuthMock.mockReturnValue({ user: { _id: "me" } });

    useFeedPageLogicMock.mockReturnValue({
      navigate: navigateMock,
      user: { _id: "me", name: "Riya" },
      activeTab: "following",
      setActiveTab: vi.fn(),
      sortMode: "recent",
      setSortMode: vi.fn(),
      searchTerm: "",
      setSearchTerm: vi.fn(),
      pagination: { hasMore: true },
      feedLoading: false,
      feedLoadingMore: false,
      storiesLoading: false,
      storyGroups: [{ id: "group-1" }],
      storyViewer: { groupIndex: 0, storyIndex: 0 },
      setStoryViewer: vi.fn(),
      storyAudienceLoading: false,
      storyDeletingId: "",
      commentsByPost: {},
      commentsLoadingByPost: {},
      commentsSubmittingByPost: {},
      commentDrafts: {},
      replyDraftsByComment: {},
      replyComposerByComment: {},
      replySubmittingByComment: {},
      replyLoadingByComment: {},
      expandedCommentsPostId: null,
      actionState: {},
      toast: { message: "Saved" },
      repostComposer: {
        postId: "post-1",
        quoteText: "Ship it",
        visibility: "followers",
        submitting: false,
      },
      setRepostComposer: vi.fn(),
      shareComposer: {
        postId: "post-1",
        postPreview: { content: "Launch update" },
        targets: [],
        loadingTargets: false,
        selectedChatIds: [],
        expandedNodeIds: {},
        note: "",
        sending: false,
      },
      repostTargetPost: { content: "Launch update" },
      filteredPosts: [{ _id: "post-1", content: "Launch update" }],
      topHashtags: [["react", 2]],
      storyStats: { totalStories: 1, unseen: 1 },
      profileId: "me",
      shouldShowBottomNav: true,
      handleOpenStoryGroup: vi.fn(),
      handleNavigateStory: vi.fn(),
      handleMarkStoryViewed: vi.fn(),
      handleReactToStory: vi.fn(),
      handleInspectStoryAudience: vi.fn(),
      handleDeleteStory: vi.fn(),
      handleToggleLike: vi.fn(),
      handleToggleSave: vi.fn(),
      handleSharePost: vi.fn(),
      handleToggleFollowAuthor: vi.fn(),
      handleDeletePost: vi.fn(),
      handleDeleteComment: vi.fn(),
      openRepostComposer: vi.fn(),
      closeRepostComposer: vi.fn(),
      closeShareComposer: vi.fn(),
      handleShareTargetPress: vi.fn(),
      toggleShareNodeExpanded: vi.fn(),
      handleShareNoteChange: vi.fn(),
      submitShareToChat: vi.fn(),
      submitRepost: vi.fn(),
      handleToggleComments: vi.fn(),
      handleToggleCommentLike: vi.fn(),
      handleToggleReplyComposer: vi.fn(),
      handleSubmitComment: vi.fn(),
      handleCommentDraftChange: vi.fn(),
      handleReplyDraftChange: vi.fn(),
      handleSubmitReply: vi.fn(),
      handleLoadMoreReplies: vi.fn(),
      handleLoadMore: vi.fn(),
      handleRefresh: vi.fn(),
    });

    getPostByIdMock.mockResolvedValue({
      post: {
        _id: "post-1",
        content: "Detailed post",
        likesCount: 4,
        commentsCount: 1,
        repostsCount: 2,
        author: { _id: "author-1", username: "alex" },
        media: [{ type: "image/png", url: "/hero.png" }],
      },
    });
    getPostCommentsMock.mockResolvedValue({
      comments: [
        {
          _id: "comment-1",
          content: "Looking good",
          createdAt: "2026-03-18T10:05:00.000Z",
          author: { username: "riya" },
        },
      ],
    });
  });

  it("renders feed page sections and top-level actions", () => {
    const feedState = useFeedPageLogicMock();

    render(<FeedPage />);

    fireEvent.click(screen.getByRole("button", { name: /Create Feed/i }));
    fireEvent.click(screen.getByRole("button", { name: /Refresh Feed/i }));
    fireEvent.click(screen.getByRole("button", { name: /Load more/i }));

    expect(navigateMock).toHaveBeenCalledWith("/main/create");
    expect(feedState.handleRefresh).toHaveBeenCalledTimes(1);
    expect(feedState.handleLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Filters:following:recent")).toBeInTheDocument();
    expect(screen.getByText("Stories:1")).toBeInTheDocument();
    expect(screen.getByText("Post Card:Launch update")).toBeInTheDocument();
    expect(screen.getByText("Repost Modal:Launch update:followers")).toBeInTheDocument();
    expect(screen.getByText("Share Modal:post-1")).toBeInTheDocument();
    expect(screen.getByText("Story Viewer:open")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-bottom-nav")).toHaveTextContent("feed:hidden:me");
  });

  it("loads post detail data, renders comments, and wires navigation actions", async () => {
    render(<PostDetailPage />);

    await waitFor(() => {
      expect(getPostByIdMock).toHaveBeenCalledWith("post-1");
    });

    await waitFor(() => {
      expect(screen.getByText("Detailed post")).toBeInTheDocument();
    });

    expect(getPostCommentsMock).toHaveBeenCalledWith("post-1", { page: 1, limit: 20 });
    expect(screen.getByText("Looking good")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-bottom-nav")).toHaveTextContent("notifications:shown:me");

    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    fireEvent.click(screen.getByRole("button", { name: /@alex/i }));

    expect(navigateMock).toHaveBeenNthCalledWith(1, -1);
    expect(navigateMock).toHaveBeenNthCalledWith(2, "/profile/author-1");
  });

  it("shows the post-not-found state when loading fails", async () => {
    getPostByIdMock.mockRejectedValueOnce(new Error("Post missing"));

    render(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Post missing")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Go back/i }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });
});
