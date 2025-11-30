import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Cloud, Sparkles, ShieldCheck } from "lucide-react";

function Column({
  title,
  tasks,
  accent = "slate",
}: {
  title: string;
  tasks: string[];
  accent?: "slate" | "cyan" | "blue";
}) {
  const accentClasses: Record<string, string> = {
    slate: "bg-slate-800/80 text-slate-200",
    cyan: "bg-cyan-500/15 text-cyan-100",
    blue: "bg-blue-500/15 text-blue-100",
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 p-2 ring-1 ring-slate-700/80">
      <div className="mb-2 flex items-center justify-between text-[11px] text-slate-300">
        <span>{title}</span>
        <span className="h-1.5 w-8 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400" />
      </div>
      <div className="space-y-1.5">
        {tasks.map((task) => (
          <motion.div
            key={task}
            className={`rounded-xl px-2.5 py-1.5 text-[11px] ${accentClasses[accent]}`}
            whileHover={{ y: -2, scale: 1.01 }}
          >
            {task}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default Column;