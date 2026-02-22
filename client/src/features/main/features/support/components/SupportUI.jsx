import { ArrowUpRight, MessageCircleReply, Star } from "lucide-react";
import {
    formatDateTime,
    toIdString
} from "../utils/support.helpers";

export const TicketCommentNode = ({ node, onReply }) => {
    const commentId = toIdString(node?._id);
    const depth = Number(node?.depth || 0);
    const marginLeft = Math.min(depth, 4) * 14;
    const author = node?.author || {};
    const isAdminReply = node?.authorRole === "admin" || node?.authorModel === "AdminAccount";
    const authorName = isAdminReply
        ? "Aurora Team"
        : author?.name || node?.authorName || author?.username || "User";
    const attachments = Array.isArray(node?.attachments) ? node.attachments : [];

    return (
        <div style={{ marginLeft }} className="space-y-2">
            <div className="rounded-xl border border-slate-800/70 bg-slate-900/65 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-200">
                            {authorName}
                        </p>
                        {isAdminReply ? (
                            <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-sky-300">
                                Support Team
                            </p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-slate-500">
                            {formatDateTime(node?.createdAt)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onReply(commentId)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800/70"
                    >
                        <MessageCircleReply className="h-3 w-3" />
                        Reply
                    </button>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                    {node?.body || ""}
                </p>

                {attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {attachments.map((attachment, index) => (
                            <a
                                key={`${commentId}-attachment-${index}`}
                                href={attachment?.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-600 hover:text-slate-100"
                            >
                                {attachment?.name || "Attachment"}
                                <ArrowUpRight className="h-3 w-3" />
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {Array.isArray(node?.children) && node.children.length > 0 && (
                <div className="space-y-2">
                    {node.children.map((child) => (
                        <TicketCommentNode
                            key={toIdString(child?._id)}
                            node={child}
                            onReply={onReply}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const StarRatingInput = ({ value, onChange }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= value;
            return (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    className="rounded-md p-1 hover:bg-slate-800/70"
                    aria-label={`Set rating to ${star}`}
                >
                    <Star
                        className={`h-5 w-5 ${
                            active ? "fill-amber-400 text-amber-400" : "text-slate-600"
                        }`}
                    />
                </button>
            );
        })}
    </div>
);
