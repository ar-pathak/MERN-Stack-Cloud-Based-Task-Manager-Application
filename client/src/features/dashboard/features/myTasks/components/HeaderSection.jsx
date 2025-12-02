import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export default function HeaderSection() {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <motion.h1
                    className="bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent md:text-4xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    My Tasks
                </motion.h1>
                <motion.p
                    className="mt-1 max-w-xl text-sm text-slate-300/80"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                >
                    Cloud-based task manager for your team — track, prioritize, and ship
                    work across devices with real-time sync.
                </motion.p>
            </div>

            <motion.button
                className="group inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-50 backdrop-blur-md shadow-[0_0_30px_rgba(34,211,238,0.35)] hover:bg-cyan-400/25 active:scale-[0.97] transition"
                whileTap={{ scale: 0.96 }}
            >
                <Plus className="h-4 w-4" />
                New Task
                <span className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100/80 group-hover:bg-cyan-500/20">
                    Quick Add
                </span>
            </motion.button>
        </div>
    );
}