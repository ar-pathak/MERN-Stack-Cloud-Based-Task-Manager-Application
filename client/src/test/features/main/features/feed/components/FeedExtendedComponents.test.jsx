import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FeedFilters from "../../../../../../features/main/features/feed/components/FeedFilters";
import FeedPostCard from "../../../../../../features/main/features/feed/components/FeedPostCard";
import PostMediaPreview from "../../../../../../features/main/features/feed/components/PostMediaPreview";
import RepostComposerModal from "../../../../../../features/main/features/feed/components/RepostComposerModal";
import SharePostModal from "../../../../../../features/main/features/feed/components/SharePostModal";
import StoryRail from "../../../../../../features/main/features/feed/components/StoryRail";
import StoryViewerModal from "../../../../../../features/main/features/feed/components/StoryViewerModal";

const makePost = (overrides = {}) => ({
  _id: "post-1",
  content: "Launch update",
  visibility: "public",
  likesCount: 3,
  commentsCount: 2,
  repostsCount: 1,
  sharesCount: 0,
  createdAt: "2026-03-18T10:00:00.000Z",
  hashtags: ["react", "vite"],
  media: [],
  userEngagement: {
    hasLiked: false,
    hasSaved: false,
    hasReposted: false,
    isFollowingAuthor: false,
    isFollowRequestPending: false,
  },
  author: {
    _id: "author-1",
    id: "author-1",
    name: "Alex Johnson",
    username: "alex",
  },
  ...overrides,
});

