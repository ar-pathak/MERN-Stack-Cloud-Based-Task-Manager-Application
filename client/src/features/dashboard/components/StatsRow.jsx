import { CheckCircle2, Cloud, ListChecks, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
const StatsRow = () => {
    const stats = [
        {
            label: "Tasks today",
            value: "12",
            sub: "5 completed",
            icon: ListChecks,
            gradient: "from-sky-500/40 via-sky-400/40 to-cyan-400/40",
        },
        {
            label: "In progress",
            value: "7",
            sub: "2 at risk",
            icon: Loader2,
            gradient: "from-amber-400/50 via-orange-400/40 to-rose-400/40",
        },
        {
            label: "Completed",
            value: "128",
            sub: "Last 30 days",
            icon: CheckCircle2,
            gradient: "from-emerald-400/40 via-emerald-300/40 to-sky-300/40",
        },
        {
            label: "Cloud projects",
            value: "6",
            sub: "Across 3 teams",
            icon: Cloud,
            gradient: "from-indigo-400/40 via-sky-400/40 to-cyan-400/40",
        },
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, sub, icon: Icon, gradient }, index) => (
                <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
                    className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.85)]"
                >
                    <div
                        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-40 mix-blend-soft-light`}
                    />
                    <div className="relative flex items-start justify-between gap-2">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                                {label}
                            </p>
                            <p className="mt-1 text-xl font-semibold">{value}</p>
                            <p className="text-[11px] text-slate-400">{sub}</p>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/80">
                            <Icon className="h-4 w-4 text-sky-300" />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default StatsRow;