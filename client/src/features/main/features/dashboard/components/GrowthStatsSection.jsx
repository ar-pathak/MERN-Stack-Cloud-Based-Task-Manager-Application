import { CalendarClock } from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

import { CHART_COLORS } from "../constants/dashboard.constants";
import { formatNumber } from "../utils/dashboard.utils";
import DashboardChartTooltip from "./DashboardChartTooltip";
import DashboardEmptyState from "./DashboardEmptyState";

const GrowthStatsSection = ({
    growthRows = [],
    followerGrowth = [],
    likesCommentsTrend = [],
    topPerforming = []
}) => (
    <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <CalendarClock className="h-4 w-4 text-emerald-400" />
            Growth Stats
        </h2>

        <div className="mb-3 overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
                    <tr>
                        <th className="px-3 py-2 text-left">Metric</th>
                        <th className="px-3 py-2 text-right">Today</th>
                        <th className="px-3 py-2 text-right">7d</th>
                        <th className="px-3 py-2 text-right">30d</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                    {growthRows.map((row) => (
                        <tr key={row.label}>
                            <td className="px-3 py-2">{row.label}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(row.today)}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(row.sevenDays)}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(row.thirtyDays)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900/90">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                    Follower Growth
                </p>
                {followerGrowth.length ? (
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={followerGrowth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis
                                    dataKey="day"
                                    stroke="#64748b"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                />
                                <Tooltip
                                    content={<DashboardChartTooltip />}
                                    cursor={{ stroke: "#475569", strokeDasharray: "3 3" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="followers"
                                    stroke="#38bdf8"
                                    dot={false}
                                />
                                <Line type="monotone" dataKey="gained" stroke="#22c55e" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <DashboardEmptyState message="No follower growth data." />
                )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900/90">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                    Likes / Comments Trend
                </p>
                {likesCommentsTrend.length ? (
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={likesCommentsTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis
                                    dataKey="day"
                                    stroke="#64748b"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                />
                                <Tooltip
                                    content={<DashboardChartTooltip />}
                                    cursor={{ stroke: "#475569", strokeDasharray: "3 3" }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="likes"
                                    stroke="#f43f5e"
                                    fill="rgba(244,63,94,0.2)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="comments"
                                    stroke="#f59e0b"
                                    fill="rgba(245,158,11,0.16)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <DashboardEmptyState message="No likes/comments trend data." />
                )}
            </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900/90">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Top Performing Posts
            </p>
            {topPerforming.length ? (
                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topPerforming} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                                type="number"
                                stroke="#64748b"
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                            />
                            <YAxis
                                type="category"
                                dataKey="label"
                                width={160}
                                stroke="#64748b"
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                            />
                            <Tooltip
                                content={<DashboardChartTooltip />}
                                cursor={{ fill: "rgba(71,85,105,0.2)" }}
                            />
                            <Bar dataKey="engagementScore">
                                {topPerforming.map((post, index) => (
                                    <Cell
                                        key={String(post?._id || index)}
                                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <DashboardEmptyState message="No top-performing posts." />
            )}
        </div>
    </section>
);

export default GrowthStatsSection;
