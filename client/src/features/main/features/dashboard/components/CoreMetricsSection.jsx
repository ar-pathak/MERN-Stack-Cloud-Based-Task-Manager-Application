import { formatNumber } from "../utils/dashboard.utils";

const metrics = [
    { label: "Posts", key: "posts" },
    { label: "Followers", key: "followers" },
    { label: "Following", key: "following" },
    { label: "Likes", key: "likes" },
    { label: "Comments", key: "comments" },
    { label: "Shares", key: "shares" },
    { label: "Saves", key: "saves" }
];

const CoreMetricsSection = ({ totals = {} }) => (
    <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Core Metrics</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {metrics.map((metric) => (
                <div
                    key={metric.key}
                    className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900"
                >
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        {metric.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-100">
                        {formatNumber(totals?.[metric.key])}
                    </p>
                </div>
            ))}
        </div>
    </section>
);

export default CoreMetricsSection;
