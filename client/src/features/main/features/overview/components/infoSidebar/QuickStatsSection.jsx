import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    Users,
    Flag,
    Activity,
    Calendar,
    AlertCircle
} from "lucide-react";

const QuickStatsSection = ({ item }) => {
    const stats = useMemo(() => {

        // PROJECT STATS
        // Schema: Project (Includes members array, status enum).
        if (item.type === 'project') {
            const projectStats = [
                {
                    label: 'Team Size',
                    value: item.members?.length || 0,
                    icon: Users,
                    color: 'purple'
                },
                {
                    label: 'Status',
                    value: item.status || 'active',
                    icon: Activity,
                    color: item.status === 'completed' ? 'emerald' : 'sky'
                }
            ];

            return projectStats;
        }

        // TASK STATS
        if (item.type === 'task') {
            const isHigh = item.isHighPriority;

            return [
                {
                    label: 'Priority',
                    value: isHigh ? 'High' : 'Normal',
                    icon: isHigh ? AlertCircle : Flag,
                    color: isHigh ? 'rose' : 'sky'
                },
                {
                    label: 'Assignees',
                    value: item.assignees?.length || 0,
                    icon: Users,
                    color: 'purple'
                },
                {
                    label: 'Status',
                    value: item.status || 'active',
                    icon: Activity,
                    color: item.status === 'completed' ? 'emerald' : 'amber'
                },
                {
                    label: 'Due Date',
                    value: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No Date',
                    icon: Calendar,
                    color: 'slate'
                }
            ];
        }

        return [];
    }, [item]);

    if (stats.length === 0) return null;

    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-xl border bg-gradient-to-br ${stat.color === 'emerald' ? 'from-emerald-500/10 to-green-600/10 border-emerald-500/20' :
                            stat.color === 'sky' ? 'from-sky-500/10 to-blue-600/10 border-sky-500/20' :
                                stat.color === 'amber' ? 'from-amber-500/10 to-orange-600/10 border-amber-500/20' :
                                    stat.color === 'purple' ? 'from-purple-500/10 to-pink-600/10 border-purple-500/20' :
                                        stat.color === 'rose' ? 'from-rose-500/10 to-red-600/10 border-rose-500/20' :
                                            'from-slate-500/10 to-gray-600/10 border-slate-500/20'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <stat.icon className={`h-4 w-4 ${stat.color === 'emerald' ? 'text-emerald-400' :
                                stat.color === 'sky' ? 'text-sky-400' :
                                    stat.color === 'amber' ? 'text-amber-400' :
                                        stat.color === 'purple' ? 'text-purple-400' :
                                            stat.color === 'rose' ? 'text-rose-400' :
                                                'text-slate-400'
                                }`} />
                            <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                        </div>
                        <p className={`text-xl font-bold ${stat.color === 'slate' ? 'text-slate-300' : 'text-slate-100'
                            } truncate`}>
                            {stat.value}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default QuickStatsSection;