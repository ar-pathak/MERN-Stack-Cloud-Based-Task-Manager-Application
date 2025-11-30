import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Cloud, Sparkles, ShieldCheck } from "lucide-react";
function TrustBar() {
    return (
        <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900/70 px-4 py-3 text-[11px] text-slate-300 ring-1 ring-slate-700/80 backdrop-blur sm:px-6 sm:text-xs">
                <p className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/15">
                        <Sparkles className="h-3 w-3 text-cyan-300" />
                    </span>
                    Trusted cloud task manager for product, marketing & ops teams.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-[11px]">
                    <span>99.98% uptime</span>
                    <span className="h-1 w-1 rounded-full bg-slate-500" />
                    <span>Data centers in India, EU & US</span>
                    <span className="h-1 w-1 rounded-full bg-slate-500" />
                    <span>Role-based access controls</span>
                </div>
            </div>
        </section>
    );
}
export default TrustBar;