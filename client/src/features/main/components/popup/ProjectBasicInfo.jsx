const ProjectBasicInfo = ({ name, description, status, onChange, error, disabled }) => (
    <div className="space-y-5">
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
                Project Name <span className="text-rose-400">*</span>
            </label>
            <input
                type="text"
                name="name"
                value={name}
                onChange={onChange}
                placeholder="e.g., Mobile App Redesign"
                className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors ${error ? 'border-rose-500/50' : 'border-slate-800/60'
                    }`}
                disabled={disabled}
                autoFocus
            />
            {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
                name="description"
                value={description}
                onChange={onChange}
                placeholder="Describe the project goals and scope..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                disabled={disabled}
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
            <select
                name="status"
                value={status}
                onChange={onChange}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 transition-colors appearance-none"
                disabled={disabled}
            >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="completed">Completed</option>
            </select>
        </div>
    </div>
);

export default ProjectBasicInfo;