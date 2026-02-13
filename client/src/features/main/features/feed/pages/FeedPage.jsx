import { Loader2 } from "lucide-react";

import MobileBottomNav from "../../../components/navigation/MobileBottomNav";
import { FEED_TABS, SORT_OPTIONS } from "../constants/feed.constants";
import FeedEmptyState from "../components/FeedEmptyState";
import FeedFilters from "../components/FeedFilters";
import FeedPostCard from "../components/FeedPostCard";
import FeedSidebar from "../components/FeedSidebar";
import FeedSkeletonList from "../components/FeedSkeletonList";
import FeedToast from "../components/FeedToast";
import FeedTopBar from "../components/FeedTopBar";
import RepostComposerModal from "../components/RepostComposerModal";
import StoryRail from "../components/StoryRail";
import StoryViewerModal from "../components/StoryViewerModal";
import useFeedPageLogic from "../hook/useFeedPageLogic";
import { formatRelativeTime } from "../utils/feed.helpers";

const FeedPage = () => {
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
        openRepostComposer,
        closeRepostComposer,
        submitRepost,
        handleToggleComments,
        handleSubmitComment,
        handleCommentDraftChange,
        handleLoadMore,
        handleRefresh
    } = useFeedPageLogic();

    return (
        <div className={`min-h-full bg-slate-950 ${shouldShowBottomNav ? "pb-[5.25rem]" : "pb-8"}`}>
            <div className="mx-auto w-full max-w-6xl px-3 pt-3 sm:px-4 sm:pt-4">
                <FeedTopBar
                    totalPosts={pagination?.total}
                    totalStories={storyStats.totalStories}
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

                        {feedLoading && <FeedSkeletonList />}

                        {!feedLoading && filteredPosts.length === 0 && (
                            <FeedEmptyState
                                activeTab={activeTab}
                                hasSearch={Boolean(String(searchTerm || "").trim())}
                            />
                        )}

                        <div className="space-y-3">
                            {filteredPosts.map((post) => {
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
                                        isCommentsOpen={isCommentsOpen}
                                        comments={commentsByPost?.[postId] || []}
                                        commentsLoading={Boolean(commentsLoadingByPost?.[postId])}
                                        commentsSubmitting={Boolean(commentsSubmittingByPost?.[postId])}
                                        commentDraft={commentDrafts?.[postId] || ""}
                                        onCommentDraftChange={handleCommentDraftChange}
                                        onCommentSubmit={handleSubmitComment}
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
                        storyStats={storyStats}
                        topHashtags={topHashtags}
                        onPickTag={setSearchTerm}
                    />
                </div>
            </div>

            {shouldShowBottomNav && (
                <MobileBottomNav
                    activeTab="feed"
                    profileId={profileId}
                    hidden={Boolean(storyViewer)}
                />
            )}

            {repostComposer?.postId && (
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
            )}

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

            <FeedToast toast={toast} mobile={shouldShowBottomNav} />
        </div>
    );
};

export default FeedPage;
