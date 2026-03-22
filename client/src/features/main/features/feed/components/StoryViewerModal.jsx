import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Pause, Play, Trash2, UserRound, X } from "lucide-react";

const STORY_IMAGE_DURATION_MS = 6500;
const STORY_EMOJIS = [
    "\u2764\uFE0F",
    "\uD83D\uDD25",
    "\uD83D\uDC4F",
    "\uD83D\uDE2E",
    "\uD83D\uDE02"
];

const getId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);

    if (typeof value === "object" && typeof value.$oid === "string") {
        return value.$oid;
    }

    if (typeof value === "object" && value._id && value._id !== value) {
        return getId(value._id);
    }

    if (typeof value === "object" && typeof value.id === "string") {
        return value.id;
    }

    if (typeof value?.toHexString === "function") {
        return value.toHexString();
    }

    if (typeof value?.toString === "function") {
        const normalized = value.toString();
        if (normalized && normalized !== "[object Object]") {
            return normalized;
        }
    }

    return "";
};
const isRecord = (value) => Boolean(value && typeof value === "object");
const hasProfileFields = (value) =>
    isRecord(value) &&
    Boolean(value?._id || value?.id || value?.username || value?.name || value?.avatar);

const resolveProfile = (value) => {
    if (!value) return {};
    if (typeof value === "string") return { _id: value };
    if (!isRecord(value)) return {};

    if (hasProfileFields(value)) return value;
    if (hasProfileFields(value?.user)) return value.user;
    if (hasProfileFields(value?.viewer)) return value.viewer;
    if (hasProfileFields(value?.profile)) return value.profile;

    return {};
};

const formatRelativeTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 1) return "Now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
};

const getDisplayName = (profile) => profile?.name || profile?.username || "User";

