// components/OverviewStats.jsx
const OverviewStats = ({ overview, loading }) => {
    if (loading) return <div className="px-6 pt-4 pb-2 text-sm text-slate-400">Loading overview...</div>;
    if (!overview || !overview.stats) return null;

    const { stats } = overview;

    return (
        <div className="px-6 pt-4 pb-2 border-b border-slate-800/50 bg-slate-950/60">
            <div className="flex items-center gap-4 text-sm text-slate-300">
                <StatItem label="Projects" value={stats.projectsCount} />
                <StatItem label="Tasks" value={stats.totalTasks} />
                <StatItem label="Completed" value={stats.completedTasks} />
                <StatItem label="High Priority" value={stats.highPriorityTasks} valueColor="text-amber-400" />
                <div className="flex items-center gap-2 ml-auto">
                    <div className="text-xs text-slate-400">Members</div>
                    <div className="font-semibold text-slate-100">{stats.membersCount}</div>
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ label, value, valueColor = "text-slate-100" }) => (
    <div className="flex items-center gap-2">
        <div className="text-xs text-slate-400">{label}</div>
        <div className={`font-semibold ${valueColor}`}>{value}</div>
    </div>
);

export default OverviewStats;