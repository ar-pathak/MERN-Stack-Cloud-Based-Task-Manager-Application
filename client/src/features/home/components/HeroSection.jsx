import { motion } from "framer-motion";
import { Link } from "react-router";
import {
    ArrowRight,
    BarChart3,
    BellRing,
    ShieldCheck,
    Sparkles,
    Video
} from "lucide-react";
import { fadeUp, stagger } from "./AnimationHelpers";

const heroHighlights = [
    {
        icon: BellRing,
        title: "Real-time notifications",
        detail: "Mentions, unread updates, and workspace activity in one stream."
    },
    {
        icon: Video,
        title: "Calls inside chat",
        detail: "Start audio or video sessions directly from Aurora Connect."
    },
    {
        icon: BarChart3,
        title: "Actionable insights",
        detail: "Track growth, post analytics, and audience trends from Aurora Insights."
    },
    {
        icon: ShieldCheck,
        title: "Privacy controls",
        detail: "Role-based access, private profiles, and guarded workspace actions."
    }
];

function HeroSection() {
    return (
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-3 pb-14 pt-6 sm:px-6 sm:pt-8 lg:flex-row lg:items-center lg:py-16 lg:px-8">
            <motion.div
                className="flex-1"
                variants={stagger}
                initial="hidden"
                animate="visible"
            >
                <motion.p
                    variants={fadeUp}
                    className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-medium text-slate-200 ring-1 ring-slate-700/70 backdrop-blur sm:text-xs"
                >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 sm:h-5 sm:w-5">
                        <Sparkles className="h-3 w-3 text-cyan-300" />
                    </span>
                    <span className="block truncate sm:hidden">Aurora Workspace, Flow, Connect</span>
                    <span className="hidden sm:inline">Aurora Workspace + Aurora Flow + Aurora Connect</span>
                </motion.p>

                <motion.h1
                    variants={fadeUp}
                    className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-4xl lg:text-5xl"
                >
                    Aurora keeps workspace planning, task flow, chat, calls, and insights
                    <span className="block bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-400 bg-clip-text text-transparent">
                        moving in one connected product.
                    </span>
                </motion.h1>

                <motion.p
                    variants={fadeUp}
                    className="mt-4 max-w-xl text-[13px] leading-relaxed text-slate-300 sm:text-base"
                >
                    Build workspaces, organize projects and tasks, collaborate in real time, and
                    review analytics without jumping between disconnected tools. Aurora reflects the
                    exact flow your team uses inside the app.
                </motion.p>

                <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <Link
                        to="/main"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition-colors hover:bg-cyan-300 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                        <span className="sm:hidden">Open</span>
                        <span className="hidden sm:inline">Open Aurora</span>
                        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Link>
                    <Link
                        to="/main"
                        className="rounded-xl px-3 py-2 text-xs font-medium text-slate-200 ring-1 ring-slate-600/70 transition-colors hover:ring-slate-400 sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                        <span className="sm:hidden">Workspace</span>
                        <span className="hidden sm:inline">Go to Workspace</span>
                    </Link>
                </motion.div>

                <motion.div variants={fadeUp} className="mt-6 grid gap-3 sm:grid-cols-2">
                    {heroHighlights.map(({ icon: Icon, title, detail }) => (
                        <div
                            key={title}
                            className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-3 text-xs text-slate-300"
                        >
                            <div className="mb-2 flex items-start gap-2">
                                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                                <p className="font-semibold text-slate-100 break-words">{title}</p>
                            </div>
                            <p className="break-words leading-relaxed text-slate-400">{detail}</p>
                        </div>
                    ))}
                </motion.div>
            </motion.div>

            <motion.div
                className="relative mt-8 flex-1 lg:mt-0"
                initial={{ opacity: 0, x: 36 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
            >
                <motion.div
                    className="absolute inset-0 -translate-x-4 -translate-y-4 rounded-[30px] bg-gradient-to-br from-cyan-500/35 via-sky-500/25 to-transparent blur-xl"
                    animate={{
                        opacity: [0.36, 0.68, 0.36],
                        scale: [1, 1.03, 1]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="relative rounded-[24px] border border-slate-700/80 bg-slate-900/80 p-3 shadow-2xl shadow-sky-950/40 backdrop-blur sm:rounded-[28px] sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                        <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Aurora Workspace
                            </p>
                            <p className="mt-1 break-words text-sm font-semibold text-slate-50">
                                Product Launch Operations
                            </p>
                        </div>
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-medium text-emerald-300 sm:text-[11px]">
                            Live sync on
                        </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-cyan-300">
                                Aurora Flow
                            </p>
                            <ul className="mt-2 space-y-2 text-xs text-slate-300">
                                <li className="rounded-xl bg-slate-900/70 px-2.5 py-2 break-words">Finalize onboarding checklist</li>
                                <li className="rounded-xl bg-slate-900/70 px-2.5 py-2 break-words">Review workspace permissions</li>
                                <li className="rounded-xl bg-slate-900/70 px-2.5 py-2 break-words">Ship Q1 release notes</li>
                            </ul>
                        </div>

                        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-sky-300">
                                Aurora Connect
                            </p>
                            <div className="mt-2 space-y-2 text-xs text-slate-300">
                                <div className="rounded-xl bg-slate-900/70 px-2.5 py-2 break-words">
                                    Design team called in from workspace chat
                                </div>
                                <div className="rounded-xl bg-slate-900/70 px-2.5 py-2 break-words">
                                    Mention: "Need approval before 3:00 PM"
                                </div>
                                <div className="rounded-xl bg-slate-900/70 px-2.5 py-2 break-words">
                                    14 unread updates grouped by workspace
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3 sm:gap-3">
                        <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-3 py-2">
                            <p className="text-slate-400">Workspaces</p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">8</p>
                        </div>
                        <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-3 py-2">
                            <p className="text-slate-400">Open calls</p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">2</p>
                        </div>
                        <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-3 py-2">
                            <p className="text-slate-400">Insights score</p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">92%</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}

export default HeroSection;
