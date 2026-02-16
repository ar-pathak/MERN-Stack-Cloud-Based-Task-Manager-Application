import { motion } from "framer-motion";
import {
    BarChart3,
    FolderPlus,
    MessageSquareMore,
    Network
} from "lucide-react";

const steps = [
    {
        title: "Create your Aurora Workspace",
        icon: FolderPlus,
        body: "Start a workspace, set the context, and build the structure that your team will actually use."
    },
    {
        title: "Map projects into Aurora Flow",
        icon: Network,
        body: "Add projects, tasks, and subtasks. Keep status, assignment, and timelines visible in one place."
    },
    {
        title: "Collaborate in Aurora Connect",
        icon: MessageSquareMore,
        body: "Chat in real time, call directly from conversations, and resolve mentions without leaving the workflow."
    },
    {
        title: "Track decisions in Aurora Insights",
        icon: BarChart3,
        body: "Use dashboard metrics and activity trends to spot blockers, measure output, and improve execution."
    }
];

function FlowSection() {
    return (
        <section
            id="how-aurora-works"
            className="mx-auto w-full max-w-7xl px-3 py-12 sm:px-6 lg:px-8"
        >
            <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-950/90 p-4 backdrop-blur sm:p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">How Aurora Works</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-50 sm:text-3xl">
                    One operational loop from workspace setup to delivery insights.
                </h2>
                <p className="mt-3 max-w-3xl text-[13px] text-slate-300 sm:text-base">
                    Aurora follows the same flow as your authenticated experience: configure workspace,
                    execute through task flow, collaborate through connect, and optimize with insights.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {steps.map(({ title, icon: Icon, body }, index) => (
                        <motion.article
                            key={title}
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.35 }}
                            transition={{ duration: 0.45, delay: index * 0.08 }}
                            className="relative rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4"
                        >
                            <div className="mb-3 flex items-start gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/15 text-xs font-semibold text-cyan-200">
                                    {index + 1}
                                </div>
                                <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-2">
                                    <Icon className="h-4 w-4 text-sky-300" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-100 sm:text-base break-words">{title}</h3>
                            </div>
                            <p className="text-[13px] leading-relaxed text-slate-300 sm:text-sm">{body}</p>
                        </motion.article>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default FlowSection;
