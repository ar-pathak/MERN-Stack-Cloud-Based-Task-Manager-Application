import { AnimatePresence, motion } from "framer-motion";
import { Heart, Loader2, MessageSquare, Repeat2, Trash2, X } from "lucide-react";

import { toId } from "../utils/profile.helpers";

const MotionDiv = motion.div;

const PostDetailModal = ({
    open,
    post,
    onClose,
    isOwnProfile,
    currentUserId,
    postActionLoadingId,
    onDeletePost,
    onOpenLikes,
    getPostDateLabel
}) => {
    return (
        <AnimatePresence>
            {open && post && (
                <MotionDiv
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
                >
                    <button
                        type="button"
                        aria-label="Close post"
                        onClick={onClose}
                        className="absolute inset-0"
                    />
                    <MotionDiv
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        className="relative z-10 w-full max-w-2xl rounded-t-2xl border border-slate-800 bg-slate-950 shadow-2xl sm:rounded-2xl"
                    >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 max-[360px]:flex-col max-[360px]:items-stretch">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-100">
                                    {post?.author?.name || post?.author?.username || "User"}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                    @{post?.author?.username || "user"} -{" "}
                                    {getPostDateLabel?.(post?.publishedAt || post?.createdAt || post?.scheduledFor)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 max-[360px]:w-full max-[360px]:justify-between">
                                {(isOwnProfile ||
                                    String(currentUserId || "") ===
                                        String(toId(post?.author) || "")) && (
                                    <button
                                        type="button"
                                        onClick={(event) => onDeletePost?.(post, event)}
                                        disabled={postActionLoadingId === toId(post)}
                                        className="inline-flex items-center gap-1 rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {postActionLoadingId === toId(post) ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                        Delete
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[78dvh] space-y-3 overflow-y-auto p-4">
                            {post?.content && (
                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
                                    {post.content}
                                </p>
                            )}

                            {(post?.media || []).length > 0 && (
                                <div
                                    className={`grid gap-2 ${
                                        post.media.length > 1
                                            ? "grid-cols-1 sm:grid-cols-2"
                                            : "grid-cols-1"
                                    }`}
                                >
                                    {post.media.map((mediaEntry, index) => {
                                        const mediaType = String(
                                            mediaEntry?.mediaType || mediaEntry?.type || ""
                                        ).toLowerCase();
                                        const isVideo = mediaType.includes("video");

                                        return (
                                            <div
                                                key={`${toId(post)}:${index}`}
                                                className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
                                            >
                                                {isVideo ? (
                                                    <video
                                                        controls
                                                        src={mediaEntry?.url}
                                                        className="max-h-[24rem] w-full bg-black object-contain"
                                                    />
                                                ) : (
                                                    <img
                                                        src={mediaEntry?.url}
                                                        alt="Post media"
                                                        className="max-h-[24rem] w-full object-cover"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-1.5">
                                <button
                                    type="button"
                                    onClick={(event) => onOpenLikes?.(post, event)}
                                    className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-300 hover:bg-slate-800"
                                >
                                    <Heart className="h-3.5 w-3.5" />
                                    {Number(post?.likesCount || 0)}
                                </button>
                                <div className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-400">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    {Number(post?.commentsCount || 0)}
                                </div>
                                <div className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-400">
                                    <Repeat2 className="h-3.5 w-3.5" />
                                    {Number(post?.repostsCount || 0)}
                                </div>
                            </div>
                        </div>
                    </MotionDiv>
                </MotionDiv>
            )}
        </AnimatePresence>
    );
};

export default PostDetailModal;
