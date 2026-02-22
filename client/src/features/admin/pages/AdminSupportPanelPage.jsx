import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, LogOut, RefreshCcw, Send, Shield, Star } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "../context/AdminAuthContext";
import {
    addAdminSupportReply,
    assignAdminSupportTicket,
    getAdminSupportFeedback,
    getAdminSupportTicketById,
    getAdminSupportTickets,
    updateAdminSupportTicketStatus
} from "../../../service/adminSupport.service";

const STATUS_OPTIONS = ["all", "open", "in_progress", "resolved", "closed"];
const ASSIGNEE_OPTIONS = ["all", "mine", "unassigned"];

const pretty = (value = "") =>
    String(value || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const formatDateTime = (value) => {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
};

const AdminSupportPanelPage = () => {
    const { admin, logout } = useAdminAuth();
    const [filters, setFilters] = useState({ status: "all", assignee: "all", search: "" });
    const [tickets, setTickets] = useState([]);
    const [summary, setSummary] = useState(null);
    const [agents, setAgents] = useState([]);
    const [selectedTicketId, setSelectedTicketId] = useState("");
    const [ticketDetail, setTicketDetail] = useState(null);
    const [feedback, setFeedback] = useState([]);
    const [feedbackSummary, setFeedbackSummary] = useState({ averageRating: 0, total: 0 });
    const [replyBody, setReplyBody] = useState("");
    const [internalNote, setInternalNote] = useState(false);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const loadTickets = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getAdminSupportTickets({
                ...filters,
                search: String(filters.search || "").trim() || undefined,
                limit: 50
            });
            const list = Array.isArray(result?.tickets) ? result.tickets : [];
            setTickets(list);
            setSummary(result?.summary || null);
            setAgents(Array.isArray(result?.agents) ? result.agents : []);
            setSelectedTicketId((previous) => (
                previous && list.some((item) => String(item?._id) === previous)
                    ? previous
                    : String(list[0]?._id || "")
            ));
        } catch (error) {
            toast.error(error?.message || "Failed to load admin tickets.");
            setTickets([]);
            setSelectedTicketId("");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const loadTicketDetail = useCallback(async (ticketId) => {
        if (!ticketId) {
            setTicketDetail(null);
            return;
        }
        setDetailLoading(true);
        try {
            const result = await getAdminSupportTicketById(ticketId);
            setTicketDetail(result || null);
        } catch (error) {
            toast.error(error?.message || "Failed to load ticket details.");
            setTicketDetail(null);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const loadFeedback = useCallback(async () => {
        try {
            const result = await getAdminSupportFeedback({ limit: 6 });
            setFeedback(Array.isArray(result?.feedback) ? result.feedback : []);
            setFeedbackSummary(result?.summary || { averageRating: 0, total: 0 });
        } catch {
            setFeedback([]);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadTickets();
            loadFeedback();
        }, 220);
        return () => clearTimeout(timer);
    }, [loadTickets, loadFeedback]);

    useEffect(() => {
        loadTicketDetail(selectedTicketId);
    }, [selectedTicketId, loadTicketDetail]);

    const handleStatus = async (status) => {
        if (!selectedTicketId) return;
        try {
            await updateAdminSupportTicketStatus(selectedTicketId, status);
            toast.success("Status updated.");
            await Promise.all([loadTickets(), loadTicketDetail(selectedTicketId)]);
        } catch (error) {
            toast.error(error?.message || "Could not update status.");
        }
    };

    const handleAssign = async (assigneeId) => {
        if (!selectedTicketId) return;
        try {
            await assignAdminSupportTicket(selectedTicketId, assigneeId);
            toast.success("Assignment updated.");
            await Promise.all([loadTickets(), loadTicketDetail(selectedTicketId)]);
        } catch (error) {
            toast.error(error?.message || "Could not update assignment.");
        }
    };

    const handleReply = async (event) => {
        event.preventDefault();
        if (!selectedTicketId || sending) return;
        try {
            setSending(true);
            await addAdminSupportReply(selectedTicketId, { body: replyBody, internalNote });
            toast.success(internalNote ? "Internal note saved." : "Aurora reply sent.");
            setReplyBody("");
            setInternalNote(false);
            await Promise.all([loadTickets(), loadTicketDetail(selectedTicketId)]);
        } catch (error) {
            toast.error(error?.message || "Could not send reply.");
        } finally {
            setSending(false);
        }
    };

    const summaryText = useMemo(() => ({
        open: Number(summary?.totals?.openTickets || 0),
        waiting: Number(summary?.totals?.waitingForReply || 0),
        unassigned: Number(summary?.totals?.unassigned || 0),
        overdue: Number(summary?.totals?.overdue || 0)
    }), [summary]);

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-4 text-slate-100">
            <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-3">
                <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-sky-300">
                                <Shield className="h-3.5 w-3.5" />
                                Aurora Admin Console
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                                {admin?.name} ({pretty(admin?.role)})
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={loadTickets}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/80"
                            >
                                <RefreshCcw className="h-3.5 w-3.5" />
                                Refresh
                            </button>
                            <button
                                type="button"
                                onClick={logout}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                Logout
                            </button>
                        </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4 text-xs">
                        <p className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1.5">Active: {summaryText.open}</p>
                        <p className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1.5">Waiting: {summaryText.waiting}</p>
                        <p className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1.5">Unassigned: {summaryText.unassigned}</p>
                        <p className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1.5">Overdue: {summaryText.overdue}</p>
                    </div>
                </header>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-3">
                    <div className="grid gap-2 md:grid-cols-3">
                        <select
                            value={filters.status}
                            onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))}
                            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-slate-300"
                        >
                            {STATUS_OPTIONS.map((entry) => <option key={entry} value={entry}>{pretty(entry)}</option>)}
                        </select>
                        <select
                            value={filters.assignee}
                            onChange={(event) => setFilters((previous) => ({ ...previous, assignee: event.target.value }))}
                            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-slate-300"
                        >
                            {ASSIGNEE_OPTIONS.map((entry) => <option key={entry} value={entry}>{pretty(entry)}</option>)}
                        </select>
                        <input
                            value={filters.search}
                            onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))}
                            placeholder="Search ticket/requester..."
                            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-slate-300"
                        />
                    </div>
                </section>

                <section className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)_20rem]">
                    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                        <h2 className="text-sm font-semibold">Queue</h2>
                        {loading ? (
                            <p className="mt-3 inline-flex items-center gap-1 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading...</p>
                        ) : (
                            <div className="mt-3 space-y-2">
                                {tickets.map((ticket) => (
                                    <button
                                        key={String(ticket?._id)}
                                        type="button"
                                        onClick={() => setSelectedTicketId(String(ticket?._id))}
                                        className={`w-full rounded-xl border px-3 py-2 text-left ${
                                            String(ticket?._id) === selectedTicketId
                                                ? "border-sky-500/40 bg-sky-500/10"
                                                : "border-slate-800 bg-slate-900/70"
                                        }`}
                                    >
                                        <p className="text-[11px] text-slate-500">{ticket?.ticketNumber}</p>
                                        <p className="line-clamp-2 text-sm text-slate-200">{ticket?.subject}</p>
                                        <p className="mt-1 text-[11px] text-slate-500">{pretty(ticket?.status)} • {pretty(ticket?.priority)}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </article>

                    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                        <h2 className="text-sm font-semibold">Thread</h2>
                        {detailLoading ? (
                            <p className="mt-3 inline-flex items-center gap-1 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading...</p>
                        ) : !ticketDetail ? (
                            <p className="mt-3 text-sm text-slate-500">Select a ticket.</p>
                        ) : (
                            <div className="mt-3 space-y-3">
                                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                                    <p className="text-xs text-slate-500">{ticketDetail?.ticketNumber}</p>
                                    <p className="text-base font-semibold">{ticketDetail?.subject}</p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{ticketDetail?.description}</p>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <select
                                        value={ticketDetail?.status || "open"}
                                        onChange={(event) => handleStatus(event.target.value)}
                                        className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-slate-300"
                                    >
                                        {STATUS_OPTIONS.filter((entry) => entry !== "all").map((entry) => (
                                            <option key={entry} value={entry}>{pretty(entry)}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={String(ticketDetail?.assignee?._id || "")}
                                        onChange={(event) => handleAssign(event.target.value)}
                                        className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-slate-300"
                                    >
                                        <option value="">Unassigned</option>
                                        {agents.map((agent) => (
                                            <option key={String(agent?._id)} value={String(agent?._id)}>
                                                {agent?.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="max-h-[22rem] space-y-2 overflow-auto">
                                    {(ticketDetail?.comments || []).map((comment) => {
                                        const adminReply = comment?.authorRole === "admin" || comment?.authorModel === "AdminAccount";
                                        return (
                                            <div key={String(comment?._id)} className={`rounded-xl border px-3 py-2 ${adminReply ? "border-sky-500/30 bg-sky-500/10" : "border-slate-800 bg-slate-900/75"}`}>
                                                <div className="flex justify-between gap-2">
                                                    <p className="text-xs font-semibold">{adminReply ? "Aurora Team" : (comment?.author?.name || comment?.authorName || "User")}</p>
                                                    <p className="text-[11px] text-slate-500">{formatDateTime(comment?.createdAt)}</p>
                                                </div>
                                                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{comment?.body || ""}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                                <form onSubmit={handleReply} className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                                    <textarea
                                        value={replyBody}
                                        onChange={(event) => setReplyBody(event.target.value)}
                                        rows={4}
                                        required
                                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                                        placeholder="Write reply..."
                                    />
                                    <label className="inline-flex items-center gap-2 text-xs text-slate-400">
                                        <input type="checkbox" checked={internalNote} onChange={(event) => setInternalNote(event.target.checked)} />
                                        Internal note (not visible to user)
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={sending}
                                        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-sm text-sky-100"
                                    >
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        {internalNote ? "Add Internal Note" : "Send Aurora Reply"}
                                    </button>
                                </form>
                            </div>
                        )}
                    </article>

                    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                        <h2 className="text-sm font-semibold">Feedback</h2>
                        <p className="mt-1 text-xs text-slate-500">Avg {Number(feedbackSummary?.averageRating || 0).toFixed(2)} • {feedbackSummary?.total || 0}</p>
                        <div className="mt-3 space-y-2">
                            {feedback.map((item) => (
                                <div key={String(item?._id)} className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] text-slate-500">{pretty(item?.type)}</p>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((value) => (
                                                <Star key={`${String(item?._id)}-${value}`} className={`h-3.5 w-3.5 ${value <= Number(item?.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-700"}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="mt-1 line-clamp-3 text-sm text-slate-300">{item?.message || ""}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(item?.createdAt)}</p>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                <footer className="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-500">
                    Replies from this panel appear to users as <span className="font-semibold text-slate-300">Aurora Team</span>.
                </footer>
            </section>
        </main>
    );
};

export default AdminSupportPanelPage;
