import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    CheckSquare,
    Users, Flag, Link as LinkIcon, Image as ImageIcon,
    Activity, TrendingUp, Zap, Target
} from "lucide-react";


const QuickStatsSection = ({ item, overview }) => {
    const stats = useMemo(() => {
        if (item.type === 'workspace' && overview?.stats) {
            return [
                { label: 'Total Tasks', value: overview.stats.totalTasks || 0, icon: CheckSquare, color: 'emerald' },
                { label: 'Completed', value: overview.stats.completedTasks || 0, icon: Target, color: 'sky' },
                { label: 'In Progress', value: overview.stats.inProgressTasks || 0, icon: Activity, color: 'amber' },
                { label: 'Members', value: item.members?.length || 0, icon: Users, color: 'purple' }
            ];
        }
        if (item.type === 'project') {
            return [
                { label: 'Tasks', value: item.tasks?.length || 0, icon: CheckSquare, color: 'emerald' },
                { label: 'Team Size', value: item.members?.length || 0, icon: Users, color: 'purple' },
                { label: 'Completion', value: `${Math.round(((item.completedTasks || 0) / (item.tasks?.length || 1)) * 100)}%`, icon: TrendingUp, color: 'sky' }
            ];
        }
        if (item.type === 'task') {
            return [
                { label: 'Subtasks', value: item.subtasks?.length || 0, icon: CheckSquare, color: 'emerald' },
                { label: 'Priority', value: item.priority || 'normal', icon: Flag, color: item.priority === 'high' ? 'rose' : 'amber' }
            ];
        }
        return [];
    }, [item, overview]);

    if (stats.length === 0) return null;

    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-slate-500" />
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
                                        'from-rose-500/10 to-red-600/10 border-rose-500/20'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <stat.icon className={`h-4 w-4 ${stat.color === 'emerald' ? 'text-emerald-400' :
                                stat.color === 'sky' ? 'text-sky-400' :
                                    stat.color === 'amber' ? 'text-amber-400' :
                                        stat.color === 'purple' ? 'text-purple-400' :
                                            'text-rose-400'
                                }`} />
                            <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default QuickStatsSection