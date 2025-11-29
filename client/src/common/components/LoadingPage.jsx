import React from "react";
import { motion } from "framer-motion";

const LoadingPage = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden text-slate-50">
      {/* Animated Gradient Blobs */}
      <motion.div
        className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-purple-500/30 blur-3xl"
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-cyan-500/30 blur-3xl"
        animate={{ x: [0, -30, 20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl px-8 py-10 shadow-2xl"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Logo + Spinner */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="h-14 w-14 rounded-2xl border border-white/20 bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
          >
            <div className="h-7 w-7 rounded-xl bg-slate-950" />
          </motion.div>

          <motion.h1
            className="text-xl font-semibold tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            Loading your experience…
          </motion.h1>

          <motion.p
            className="text-sm text-slate-300 text-center max-w-xs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            We&apos;re getting everything ready for you. This usually only takes a
            moment.
          </motion.p>
        </div>

        {/* Progress Bar */}
        <motion.div
          className="mt-8 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400"
            animate={{ x: ["-120%", "150%"] }}
            transition={{
              repeat: Infinity,
              duration: 1.6,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Sub Text dots */}
        <motion.div
          className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <span>Preparing secure session</span>
          <motion.span
            className="flex gap-1"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <span>•</span>
            <span>•</span>
            <span>•</span>
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoadingPage;
