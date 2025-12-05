
export default function Filters({ selected, onSelect }) {
    const options = ['All', 'Tasks', 'Comments', 'System']
    return (
        <div className="flex gap-2 mb-6">
            {options.map((op) => (
                <button
                    key={op}
                    onClick={() => onSelect(op)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${selected === op ? 'bg-indigo-600 text-white shadow' : 'bg-white/60 dark:bg-slate-800/50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700'}`}
                >
                    {op}
                </button>
            ))}
            <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">Showing <span className="font-semibold">3</span> recent</div>
        </div>
    )
}