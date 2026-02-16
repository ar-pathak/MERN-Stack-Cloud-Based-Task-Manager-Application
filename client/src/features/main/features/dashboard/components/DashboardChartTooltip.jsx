import { formatNumber } from "../utils/dashboard.utils";

const resolveTooltipLabel = (label, payload = []) => {
    const first = payload[0];
    const preferredDay = first?.payload?.day;
    if (preferredDay !== undefined && preferredDay !== null && String(preferredDay).trim()) {
        return String(preferredDay);
    }

    if (label !== undefined && label !== null && String(label).trim()) {
        return String(label);
    }

    const fallback =
        first?.payload?.label ||
        first?.payload?.day ||
        first?.name ||
        first?.dataKey ||
        "";

    return String(fallback || "").trim();
};

const formatTooltipValue = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return formatNumber(value);
    }

    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
        return formatNumber(numeric);
    }

    return String(value ?? "-");
};

const DashboardChartTooltip = ({ active, payload = [], label }) => {
    if (!active || !Array.isArray(payload) || payload.length === 0) return null;

    const rows = payload.filter((entry) => entry && entry.value !== undefined && entry.value !== null);
    if (!rows.length) return null;

    const title = resolveTooltipLabel(label, rows);

    return (
        <div className="min-w-[150px] rounded-xl border border-slate-600/90 bg-slate-950/95 px-3 py-2 shadow-[0_8px_30px_rgba(2,6,23,0.65)] backdrop-blur-sm">
            {title ? <p className="mb-1 text-xs font-semibold text-slate-100">{title}</p> : null}
            <div className="space-y-1">
                {rows.map((entry, index) => {
                    const key = `${entry?.dataKey || entry?.name || "item"}_${index}`;
                    const markerColor = entry?.color || "#94a3b8";
                    return (
                        <div key={key} className="flex items-center justify-between gap-3 text-xs">
                            <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-200">
                                <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: markerColor }}
                                />
                                <span className="truncate">
                                    {entry?.name || entry?.dataKey || "Value"}
                                </span>
                            </span>
                            <span className="font-semibold text-white">
                                {formatTooltipValue(entry?.value)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DashboardChartTooltip;
