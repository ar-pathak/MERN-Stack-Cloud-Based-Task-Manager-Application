import { Bookmark, BookmarkCheck, Heart, Loader2, MessageCircle, Repeat2, SendHorizontal } from "lucide-react";

import PostMediaPreview from "./PostMediaPreview";
import { getInitial } from "../utils/feed.helpers";

const FeedPostCard = ({
    post,
    navigateToProfile,
    formatRelativeTime,
    actionState,
    onToggleLike,
    onToggleComments,
    onOpenRepost,
    onToggleSave,
    onSharePost,
    isCommentsOpen,
    comments,
    commentsLoading,
    commentsSubmitting,
    commentDraft,
    onCommentDraftChange,
    onCommentSubmit
}) => {
    const postId = String(post?._id || "");
    const hasLiked = Boolean(post?.userEngagement?.hasLiked);
    const hasSaved = Boolean(post?.userEngagement?.hasSaved);

    return (
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
            <header className="mb-3 flex items-start justify-between gap-3">
                <button
                    type="button"
                    onClick={() => navigateToProfile(post?.author?._id || post?.author?.id)}
                    className="flex min-w-0 items-center gap-3 text-left"
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
                            @{post?.author?.username || "user"} - {formatRelativeTime(post?.createdAt)}
                        </p>
                    </div>
                </button>

                <span className="rounded-full bg-slate-800/80 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    {post?.visibility || "public"}
                </span>
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
                    <Heart className={`h-3.5 w-3.5 ${hasLiked ? "fill-current" : ""}`} />
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
                    {hasSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                </button>

                <button
                    type="button"
                    onClick={() => onSharePost(post)}
                    disabled={Boolean(actionState[`share:${postId}`])}
                    className="flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-400 hover:bg-slate-800/80"
                >
                    <SendHorizontal className="h-3.5 w-3.5" />
                    {Number(post?.sharesCount || 0)}
                </button>
            </div>

            {isCommentsOpen && (
                <section className="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Comments
                        </p>
                        {commentsLoading && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                        )}
                    </div>

                    <div className="space-y-2">
                        {comments.map((comment) => (
                            <div
                                key={comment?._id}
                                className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5"
                            >
                                <p className="text-xs text-slate-400">
                                    @{comment?.author?.username || "user"} -{" "}
                                    {formatRelativeTime(comment?.createdAt)}
                                </p>
                                <p className="text-sm text-slate-200">{comment?.content}</p>
                            </div>
                        ))}
                        {!commentsLoading && comments.length === 0 && (
                            <p className="text-xs text-slate-500">No comments yet.</p>
                        )}
                    </div>

                    <div className="mt-3 flex items-end gap-2">
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
                            disabled={commentsSubmitting}
                            className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-sky-500 text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
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
};

export default FeedPostCard;
