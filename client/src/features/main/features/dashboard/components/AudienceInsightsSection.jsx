import { Users } from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

import { CHART_COLORS } from "../constants/dashboard.constants";
import { formatNumber } from "../utils/dashboard.utils";
import DashboardChartTooltip from "./DashboardChartTooltip";
import DashboardEmptyState from "./DashboardEmptyState";

const AudienceInsightsSection = ({
    countryRows = [],
    hourlyRows = [],
    userMix = {},
    bestPostingHour = null
}) => {
    const totalUserMix = Number(userMix?.newUsers || 0) + Number(userMix?.returningUsers || 0);

    return (
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Users className="h-4 w-4 text-amber-400" />
                Audience Insights
            </h2>

            <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900/90">
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                        Followers by Country
                    </p>
                    {countryRows.length ? (
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={countryRows}
                                        dataKey="value"
                                        nameKey="country"
                                        innerRadius={42}
                                        outerRadius={78}
                                    >
                                        {countryRows.map((row, index) => (
                                            <Cell
                                                key={`${row.country}-${index}`}
                                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<DashboardChartTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <DashboardEmptyState message="No country data." />
                    )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900/90">
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                        Best Posting Time
                    </p>
                    <p className="mb-2 text-sm text-slate-200">
                        {bestPostingHour?.label || "N/A"}
                    </p>
                    {hourlyRows.length ? (
                        <div className="h-[190px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourlyRows}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis
                                        dataKey="label"
                                        stroke="#64748b"
                                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                                    />
                                    <Tooltip
                                        content={<DashboardChartTooltip />}
                                        cursor={{ fill: "rgba(71,85,105,0.2)" }}
                                    />
                                    <Bar dataKey="averageEngagement" fill="#22c55e" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <DashboardEmptyState message="No active-time data." />
                    )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900/90">
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                        New vs Returning Users
                    </p>
                    {totalUserMix > 0 ? (
                        <>
                            <div className="h-[170px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                {
                                                    label: "New",
                                                    value: Number(userMix?.newUsers || 0)
                                                },
                                                {
                                                    label: "Returning",
                                                    value: Number(userMix?.returningUsers || 0)
                                                }
                                            ]}
                                            dataKey="value"
                                            nameKey="label"
                                            innerRadius={40}
                                            outerRadius={72}
                                        >
                                            <Cell fill="#38bdf8" />
                                            <Cell fill="#f59e0b" />
                                        </Pie>
                                        <Tooltip content={<DashboardChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-slate-400">
                                New: {formatNumber(userMix?.newUsers)} - Returning:{" "}
                                {formatNumber(userMix?.returningUsers)}
                            </p>
                        </>
                    ) : (
                        <DashboardEmptyState message="No user mix data." />
                    )}
                </div>
            </div>
        </section>
    );
};

export default AudienceInsightsSection;
