import React from "react";
import {
    Bookmark,
    BookmarkCheck,
    CornerDownRight,
    Heart,
    Loader2,
    MessageCircle,
    Repeat2,
    SendHorizontal,
    Trash2,
    UserCheck,
    UserPlus
} from "lucide-react";

import PostMediaPreview from "./PostMediaPreview";
import { getInitial, getPostTimelineValue } from "../utils/feed.helpers";

const CommentItem = ({
    comment,
    postId,
    isReply = false,
    actionState,
    formatRelativeTime,
    navigateToProfile,
    currentUserId,
    postAuthorId,
    allowReply = false,
    replyDraft = "",
    replyComposerOpen = false,
    replySubmitting = false,
    replyLoading = false,
    onToggleCommentLike,
    onToggleReplyComposer,
    onReplyDraftChange,
    onReplySubmit,
    onLoadMoreReplies,
    onDeleteComment
}) => {
    const commentId = String(comment?._id || "");
    const commentAuthorId = String(comment?.author?._id || comment?.author?.id || "");
    const hasLiked = Boolean(comment?.userEngagement?.hasLiked);
    const likeActionKey = `comment-like:${commentId}`;
    const deleteActionKey = `comment-delete:${commentId}`;
    const replies = Array.isArray(comment?.replies) ? comment.replies : [];
    const canSubmitReply = Boolean(String(replyDraft || "").trim()) && !replySubmitting;
    const canDeleteComment = Boolean(
        String(currentUserId || "") &&
        (String(currentUserId || "") === commentAuthorId ||
            String(currentUserId || "") === String(postAuthorId || ""))
    );

    return (
        <div className={`rounded-lg border border-slate-800 bg-slate-900/50 ${isReply ? "p-2" : "p-2.5"}`}>
            <div className="flex items-start gap-2.5">
                <button
                    type="button"
                    onClick={() =>
                        navigateToProfile(comment?.author?._id || comment?.author?.id)
                    }
                    className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800"
                >
                    {comment?.author?.avatar ? (
                        <img
                            src={comment.author.avatar}
                            alt={comment?.author?.name || comment?.author?.username || "User"}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-300">
                            {getInitial(comment?.author)}
                        </span>
                    )}
                </button>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <button
                            type="button"
                            onClick={() =>
                                navigateToProfile(comment?.author?._id || comment?.author?.id)
                            }
                            className="truncate font-semibold text-slate-200 hover:text-sky-300"
                        >
                            @{comment?.author?.username || "user"}
                        </button>
                        <span className="text-slate-500">-</span>
                        <span className="text-slate-500">
                            {formatRelativeTime(comment?.createdAt)}
                        </span>
                    </div>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
                        {comment?.content}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onToggleCommentLike(postId, comment)}
                            disabled={Boolean(actionState?.[likeActionKey])}
                            className={`inline-flex items-center gap-1 text-xs ${
                                hasLiked
                                    ? "text-rose-300"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            {actionState?.[likeActionKey] ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Heart
                                    className={`h-3.5 w-3.5 ${
                                        hasLiked ? "fill-current" : ""
                                    }`}
                                />
                            )}
                            {Number(comment?.likesCount || 0)}
                        </button>

                        {allowReply && (
                            <button
                                type="button"
                                onClick={() => onToggleReplyComposer(commentId)}
                                className={`inline-flex items-center gap-1 text-xs ${
                                    replyComposerOpen
                                        ? "text-sky-300"
                                        : "text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                <CornerDownRight className="h-3.5 w-3.5" />
                                Reply
                            </button>
                        )}

                        {allowReply && Number(comment?.repliesCount || 0) > 0 && (
                            <span className="text-xs text-slate-500">
                                {Number(comment?.repliesCount || 0)}{" "}
                                {Number(comment?.repliesCount || 0) === 1
                                    ? "reply"
                                    : "replies"}
                            </span>
                        )}

                        {canDeleteComment && (
                            <button
                                type="button"
                                onClick={() => onDeleteComment(postId, comment)}
                                disabled={Boolean(actionState?.[deleteActionKey])}
                                className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {actionState?.[deleteActionKey] ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Delete
                            </button>
                        )}
                    </div>

                    {allowReply && replies.length > 0 && (
                        <div className="mt-3 space-y-2 border-l border-slate-800 pl-3">
                            {replies.map((reply) => (
                                <CommentItem
                                    key={reply?._id}
                                    comment={reply}
                                    postId={postId}
                                    isReply
                                    actionState={actionState}
                                    formatRelativeTime={formatRelativeTime}
                                    navigateToProfile={navigateToProfile}
                                    currentUserId={currentUserId}
                                    postAuthorId={postAuthorId}
                                    onToggleCommentLike={onToggleCommentLike}
                                    onDeleteComment={onDeleteComment}
                                />
                            ))}

                            {Boolean(comment?.hasMoreReplies) && (
                                <button
                                    type="button"
                                    onClick={() => onLoadMoreReplies(postId, commentId)}
                                    disabled={replyLoading}
                                    className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {replyLoading && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    )}
                                    Load more replies
                                </button>
                            )}
                        </div>
                    )}

                    {allowReply && replyComposerOpen && (
                        <div className="mt-3 flex items-end gap-2 max-[360px]:flex-col max-[360px]:items-stretch">
                            <textarea
                                value={replyDraft}
                                onChange={(event) =>
                                    onReplyDraftChange(commentId, event.target.value)
                                }
                                rows={2}
                                placeholder={`Reply to @${comment?.author?.username || "user"}...`}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                            />
                            <button
                                type="button"
                                onClick={() => onReplySubmit(postId, commentId)}
                                disabled={!canSubmitReply}
                                className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-sky-500 text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 max-[360px]:w-full max-[360px]:min-w-0"
                            >
                                {replySubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <SendHorizontal className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const FeedPostCard = React.memo(({
    post,
    navigateToProfile,
    formatRelativeTime,
    actionState,
    onToggleLike,
    onToggleComments,
    onOpenRepost,
    onToggleSave,
    onSharePost,
    onToggleFollowAuthor,
    onDeletePost,
    isCommentsOpen,
    comments,
    commentsLoading,
    commentsSubmitting,
    commentDraft,
    currentUserId,
    replyDraftsByComment,
    replyComposerByComment,
    replySubmittingByComment,
    replyLoadingByComment,
    onCommentDraftChange,
    onCommentSubmit,
    onDeleteComment,
    onToggleCommentLike,
    onToggleReplyComposer,
    onReplyDraftChange,
    onReplySubmit,
    onLoadMoreReplies
}) => {
    const postId = String(post?._id || "");
    const authorId = String(post?.author?._id || post?.author?.id || "");
    const hasLiked = Boolean(post?.userEngagement?.hasLiked);
    const hasSaved = Boolean(post?.userEngagement?.hasSaved);
    const isOwnPost = Boolean(String(currentUserId || "") && String(currentUserId) === authorId);
    const isFollowingAuthor = Boolean(post?.userEngagement?.isFollowingAuthor);
    const isFollowRequestPending = Boolean(post?.userEngagement?.isFollowRequestPending);
    const isFollowedByAuthor = Boolean(post?.userEngagement?.isFollowedByAuthor);
    const followActionKey = `follow:${authorId}`;
    const deletePostActionKey = `post-delete:${postId}`;
    const canSubmitComment = Boolean(String(commentDraft || "").trim()) && !commentsSubmitting;

    let followLabel = "Follow";
    let followButtonClass = "border-sky-500/40 text-sky-300 hover:bg-sky-500/10";

    if (isFollowingAuthor) {
        followLabel = "Following";
        followButtonClass = "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10";
    } else if (isFollowRequestPending) {
        followLabel = "Requested";
        followButtonClass = "border-amber-500/40 text-amber-300 hover:bg-amber-500/10";
    } else if (isFollowedByAuthor) {
        followLabel = "Follow Back";
        followButtonClass = "border-sky-500/40 text-sky-300 hover:bg-sky-500/10";
    }

    return (
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4 max-[360px]:p-3">
            <header className="mb-3 flex items-start justify-between gap-3 max-[360px]:flex-col">
                <button
                    type="button"
                    onClick={() => navigateToProfile(post?.author?._id || post?.author?.id)}
                    className="flex w-full min-w-0 items-center gap-3 text-left"
                >
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                        {post?.author?.avatar ? (
                            <img
                                src={post.author.avatar}
                                alt={post?.author?.name || post?.author?.username}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-300">
                                {getInitial(post?.author)}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">
                            {post?.author?.name || post?.author?.username || "User"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                            @{post?.author?.username || "user"} - {formatRelativeTime(getPostTimelineValue(post))}
                        </p>
                    </div>
                </button>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    {!isOwnPost && (
                        <button
                            type="button"
                            onClick={() => onToggleFollowAuthor(post)}
                            disabled={Boolean(actionState?.[followActionKey])}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 max-[360px]:px-2 max-[360px]:text-[10px] ${followButtonClass}`}
                        >
                            {actionState?.[followActionKey] ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isFollowingAuthor ? (
                                <UserCheck className="h-3 w-3" />
                            ) : (
                                <UserPlus className="h-3 w-3" />
                            )}
                            {followLabel}
                        </button>
                    )}

                    <span className="rounded-full bg-slate-800/80 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400 max-[360px]:px-1.5">
                        {post?.visibility || "public"}
                    </span>

                    {isOwnPost && (
                        <button
                            type="button"
                            onClick={() => onDeletePost(post)}
                            disabled={Boolean(actionState?.[deletePostActionKey])}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60 max-[360px]:px-2 max-[360px]:text-[10px]"
                        >
                            {actionState?.[deletePostActionKey] ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Trash2 className="h-3 w-3" />
                            )}
                            Delete
                        </button>
                    )}
                </div>
            </header>

            {post?.postType === "repost" && (
                <p className="mb-2 text-xs text-slate-400">
                    Reposted from @{post?.originalPost?.author?.username || "user"}
                </p>
            )}

            {post?.content && (
                <p className="mb-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                    {post.content}
                </p>
            )}

            <PostMediaPreview post={post} />

            {post?.originalPost && (
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="mb-1 text-xs text-slate-500">
                        Original post by @{post?.originalPost?.author?.username || "user"}
                    </p>
                    <p className="mb-2 line-clamp-3 text-sm text-slate-300">
                        {post?.originalPost?.content}
                    </p>
                    <PostMediaPreview post={post?.originalPost} compact />
                </div>
            )}

            {Array.isArray(post?.hashtags) && post.hashtags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.hashtags.slice(0, 6).map((tag) => (
                        <span
                            key={`${postId}-${tag}`}
                            className="rounded-full bg-sky-500/12 px-2 py-0.5 text-xs font-medium text-sky-300"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="mt-4 grid grid-cols-5 gap-1 rounded-xl bg-slate-900/75 p-1">
                <button
                    type="button"
                    onClick={() => onToggleLike(post)}
                    disabled={Boolean(actionState[`like:${postId}`])}
                    className={`flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs ${
                        hasLiked ? "bg-rose-500/15 text-rose-300" : "text-slate-400 hover:bg-slate-800/80"
                    }`}
                >
                    {Boolean(actionState[`like:${postId}`]) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Heart className={`h-3.5 w-3.5 ${hasLiked ? "fill-current" : ""}`} />
                    )}
                    {Number(post?.likesCount || 0)}
                </button>

                <button
                    type="button"
                    onClick={() => onToggleComments(postId)}
                    className={`flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs ${
                        isCommentsOpen
                            ? "bg-sky-500/15 text-sky-300"
                            : "text-slate-400 hover:bg-slate-800/80"
                    }`}
                >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {Number(post?.commentsCount || 0)}
                </button>

                <button
                    type="button"
                    onClick={() => onOpenRepost(post)}
                    className={`flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs ${
                        post?.userEngagement?.hasReposted
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "text-slate-400 hover:bg-slate-800/80"
                    }`}
                >
                    <Repeat2 className="h-3.5 w-3.5" />
                    {Number(post?.repostsCount || 0)}
                </button>

                <button
                    type="button"
                    onClick={() => onToggleSave(post)}
                    disabled={Boolean(actionState[`save:${postId}`])}
                    className={`flex items-center justify-center rounded-lg px-2 py-2 text-xs ${
                        hasSaved ? "bg-amber-500/15 text-amber-300" : "text-slate-400 hover:bg-slate-800/80"
                    }`}
                >
                    {Boolean(actionState[`save:${postId}`]) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        hasSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => onSharePost(post)}
                    disabled={Boolean(actionState[`share:${postId}`])}
                    className="flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-400 hover:bg-slate-800/80"
                >
                    {Boolean(actionState[`share:${postId}`]) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <SendHorizontal className="h-3.5 w-3.5" />
                    )}
                    {Number(post?.sharesCount || 0)}
                </button>
            </div>

            {isCommentsOpen && (
                <section className="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2 max-[360px]:flex-wrap">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Comments ({Number(post?.commentsCount || 0)})
                        </p>
                        {commentsLoading && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                        )}
                    </div>

                    <div className="space-y-2">
                        {comments.map((comment) => {
                            const commentId = String(comment?._id || "");

                            return (
                                <CommentItem
                                    key={commentId}
                                    comment={comment}
                                    postId={postId}
                                    actionState={actionState}
                                    formatRelativeTime={formatRelativeTime}
                                    navigateToProfile={navigateToProfile}
                                    currentUserId={currentUserId}
                                    postAuthorId={authorId}
                                    allowReply
                                    replyDraft={replyDraftsByComment?.[commentId] || ""}
                                    replyComposerOpen={Boolean(
                                        replyComposerByComment?.[commentId]
                                    )}
                                    replySubmitting={Boolean(
                                        replySubmittingByComment?.[commentId]
                                    )}
                                    replyLoading={Boolean(replyLoadingByComment?.[commentId])}
                                    onToggleCommentLike={onToggleCommentLike}
                                    onToggleReplyComposer={onToggleReplyComposer}
                                    onReplyDraftChange={onReplyDraftChange}
                                    onReplySubmit={onReplySubmit}
                                    onLoadMoreReplies={onLoadMoreReplies}
                                    onDeleteComment={onDeleteComment}
                                />
                            );
                        })}
                        {!commentsLoading && comments.length === 0 && (
                            <p className="text-xs text-slate-500">No comments yet.</p>
                        )}
                    </div>

                    <div className="mt-3 flex items-end gap-2 max-[360px]:flex-col max-[360px]:items-stretch">
                        <textarea
                            value={commentDraft || ""}
                            onChange={(event) => onCommentDraftChange(postId, event.target.value)}
                            rows={2}
                            placeholder="Write a comment..."
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                        />
                        <button
                            type="button"
                            onClick={() => onCommentSubmit(postId)}
                            disabled={!canSubmitComment}
                            className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-sky-500 text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 max-[360px]:w-full max-[360px]:min-w-0"
                        >
                            {commentsSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <SendHorizontal className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </section>
            )}
        </article>
    );
}, (prevProps, nextProps) => {
    // Check core post identity
    if (prevProps.post._id !== nextProps.post._id) return false;
    if (prevProps.isCommentsOpen !== nextProps.isCommentsOpen) return false;
    if (prevProps.currentUserId !== nextProps.currentUserId) return false;

    // Check action state for this post
    const postId = prevProps.post._id;
    if (prevProps.actionState[`like:${postId}`] !== nextProps.actionState[`like:${postId}`]) return false;
    if (prevProps.actionState[`save:${postId}`] !== nextProps.actionState[`save:${postId}`]) return false;
    if (prevProps.actionState[`share:${postId}`] !== nextProps.actionState[`share:${postId}`]) return false;

    // Check comment-related props only if comments are open for this post
    if (prevProps.isCommentsOpen) {
        const commentId = String(prevProps.post._id);
        if (JSON.stringify(prevProps.commentsByPost?.[commentId]) !== JSON.stringify(nextProps.commentsByPost?.[commentId])) return false;
        if (prevProps.commentsLoadingByPost?.[commentId] !== nextProps.commentsLoadingByPost?.[commentId]) return false;
        if (prevProps.commentsSubmittingByPost?.[commentId] !== nextProps.commentsSubmittingByPost?.[commentId]) return false;
        if (prevProps.commentDrafts?.[commentId] !== nextProps.commentDrafts?.[commentId]) return false;
    }

    return true;
});

export default FeedPostCard;
