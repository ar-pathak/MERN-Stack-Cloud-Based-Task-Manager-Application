import {
    X, ListChecks, Calendar, UserPlus,
    CheckCircle2, Loader2, AlertCircle, Info
} from "lucide-react";

export const SubtaskHeader = ({ taskTitle, onClose, disabled }) => (
    <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-800/50 px-6 py-4">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-600/20 border border-teal-500/30 flex items-center justify-center">
                <ListChecks className="h-5 w-5 text-teal-400" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-100">Create Subtask</h2>
                <p className="text-xs text-slate-500">
                    Add to: <span className="text-teal-400">{taskTitle || 'Task'}</span>
                </p>
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

export const SubtaskInputs = ({ formData, handleChange, errors, disabled }) => (
    <div className="space-y-5">
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
                Subtask Title <span className="text-rose-400">*</span>
            </label>
            <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Create wireframes for login page"
                className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 transition-colors ${errors.title ? 'border-rose-500/50' : 'border-slate-800/60'
                    }`}
                disabled={disabled}
                autoFocus
            />
            {errors.title && <p className="mt-1.5 text-xs text-rose-400">{errors.title}</p>}
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description (Optional)</label>
            <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Add more details about this subtask..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 transition-colors resize-none"
                disabled={disabled}
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date (Optional)
            </label>
            <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-teal-500/50 transition-colors"
                disabled={disabled}
            />
        </div>
    </div>
);

export const AssigneeSelector = ({ assignees, selectedId, onSelect, isLoading, disabled }) => {
    if (isLoading) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800/50">
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                <p className="text-sm text-slate-400">Loading task details...</p>
            </div>
        );
    }

    if (assignees.length === 0) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-amber-400">No assignees available</p>
                    <p className="text-xs text-amber-400/70">Parent task has no assigned members</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Assign To (Optional)
                <span className="text-xs text-slate-500 font-normal">- from parent task</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
                {assignees.map(assignee => (
                    <button
                        key={assignee.id}
                        type="button"
                        onClick={() => onSelect(assignee.id)}
                        disabled={disabled}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedId === assignee.id
                                ? 'bg-teal-500/10 border-teal-500/30'
                                : 'bg-slate-900/40 border-slate-800/50 hover:bg-slate-800/40'
                            }`}
                    >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {assignee.avatar}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <span className="text-sm text-slate-300 block truncate">{assignee.name}</span>
                            {assignee.email && <span className="text-xs text-slate-500 block truncate">{assignee.email}</span>}
                        </div>
                        {selectedId === assignee.id && <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />}
                    </button>
                ))}
            </div>
        </div>
    );
};


export const ProTip = () => (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
        <Info className="h-4 w-4 text-teal-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-teal-300">
            💡 <strong>Pro Tip:</strong> Break down complex tasks into smaller, manageable subtasks. Aim for subtasks that can be completed in 1-2 hours for better progress tracking.
        </p>
    </div>
);