const StoryViewerModal = ({
    viewer,
    groups = [],
    currentUserId,
    onClose,
    onNavigate,
    onMarkViewed,
    onReact,
    onInspectAudience,
    audienceLoading = false,
    onDeleteStory,
    deletingStoryId,
    onOpenProfile
}) => {
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [isAudienceOpen, setIsAudienceOpen] = useState(false);
    const imageElapsedRef = useRef(0);
    const imageStartedAtRef = useRef(0);
    const onMarkViewedRef = useRef(onMarkViewed);

    const activeGroup = viewer ? groups?.[viewer.groupIndex] : null;
    const activeStory = viewer ? activeGroup?.stories?.[viewer.storyIndex] : null;
    const mediaType = String(activeStory?.media?.type || "").toLowerCase() === "video" ? "video" : "image";
    const storyCount = activeGroup?.stories?.length || 0;
    const viewerGroupIndex = Number(viewer?.groupIndex ?? -1);
    const viewerStoryIndex = Number(viewer?.storyIndex ?? -1);

    useEffect(() => {
        onMarkViewedRef.current = onMarkViewed;
    }, [onMarkViewed]);

    const author = useMemo(() => {
        const storyAuthor = resolveProfile(activeStory?.author);
        if (hasProfileFields(storyAuthor)) return storyAuthor;
        return resolveProfile(activeGroup?.author);
    }, [activeGroup?.author, activeStory?.author]);

    const authorId = getId(author);
    const currentUserKey = getId(currentUserId);
    const isOwnStory = useMemo(() => {
        if (!currentUserKey) return false;
        const storyAuthorId = getId(activeStory?.author);
        const groupAuthorId = getId(activeGroup?.author);
        return [authorId, storyAuthorId, groupAuthorId].some(
            (candidate) => Boolean(candidate) && candidate === currentUserKey
        );
    }, [activeGroup?.author, activeStory?.author, authorId, currentUserKey]);

    const canGoPrev = useMemo(() => {
        if (!viewer) return false;
        return viewer.storyIndex > 0 || viewer.groupIndex > 0;
    }, [viewer]);

    const reactionByUserId = useMemo(() => {
        const map = {};
        (activeStory?.reactions || []).forEach((entry) => {
            const reactionUser = resolveProfile(entry?.user || entry?.profile || entry);
            const userId =
                getId(reactionUser) ||
                getId(entry?.user) ||
                getId(entry?.userId || entry?.id);
            if (!userId) return;
            map[userId] = entry;
        });
        return map;
    }, [activeStory?.reactions]);

    const currentReaction = useMemo(() => {
        if (activeStory?.myReaction) return activeStory.myReaction;
        return reactionByUserId[currentUserKey]?.emoji || null;
    }, [activeStory?.myReaction, currentUserKey, reactionByUserId]);

    const viewerRows = useMemo(() => {
        const audienceEntries = Array.isArray(activeStory?.viewers)
            ? activeStory.viewers
            : Array.isArray(activeStory?.audience?.viewers)
              ? activeStory.audience.viewers
              : [];

        const rows = audienceEntries.map((entry, index) => {
            const rawUser = entry?.user || entry?.viewer || entry?.profile || entry;
            const user = resolveProfile(rawUser);
            const userId =
                getId(user) || getId(rawUser) || getId(entry?.userId || entry?.viewerId || entry?.id);
            const reaction = reactionByUserId[userId];
            return {
                key: `${userId || "viewer"}-${index}`,
                userId,
                name: getDisplayName(user),
                username: user?.username || "",
                avatar: user?.avatar || null,
                viewedAt: entry?.viewedAt || entry?.seenAt || entry?.createdAt || null,
                reaction: reaction?.emoji || null
            };
        });

        return rows.sort(
            (a, b) => new Date(b?.viewedAt || 0).getTime() - new Date(a?.viewedAt || 0).getTime()
        );
    }, [activeStory?.audience?.viewers, activeStory?.viewers, reactionByUserId]);

    useEffect(() => {
        if (!activeStory?._id || viewerGroupIndex < 0 || viewerStoryIndex < 0) return;
        setPaused(false);
        setIsAudienceOpen(false);
        setProgress(0);
        imageElapsedRef.current = 0;
        imageStartedAtRef.current = Date.now();
        onMarkViewedRef.current?.(viewerGroupIndex, viewerStoryIndex);
    }, [activeStory?._id, viewerGroupIndex, viewerStoryIndex]);

    useEffect(() => {
        if (
            !viewer ||
            !activeStory ||
            mediaType === "video" ||
            paused ||
            isAudienceOpen ||
            audienceLoading
        ) {
            return undefined;
        }

        imageStartedAtRef.current = Date.now() - imageElapsedRef.current;
        
        // Use requestAnimationFrame instead of setInterval for smoother, less CPU-intensive updates
        let animationFrameId;
        const updateProgress = () => {
            const elapsed = Date.now() - imageStartedAtRef.current;
            imageElapsedRef.current = elapsed;
            const nextProgress = Math.min(100, (elapsed / STORY_IMAGE_DURATION_MS) * 100);
            setProgress(nextProgress);
            
            if (nextProgress >= 100) {
                onNavigate?.(1);
            } else {
                animationFrameId = requestAnimationFrame(updateProgress);
            }
        };
        
        animationFrameId = requestAnimationFrame(updateProgress);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [activeStory?._id, audienceLoading, isAudienceOpen, mediaType, onNavigate, paused, viewer]);

    useEffect(() => {
        if (!viewer || mediaType !== "video") return;
        setProgress(0);
        imageElapsedRef.current = 0;
        imageStartedAtRef.current = Date.now();
    }, [mediaType, viewer]);

    const handleVideoTimeUpdate = useCallback((event) => {
        const node = event.currentTarget;
        const duration = Number(node?.duration || 0);
        const currentTime = Number(node?.currentTime || 0);
        if (!duration || !Number.isFinite(duration) || !Number.isFinite(currentTime)) return;
        setProgress(Math.min(100, (currentTime / duration) * 100));
    }, []);

    useEffect(() => {
        if (!viewer) return;

        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose?.();
            if (event.key === "ArrowRight") onNavigate?.(1);
            if (event.key === "ArrowLeft") onNavigate?.(-1);
            if (event.key === " ") {
                event.preventDefault();
                if (mediaType !== "video") {
                    setPaused((prev) => !prev);
                }
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [mediaType, onClose, onNavigate, viewer]);

    const handleOpenProfile = () => {
        if (!authorId) return;
        onOpenProfile?.(authorId);
    };

    const handleToggleAudience = () => {
        const next = !isAudienceOpen;
        setIsAudienceOpen(next);
        if (next) {
            onInspectAudience?.(activeStory?._id);
        }
    };

    const handleDeleteCurrentStory = () => {
        if (!isOwnStory || !activeStory?._id) return;
        if (typeof window !== "undefined") {
            const confirmed = window.confirm("Delete this story?");
            if (!confirmed) return;
        }
        onDeleteStory?.(activeStory._id);
    };

    const isDeletingCurrentStory = String(deletingStoryId || "") === String(activeStory?._id || "");

    if (!viewer || !activeStory) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3">
            <div className="relative flex h-full max-h-[44rem] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-36 bg-gradient-to-b from-black/95 via-black/70 to-black/20" />

                <div className="absolute left-0 right-0 top-0 z-30 p-3">
                    <div className="mb-3 flex gap-1.5">
                        {Array.from({ length: storyCount }).map((_, index) => {
                            let width = 0;
                            if (index < viewer.storyIndex) width = 100;
                            if (index === viewer.storyIndex) width = progress;

                            return (
                                <div key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                                    <div
                                        className="h-full bg-white transition-[width] duration-75 ease-linear"
                                        style={{ width: `${width}%` }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleOpenProfile}
                            className="flex min-w-0 items-center gap-2 rounded-lg border border-white/15 bg-black/65 px-1.5 py-1 text-left backdrop-blur-sm hover:bg-black/75"
                        >
                            <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-300/40 bg-slate-800">
                                {author?.avatar ? (
                                    <img
                                        src={author.avatar}
                                        alt={getDisplayName(author)}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                                        {getDisplayName(author).charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                                    {getDisplayName(author)}
                                </p>
                                <p className="truncate text-xs text-slate-100/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                                    {author?.username ? `@${author.username} - ` : ""}
                                    {formatRelativeTime(activeStory?.createdAt)}
                                </p>
                            </div>
                        </button>

                        <div className="flex items-center gap-1">
                            {isOwnStory && (
                                <button
                                    type="button"
                                    onClick={handleDeleteCurrentStory}
                                    disabled={isDeletingCurrentStory}
                                    className="rounded-full bg-rose-500/40 p-2 text-white hover:bg-rose-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {mediaType !== "video" && (
                                <button
                                    type="button"
                                    onClick={() => setPaused((prev) => !prev)}
                                    className="rounded-full bg-black/45 p-2 text-white hover:bg-black/65"
                                >
                                    {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full bg-black/45 p-2 text-white hover:bg-black/65"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative flex-1 bg-black">
                    <button
                        type="button"
                        onClick={() => onNavigate?.(-1)}
                        disabled={!canGoPrev}
                        className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white hover:bg-black/65 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => onNavigate?.(1)}
                        className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white hover:bg-black/65"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    {mediaType === "video" ? (
                        <video
                            key={activeStory?._id}
                            src={activeStory?.media?.url}
                            autoPlay
                            controls
                            className="h-full w-full object-cover"
                            onTimeUpdate={handleVideoTimeUpdate}
                            onEnded={() => onNavigate?.(1)}
                        />
                    ) : (
                        <img
                            key={activeStory?._id}
                            src={activeStory?.media?.url}
                            alt="Story"
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>

                <div className="space-y-3 border-t border-slate-800 bg-slate-950/95 p-3">
                    {activeStory?.caption && (
                        <p className="text-sm leading-5 text-slate-200">{activeStory.caption}</p>
                    )}

                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                        {STORY_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onReact?.(activeStory?._id, emoji)}
                                className={`rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
                                    currentReaction === emoji
                                        ? "border-sky-400 bg-sky-500/20 text-white"
                                        : "border-slate-700 bg-slate-900/60 hover:border-slate-600"
                                }`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    {isOwnStory ? (
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={handleToggleAudience}
                                className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                Views {Number(activeStory?.viewsCount || 0)} - tap to inspect
                            </button>

                            {isAudienceOpen && (
                                <div className="max-h-40 space-y-2 overflow-y-auto scroll-smooth rounded-xl border border-slate-800 bg-slate-900/70 p-2">
                                    {audienceLoading && (
                                        <p className="text-xs text-slate-500">Loading viewers...</p>
                                    )}
                                    {!audienceLoading && viewerRows.length === 0 && (
                                        <p className="text-xs text-slate-500">No viewers yet.</p>
                                    )}

                                    {!audienceLoading &&
                                        viewerRows.map((row) => (
                                            <button
                                                key={row.key}
                                                type="button"
                                                disabled={!row.userId}
                                                onClick={() => onOpenProfile?.(row.userId)}
                                                className="flex w-full items-center justify-between rounded-lg bg-slate-950/70 px-2 py-1.5 text-left hover:bg-slate-900 disabled:cursor-default disabled:hover:bg-slate-950/70"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <div className="h-7 w-7 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                                                        {row.avatar ? (
                                                            <img
                                                                src={row.avatar}
                                                                alt={row.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                                                                <UserRound className="h-3.5 w-3.5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-medium text-slate-200">
                                                            {row.name}
                                                        </p>
                                                        <p className="truncate text-[11px] text-slate-500">
                                                            {row.username ? `@${row.username} - ` : ""}
                                                            {formatRelativeTime(row.viewedAt)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {row.reaction && (
                                                    <span className="text-sm" title="Reaction">
                                                        {row.reaction}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500">Views {Number(activeStory?.viewsCount || 0)}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryViewerModal;
