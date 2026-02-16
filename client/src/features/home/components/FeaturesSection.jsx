import { motion } from "framer-motion";
import {
    BarChart3,
    FolderKanban,
    Lock,
    MessageSquareMore,
    Workflow
} from "lucide-react";

const accentStyles = {
    sky: "from-sky-500/20 to-cyan-500/10 border-sky-500/30 text-sky-300",
    emerald: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300",
    amber: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300",
    violet: "from-violet-500/20 to-indigo-500/10 border-violet-500/30 text-violet-300",
    rose: "from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-300"
};

const productCards = [
    {
        title: "Aurora Workspace",
        icon: FolderKanban,
        accent: "sky",
        body: "Keep workspaces, projects, teams, and task context aligned in one timeline-driven overview.",
        points: ["Nested workspace > project > task structure", "Fast create actions for workspaces and tasks"]
    },
    {
        title: "Real-time Chat (Aurora Connect)",
        icon: MessageSquareMore,
        accent: "emerald",
        body: "Collaborate where work happens with chat, mentions, unread indicators, and built-in calling.",
        points: ["Realtime messaging with typing and attachments", "Audio/video call controls inside chat panels"]
    },
    {
        title: "Task Flow (Aurora Flow)",
        icon: Workflow,
        accent: "amber",
        body: "Move work from planning to delivery with projects, subtasks, ownership, and role-aware actions.",
        points: ["Project and subtask workflows with quick edit popups", "Priority, due date, and status controls"]
    },
    {
        title: "Aurora Insights",
        icon: BarChart3,
        accent: "violet",
        body: "Track growth, post performance, audience behavior, and execution trends in advanced dashboards.",
        points: ["Core metrics and trend sections", "Filters for status, date, and post analytics"]
    },
    {
        title: "Privacy Controls",
        icon: Lock,
        accent: "rose",
        body: "Protect collaboration with private accounts, access boundaries, and workspace role permissions.",
        points: ["Owner, admin, member, viewer role model", "Private profile and permission-aware interactions"]
    }
];

function FeaturesSection() {
    return (
        <section
            id="product-overview"
            className="mx-auto w-full max-w-7xl px-3 py-12 sm:px-6 lg:px-8"
        >
            <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Product Overview</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-50 sm:text-3xl">
                    Aurora modules match the way your team already works in-app.
                </h2>
                <p className="mt-3 max-w-3xl text-[13px] text-slate-300 sm:text-base">
                    Every card below maps to implemented modules in your current product, not placeholder
                    feature marketing. The landing page now mirrors the real Aurora experience.
                </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {productCards.map(({ title, icon: Icon, accent, body, points }, index) => (
                    <motion.article
                        key={title}
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.35 }}
                        transition={{ duration: 0.45, delay: index * 0.04 }}
                        className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur"
                    >
                        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-3xl ${accentStyles[accent]}`} />
                        </div>

                        <div className="relative">
                            <div className="flex items-start gap-2">
                                <div className={`rounded-xl border bg-gradient-to-br p-2 ${accentStyles[accent]}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-100 sm:text-base break-words">{title}</h3>
                            </div>

                            <p className="mt-3 text-[13px] leading-relaxed text-slate-300 sm:text-sm">{body}</p>

                            <ul className="mt-4 space-y-2 text-xs text-slate-400">
                                {points.map((point) => (
                                    <li key={point} className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-2.5 py-2 break-words">
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.article>
                ))}
            </div>
        </section>
    );
}

export default FeaturesSection;
