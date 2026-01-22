import { motion } from "framer-motion";
import {
    Link as LinkIcon, Image as ImageIcon,
    Activity, TrendingUp, BarChart3
} from "lucide-react";


const AnalyticsSection = ({ item, overview }) => {
    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Activity Overview</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-gradient-to-br from-sky-500/10 to-blue-600/10 border border-sky-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-sky-400" />
                            <span className="text-xs text-slate-400">This Week</span>
                        </div>
                        <p className="text-2xl font-bold text-sky-300">24</p>
                        <p className="text-xs text-slate-500 mt-1">Tasks completed</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-emerald-400" />
                            <span className="text-xs text-slate-400">Avg Time</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-300">2.4h</p>
                        <p className="text-xs text-slate-500 mt-1">Per task</p>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Weekly Activity</h4>
                <div className="flex items-end justify-between gap-2 h-32">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                        const height = Math.random() * 100;
                        return (
                            <div key={day} className="flex-1 flex flex-col items-center gap-2">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${height}%` }}
                                    transition={{ delay: i * 0.1 }}
                                    className="w-full bg-gradient-to-t from-sky-500 to-blue-600 rounded-t-lg min-h-[10%]"
                                />
                                <span className="text-[10px] text-slate-500">{day}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsSection