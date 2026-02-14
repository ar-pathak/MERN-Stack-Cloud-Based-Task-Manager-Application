import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

import { toId } from "../utils/profile.helpers";

const MotionDiv = motion.div;

const PostLikesModal = ({
    open,
    postAuthorId,
    likedUsers,
    likesLoading,
    likesPagination,
    onClose,
    onLoadMore,
    onUserClick,
    getUserInitial,
    getPostDateLabel
}) => {
    return (
        <AnimatePresence>
            {open && (
                <MotionDiv
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
                >
                    <button
                        type="button"
                        aria-label="Close likes"
                        onClick={onClose}
                        className="absolute inset-0"
                    />
                    <MotionDiv
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="relative z-10 w-full max-w-xl rounded-t-2xl border border-slate-800 bg-slate-950 shadow-2xl sm:rounded-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                            <h3 className="text-sm font-semibold text-slate-100">Liked by</h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-[70dvh] overflow-y-auto p-2.5">
                            {likesLoading && likedUsers.length === 0 && (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                </div>
                            )}

                            {!likesLoading && likedUsers.length === 0 && (
                                <p className="py-8 text-center text-sm text-slate-500">
                                    No likes yet.
                                </p>
                            )}

                            <div className="space-y-1.5">
                                {likedUsers.map((entry, index) => {
                                    const userId = toId(entry);
                                    const entryKey = userId || `like-user-${index}`;
                                    const isPostAuthor =
                                        String(postAuthorId || "") === String(userId || "");

                                    return (
                                        <button
                                            key={entryKey}
                                            type="button"
                                            onClick={() => onUserClick?.(entry)}
                                            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/45 px-3 py-2 text-left hover:bg-slate-900"
                                        >
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                                                    {entry?.avatar ? (
                                                        <img
                                                            src={entry.avatar}
                                                            alt={
                                                                entry?.name ||
                                                                entry?.username ||
                                                                "User"
                                                            }
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-300">
                                                            {getUserInitial?.(entry)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-slate-100">
                                                        {entry?.name || entry?.username || "User"}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500">
                                                        @{entry?.username || "user"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {isPostAuthor && (
                                                    <span className="rounded-full bg-sky-500/15 px-2 py-1 text-[10px] font-semibold text-sky-300">
                                                        Author
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-slate-500">
                                                    {getPostDateLabel?.(entry?.likedAt)}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {Boolean(likesPagination?.hasMore) && (
                                <div className="pt-3">
                                    <button
                                        type="button"
                                        onClick={onLoadMore}
                                        disabled={likesLoading}
                                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {likesLoading ? "Loading..." : "Load more"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </MotionDiv>
                </MotionDiv>
            )}
        </AnimatePresence>
    );
};

export default PostLikesModal;
