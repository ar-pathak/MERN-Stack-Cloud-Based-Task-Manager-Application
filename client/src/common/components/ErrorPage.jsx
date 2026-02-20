import React from "react";
import { useNavigate } from "react-router";

const ErrorPage = ({ code = 404, message = "Page not found" }) => {
  const navigate = useNavigate();
  const isServerError = String(code).startsWith("5");

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4 text-slate-50">
      <div className="pointer-events-none absolute -top-28 -left-24 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/70 px-7 py-8 shadow-2xl">
        <p className="text-center text-6xl font-black tracking-tight text-rose-300">{code}</p>
        <h1 className="mt-4 text-center text-2xl font-semibold">
          {isServerError ? "Something went wrong" : "Page not found"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-slate-300">
          {isServerError
            ? "We could not complete your request right now. Please try again."
            : message || "The page you requested could not be found."}
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-cyan-300"
          >
            Go Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-600/80 bg-slate-900/60 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-800/80"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
