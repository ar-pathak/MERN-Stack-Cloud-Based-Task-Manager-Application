import { useEffect, useState } from "react"


export default function DarkModeToggle() {
    const [isDark, setIsDark] = useState(() => typeof window !== 'undefined' && document.documentElement.classList.contains('dark'))

    useEffect(() => {
        if (isDark) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
    }, [isDark])

    return (
        <button
            onClick={() => setIsDark((s) => !s)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg border bg-white/60 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 text-sm"
            aria-label="Toggle dark mode"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m8.66-10.66l-.7.7M4.04 19.96l-.7-.7M21 12h-1M4 12H3m16.66 4.66l-.7-.7M4.04 4.04l-.7.7" />
            </svg>
            <span className="hidden sm:inline">Dark</span>
        </button>
    )
}
