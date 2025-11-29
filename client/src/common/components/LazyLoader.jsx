import React from "react";
import { motion } from "framer-motion";

export default function LazyLoader() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-transparent text-slate-200">

            {/* Animated blob / circle */}
            <motion.div
                className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-cyan-300 shadow-lg shadow-sky-500/40"
                animate={{ rotate: 360 }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            {/* Text fade */}
            <motion.p
                className="mt-4 text-xs text-slate-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity }}
            >
                Loading component…
            </motion.p>
        </div>
    );
}
