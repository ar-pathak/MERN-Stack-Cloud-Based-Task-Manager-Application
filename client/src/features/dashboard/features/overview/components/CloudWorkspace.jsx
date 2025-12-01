import { ArrowRight, Cloud } from "lucide-react";
import { motion } from "framer-motion";
const CloudWorkspace = () => {
    const projects = [
        { name: "Team Alpha – Sprints", sync: "Synced", time: "Just now" },
        { name: "Client Portal – V2", sync: "Syncing…", time: "2m ago" },
        { name: "Internal Tools", sync: "Synced", time: "18m ago" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.9)]"
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.21),transparent_60%)] opacity-70" />

            <div className="relative flex items-center justify-between gap-2">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        Cloud workspace
                    </p>
                    <p className="mt-1 text-sm font-medium">
                        All your tasks, synced across devices.
                    </p>
                </div>
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/80">
                    <Cloud className="relative h-5 w-5 text-sky-300" />
                    <motion.div
                        className="absolute h-14 w-14 rounded-full border border-sky-400/40"
                        animate={{ scale: [1, 1.1, 1], opacity: [0.9, 0.3, 0.9] }}
                        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>
            </div>

            <div className="relative mt-3 space-y-2.5">
                {projects.map((project, idx) => (
                    <motion.div
                        key={project.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05, duration: 0.3 }}
                        className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-2.5"
                    >
                        <div>
                            <p className="text-[13px] font-medium">{project.name}</p>
                            <p className="text-[11px] text-slate-400">{project.time}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span
                                className={`text-[11px] ${project.sync.includes("Syncing")
                                    ? "text-amber-300"
                                    : "text-emerald-300"
                                    }`}
                            >
                                {project.sync}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default CloudWorkspace;