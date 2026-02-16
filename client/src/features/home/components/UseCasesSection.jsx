import { motion } from "framer-motion";
import { Activity, BellRing, Video } from "lucide-react";

const previewActivity = [
    { type: "Workspace", text: "Growth Workspace created by Priya" },
    { type: "Task Flow", text: "Q1 launch checklist moved to In Progress" },
    { type: "Connect", text: "Design review call started in Product chat" },
    { type: "Insights", text: "Weekly performance report generated" }
];

const previewMessages = [
    { sender: "Aman", message: "Can we lock copy for the release post?", time: "09:12" },
    { sender: "Leena", message: "Yes, adding final notes in Aurora Flow.", time: "09:14" },
    { sender: "Ravi", message: "Joining call in 2 min.", time: "09:15" }
];

function PreviewCard({ title, subtitle, children }) {
    return (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3 backdrop-blur sm:p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{subtitle}</p>
            <h3 className="mt-1 text-sm font-semibold text-slate-100 sm:text-base break-words">{title}</h3>
            <div className="mt-4">{children}</div>
        </div>
    );
}

function UseCasesSection() {
    return (
        <section
            id="live-preview"
            className="mx-auto w-full max-w-7xl px-3 py-12 sm:px-6 lg:px-8"
        >
            <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live Feature Preview</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-50 sm:text-3xl">
                    A landing preview built with the same panel language as Aurora screens.
                </h2>
                <p className="mt-3 max-w-3xl text-[13px] text-slate-300 sm:text-base">
                    This mock stream mirrors your workspace timeline, chat/call behavior, and insights pulse
                    so users understand the real product before signing in.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.15fr,1fr]">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.5 }}
                >
                    <PreviewCard title="Aurora Workspace Stream" subtitle="Activity Timeline">
                        <div className="space-y-2 text-sm">
                            {previewActivity.map((entry) => (
                                <div
                                    key={entry.text}
                                    className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-3 py-2"
                                >
                                    <p className="text-xs uppercase tracking-[0.12em] text-sky-300">{entry.type}</p>
                                    <p className="mt-1 break-words text-slate-300">{entry.text}</p>
                                </div>
                            ))}
                        </div>
                    </PreviewCard>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4"
                >
                    <PreviewCard title="Aurora Connect" subtitle="Realtime Chat and Calling">
                        <div className="space-y-2">
                            {previewMessages.map((message) => (
                                <div
                                    key={`${message.sender}-${message.time}`}
                                    className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-3 py-2"
                                >
                                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                                        <span className="font-medium text-slate-200 break-words">{message.sender}</span>
                                        <span>{message.time}</span>
                                    </div>
                                    <p className="mt-1 break-words text-sm text-slate-300">{message.message}</p>
                                </div>
                            ))}
                            <div className="mt-2 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                                <Video className="mt-0.5 h-4 w-4 shrink-0" />
                                Product team call active - 4 participants
                            </div>
                        </div>
                    </PreviewCard>

                    <PreviewCard title="Aurora Insights Snapshot" subtitle="Dashboard Pulse">
                        <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 px-2 py-2">
                                <BellRing className="mx-auto h-4 w-4 text-cyan-300" />
                                <p className="mt-1 text-[11px] text-slate-400">Unread</p>
                                <p className="text-sm font-semibold text-slate-100">27</p>
                            </div>
                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 px-2 py-2">
                                <Activity className="mx-auto h-4 w-4 text-emerald-300" />
                                <p className="mt-1 text-[11px] text-slate-400">Completed</p>
                                <p className="text-sm font-semibold text-slate-100">64</p>
                            </div>
                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 px-2 py-2">
                                <Video className="mx-auto h-4 w-4 text-violet-300" />
                                <p className="mt-1 text-[11px] text-slate-400">Calls</p>
                                <p className="text-sm font-semibold text-slate-100">5</p>
                            </div>
                        </div>
                    </PreviewCard>
                </motion.div>
            </div>
        </section>
    );
}

export default UseCasesSection;
