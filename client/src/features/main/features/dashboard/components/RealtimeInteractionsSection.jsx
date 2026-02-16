import { Activity, Heart, MessageCircle, Share2 } from "lucide-react";

import { formatDateTime } from "../utils/dashboard.utils";

const interactionMetaMap = {
    post_like: {
        label: "Like",
        icon: Heart,
        iconClassName: "text-rose-300"
    },
    post_comment: {
        label: "Comment",
        icon: MessageCircle,
        iconClassName: "text-amber-300"
    },
    post_share: {
        label: "Share",
        icon: Share2,
        iconClassName: "text-emerald-300"
    },
    comment_reply: {
        label: "Reply",
        icon: MessageCircle,
        iconClassName: "text-sky-300"
    }
};

const RealtimeInteractionsSection = ({ interactions = [] }) => (
    <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Activity className="h-4 w-4 text-cyan-400" />
                Real-time Updates
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
            </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 transition-colors hover:border-slate-700">
            {!interactions.length ? (
                <p className="px-3 py-4 text-xs text-slate-500">
                    Waiting for live post interactions...
                </p>
            ) : (
                interactions.map((interaction) => {
                    const meta = interactionMetaMap[interaction?.kind] || {};
                    const Icon = meta.icon || Activity;
                    return (
                        <div
                            key={String(interaction?.id || "")}
                            className="border-b border-slate-800 px-3 py-2 transition-colors hover:bg-slate-800/35 last:border-b-0"
                        >
                            <div className="flex items-start gap-2">
                                <Icon className={`mt-0.5 h-3.5 w-3.5 ${meta.iconClassName || "text-slate-300"}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs text-slate-200">
                                        {interaction?.message || "New interaction"}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        {meta.label || "Interaction"} -{" "}
                                        {formatDateTime(interaction?.createdAt)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    </section>
);

export default RealtimeInteractionsSection;
