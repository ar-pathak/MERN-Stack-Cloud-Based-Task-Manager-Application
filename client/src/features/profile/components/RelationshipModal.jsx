import { useEffect } from "react";
import { Loader2, UserRound, X } from "lucide-react";

import {
    getFollowButtonState,
    toDisplayName,
    toId
} from "../utils/profile.helpers";

const RelationshipModal = ({
    open,
    title,
    users = [],
    loading,
    pagination,
    actionLoadingId,
    currentUserId,
    onClose,
    onLoadMore,
    onToggleFollow,
    onUserClick
}) => {
    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose, open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 sm:items-center sm:p-4">
            <div className="w-full max-w-xl rounded-t-2xl border border-slate-800 bg-slate-950 shadow-2xl sm:rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="max-h-[70dvh] overflow-y-auto p-2.5">
                    {loading && users.length === 0 && (
                        <div className="flex items-center justify-center py-10 text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    )}

                    {!loading && users.length === 0 && (
                        <p className="py-8 text-center text-sm text-slate-500">No users found.</p>
                    )}

                    <div className="space-y-1.5">
                        {users.map((entry) => {
                            const userId = toId(entry);
                            const isSelf = userId === currentUserId;
                            const isActionLoading = actionLoadingId === userId;
                            const followState = getFollowButtonState(entry);

                            return (
                                <div
                                    key={userId}
                                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/45 px-3 py-2"
                                >
                                    <button
                                        type="button"
                                        onClick={() => onUserClick?.(entry)}
                                        className="flex min-w-0 items-center gap-2.5 rounded-lg text-left hover:bg-slate-800/50"
                                    >
                                        <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                                            {entry?.avatar ? (
                                                <img
                                                    src={entry.avatar}
                                                    alt={toDisplayName(entry)}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                                    <UserRound className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-100">
                                                {toDisplayName(entry)}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {entry?.username ? `@${entry.username}` : ""}
                                            </p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isSelf || isActionLoading}
                                        onClick={() => onToggleFollow?.(entry)}
                                        className={`inline-flex min-w-[5.6rem] items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                            followState.tone === "following"
                                                ? "border-slate-700 bg-slate-800 text-slate-200 hover:border-red-500/40 hover:text-red-300"
                                                : followState.tone === "pending"
                                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                                                  : "border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"
                                        }`}
                                    >
                                        {isSelf ? "You" : isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : followState.label}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {Boolean(pagination?.hasMore) && (
                        <div className="pt-3">
                            <button
                                type="button"
                                onClick={onLoadMore}
                                disabled={loading}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Loading..." : "Load more"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RelationshipModal;
