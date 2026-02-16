export const MOBILE_BREAKPOINT = 768;

export const CATEGORY_OPTIONS = [
    { value: "all", label: "All" },
    { value: "account", label: "Account" },
    { value: "privacy", label: "Privacy" },
    { value: "posts", label: "Posts" },
    { value: "analytics", label: "Analytics" },
    { value: "billing", label: "Billing" },
    { value: "security", label: "Security" }
];

export const PRIORITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" }
];

export const STATUS_OPTIONS = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" }
];

export const FEEDBACK_TYPE_OPTIONS = [
    { value: "feature_request", label: "Feature Request" },
    { value: "bug_report", label: "Bug Report" }
];

export const STATUS_LABEL_MAP = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed"
};

export const PRIORITY_LABEL_MAP = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent"
};

export const STATUS_CLASS_MAP = {
    open: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    in_progress: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    resolved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    closed: "border-slate-500/40 bg-slate-700/40 text-slate-300"
};

export const PRIORITY_CLASS_MAP = {
    low: "border-slate-600 bg-slate-700/40 text-slate-300",
    medium: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    high: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    urgent: "border-rose-500/30 bg-rose-500/10 text-rose-300"
};

export const INITIAL_TICKET_FORM = {
    subject: "",
    category: "account",
    description: "",
    priority: "medium"
};

export const INITIAL_FEEDBACK_FORM = {
    type: "feature_request",
    category: "account",
    title: "",
    message: "",
    rating: 5
};
