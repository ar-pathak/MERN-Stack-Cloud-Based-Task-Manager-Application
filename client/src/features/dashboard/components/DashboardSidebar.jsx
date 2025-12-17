import { motion } from "framer-motion";
import { Activity, CalendarDays, Cloud, FolderKanban, ListChecks } from "lucide-react";
import { NavLink } from "react-router";


const DashboardSidebar = () => {


    const navItems = [
        { label: "Overview", icon: Cloud, path: "/dashboard" },
        { label: "My Tasks", icon: ListChecks, path: "/dashboard/my-tasks" },
        { label: "Projects", icon: FolderKanban, path: "/dashboard/projects" },
        { label: "Activity", icon: Activity, path: "/dashboard/activity" },
        { label: "Schedule", icon: CalendarDays, path: "/dashboard/schedule" },
    ];

    return (
        <aside className="hidden md:flex w-64 flex-col border-r border-slate-800/70 bg-slate-950/30 backdrop-blur-xl">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800/60">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/20">
                    <motion.div
                        className="absolute inset-0 rounded-2xl bg-sky-400/40 blur-md"
                        animate={{ opacity: [0.6, 0.2, 0.6] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <Cloud className="relative h-5 w-5 text-sky-300" />
                </div>
                <div>
                    <p className="text-sm font-semibold tracking-tight">
                        Nimbus Tasks
                    </p>
                    <p className="text-[11px] text-slate-400">
                        Cloud workspace manager
                    </p>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map(({ label, icon: Icon, path }) => (
                    <NavLink key={label} to={path} end>
                        {({ isActive }) => (
                            <motion.div
                                whileHover={{ x: 4, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition
            ${isActive
                                        ? "bg-slate-900/70 text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.18)] border border-slate-700/70"
                                        : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-100"
                                    }`}
                            >
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/60">
                                    <Icon className="h-4 w-4 text-sky-400" />

                                    {isActive && (
                                        <motion.span
                                            layoutId="sidebar-active-dot"
                                            className="absolute -right-1 h-1.5 w-1.5 rounded-full bg-sky-400"
                                        />
                                    )}
                                </div>

                                <span>{label}</span>
                            </motion.div>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="mt-auto border-t border-slate-800/70 px-4 py-4 text-xs text-slate-400/90">
                <p className="flex items-center justify-between">
                    <span>Cloud Sync</span>
                    <span className="text-sky-300 font-medium">Active</span>
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "68%" }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"
                    />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                    32 of 50 GB in use
                </p>
            </div>
        </aside>
    );
};

export default DashboardSidebar;