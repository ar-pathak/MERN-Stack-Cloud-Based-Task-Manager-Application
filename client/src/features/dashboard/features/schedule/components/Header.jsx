

function Header() {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Schedule</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Plan your day and upcoming tasks.</p>
            </div>
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow hover:scale-105 transition">
                + Add Schedule
            </button>
        </div>
    )
}
export default Header;