
export const mockTasks = [
    {
        id: 1,
        title: "Design database schema for notifications",
        project: "CloudTask Core",
        status: "In Progress",
        priority: "High",
        dueDate: "Today, 5:00 PM",
        tags: ["Backend", "Database"],
        progress: 70,
        favorite: true,
    },
    {
        id: 2,
        title: "Refine onboarding journey for new teams",
        project: "CX Upgrade",
        status: "Todo",
        priority: "Medium",
        dueDate: "Tomorrow",
        tags: ["UX", "Research"],
        progress: 20,
        favorite: false,
    },
    {
        id: 3,
        title: "Implement task activity timeline UI",
        project: "Web App",
        status: "Review",
        priority: "High",
        dueDate: "Dec 05",
        tags: ["Frontend"],
        progress: 90,
        favorite: true,
    },
    {
        id: 4,
        title: "Optimize cron workers for recurring tasks",
        project: "CloudTask Core",
        status: "Done",
        priority: "Low",
        dueDate: "Yesterday",
        tags: ["DevOps"],
        progress: 100,
        favorite: false,
    },
];

export const tabs = ["All", "Today", "Upcoming", "Completed"];

export const statusColors = {
    "Todo": "bg-slate-500/20 text-slate-200 border-slate-500/40",
    "In Progress": "bg-blue-500/15 text-blue-200 border-blue-500/40",
    "Review": "bg-amber-500/15 text-amber-100 border-amber-500/40",
    "Done": "bg-emerald-500/15 text-emerald-100 border-emerald-500/40",
};

export const priorityColors = {
    High: "bg-rose-500/15 text-rose-100 border-rose-500/40",
    Medium: "bg-amber-500/15 text-amber-100 border-amber-500/40",
    Low: "bg-emerald-500/15 text-emerald-100 border-emerald-500/40",
};
