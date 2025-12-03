import { motion } from "framer-motion";
import { Clock, Plus } from "lucide-react";

export default function Header() {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <motion.div
                className="space-y-1"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.35 } }}
            >
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200 shadow-lg shadow-slate-950/40 backdrop-blur">
                    <span className="relative inline-flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    Cloud Projects
                    <span className="text-slate-400">· Live sync on</span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                    Projects
                </h1>
                <p className="max-w-xl text-sm text-slate-400">
                    Organize product lines, sprints and experiments under one{" "}
                    <span className="font-medium text-slate-200">
                        cloud workspace
                    </span>
                    . Attach tasks, teams and timelines to each project.
                </p>
            </motion.div>

            <motion.div
                className="mt-2 flex items-center gap-3 sm:mt-0"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.35 } }}
            >
                <button className="group inline-flex items-center gap-2 rounded-xl border border-cyan-400/60 bg-gradient-to-r from-cyan-500/90 to-indigo-500/90 px-4 py-2 text-sm font-medium text-slate-950 shadow-[0_18px_40px_rgba(8,47,73,0.65)] transition hover:translate-y-0.5 hover:shadow-[0_8px_24px_rgba(8,47,73,0.9)]">
                    <span className="rounded-full bg-slate-950/10 p-1 shadow-inner shadow-white/10">
                        <Plus className="h-3.5 w-3.5" />
                    </span>
                    New project
                </button>
                <button className="hidden items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200 shadow-lg shadow-slate-950/40 backdrop-blur sm:inline-flex">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Recent</span>
                </button>
            </motion.div>
        </div>
    );
}