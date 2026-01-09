import { motion } from "framer-motion"
import { Archive, AtSign, Bell, BellOff, Download, Settings, Star, Image as ImageIcon, File as FileIcon } from "lucide-react";

// InfoSidebar now accepts an optional `overview` payload { workspace, projects, tasks, stats }

const InfoSidebar = ({ item, overview }) => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Sidebar Header - Fixed */}
            <div className="flex-shrink-0 p-4 border-b border-slate-800/50">
                <h3 className="text-sm font-bold text-slate-300 flex items-center justify-between">
                    Details
                    <button className="p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                        <Settings className="h-4 w-4 text-slate-400" />
                    </button>
                </h3>
            </div>

            {/* Sidebar Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">

                {/* Overview Stats (from API) */}
                {overview?.stats && (
                    <div className="mb-6">
                        <h4 className="text-xs font-semibold text-slate-400 mb-3">Overview</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                            <div className="p-2 rounded-lg bg-slate-900/40">
                                <div className="text-xs text-slate-400">Projects</div>
                                <div className="font-semibold text-slate-100">{overview.stats.projectsCount}</div>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900/40">
                                <div className="text-xs text-slate-400">Tasks</div>
                                <div className="font-semibold text-slate-100">{overview.stats.totalTasks}</div>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900/40">
                                <div className="text-xs text-slate-400">Completed</div>
                                <div className="font-semibold text-slate-100">{overview.stats.completedTasks}</div>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900/40">
                                <div className="text-xs text-amber-400">High Priority</div>
                                <div className="font-semibold text-amber-400">{overview.stats.highPriorityTasks}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status & Progress */}
                {item.status && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500">Status</span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.status === "completed" ? "text-emerald-400 bg-emerald-500/10" :
                                item.status === "in-progress" ? "text-blue-400 bg-blue-500/10" :
                                    "text-slate-400 bg-slate-500/10"
                                }`}>
                                {item.status}
                            </span>
                        </div>
                        {item.progress !== undefined && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-slate-500">Progress</span>
                                    <span className="text-xs font-medium text-slate-300">{item.progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800/60 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.progress}%` }}
                                        className="h-full bg-gradient-to-r from-sky-500 to-blue-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Actions */}
                <div className="mb-6">
                    <h4 className="text-xs font-semibold text-slate-400 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/40 transition-colors text-left">
                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <Star className="h-4 w-4 text-amber-400" />
                            </div>
                            <span className="text-sm text-slate-300">{item.starred ? 'Unstar' : 'Star'} conversation</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/40 transition-colors text-left">
                            <div className="h-8 w-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
                                {item.muted ? <Bell className="h-4 w-4 text-slate-400" /> : <BellOff className="h-4 w-4 text-slate-400" />}
                            </div>
                            <span className="text-sm text-slate-300">{item.muted ? 'Unmute' : 'Mute'} notifications</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/40 transition-colors text-left">
                            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <Archive className="h-4 w-4 text-purple-400" />
                            </div>
                            <span className="text-sm text-slate-300">Archive conversation</span>
                        </button>
                    </div>
                </div>

                {/* Members */}
                {item.members && (
                    <div className="mb-6">
                        <h4 className="text-xs font-semibold text-slate-400 mb-3">Members ({item.members.length})</h4>
                        <div className="space-y-2">
                            {item.members.map((member) => (
                                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/40 transition-colors cursor-pointer">
                                    <div className="relative">
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                                            {member.avatar}
                                        </div>
                                        {member.online && (
                                            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-200 truncate">{member.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {member.typing ? 'typing...' : member.online ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                    <button className="p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors opacity-0 group-hover:opacity-100">
                                        <AtSign className="h-4 w-4 text-slate-400" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Projects & Tasks (from overview) */}
                {overview?.projects && overview.projects.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-xs font-semibold text-slate-400 mb-3">Projects</h4>
                        <div className="space-y-2">
                            {overview.projects.map((proj) => {
                                const projTasks = Array.isArray(proj.tasks) ? proj.tasks : (overview.tasks || []).filter(t => t.projectId === proj.id || t.project === proj.id);
                                return (
                                    <div key={proj.id} className="p-2 rounded-lg bg-slate-900/30 border border-slate-800/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-md bg-slate-800/60 flex items-center justify-center text-sm text-slate-200">
                                                    {typeof proj.icon === 'function' ? (
                                                        <proj.icon className="h-4 w-4 text-slate-300" />
                                                    ) : (
                                                        (proj.name && proj.name[0]) || 'P'
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-200 truncate">{proj.name}</p>
                                                    <p className="text-xs text-slate-500">{projTasks.length} tasks • {proj.progress ?? 0}%</p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-400">{proj.status}</div>
                                        </div>

                                        {projTasks.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {projTasks.slice(0, 3).map((t) => (
                                                    <div key={t.id} className="flex items-center justify-between text-xs text-slate-300">
                                                        <div className="truncate">{t.name}</div>
                                                        <div className={`px-2 py-0.5 rounded-full text-[11px] ${t.status === 'completed' || t.status === 'Done' ? 'bg-emerald-500/10 text-emerald-300' : t.status === 'in-progress' ? 'bg-blue-500/10 text-blue-300' : 'bg-slate-700/10 text-slate-400'}`}>{t.priority ? t.priority : t.status}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Shared Files */}
                <div className="mb-6">
                    <h4 className="text-xs font-semibold text-slate-400 mb-3">Shared Files</h4>
                    <div className="space-y-2">
                        {[
                            { name: 'Design_System.fig', size: '2.4 MB', icon: ImageIcon, date: '2 days ago' },
                            { name: 'Requirements.pdf', size: '1.8 MB', icon: FileIcon, date: '5 days ago' }
                        ].map((file, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/40 transition-colors group cursor-pointer">
                                <div className="h-10 w-10 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                                    <file.icon className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                                    <p className="text-xs text-slate-500">{file.size} • {file.date}</p>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-700/60 transition-all">
                                    <Download className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tags */}
                <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                        {['Design', 'High Priority', 'Q1 2024'].map((tag) => (
                            <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 hover:bg-slate-800/60 transition-colors cursor-pointer">
                                {tag}
                            </span>
                        ))}
                        <button className="px-2.5 py-1 rounded-lg border border-dashed border-slate-700/50 text-xs text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors">
                            + Add tag
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfoSidebar