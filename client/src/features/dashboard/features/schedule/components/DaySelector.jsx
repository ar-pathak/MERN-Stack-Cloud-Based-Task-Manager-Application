import { useState } from "react"
import { days } from "../utils/data"

function DaySelector() {
    
    const [active, setActive] = useState('Wed')

    return (
        <div className="flex gap-2 mb-6">
            {days.map((day) => (
                <button
                    key={day}
                    onClick={() => setActive(day)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition ${active === day ? 'bg-indigo-600 text-white shadow' : 'bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700'}`}
                >
                    {day}
                </button>
            ))}
        </div>
    )
}

export default DaySelector