import { Link } from "react-router";

import { ArrowRight, Cloud } from "lucide-react";

function Navbar() {
    return (
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/20 ring-1 ring-cyan-400/60">
                    <Cloud className="h-5 w-5 text-cyan-300" />
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-base font-semibold tracking-tight text-slate-50">
                        NimbusTask Cloud
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Task Management OS
                    </span>
                </div>
            </div>

            <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
                <a href="#features" className="hover:text-cyan-300 transition-colors">
                    Features
                </a>
                <a href="#workflow" className="hover:text-cyan-300 transition-colors">
                    Workflow
                </a>
                <a href="#use-cases" className="hover:text-cyan-300 transition-colors">
                    Use cases
                </a>
                <a href="#security" className="hover:text-cyan-300 transition-colors">
                    Security
                </a>
            </nav>

            <div className="flex items-center gap-3">
                <button
                    className="hidden rounded-xl px-3 py-2 text-sm text-slate-300 ring-1 ring-slate-600/70 hover:ring-slate-400 md:inline-flex"
                >
                    Log in
                </button>
                <button
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-3.5 py-2.5 text-xs font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 hover:bg-cyan-300 sm:text-sm"
                >
                    Start free workspace
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </header>
    );
}

export default Navbar;