import { motion } from "framer-motion";
import { Clock4 } from "lucide-react";

const ActivityTimeline = () => {
    const events = [
        {
            time: "10:24",
            label: "You completed “API integration for sync”.",
            type: "success",
        },
        {
            time: "09:12",
            label: "New task added to “Client Portal – V2”.",
            type: "normal",
        },
        {
            time: "Yesterday",
            label: "Cloud backup created for all workspaces.",
            type: "success",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.9)]"
        >
            {/* subtle top water / light reflection */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.4),transparent_70%)] opacity-70" />

            <div className="relative mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/80">
                        <Clock4 className="h-4 w-4 text-sky-300" />
                    </div>
                    <div>
                        <p className="text-xs font-medium">Recent activity</p>
                        <p className="text-[11px] text-slate-400">
                            What&apos;s happening across your workspace.
                        </p>
                    </div>
                </div>
                <button className="text-[11px] text-sky-300 hover:text-sky-200">
                    View all
                </button>
            </div>

            <div className="relative mt-1 space-y-2.5">
                <div className="absolute left-[10px] top-0 bottom-1 w-px bg-gradient-to-b from-sky-500/40 via-slate-600/60 to-transparent" />
                {events.map((ev, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.18 + idx * 0.05, duration: 0.32 }}
                        className="relative flex gap-3 pl-1"
                    >
                        <div className="relative mt-1">
                            <div className="h-2.5 w-2.5 rounded-full bg-slate-900">
                                <div
                                    className={`h-full w-full rounded-full border ${ev.type === "success"
                                        ? "border-emerald-400 bg-emerald-300/80"
                                        : "border-sky-400 bg-sky-300/80"
                                        }`}
                                />
                            </div>
                        </div>
                        <div className="flex-1 rounded-xl border border-slate-800/80 bg-slate-900/80 px-3 py-2.5">
                            <p className="text-[11px] text-slate-400">{ev.time}</p>
                            <p className="text-xs text-slate-100">{ev.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default ActivityTimeline;