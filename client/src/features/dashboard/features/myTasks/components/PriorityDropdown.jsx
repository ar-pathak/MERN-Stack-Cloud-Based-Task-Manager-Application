import { ChevronDown, Filter } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
 export default function PriorityDropdown({ priorityFilter, setPriorityFilter }) {
    const [open, setOpen] = useState(false);
    const items = ["All", "High", "Medium", "Low"];

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-600/70 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-400/70 hover:text-cyan-100"
            >
                <Filter className="h-3.5 w-3.5" />
                Priority:{" "}
                <span className="font-semibold text-slate-100">
                    {priorityFilter}
                </span>
                <ChevronDown className="h-3 w-3" />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="absolute right-0 z-20 mt-2 w-32 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-xl"
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.14 }}
                    >
                        {items.map((item) => (
                            <button
                                key={item}
                                onClick={() => {
                                    setPriorityFilter(item);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] text-left ${priorityFilter === item
                                    ? "bg-cyan-500/15 text-cyan-100"
                                    : "text-slate-300 hover:bg-slate-800/70"
                                    }`}
                            >
                                <span>{item}</span>
                                {item !== "All" && (
                                    <span
                                        className={`h-2 w-2 rounded-full ${item === "High"
                                            ? "bg-rose-400"
                                            : item === "Medium"
                                                ? "bg-amber-300"
                                                : "bg-emerald-300"
                                            }`}
                                    />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}