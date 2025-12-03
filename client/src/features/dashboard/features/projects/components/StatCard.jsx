
export default function StatCard({ icon: Icon, label, value, sub }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/70 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
            <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-cyan-400/10 blur-2xl" />
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                        {label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-50">{value}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
                </div>
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/80 shadow-inner shadow-slate-700/60">
                    <Icon className="h-4 w-4 text-cyan-300" />
                </div>
            </div>
        </div>
    );
}