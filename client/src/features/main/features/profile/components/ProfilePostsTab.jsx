import React from "react";
import { Loader2, Lock, Trash2 } from "lucide-react";

import { toId } from "../utils/profile.helpers";
import { getRichTextPreview } from "../../../utils/richText";

const PostItem = React.memo(({
    post,
    onOpenPost,
    onDeletePost,
    onOpenLikes,
    isOwnProfile,
    currentUserId,
    postActionLoadingId,
    getPostDateLabel
}) => {
    const postId = toId(post);
    const canDeletePost =
        isOwnProfile ||
        String(currentUserId || "") ===
            String(toId(post?.author) || "");

    return (
        <article
            key={postId}
            role="button"
            tabIndex={0}
            onClick={() => onOpenPost?.(post)}
            onKeyDown={(event) => {
                if (event.currentTarget !== event.target) return;
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenPost?.(post);
                }
            }}
            className="group rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-left transition hover:border-slate-700 hover:bg-slate-900/80 max-[360px]:p-2.5"
        >
            <div className="flex items-start justify-between gap-3 max-[360px]:flex-col">
                <div className="min-w-0">
                    <p className="text-[11px] text-slate-500">
                        {getPostDateLabel?.(post?.publishedAt || post?.createdAt || post?.scheduledFor)}
                    </p>
                    {post?.content && (
                        <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                            {getRichTextPreview(post.content, 280)}
                        </p>
                    )}
                </div>
                {canDeletePost && (
                    <button
                        type="button"
                        onClick={(event) => onDeletePost?.(post, event)}
                        disabled={postActionLoadingId === postId}
                        className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60 max-[360px]:self-start"
                    >
                        {postActionLoadingId === postId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                    </button>
                )}
            </div>

            {(post?.media || []).length > 0 && (
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                    <img
                        src={post.media[0]?.url}
                        alt="Post media"
                        className="h-48 w-full object-cover sm:h-56"
                    />
                </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <button
                    type="button"
                    onClick={(event) => onOpenLikes?.(post, event)}
                    className="rounded px-1 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-sky-300"
                >
                    {Number(post?.likesCount || 0)} likes
                </button>
                <span>{Number(post?.commentsCount || 0)} comments</span>
                <span>{Number(post?.repostsCount || 0)} reposts</span>
            </div>
        </article>
    );
}, (prevProps, nextProps) => {
    return prevProps.post._id === nextProps.post._id &&
           prevProps.postActionLoadingId === nextProps.postActionLoadingId &&
           prevProps.isOwnProfile === nextProps.isOwnProfile &&
           prevProps.currentUserId === nextProps.currentUserId;
});

const ProfilePostsTab = ({
    canViewProtectedContent,
    isBlockedByMe,
    isBlockedMe,
    posts,
    postsAccessMessage,
    onOpenPost,
    onDeletePost,
    onOpenLikes,
    isOwnProfile,
    currentUserId,
    postActionLoadingId,
    getPostDateLabel,
    postsPagination,
    postsLoadingMore,
    onLoadMorePosts
}) => {
    return (
        <div className="space-y-3">
            {!canViewProtectedContent ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center">
                    <Lock className="mx-auto h-6 w-6 text-slate-500" />
                    <p className="mt-2 text-sm font-medium text-slate-300">
                        {isBlockedByMe
                            ? "You blocked this user"
                            : isBlockedMe
                              ? "You cannot view this profile"
                              : "This profile is private"}
                    </p>
                </div>
            ) : posts.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                    {postsAccessMessage || "No posts yet."}
                </p>
            ) : (
                <>
                    {posts.map((post) => (
                        <PostItem
                            key={toId(post)}
                            post={post}
                            onOpenPost={onOpenPost}
                            onDeletePost={onDeletePost}
                            onOpenLikes={onOpenLikes}
                            isOwnProfile={isOwnProfile}
                            currentUserId={currentUserId}
                            postActionLoadingId={postActionLoadingId}
                            getPostDateLabel={getPostDateLabel}
                        />
                    ))}

                    {Boolean(postsPagination?.hasMore) && (
                        <button
                            type="button"
                            onClick={onLoadMorePosts}
                            disabled={postsLoadingMore}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                        >
                            {postsLoadingMore ? "Loading..." : "Load more posts"}
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default ProfilePostsTab;
