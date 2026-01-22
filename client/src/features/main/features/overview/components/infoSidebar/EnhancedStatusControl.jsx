import { useState } from "react";
import {
    Flag, Link as LinkIcon, Image as ImageIcon,
    Activity
} from "lucide-react";


const EnhancedStatusControl = ({ item }) => {
    const [status, setStatus] = useState(item.status || 'todo');
    const statuses = [
        { value: 'todo', label: 'To Do', color: 'slate' },
        { value: 'in progress', label: 'In Progress', color: 'amber' },
        { value: 'completed', label: 'Completed', color: 'emerald' }
    ];

    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Status & Priority</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-medium ml-1">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 capitalize transition-all"
                    >
                        {statuses.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-medium ml-1">Priority</label>
                    <div className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium capitalize ${item.priority === 'high' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                        item.priority === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            'bg-slate-800/40 border-slate-700 text-slate-400'
                        }`}>
                        <Flag className="h-3.5 w-3.5" />
                        {item.priority || 'Normal'}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default EnhancedStatusControl