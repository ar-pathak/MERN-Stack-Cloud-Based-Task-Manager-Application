import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
    Briefcase,
    CheckSquare,
    ChevronDown,
    ChevronRight,
    FolderOpen,
    Loader2,
    MessageCircle,
    SendHorizontal,
    Square,
    X
} from "lucide-react";

const formatActivityTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const getNodeIcon = (type = "") => {
    if (type === "workspace") return Briefcase;
    if (type === "project") return FolderOpen;
    return MessageCircle;
};

const ShareNode = ({
    node,
    depth = 0,
    expandedNodeIds = {},
    selectedSet,
    onTargetPress,
    onToggleExpand
}) => {
    const hasChildren = Array.isArray(node?.children) && node.children.length > 0;
    const isExpanded = Boolean(expandedNodeIds?.[node?.id]);
    const canSelect = Boolean(node?.canSelect && node?.chatId);
    const isSelected = canSelect && selectedSet.has(String(node.chatId));
    const Icon = getNodeIcon(node?.type);

    return (
        <div>
            <div
                role="button"
                tabIndex={0}
                onClick={() => onTargetPress?.(node)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onTargetPress?.(node);
                    }
                }}
                className={`w-full cursor-pointer rounded-lg border px-2 py-2 text-left transition ${
                    isSelected
                        ? "border-sky-500/60 bg-sky-500/10"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                }`}
                style={{ paddingLeft: `${8 + depth * 14}px` }}
            >
                <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center text-slate-500">
                        {hasChildren ? (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleExpand?.(node?.id);
                                }}
                                className="rounded p-0.5 hover:bg-slate-800"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                )}
                            </button>
                        ) : (
                            <span className="h-3.5 w-3.5" />
                        )}
                    </div>

                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300">
                        <Icon className="h-3.5 w-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-slate-100">
                                {node?.label || "Untitled"}
                            </p>
                            <span className="text-[10px] text-slate-500">
                                {formatActivityTime(node?.updatedAt)}
                            </span>
                        </div>
                        <p className="truncate text-xs text-slate-500">
                            {node?.subtitle || "No recent message"}
                        </p>
                    </div>

                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center text-slate-400">
                        {canSelect ? (
                            isSelected ? (
                                <CheckSquare className="h-4 w-4 text-sky-400" />
                            ) : (
                                <Square className="h-4 w-4" />
                            )
                        ) : (
                            <span className="h-4 w-4" />
                        )}
                    </div>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="mt-1 space-y-1">
                    {node.children.map((child) => (
                        <ShareNode
                            key={child?.id}
                            node={child}
                            depth={depth + 1}
                            expandedNodeIds={expandedNodeIds}
                            selectedSet={selectedSet}
                            onTargetPress={onTargetPress}
                            onToggleExpand={onToggleExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const SharePostModal = ({
    isOpen = false,
    postId = "",
    postPreview = null,
    targets = [],
    loadingTargets = false,
    selectedChatIds = [],
    expandedNodeIds = {},
    note = "",
    submitting = false,
    onClose,
    onTargetPress,
    onToggleExpand,
    onNoteChange,
    onSubmit
}) => {
    useEffect(() => {
        if (!isOpen || typeof document === "undefined") return undefined;

        const scrollContainer = document.querySelector(".app-scroll-container");
        const previousBodyOverflow = document.body.style.overflow;
        const previousScrollOverflow = scrollContainer?.style.overflow ?? "";

        document.body.style.overflow = "hidden";

        if (scrollContainer instanceof HTMLElement) {
            scrollContainer.style.overflow = "hidden";
        }

        return () => {
            document.body.style.overflow = previousBodyOverflow;

            if (scrollContainer instanceof HTMLElement) {
                scrollContainer.style.overflow = previousScrollOverflow;
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const hasTargets = Array.isArray(targets) && targets.length > 0;
    const selectedSet = new Set((selectedChatIds || []).map((id) => String(id || "")));
    const selectedCount = selectedSet.size;

    const modalContent = (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 px-3 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-post-modal-title"
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
                <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <div>
                        <h3
                            id="share-post-modal-title"
                            className="text-sm font-semibold text-slate-100"
                        >
                            Share Post In Chats
                        </h3>
                        {postPreview && (
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                                @{postPreview?.authorLabel || "user"}:{" "}
                                {String(postPreview?.content || "").trim() || `Post ${String(postId).slice(0, 8)}...`}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="space-y-3 overflow-y-auto px-4 py-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Share Targets
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Selected: {selectedCount}
                            </p>
                        </div>

                        {loadingTargets ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Loading share targets...
                            </div>
                        ) : hasTargets ? (
                            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                                {targets.map((target) => (
                                    <ShareNode
                                        key={target?.id}
                                        node={target}
                                        expandedNodeIds={expandedNodeIds}
                                        selectedSet={selectedSet}
                                        onTargetPress={onTargetPress}
                                        onToggleExpand={onToggleExpand}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500">
                                No share targets found.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Add Note (Optional)
                        </label>
                        <textarea
                            rows={3}
                            value={note}
                            onChange={(event) => onNoteChange?.(event.target.value)}
                            placeholder="Say something about this post..."
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                        />
                    </div>
                </div>

                <footer className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={!selectedCount || loadingTargets || submitting || !hasTargets}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <SendHorizontal className="h-3.5 w-3.5" />
                        )}
                        {selectedCount > 1 ? `Share to ${selectedCount} chats` : "Share"}
                    </button>
                </footer>
            </div>
        </div>
    );

    if (typeof document !== "undefined") {
        return createPortal(modalContent, document.body);
    }

    return modalContent;
};

export default SharePostModal;
