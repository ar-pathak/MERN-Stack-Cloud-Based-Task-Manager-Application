import {
    X, Briefcase, FolderOpen, Calendar, Flag,
    CheckSquare, Users, Loader2, AlertCircle
} from "lucide-react";

export const TaskHeader = ({ levelInfo, onClose, disabled }) => (
    <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-800/50 px-6 py-4">
        <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl bg-${levelInfo.color}-500/10 border border-${levelInfo.color}-500/20 flex items-center justify-center`}>
                <levelInfo.icon className={`h-5 w-5 text-${levelInfo.color}-400`} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-100">{levelInfo.label}</h2>
                <p className="text-xs text-slate-500">{levelInfo.description}</p>
            </div>
        </div>
        <button
            onClick={onClose}
            disabled={disabled}
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors disabled:opacity-50"
        >
            <X className="h-5 w-5 text-slate-400" />
        </button>
    </div>
);

export const BasicInputs = ({ formData, handleChange, errors, disabled }) => (
    <div className="space-y-5">
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
                Task Title <span className="text-rose-400">*</span>
            </label>
            <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Design system audit"
                className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-green-500/50 transition-colors ${errors.title ? 'border-rose-500/50' : 'border-slate-800/60'
                    }`}
                disabled={disabled}
            />
            {errors.title && <p className="mt-1.5 text-xs text-rose-400">{errors.title}</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the task details..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-green-500/50 transition-colors resize-none"
                disabled={disabled}
            />
        </div>
    </div>
);

export const ContextSelectors = ({
    flags, workspaces, filteredProjects, formData, handleChange, disabled
}) => {
    if (!flags.isGlobal && !flags.isWorkspace) return null;

    return (
        <div className={flags.isGlobal ? "grid grid-cols-2 gap-4" : ""}>
            {flags.isGlobal && (
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Workspace</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <select
                            name="workspace"
                            value={formData.workspace}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-green-500/50 appearance-none"
                            disabled={disabled}
                        >
                            <option value="">No workspace</option>
                            {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                        </select>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Project</label>
                <div className="relative">
                    <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <select
                        name="project"
                        value={formData.project}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-green-500/50 appearance-none"
                        disabled={disabled || (flags.isGlobal && !formData.workspace)}
                    >
                        <option value="">No project</option>
                        {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
};

export const TaskSettings = ({ formData, handleChange, disabled }) => (
    <div className="space-y-5">
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Due Date</label>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-green-500/50"
                    disabled={disabled}
                />
            </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
            <div className="flex items-center gap-3 flex-1">
                <Flag className="h-5 w-5 text-rose-400" />
                <div>
                    <p className="text-sm font-medium text-slate-300">High Priority</p>
                    <p className="text-xs text-slate-500">Mark this task as urgent</p>
                </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    name="isHighPriority"
                    checked={formData.isHighPriority}
                    onChange={handleChange}
                    className="sr-only peer"
                    disabled={disabled}
                />
                <div className="w-11 h-6 bg-slate-800/60 peer-focus:outline-none rounded-full peer peer-checked:bg-rose-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
        </div>
    </div>
);

export const AssigneeGrid = ({ title, items, selected, onToggle, isLoading, type = "member", disabled }) => {
    if (!items.length) return null;

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
                {title}
                {isLoading && <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin text-slate-500" />}
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {items.map(item => {
                    const isSelected = selected.includes(item.id);
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onToggle(type === 'member' ? 'assignees' : 'assigneesTeams', item.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected
                                    ? type === 'member' ? 'bg-green-500/10 border-green-500/30' : 'bg-purple-500/10 border-purple-500/30'
                                    : 'bg-slate-900/40 border-slate-800/50 hover:bg-slate-800/40'
                                }`}
                            disabled={disabled}
                        >
                            {type === 'member' ? (
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                                    {item.avatar}
                                </div>
                            ) : (
                                <Users className="h-5 w-5 text-purple-400" />
                            )}
                            <div className="flex-1 text-left min-w-0">
                                <span className="text-sm text-slate-300 block truncate">{item.name}</span>
                                {type === 'member' && <span className="text-xs text-slate-500 block truncate">{item.role}</span>}
                            </div>
                            {isSelected && (
                                <CheckSquare className={`h-4 w-4 flex-shrink-0 ${type === 'member' ? 'text-green-400' : 'text-purple-400'}`} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};