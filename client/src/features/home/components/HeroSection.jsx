import { motion } from "framer-motion";
import { fadeUp, stagger } from "./AnimationHelpers";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import Column from "./Column";
import Stat from "./Stat";
function HeroSection() {
    return (
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-16 pt-8 sm:px-6 lg:flex-row lg:items-center lg:py-20 lg:px-8">
            {/* Left: content */}
            <motion.div
                className="flex-1"
                variants={stagger}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    variants={fadeUp}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-slate-700/70 backdrop-blur"
                >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20">
                        <Sparkles className="h-3 w-3 text-cyan-300" />
                    </span>
                    Cloud-native task manager for fast-moving teams
                </motion.div>

                <motion.h1
                    variants={fadeUp}
                    className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-4xl lg:text-5xl"
                >
                    Bring every task, teammate & deadline
                    <span className="block bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-400 bg-clip-text text-transparent">
                        together in one cloud workspace.
                    </span>
                </motion.h1>

                <motion.p
                    variants={fadeUp}
                    className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base"
                >
                    NimbusTask Cloud keeps tasks, sprints, docs and team updates perfectly
                    in sync across devices. Real-time updates, smart automations and rich
                    timelines help your team ship on time—without the chaos of scattered tools.
                </motion.p>

                <motion.div
                    variants={fadeUp}
                    className="mt-6 flex flex-wrap items-center gap-3"
                >
                    <button className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 hover:bg-cyan-300">
                        Create free workspace
                        <ArrowRight className="h-4 w-4" />
                    </button>
                    <button className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-200 ring-1 ring-slate-600/70 hover:ring-slate-400">
                        Explore live demo
                    </button>
                </motion.div>

                <motion.div
                    variants={fadeUp}
                    className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-300 sm:text-[13px]"
                >
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                        <span>No credit card · 14-day free trial</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-cyan-300" />
                        <span>End-to-end encrypted, SOC2-ready</span>
                    </div>
                </motion.div>
            </motion.div>

            {/* Right: “water / cloud” dashboard preview */}
            <motion.div
                className="relative mt-6 flex-1 lg:mt-0"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
            >
                {/* liquid border */}
                <motion.div
                    className="absolute inset-0 -translate-x-4 -translate-y-4 rounded-[32px] bg-gradient-to-br from-cyan-400/40 via-sky-500/30 to-transparent blur-xl"
                    animate={{
                        opacity: [0.35, 0.7, 0.35],
                        scale: [1, 1.03, 1],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="relative rounded-[28px] border border-slate-600/60 bg-slate-900/80 p-4 shadow-2xl shadow-sky-900/60 backdrop-blur">
                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                                Cloud workspace
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-50">
                                Sprint board – Growth team
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-300">
                            <span className="inline-flex h-6 items-center rounded-full bg-emerald-500/15 px-2 font-medium text-emerald-300 ring-1 ring-emerald-500/40">
                                Live sync·On
                            </span>
                        </div>
                    </div>

                    {/* Columns */}
                    <div className="grid grid-cols-3 gap-3">
                        <Column
                            title="Backlog"
                            tasks={[
                                "Integrate calendar sync",
                                "Define Q4 priorities",
                                "Migrate legacy tasks",
                            ]}
                        />
                        <Column
                            title="In progress"
                            accent="cyan"
                            tasks={[
                                "Launch beta workspace",
                                "Set up SLA alerts",
                                "Automate onboarding",
                            ]}
                        />
                        <Column
                            title="Review"
                            accent="blue"
                            tasks={["Stakeholder review", "Ship release notes"]}
                        />
                    </div>

                    {/* Bottom stats */}
                    <div className="mt-4 grid grid-cols-3 gap-3 text-[11px] text-slate-300">
                        <Stat label="Teams online" value="18" />
                        <Stat label="Tasks updated (today)" value="1,247" />
                        <Stat label="Avg. response time" value="1.3 min" />
                    </div>
                </div>
            </motion.div>
        </section>
    );
}

export default HeroSection;