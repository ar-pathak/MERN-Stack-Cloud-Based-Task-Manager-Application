import { motion } from "framer-motion";


function FlowSection() {
    const steps = [
        {
            label: "Capture",
            desc: "Turn chats, emails and ideas into structured tasks in one click, directly from your browser and tools.",
        },
        {
            label: "Organize",
            desc: "Group by project, owner or priority. Create swimlanes for squads, functions or client accounts.",
        },
        {
            label: "Track",
            desc: "See real-time progress in boards, timelines, burn-downs and workload heatmaps for every teammate.",
        },
    ];

    return (
        <section
            id="workflow"
            className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8"
        >
            <div className="rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-950/90 p-6 ring-1 ring-slate-700/80 backdrop-blur">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                            Simple flow. Powerful control.
                        </h2>
                        <p className="mt-2 max-w-lg text-sm text-slate-300 sm:text-[15px]">
                            Designed for async, remote-first work. NimbusTask Cloud keeps your
                            projects flowing even when your team is spread across time zones.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {steps.map((s, idx) => (
                        <motion.div
                            key={s.label}
                            className="relative flex flex-col gap-2 rounded-2xl bg-slate-950/60 px-4 py-3 ring-1 ring-slate-700/80"
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.4 }}
                            transition={{ duration: 0.4, delay: idx * 0.1 }}
                        >
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/15 text-[11px] font-semibold text-cyan-200">
                                    {idx + 1}
                                </span>
                                <span className="text-[13px] font-medium">{s.label}</span>
                            </div>
                            <p className="text-xs leading-relaxed text-slate-300 sm:text-[13px]">
                                {s.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
export default FlowSection;