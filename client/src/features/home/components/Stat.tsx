import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Cloud, Sparkles, ShieldCheck } from "lucide-react";
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900/70 px-3 py-2 ring-1 ring-slate-700/80">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-50">{value}</p>
    </div>
  );
}

export default Stat;