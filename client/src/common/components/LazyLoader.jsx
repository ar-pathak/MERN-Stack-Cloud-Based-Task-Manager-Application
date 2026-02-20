import React from "react";

export default function LazyLoader() {
  return (
    <div className="min-h-[36vh] flex flex-col items-center justify-center bg-transparent text-slate-300">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
      <p className="mt-3 text-xs text-slate-400">Loading component...</p>
    </div>
  );
}
