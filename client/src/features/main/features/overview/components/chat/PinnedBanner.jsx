import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, X } from "lucide-react";

const getPinnedAtTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

const getPinnedPreview = (message) => {
    const text = String(message?.content || message?.text || "").trim();
    if (text) return text;

    if (message?.type === "post" || message?.sharedPost) {
        return "Shared a post";
    }

    if (Array.isArray(message?.attachments) && message.attachments.length > 0) {
        return `${message.attachments.length} attachment${message.attachments.length > 1 ? "s" : ""}`;
    }

    return "Pinned message";
};

const getSenderLabel = (message) =>
    message?.senderId?.name ||
    message?.senderId?.username ||
    message?.sender?.name ||
    "Unknown user";

const getPinnedByLabel = (message) =>
    message?.pinnedBy?.name || message?.pinnedBy?.username || "";

const PinnedBanner = ({
    pinnedMessages,
    onViewPinned,
    onJumpToMessage,
    onTogglePin,
    maxPinnedMessages = 5
}) => {
    const orderedPinned = useMemo(() => {
        const list = Array.isArray(pinnedMessages) ? [...pinnedMessages] : [];
        return list.sort((a, b) => {
            const aTime = new Date(a?.pinnedAt || a?.createdAt || 0).getTime();
            const bTime = new Date(b?.pinnedAt || b?.createdAt || 0).getTime();
            return bTime - aTime;
        });
    }, [pinnedMessages]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth <= 360;
    });

    useEffect(() => {
        if (orderedPinned.length === 0) {
            setActiveIndex(0);
            return;
        }
        setActiveIndex((prev) => Math.min(prev, orderedPinned.length - 1));
    }, [orderedPinned.length]);

    if (!orderedPinned.length) return null;

    const activePinned = orderedPinned[activeIndex];
    const activeMessageId = activePinned?._id || activePinned?.id;
    const previewText = getPinnedPreview(activePinned);
    const senderLabel = getSenderLabel(activePinned);
    const pinnedByLabel = getPinnedByLabel(activePinned);
    const pinnedAtTime = getPinnedAtTime(activePinned?.pinnedAt);
    const pinUsageLabel = `${orderedPinned.length}/${maxPinnedMessages}`;

    const goNext = () => {
        setActiveIndex((prev) => (prev + 1) % orderedPinned.length);
    };

    const goPrev = () => {
        setActiveIndex((prev) => (prev - 1 + orderedPinned.length) % orderedPinned.length);
    };

    const handleToggleCollapsed = () => {
        setIsCollapsed((prev) => !prev);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 px-2.5 py-2.5 max-[300px]:px-1.5 max-[300px]:py-2 sm:px-4 md:px-6"
            >
                <div className="flex items-start gap-2 max-[300px]:gap-1.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/10 max-[300px]:h-7 max-[300px]:w-7">
                        <Pin className="h-4 w-4 text-amber-300 max-[300px]:h-3.5 max-[300px]:w-3.5" fill="currentColor" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 max-[300px]:gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-300 max-[300px]:text-[10px]">
                                Pinned
                            </span>
                            <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200 max-[300px]:px-1 max-[300px]:text-[9px]">
                                {pinUsageLabel}
                            </span>
                            {orderedPinned.length > 1 ? (
                                <span className="text-[10px] text-amber-200/80 max-[300px]:text-[9px]">
                                    {activeIndex + 1} of {orderedPinned.length}
                                </span>
                            ) : null}
                        </div>

                        {!isCollapsed ? (
                            <>
                                <p className="mt-0.5 line-clamp-1 text-sm text-slate-200 max-[300px]:text-xs">{previewText}</p>
                                <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400 max-[300px]:text-[10px]">
                                    {senderLabel}
                                    {pinnedByLabel ? ` | pinned by ${pinnedByLabel}` : ""}
                                    {pinnedAtTime ? ` | ${pinnedAtTime}` : ""}
                                </p>
                            </>
                        ) : (
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-300 max-[300px]:text-[11px]">
                                {orderedPinned.length} pinned message{orderedPinned.length > 1 ? "s" : ""}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-1 max-[300px]:gap-0.5">
                        {orderedPinned.length > 1 && !isCollapsed ? (
                            <>
                                <button
                                    type="button"
                                    onClick={goPrev}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/20 text-amber-200 transition hover:bg-amber-500/10 max-[300px]:h-6 max-[300px]:w-6"
                                    aria-label="Previous pinned message"
                                >
                                    <ChevronLeft className="h-4 w-4 max-[300px]:h-3.5 max-[300px]:w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/20 text-amber-200 transition hover:bg-amber-500/10 max-[300px]:h-6 max-[300px]:w-6"
                                    aria-label="Next pinned message"
                                >
                                    <ChevronRight className="h-4 w-4 max-[300px]:h-3.5 max-[300px]:w-3.5" />
                                </button>
                            </>
                        ) : null}

                        <button
                            type="button"
                            onClick={handleToggleCollapsed}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-900/60 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition hover:bg-slate-800 max-[300px]:h-6 max-[300px]:w-6 max-[300px]:px-0"
                            aria-label={isCollapsed ? "Expand pinned banner" : "Collapse pinned banner"}
                        >
                            {isCollapsed ? (
                                <ChevronDown className="h-3.5 w-3.5 max-[300px]:h-3 max-[300px]:w-3" />
                            ) : (
                                <ChevronUp className="h-3.5 w-3.5 max-[300px]:h-3 max-[300px]:w-3" />
                            )}
                            <span className="max-[340px]:hidden">
                                {isCollapsed ? "Expand" : "Collapse"}
                            </span>
                        </button>
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {!isCollapsed ? (
                        <motion.div
                            key="pinned-actions"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 flex flex-wrap items-center gap-1.5 max-[300px]:mt-1.5 max-[300px]:gap-1"
                        >
                            {onJumpToMessage && activeMessageId ? (
                                <button
                                    type="button"
                                    onClick={() => onJumpToMessage(activeMessageId)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-100 transition hover:bg-amber-500/20 max-[300px]:px-1.5 max-[300px]:py-0.5 max-[300px]:text-[10px]"
                                >
                                    <Pin className="h-3.5 w-3.5 max-[300px]:h-3 max-[300px]:w-3" />
                                    Jump
                                </button>
                            ) : null}

                            {onTogglePin && activeMessageId ? (
                                <button
                                    type="button"
                                    onClick={() => onTogglePin(activeMessageId)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-slate-800 max-[300px]:px-1.5 max-[300px]:py-0.5 max-[300px]:text-[10px]"
                                >
                                    <X className="h-3.5 w-3.5 max-[300px]:h-3 max-[300px]:w-3" />
                                    Unpin
                                </button>
                            ) : null}

                            {orderedPinned.length > 1 && onViewPinned ? (
                                <button
                                    type="button"
                                    onClick={onViewPinned}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-slate-800 max-[300px]:px-1.5 max-[300px]:py-0.5 max-[300px]:text-[10px]"
                                >
                                    <Eye className="h-3.5 w-3.5 max-[300px]:h-3 max-[300px]:w-3" />
                                    View all
                                </button>
                            ) : null}
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
};

export default PinnedBanner;
