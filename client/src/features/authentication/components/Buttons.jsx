function PrimaryButton({ children, loading, ...rest }) {
  return (
    <button
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-400 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition-shadow hover:shadow-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={loading}
      {...rest}
    >
      {loading ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
}

function GhostButton({ children, ...rest }) {
  return (
    <button
      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/40 px-3 py-2.5 text-xs text-slate-200 transition-all hover:bg-slate-800/80 sm:text-sm"
      {...rest}
    >
      {children}
    </button>
  );
}

export { PrimaryButton, GhostButton };
