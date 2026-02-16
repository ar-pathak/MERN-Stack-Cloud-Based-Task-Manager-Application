import { Link } from "react-router";
import { ArrowRight, Sparkles } from "lucide-react";

function Navbar() {
    return (
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
            <Link to="/home" className="flex min-w-0 items-center gap-2.5">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-sky-400/40 bg-gradient-to-br from-sky-500/25 to-cyan-500/20 sm:h-10 sm:w-10">
                    <div className="absolute inset-0 rounded-2xl bg-sky-400/40 blur-md" />
                    <Sparkles className="relative h-4 w-4 text-sky-200" />
                </div>
                <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold tracking-tight text-slate-50 sm:text-base">
                        Aurora
                    </p>
                    <p className="hidden text-[11px] uppercase tracking-[0.18em] text-slate-400 sm:block">
                        Workspace Platform
                    </p>
                </div>
            </Link>

            <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
                <a href="#product-overview" className="transition-colors hover:text-cyan-300">
                    Product
                </a>
                <a href="#how-aurora-works" className="transition-colors hover:text-cyan-300">
                    Flow
                </a>
                <a href="#live-preview" className="transition-colors hover:text-cyan-300">
                    Preview
                </a>
                <a href="#trust-security" className="transition-colors hover:text-cyan-300">
                    Security
                </a>
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <Link
                    to="/home/auth"
                    className="hidden rounded-xl px-3 py-2 text-sm text-slate-300 ring-1 ring-slate-700/80 transition-colors hover:text-slate-100 md:inline-flex"
                >
                    Sign in
                </Link>
                <Link
                    to="/main"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-2.5 py-2 text-[11px] font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition-colors hover:bg-cyan-300 sm:gap-2 sm:px-3.5 sm:py-2.5 sm:text-sm"
                >
                    <span className="sm:hidden">Open</span>
                    <span className="hidden sm:inline">Open Aurora</span>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Link>
            </div>
        </header>
    );
}

export default Navbar;
