import { Loader2, Send, Ticket, Upload } from "lucide-react";
import {
    CATEGORY_OPTIONS,
    PRIORITY_CLASS_MAP,
    PRIORITY_LABEL_MAP,
    PRIORITY_OPTIONS,
    STATUS_CLASS_MAP,
    STATUS_LABEL_MAP
} from "../constants/support.constants";
import {
    formatDateTime,
    formatRelativeTime,
    toIdString
} from "../utils/support.helpers";
import { TicketCommentNode } from "./SupportUI";

const TicketsSection = ({
    ticketForm,
    setTicketForm,
    ticketFiles,
    handleFileSelection,
    ticketSubmitting,
    handleCreateTicket,
    ticketStatusFilter,
    setTicketStatusFilter,
    ticketStatuses,
    ticketsLoading,
    ticketsError,
    tickets,
    selectedTicketId,
    setSelectedTicketId,
    ticketDetailLoading,
    ticketDetailError,
    ticketDetail,
    commentTree,
    setCommentReplyParentId,
    replyingToComment,
    commentBody,
    setCommentBody,
    commentFiles,
    commentSubmitting,
    handleAddComment
}) => {
    return (
        <section className="mb-4 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                <div className="mb-3 flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-violet-400" />
                    <h3 className="text-sm font-semibold text-slate-100">
                        Create Support Ticket
                    </h3>
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-3">
                    <input
                        value={ticketForm.subject}
                        onChange={(event) =>
                            setTicketForm((previous) => ({
                                ...previous,
                                subject: event.target.value
                            }))
                        }
                        placeholder="Subject"
                        minLength={3}
                        maxLength={200}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                        required
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={ticketForm.category}
                            onChange={(event) =>
                                setTicketForm((previous) => ({
                                    ...previous,
                                    category: event.target.value
                                }))
                            }
                            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500/60"
                        >
                            {CATEGORY_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={ticketForm.priority}
                            onChange={(event) =>
                                setTicketForm((previous) => ({
                                    ...previous,
                                    priority: event.target.value
                                }))
                            }
                            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500/60"
                        >
                            {PRIORITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <textarea
                        value={ticketForm.description}
                        onChange={(event) =>
                            setTicketForm((previous) => ({
                                ...previous,
                                description: event.target.value
                            }))
                        }
                        rows={5}
                        placeholder="Describe the issue clearly and include steps to reproduce."
                        minLength={10}
                        maxLength={5000}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                        required
                    />

                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800/70">
                        <Upload className="h-3.5 w-3.5" />
                        Attach screenshots
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => handleFileSelection(event, "ticket")}
                        />
                    </label>

                    {ticketFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {ticketFiles.map((file, index) => (
                                <span
                                    key={`${file.name}-${index}`}
                                    className="inline-flex rounded-full border border-slate-700 bg-slate-900/75 px-2 py-0.5 text-[11px] text-slate-400"
                                >
                                    {file.name}
                                </span>
                            ))}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={ticketSubmitting}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {ticketSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create Ticket
                    </button>
                </form>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">My Tickets</h3>

                <div className="mb-3 flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => setTicketStatusFilter("all")}
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${
                            ticketStatusFilter === "all"
                                ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                                : "border-slate-700 bg-slate-900/70 text-slate-400"
                        }`}
                    >
                        All
                    </button>
                    {ticketStatuses.map((entry) => (
                        <button
                            key={entry?.key}
                            type="button"
                            onClick={() => setTicketStatusFilter(entry?.key)}
                            className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                ticketStatusFilter === entry?.key
                                    ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                                    : "border-slate-700 bg-slate-900/70 text-slate-400"
                            }`}
                        >
                            {STATUS_LABEL_MAP[entry?.key] || entry?.key} ({Number(entry?.count || 0)})
                        </button>
                    ))}
                </div>

                {ticketsLoading && (
                    <p className="text-sm text-slate-400">Loading tickets...</p>
                )}
                {!ticketsLoading && ticketsError && (
                    <p className="text-sm text-rose-300">{ticketsError}</p>
                )}
                {!ticketsLoading && !ticketsError && tickets.length === 0 && (
                    <p className="text-sm text-slate-500">
                        No tickets for this filter.
                    </p>
                )}

                <div className="space-y-2">
                    {tickets.map((ticketItem) => {
                        const ticketId = toIdString(ticketItem?._id);
                        const isActive = selectedTicketId === ticketId;

                        return (
                            <button
                                key={ticketId}
                                type="button"
                                onClick={() => setSelectedTicketId(ticketId)}
                                className={`w-full rounded-xl border px-3 py-2 text-left ${
                                    isActive
                                        ? "border-sky-500/40 bg-sky-500/10"
                                        : "border-slate-800/70 bg-slate-900/70 hover:border-slate-700"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs text-slate-500">
                                            {ticketItem.ticketNumber}
                                        </p>
                                        <p className="line-clamp-2 text-sm font-medium text-slate-100">
                                            {ticketItem.subject}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                            STATUS_CLASS_MAP[ticketItem.status] || STATUS_CLASS_MAP.open
                                        }`}
                                    >
                                        {STATUS_LABEL_MAP[ticketItem.status] || ticketItem.status}
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Updated {formatRelativeTime(ticketItem.updatedAt)}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-100">Ticket Thread</h3>
                    {ticketDetail ? (
                        <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[11px] text-slate-400">
                            {ticketDetail.ticketNumber}
                        </span>
                    ) : null}
                </div>

                {ticketDetailLoading && (
                    <p className="text-sm text-slate-400">Loading ticket details...</p>
                )}

                {!ticketDetailLoading && ticketDetailError && (
                    <p className="text-sm text-rose-300">{ticketDetailError}</p>
                )}

                {!ticketDetailLoading && !ticketDetailError && !ticketDetail && (
                    <p className="text-sm text-slate-500">
                        Select a ticket to view conversation.
                    </p>
                )}

                {!ticketDetailLoading && !ticketDetailError && ticketDetail && (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 px-3 py-2.5">
                            <p className="text-sm font-semibold text-slate-100">
                                {ticketDetail.subject}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                                {ticketDetail.description}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span
                                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                        STATUS_CLASS_MAP[ticketDetail.status] || STATUS_CLASS_MAP.open
                                    }`}
                                >
                                    {STATUS_LABEL_MAP[ticketDetail.status] || ticketDetail.status}
                                </span>
                                <span
                                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                        PRIORITY_CLASS_MAP[ticketDetail.priority] || PRIORITY_CLASS_MAP.medium
                                    }`}
                                >
                                    {PRIORITY_LABEL_MAP[ticketDetail.priority] || ticketDetail.priority}
                                </span>
                                <span className="rounded-full border border-slate-700 bg-slate-900/75 px-2 py-0.5 text-[11px] text-slate-400">
                                    {ticketDetail.category}
                                </span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-xs text-slate-500">
                            Last update: {formatDateTime(ticketDetail.updatedAt)}
                        </div>

                        <div className="space-y-2">
                            {commentTree.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 px-3 py-3 text-sm text-slate-500">
                                    No replies yet. Add the first reply below.
                                </div>
                            )}
                            {commentTree.map((node) => (
                                <TicketCommentNode
                                    key={toIdString(node?._id)}
                                    node={node}
                                    onReply={setCommentReplyParentId}
                                />
                            ))}
                        </div>

                        <form onSubmit={handleAddComment} className="space-y-2 rounded-xl border border-slate-800/70 bg-slate-900/75 p-3">
                            {replyingToComment && (
                                <div className="flex items-start justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-2">
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-slate-400">Replying to</p>
                                        <p className="line-clamp-2 text-xs text-slate-300">
                                            {replyingToComment?.body || ""}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCommentReplyParentId("")}
                                        className="text-[11px] text-slate-400 hover:text-slate-200"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}

                            <textarea
                                value={commentBody}
                                onChange={(event) => setCommentBody(event.target.value)}
                                rows={3}
                                placeholder="Write a reply..."
                                className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                                required
                            />

                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800/70">
                                <Upload className="h-3.5 w-3.5" />
                                Attach images
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(event) => handleFileSelection(event, "comment")}
                                />
                            </label>

                            {commentFiles.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {commentFiles.map((file, index) => (
                                        <span
                                            key={`${file.name}-${index}`}
                                            className="inline-flex rounded-full border border-slate-700 bg-slate-900/75 px-2 py-0.5 text-[11px] text-slate-400"
                                        >
                                            {file.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={commentSubmitting}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {commentSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                <Send className="h-4 w-4" />
                                Send Reply
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </section>
    );
};

export default TicketsSection;