describe("feed extended components", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("handles feed filters tab, search, and sort changes", () => {
    const onTabChange = vi.fn();
    const onSearchChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <FeedFilters
        tabs={[
          { id: "following", label: "Following", description: "People you follow" },
          { id: "explore", label: "Explore", description: "Popular posts" },
        ]}
        activeTab="following"
        onTabChange={onTabChange}
        searchTerm=""
        onSearchChange={onSearchChange}
        sortOptions={[
          { id: "recent", label: "Recent" },
          { id: "popular", label: "Popular" },
        ]}
        sortMode="recent"
        onSortChange={onSortChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Explore/i }));
    fireEvent.change(screen.getByPlaceholderText(/Search posts, people, hashtags/i), {
      target: { value: "react" },
    });
    fireEvent.change(screen.getByDisplayValue("Recent"), {
      target: { value: "popular" },
    });

    expect(onTabChange).toHaveBeenCalledWith("explore");
    expect(onSearchChange).toHaveBeenCalledWith("react");
    expect(onSortChange).toHaveBeenCalledWith("popular");
  });

  it("renders media previews for grids and videos", () => {
    const { container } = render(
      <PostMediaPreview
        post={makePost({
          media: [
            { url: "/clip.mp4", type: "video" },
            { url: "/one.png", type: "image" },
            { url: "/two.png", type: "image" },
            { url: "/three.png", type: "image" },
            { url: "/four.png", type: "image" },
          ],
        })}
      />,
    );

    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(container.querySelectorAll("img")).toHaveLength(3);
  });

  it("renders post actions, comment controls, and reply flows", () => {
    const onToggleFollowAuthor = vi.fn();
    const onToggleReplyComposer = vi.fn();
    const onDeleteComment = vi.fn();
    const onCommentDraftChange = vi.fn();
    const onLoadMoreReplies = vi.fn();

    render(
      <FeedPostCard
        post={makePost()}
        navigateToProfile={vi.fn()}
        formatRelativeTime={() => "5m ago"}
        actionState={{}}
        onToggleLike={vi.fn()}
        onToggleComments={vi.fn()}
        onOpenRepost={vi.fn()}
        onToggleSave={vi.fn()}
        onSharePost={vi.fn()}
        onToggleFollowAuthor={onToggleFollowAuthor}
        onDeletePost={vi.fn()}
        isCommentsOpen
        comments={[
          {
            _id: "comment-1",
            content: "Nice work",
            createdAt: "2026-03-18T10:05:00.000Z",
            likesCount: 1,
            repliesCount: 2,
            hasMoreReplies: true,
            replies: [{ _id: "reply-1", content: "Thread reply", createdAt: "2026-03-18T10:06:00.000Z", likesCount: 0, userEngagement: { hasLiked: false }, author: { _id: "author-3", username: "jamie" } }],
            userEngagement: { hasLiked: false },
            author: {
              _id: "me",
              id: "me",
              name: "Riya",
              username: "riya",
            },
          },
        ]}
        commentsLoading={false}
        commentsSubmitting={false}
        commentDraft=""
        currentUserId="me"
        replyDraftsByComment={{}}
        replyComposerByComment={{}}
        replySubmittingByComment={{}}
        replyLoadingByComment={{ "comment-1": false }}
        onCommentDraftChange={onCommentDraftChange}
        onCommentSubmit={vi.fn()}
        onDeleteComment={onDeleteComment}
        onToggleCommentLike={vi.fn()}
        onToggleReplyComposer={onToggleReplyComposer}
        onReplyDraftChange={vi.fn()}
        onReplySubmit={vi.fn()}
        onLoadMoreReplies={onLoadMoreReplies}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Follow/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reply/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));
    fireEvent.change(screen.getByPlaceholderText(/Write a comment/i), {
      target: { value: "Looks great" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Load more replies/i }));

    expect(onToggleFollowAuthor).toHaveBeenCalledWith(expect.objectContaining({ _id: "post-1" }));
    expect(onToggleReplyComposer).toHaveBeenCalledWith("comment-1");
    expect(onDeleteComment).toHaveBeenCalledWith("post-1", expect.objectContaining({ _id: "comment-1" }));
    expect(onCommentDraftChange).toHaveBeenCalledWith("post-1", "Looks great");
    expect(onLoadMoreReplies).toHaveBeenCalledWith("post-1", "comment-1");
  });

  it("supports repost composer interactions", () => {
    const onChange = vi.fn();
    const onVisibilityChange = vi.fn();
    const onClose = vi.fn();
    const onQuickRepost = vi.fn();
    const onQuoteRepost = vi.fn();

    render(
      <RepostComposerModal
        post={makePost()}
        value=""
        visibility="public"
        onChange={onChange}
        onVisibilityChange={onVisibilityChange}
        onClose={onClose}
        onQuickRepost={onQuickRepost}
        onQuoteRepost={onQuoteRepost}
        submitting={false}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Add your thoughts/i), {
      target: { value: "Ship it" },
    });
    fireEvent.change(screen.getByDisplayValue("Public"), {
      target: { value: "followers" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Quick repost/i }));
    fireEvent.click(screen.getByRole("button", { name: /Quote repost/i }));
    fireEvent.click(screen.getByRole("button", { name: /Close/i }));

    expect(onChange).toHaveBeenCalledWith("Ship it");
    expect(onVisibilityChange).toHaveBeenCalledWith("followers");
    expect(onQuickRepost).toHaveBeenCalledTimes(1);
    expect(onQuoteRepost).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders share targets and submit flow", () => {
    const onTargetPress = vi.fn();
    const onToggleExpand = vi.fn();
    const onNoteChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <SharePostModal
        isOpen
        postId="post-1"
        postPreview={{ authorLabel: "alex", content: "Launch update" }}
        targets={[
          {
            id: "workspace-1",
            type: "workspace",
            label: "Workspace Alpha",
            updatedAt: "2026-03-18T10:00:00.000Z",
            subtitle: "1 active chat",
            children: [
              {
                id: "chat-node-1",
                type: "chat",
                label: "General",
                chatId: "chat-1",
                canSelect: true,
                updatedAt: "2026-03-18T10:00:00.000Z",
                subtitle: "Latest update",
              },
            ],
          },
        ]}
        expandedNodeIds={{ "workspace-1": true }}
        selectedChatIds={["chat-1"]}
        note=""
        onClose={vi.fn()}
        onTargetPress={onTargetPress}
        onToggleExpand={onToggleExpand}
        onNoteChange={onNoteChange}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByText("Workspace Alpha"));
    fireEvent.click(screen.getByText("General"));
    fireEvent.change(screen.getByPlaceholderText(/Say something about this post/i), {
      target: { value: "Please review" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Share$/i }));

    expect(onTargetPress).toHaveBeenCalledWith(expect.objectContaining({ id: "workspace-1" }));
    expect(onTargetPress).toHaveBeenCalledWith(expect.objectContaining({ chatId: "chat-1" }));
    expect(onNoteChange).toHaveBeenCalledWith("Please review");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Selected: 1/i)).toBeInTheDocument();
  });

  it("handles story rail own and external story actions", () => {
    const onOpenGroup = vi.fn();
    const onCreateStory = vi.fn();

    render(
      <StoryRail
        currentUser={{ _id: "user-1", username: "riya" }}
        groups={[
          {
            author: { _id: "user-2", username: "alex" },
            unseenCount: 1,
            hasViewedAll: false,
            stories: [{ _id: "story-2" }],
          },
          {
            author: { _id: "user-1", username: "riya" },
            unseenCount: 2,
            hasViewedAll: false,
            stories: [{ _id: "story-1" }],
          },
        ]}
        onOpenGroup={onOpenGroup}
        onCreateStory={onCreateStory}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Your Story/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add/i }));
    fireEvent.click(screen.getByRole("button", { name: /alex/i }));

    expect(onOpenGroup).toHaveBeenNthCalledWith(1, 1);
    expect(onCreateStory).toHaveBeenCalledTimes(1);
    expect(onOpenGroup).toHaveBeenNthCalledWith(2, 0);
  });

  it("renders story viewer interactions, mentions audience, and keyboard navigation", async () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onMarkViewed = vi.fn();
    const onReact = vi.fn();
    const onInspectAudience = vi.fn();
    const onOpenProfile = vi.fn();

    render(
      <StoryViewerModal
        viewer={{ groupIndex: 0, storyIndex: 0 }}
        groups={[
          {
            author: { _id: "user-1", name: "Riya", username: "riya" },
            stories: [
              {
                _id: "story-1",
                createdAt: "2026-03-18T10:00:00.000Z",
                caption: "Shipping today",
                media: { type: "image", url: "/story.png" },
                author: { _id: "user-1", name: "Riya", username: "riya" },
                viewsCount: 2,
                viewers: [
                  {
                    user: { _id: "viewer-1", name: "Alex", username: "alex" },
                    viewedAt: "2026-03-18T10:05:00.000Z",
                  },
                ],
                reactions: [{ user: { _id: "viewer-1", name: "Alex" }, emoji: "\uD83D\uDD25" }],
              },
            ],
          },
        ]}
        currentUserId="user-1"
        onClose={onClose}
        onNavigate={onNavigate}
        onMarkViewed={onMarkViewed}
        onReact={onReact}
        onInspectAudience={onInspectAudience}
        onDeleteStory={vi.fn()}
        deletingStoryId=""
        onOpenProfile={onOpenProfile}
      />,
    );

    await waitFor(() => {
      expect(onMarkViewed).toHaveBeenCalledWith(0, 0);
    });

    fireEvent.click(screen.getByText("Riya"));
    fireEvent.click(screen.getByText("\uD83D\uDD25"));
    fireEvent.click(screen.getByRole("button", { name: /Views 2/i }));
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByText("Alex"));

    expect(onOpenProfile).toHaveBeenNthCalledWith(1, "user-1");
    expect(onReact).toHaveBeenCalledWith("story-1", "\uD83D\uDD25");
    expect(onInspectAudience).toHaveBeenCalledWith("story-1");
    expect(onNavigate).toHaveBeenNthCalledWith(1, 1);
    expect(onNavigate).toHaveBeenNthCalledWith(2, -1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenProfile).toHaveBeenNthCalledWith(2, "viewer-1");
  });
});
