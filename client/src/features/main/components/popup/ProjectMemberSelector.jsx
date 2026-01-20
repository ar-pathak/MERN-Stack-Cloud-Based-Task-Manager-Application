import { UserPlus, Loader2, AlertCircle, CheckSquare } from "lucide-react";

const ProjectMemberSelector = ({ members, selectedIds, isLoading, onToggle, disabled }) => {
    if (isLoading) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800/50">
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                <p className="text-sm text-slate-400">Loading workspace members...</p>
            </div>
        );
    }

    if (!isLoading && members.length === 0) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-amber-400">No members found</p>
                    <p className="text-xs text-amber-400/70">Add members to the workspace first.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add Team Members
                <span className="text-xs text-slate-500 font-normal">({selectedIds.length} selected)</span>
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {members.map(member => (
                    <button
                        key={member.id}
                        type="button"
                        onClick={() => onToggle('members', member.id)}
                        disabled={disabled}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedIds.includes(member.id)
                                ? 'bg-violet-500/10 border-violet-500/30'
                                : 'bg-slate-900/40 border-slate-800/50 hover:bg-slate-800/40'
                            }`}
                    >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {member.avatar}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <span className="text-sm text-slate-300 block truncate">{member.name}</span>
                            <span className="text-xs text-slate-500 block truncate">{member.role}</span>
                        </div>
                        {selectedIds.includes(member.id) && <CheckSquare className="h-4 w-4 text-violet-400 flex-shrink-0" />}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ProjectMemberSelector;