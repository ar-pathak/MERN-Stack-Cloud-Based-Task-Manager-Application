import DarkModeToggle from "./DarkModeToggle";

export default function Header() {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Activity</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recent actions across your workspace.</p>
            </div>
            <div className="flex items-center gap-3">
                <DarkModeToggle />
                <button className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:scale-105 transform transition">
                    Mark all read
                </button>
                <div className="w-10 h-10 rounded-full bg-white/70 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-700 shadow flex items-center justify-center">
                    <img src="https://images.unsplash.com/photo-1545996124-1b0b1c0b1f0e?w=80&q=60" alt="workspace" className="w-8 h-8 rounded-full object-cover" />
                </div>
            </div>
        </div>
    )
}
