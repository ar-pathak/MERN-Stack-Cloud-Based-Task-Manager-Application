import { Loader2, Repeat2, SendHorizontal } from "lucide-react";

const RepostComposerModal = ({
    post,
    value,
    visibility,
    onChange,
    onVisibilityChange,
    onClose,
    onQuickRepost,
    onQuoteRepost,
    submitting
}) => {
    if (!post) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Repost</p>
                        <h3 className="text-base font-semibold text-slate-100">Share to your feed</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800/80"
                    >
                        Close
                    </button>
                </div>

                <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="line-clamp-3 text-sm text-slate-200">{post?.content}</p>
                    <p className="mt-1 text-xs text-slate-500">
                        by @{post?.author?.username || post?.author?.name || "user"}
                    </p>
                </div>

                <textarea
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="Add your thoughts for quote repost..."
                    rows={4}
                    className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-600"
                />

                <div className="mb-4">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Visibility
                    </label>
                    <select
                        value={visibility}
                        onChange={(event) => onVisibilityChange(event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 outline-none"
                    >
                        <option value="public">Public</option>
                        <option value="followers">Followers</option>
                        <option value="private">Private</option>
                        <option value="unlisted">Unlisted</option>
                    </select>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={onQuickRepost}
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                        Quick repost
                    </button>
                    <button
                        type="button"
                        onClick={onQuoteRepost}
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                        Quote repost
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RepostComposerModal;
