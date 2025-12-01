import { motion } from "framer-motion";
import { Bell, Menu, Search } from "lucide-react";

const DashboardHeader = () => {
    return (
        <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/40 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                {/* Left */}
                <div className="flex items-center gap-3">
                    <button className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/60 p-2">
                        <Menu className="h-4 w-4 text-slate-200" />
                    </button>
                    <div>
                        <h1 className="text-base md:text-lg font-semibold">
                            Good afternoon, Arsan 👋
                        </h1>
                        <p className="text-xs md:text-[13px] text-slate-400">
                            Your cloud workspace is fully synced. Let&apos;s ship something.
                        </p>
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="hidden md:flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
                        <Search className="h-3.5 w-3.5 text-slate-500" />
                        <input
                            placeholder="Search tasks, projects…"
                            className="w-40 bg-transparent text-[11px] outline-none placeholder:text-slate-500"
                        />
                    </div>

                    {/* Notification */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800/70 bg-slate-900/70"
                    >
                        <Bell className="h-4 w-4 text-slate-300" />
                        <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/60 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
                        </span>
                    </motion.button>

                    {/* Profile */}
                    <button className="flex items-center gap-2 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-2.5 py-1.5">
                        <div className="relative h-7 w-7 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500">
                            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0,_rgba(255,255,255,0.6),transparent_55%)]" />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-xs font-medium">Arsan Pathak</p>
                            <p className="text-[10px] text-slate-400">Cloud admin</p>
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;