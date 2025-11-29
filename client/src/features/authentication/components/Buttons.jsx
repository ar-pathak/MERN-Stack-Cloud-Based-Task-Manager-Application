
import { motion, AnimatePresence } from "framer-motion";

function PrimaryButton({ children, loading, ...rest }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-slate-950 text-xs font-semibold py-2.5 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-400/50 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
      disabled={loading}
      {...rest}
    >
      {loading ? (
        <>
          <span className="h-3 w-3 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
          Processing...
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}

function GhostButton({ children, ...rest }) {
  return (
    <button
      className="w-full inline-flex items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/40 text-[0.7rem] text-slate-200 py-2.5 hover:bg-slate-800/80 transition-all"
      {...rest}
    >
      {children}
    </button>
  );
}

export { PrimaryButton, GhostButton };