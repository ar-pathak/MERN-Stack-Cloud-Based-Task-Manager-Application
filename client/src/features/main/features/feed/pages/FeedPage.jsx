import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { useLoaderData } from "react-router"; // 🔥 Imported useLoaderData

import { FEED_TABS, SORT_OPTIONS } from "../constants/feed.constants";
import FeedEmptyState from "../components/FeedEmptyState";
import FeedFilters from "../components/FeedFilters";
import FeedPostCard from "../components/FeedPostCard";
import FeedSidebar from "../components/FeedSidebar";
import FeedSkeletonList from "../components/FeedSkeletonList";
import FeedToast from "../components/FeedToast";
import FeedTopBar from "../components/FeedTopBar";

// Lazy-load modals (loaded only when opened)
const RepostComposerModal = lazy(() => import("../components/RepostComposerModal"));
const SharePostModal = lazy(() => import("../components/SharePostModal"));
const StoryViewerModal = lazy(() => import("../components/StoryViewerModal"));

import StoryRail from "../components/StoryRail";
import useFeedPageLogic from "../hook/useFeedPageLogic";
import { formatRelativeTime } from "../utils/feed.helpers";

const FeedPage = () => {
    // 🔥 1. Turant loader se cached data get karein
    const initialData = useLoaderData();

    const {
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
        shareComposer,
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
        closeShareComposer,
        handleShareTargetPress,
        toggleShareNodeExpanded,
        handleShareNoteChange,
        submitShareToChat,
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
    } = useFeedPageLogic();

    // 🔥 2. Stale-While-Revalidate (SWR) Logic
    // Jab tak custom hook fetch kar raha hai, loader ka cached data dikhayein
    const displayPosts = (feedLoading && filteredPosts.length === 0)
        ? (initialData || [])
        : filteredPosts;

    // 🔥 3. Skeleton sirf tab aayega jab initialData bhi null ho (Pehli baar app open hone par)
    const showSkeleton = feedLoading && displayPosts.length === 0;

    return (
        <div className={`min-h-full bg-slate-950 ${shouldShowBottomNav ? "pb-[5.25rem]" : "pb-8"}`}>
            <div className="mx-auto w-full max-w-6xl px-3 pt-3 sm:px-4 sm:pt-4">
                <FeedTopBar
                    onCreate={() => navigate("/main/create")}
                    onRefresh={handleRefresh}
                />

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
                    <section className="min-w-0">
                        <FeedFilters
                            tabs={FEED_TABS}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            sortOptions={SORT_OPTIONS}
                            sortMode={sortMode}
                            onSortChange={setSortMode}
                        />

                        <StoryRail
                            groups={storyGroups}
                            loading={storiesLoading}
                            onOpenGroup={handleOpenStoryGroup}
                            onCreateStory={() => navigate("/main/create")}
                            currentUser={user}
                        />

                        {/* 🔥 Updated Skeleton Logic */}
                        {showSkeleton && <FeedSkeletonList />}

                        {/* 🔥 Updated Empty State Logic */}
                        {!showSkeleton && displayPosts.length === 0 && (
                            <FeedEmptyState
                                activeTab={activeTab}
                                hasSearch={Boolean(String(searchTerm || "").trim())}
                            />
                        )}

                        <div className="space-y-3">
                            {/* 🔥 Render displayPosts instead of filteredPosts */}
                            {displayPosts.map((post) => {
                                const postId = String(post?._id || "");
                                const isCommentsOpen = expandedCommentsPostId === postId;

                                return (
                                    <FeedPostCard
                                        key={postId}
                                        post={post}
                                        navigateToProfile={(id) => navigate(`/profile/${id}`)}
                                        formatRelativeTime={formatRelativeTime}
                                        actionState={actionState}
                                        onToggleLike={handleToggleLike}
                                        onToggleComments={handleToggleComments}
                                        onOpenRepost={openRepostComposer}
                                        onToggleSave={handleToggleSave}
                                        onSharePost={handleSharePost}
                                        onToggleFollowAuthor={handleToggleFollowAuthor}
                                        onDeletePost={handleDeletePost}
                                        isCommentsOpen={isCommentsOpen}
                                        comments={commentsByPost?.[postId] || []}
                                        commentsLoading={Boolean(commentsLoadingByPost?.[postId])}
                                        commentsSubmitting={Boolean(commentsSubmittingByPost?.[postId])}
                                        commentDraft={commentDrafts?.[postId] || ""}
                                        currentUserId={profileId}
                                        replyDraftsByComment={replyDraftsByComment}
                                        replyComposerByComment={replyComposerByComment}
                                        replySubmittingByComment={replySubmittingByComment}
                                        replyLoadingByComment={replyLoadingByComment}
                                        onCommentDraftChange={handleCommentDraftChange}
                                        onCommentSubmit={handleSubmitComment}
                                        onDeleteComment={handleDeleteComment}
                                        onToggleCommentLike={handleToggleCommentLike}
                                        onToggleReplyComposer={handleToggleReplyComposer}
                                        onReplyDraftChange={handleReplyDraftChange}
                                        onReplySubmit={handleSubmitReply}
                                        onLoadMoreReplies={handleLoadMoreReplies}
                                    />
                                );
                            })}
                        </div>

                        {!feedLoading && pagination?.hasMore && (
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={handleLoadMore}
                                    disabled={feedLoadingMore}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {feedLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Load more
                                </button>
                            </div>
                        )}
                    </section>

                    <FeedSidebar
                        topHashtags={topHashtags}
                        onPickTag={setSearchTerm}
                    />
                </div>
            </div>

            {/* Lazy-loaded modals - only load when opened */}
            {repostComposer?.postId && (
                <Suspense fallback={null}>
                    <RepostComposerModal
                        post={repostTargetPost}
                        value={repostComposer?.quoteText}
                        visibility={repostComposer?.visibility}
                        submitting={Boolean(repostComposer?.submitting)}
                        onChange={(value) =>
                            setRepostComposer((previous) => ({ ...previous, quoteText: value }))
                        }
                        onVisibilityChange={(value) =>
                            setRepostComposer((previous) => ({ ...previous, visibility: value }))
                        }
                        onClose={closeRepostComposer}
                        onQuickRepost={() => submitRepost("repost")}
                        onQuoteRepost={() => submitRepost("quote")}
                    />
                </Suspense>
            )}

            {Boolean(shareComposer?.postId) && (
                <Suspense fallback={null}>
                    <SharePostModal
                        isOpen={Boolean(shareComposer?.postId)}
                        postId={shareComposer?.postId}
                        postPreview={shareComposer?.postPreview}
                        targets={shareComposer?.targets || []}
                        loadingTargets={Boolean(shareComposer?.loadingTargets)}
                        selectedChatIds={shareComposer?.selectedChatIds || []}
                        expandedNodeIds={shareComposer?.expandedNodeIds || {}}
                        note={shareComposer?.note || ""}
                        submitting={Boolean(shareComposer?.sending)}
                        onClose={closeShareComposer}
                        onTargetPress={handleShareTargetPress}
                        onToggleExpand={toggleShareNodeExpanded}
                        onNoteChange={handleShareNoteChange}
                        onSubmit={submitShareToChat}
                    />
                </Suspense>
            )}

            {Boolean(storyViewer) && (
                <Suspense fallback={null}>
                    <StoryViewerModal
                        viewer={storyViewer}
                        groups={storyGroups}
                        currentUserId={profileId}
                        onClose={() => setStoryViewer(null)}
                        onNavigate={handleNavigateStory}
                        onMarkViewed={handleMarkStoryViewed}
                        onReact={handleReactToStory}
                        onInspectAudience={handleInspectStoryAudience}
                        audienceLoading={storyAudienceLoading}
                        onDeleteStory={handleDeleteStory}
                        deletingStoryId={storyDeletingId}
                        onOpenProfile={(id) => navigate(`/profile/${id}`)}
                    />
                </Suspense>
            )}

            <FeedToast toast={toast} mobile={shouldShowBottomNav} />
        </div>
    );
};

export default FeedPage;