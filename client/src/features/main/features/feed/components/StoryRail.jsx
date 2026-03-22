import { Loader2, Plus } from "lucide-react";

const StoryRail = ({
    groups = [],
    loading = false,
    onOpenGroup,
    onCreateStory,
    currentUser
}) => {
    const userLabel = currentUser?.username || currentUser?.name || "You";
    const userAvatar = currentUser?.avatar || null;
    const currentUserId = String(currentUser?._id || currentUser?.id || "");

    const ownGroupIndex = groups.findIndex(
        (group) => String(group?.author?._id || group?.author || "") === currentUserId
    );
    const ownGroup = ownGroupIndex >= 0 ? groups[ownGroupIndex] : null;
    const ownHasStories = Boolean(ownGroup?.stories?.length);
    const ownUnseenCount = Number(ownGroup?.unseenCount || 0);

    const visibleGroups = groups
        .map((group, index) => ({ group, index }))
        .filter(({ group }) => String(group?.author?._id || group?.author || "") !== currentUserId);

    const handleOwnStoryClick = () => {
        if (ownHasStories) {
            onOpenGroup?.(ownGroupIndex);
            return;
        }
        onCreateStory?.();
    };

    return (
        <div className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-900/45 p-3">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Stories
                </p>
                <button
                    type="button"
                    onClick={onCreateStory}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sky-300 hover:bg-sky-500/10"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
                <button
                    type="button"
                    onClick={handleOwnStoryClick}
                    className="flex min-w-[4.9rem] flex-col items-center gap-1.5"
                >
                    <div
                        className={`relative h-14 w-14 bg-slate-900/70 p-[2px] ${
                            ownHasStories
                                ? `rounded-full ${ownUnseenCount > 0 ? "bg-gradient-to-tr from-rose-500 via-orange-400 to-sky-400" : "bg-slate-700"}`
                                : "rounded-full border-2 border-dashed border-sky-500/60"
                        }`}
                    >
                        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-800">
                            {userAvatar ? (
                                <img loading="lazy" src={userAvatar} alt={userLabel} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-xs font-semibold text-slate-300">
                                    {userLabel.charAt(0)}
                                </span>
                            )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
                            <Plus className="h-3.5 w-3.5" />
                        </span>
                        {ownHasStories && ownUnseenCount > 0 && (
                            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                {ownUnseenCount}
                            </span>
                        )}
                    </div>
                    <span className="max-w-[4.9rem] truncate text-[11px] text-slate-300">Your Story</span>
                </button>

                {loading && (
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-slate-800 bg-slate-900/60">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                )}

                {!loading &&
                    visibleGroups.map(({ group, index }) => {
                        const author = group?.author || {};
                        const hasViewedAll = Boolean(group?.hasViewedAll);
                        const unseenCount = Number(group?.unseenCount || 0);

                        return (
                            <button
                                key={author?._id || index}
                                type="button"
                                onClick={() => onOpenGroup(index)}
                                className="flex min-w-[4.9rem] flex-col items-center gap-1.5"
                            >
                                <div
                                    className={`relative h-14 w-14 rounded-full p-[2px] ${
                                        hasViewedAll
                                            ? "bg-slate-700"
                                            : "bg-gradient-to-tr from-rose-500 via-orange-400 to-sky-400"
                                    }`}
                                >
                                    <div className="h-full w-full overflow-hidden rounded-full border-2 border-slate-950 bg-slate-800">
                                        {author?.avatar ? (
                                            <img
                                                src={author.avatar}
                                                alt={author?.name || author?.username || "User"}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-300">
                                                {(author?.name || author?.username || "U").charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    {unseenCount > 0 && (
                                        <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                            {unseenCount}
                                        </span>
                                    )}
                                </div>
                                <span className="max-w-[4.9rem] truncate text-[11px] text-slate-300">
                                    {author?.username || author?.name || "User"}
                                </span>
                            </button>
                        );
                    })}
            </div>
        </div>
    );
};

export default StoryRail;
