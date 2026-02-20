import React from "react";

const LoadingPage = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-36 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 px-6 py-8 shadow-xl">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
        <h1 className="text-center text-lg font-semibold tracking-tight">Loading your experience...</h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm text-slate-300">
          Preparing your workspace. This usually takes a moment.
        </p>
      </div>
    </div>
  );
};

export default LoadingPage;
