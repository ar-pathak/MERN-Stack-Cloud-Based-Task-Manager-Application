import { CalendarClock, Loader2, Save } from "lucide-react";

import { formatDateTime, formatNumber, toLocalInputDateTime } from "../utils/dashboard.utils";

const PostManagementSection = ({
    composer,
    setComposer,
    composerError = "",
    saving = false,
    scheduledPosts = [],
    drafts = [],
    onSubmit,
    onSaveDraft,
    onResetComposer,
    onLoadDraft,
    onRemoveDraft
}) => {
    const updateComposer = (patch) => {
        setComposer((previous) => ({ ...previous, ...patch }));
    };

    return (
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">Post Management</h2>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900/80">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                            {composer?.mode === "edit" ? "Edit Post" : "Create Post"}
                        </p>
                        {composer?.mode === "edit" ? (
                            <button
                                type="button"
                                onClick={onResetComposer}
                                className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                        ) : null}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                        <select
                            value={composer?.visibility || "public"}
                            onChange={(event) => updateComposer({ visibility: event.target.value })}
                            className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none"
                        >
                            <option value="public">Public</option>
                            <option value="followers">Followers</option>
                            <option value="private">Private</option>
                            <option value="unlisted">Unlisted</option>
                        </select>

                        <select
                            value={composer?.publishMode || "now"}
                            disabled={composer?.mode === "edit"}
                            onChange={(event) => updateComposer({ publishMode: event.target.value })}
                            className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <option value="now">Publish now</option>
                            <option value="schedule">Schedule</option>
                        </select>
                    </div>

                    {composer?.publishMode === "schedule" && composer?.mode === "create" ? (
                        <input
                            type="datetime-local"
                            value={composer?.scheduledFor || ""}
                            min={toLocalInputDateTime()}
                            onChange={(event) => updateComposer({ scheduledFor: event.target.value })}
                            className="mt-2 h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none"
                        />
                    ) : null}

                    <textarea
                        value={composer?.content || ""}
                        onChange={(event) => updateComposer({ content: event.target.value })}
                        rows={6}
                        placeholder="Write post content..."
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none"
                    />

                    {composerError ? (
                        <p className="mt-2 text-xs text-rose-300">{composerError}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-slate-500">
                        {formatNumber(String(composer?.content || "").length)} / 5,000 characters
                    </p>

                    <div className="mt-2 flex gap-2">
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-sky-400 active:translate-y-[1px] disabled:cursor-not-allowed disabled:bg-sky-700"
                        >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {composer?.mode === "edit"
                                ? "Update Post"
                                : composer?.publishMode === "schedule"
                                    ? "Schedule Post"
                                    : "Create Post"}
                        </button>
                        <button
                            type="button"
                            onClick={onSaveDraft}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <CalendarClock className="h-3.5 w-3.5" />
                            Save as Draft
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900/80">
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                            Scheduled Posts
                        </p>
                        {scheduledPosts.length ? (
                            scheduledPosts.map((post) => (
                                <div
                                    key={String(post?._id || "")}
                                    className="mb-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800"
                                >
                                    <p className="line-clamp-2">{post?.contentPreview || "Post"}</p>
                                    <p className="text-[11px] text-slate-500">
                                        {formatDateTime(post?.scheduledFor)}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-500">No scheduled posts.</p>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900/80">
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                            Drafts ({formatNumber(drafts.length)})
                        </p>
                        {drafts.length ? (
                            drafts.map((draft) => (
                                <div
                                    key={String(draft.id)}
                                    className="mb-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800"
                                >
                                    <p className="line-clamp-2">{draft.content}</p>
                                    <p className="text-[11px] text-slate-500">
                                        {formatDateTime(draft.updatedAt)}
                                    </p>
                                    <div className="mt-1 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onLoadDraft(draft)}
                                            className="rounded border border-slate-700 px-1.5 py-0.5 text-[11px] transition-colors hover:border-slate-500 hover:bg-slate-700"
                                        >
                                            Load
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveDraft(draft.id)}
                                            className="rounded border border-rose-700/50 px-1.5 py-0.5 text-[11px] text-rose-300 transition-colors hover:border-rose-500/70 hover:bg-rose-500/10"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-500">No drafts saved.</p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PostManagementSection;
