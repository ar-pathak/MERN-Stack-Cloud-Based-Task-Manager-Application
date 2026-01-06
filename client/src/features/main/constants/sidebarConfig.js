export const NAV_ITEMS = [
    {
        label: "Overview",
        icon: "Cloud",
        path: "/dashboard",
        description: "Workspace overview",
        color: "sky"
    },
    {
        label: "My Tasks",
        icon: "ListChecks",
        path: "/dashboard/my-tasks",
        description: "Your assigned tasks",
        color: "violet"
    },
    {
        label: "Projects",
        icon: "FolderKanban",
        path: "/dashboard/projects",
        description: "All projects",
        color: "emerald"
    },
    {
        label: "Activity",
        icon: "Activity",
        path: "/dashboard/activity",
        description: "Recent activity",
        color: "amber"
    },
    {
        label: "Schedule",
        icon: "CalendarDays",
        path: "/dashboard/schedule",
        description: "Calendar & schedule",
        color: "rose"
    },
];

export const COLOR_THEMES = {
    sky: {
        bg: "bg-sky-500/20",
        bgInactive: "bg-sky-500/5",
        border: "border-sky-500/30",
        text: "text-sky-100",
        textInactive: "text-sky-400",
        icon: "text-sky-300",
        iconInactive: "text-sky-400",
        glow: "shadow-[0_0_20px_rgba(56,189,248,0.15)]",
        hover: "hover:bg-sky-500/10",
        gradient: "from-sky-400 to-cyan-400"
    },
    violet: {
        bg: "bg-violet-500/20",
        bgInactive: "bg-violet-500/5",
        border: "border-violet-500/30",
        text: "text-violet-100",
        textInactive: "text-violet-400",
        icon: "text-violet-300",
        iconInactive: "text-violet-400",
        glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
        hover: "hover:bg-violet-500/10",
        gradient: "from-violet-400 to-purple-400"
    },
    emerald: {
        bg: "bg-emerald-500/20",
        bgInactive: "bg-emerald-500/5",
        border: "border-emerald-500/30",
        text: "text-emerald-100",
        textInactive: "text-emerald-400",
        icon: "text-emerald-300",
        iconInactive: "text-emerald-400",
        glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
        hover: "hover:bg-emerald-500/10",
        gradient: "from-emerald-400 to-teal-400"
    },
    amber: {
        bg: "bg-amber-500/20",
        bgInactive: "bg-amber-500/5",
        border: "border-amber-500/30",
        text: "text-amber-100",
        textInactive: "text-amber-400",
        icon: "text-amber-300",
        iconInactive: "text-amber-400",
        glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
        hover: "hover:bg-amber-500/10",
        gradient: "from-amber-400 to-orange-400"
    },
    rose: {
        bg: "bg-rose-500/20",
        bgInactive: "bg-rose-500/5",
        border: "border-rose-500/30",
        text: "text-rose-100",
        textInactive: "text-rose-400",
        icon: "text-rose-300",
        iconInactive: "text-rose-400",
        glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
        hover: "hover:bg-rose-500/10",
        gradient: "from-rose-400 to-pink-400"
    }
};