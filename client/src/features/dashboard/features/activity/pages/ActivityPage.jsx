import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { activitiesMock } from '../utils/data'
import WaterEffect from '../components/WaterEffect'
import Timeline from '../components/Timeline'
import Filters from '../components/Filters'
import Header from '../components/Header'



export default function ActivityPage() {
    const [filter, setFilter] = useState('All')

    const filtered = useMemo(() => {
        if (filter === 'All') return activitiesMock
        if (filter === 'Tasks') return activitiesMock.filter((a) => a.type.toLowerCase().includes('task'))
        if (filter === 'Comments') return activitiesMock.filter((a) => a.type.toLowerCase().includes('comment'))
        return activitiesMock.filter((a) => a.type.toLowerCase().includes('system'))
    }, [filter])

    return (
        <div className="min-h-screen relative py-12 px-6 md:px-12 lg:px-20 bg-sky-50 dark:bg-slate-900 transition-colors duration-300">
            {/* Soft gradient background */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-900" />

            {/* Decorative glass container */}
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="p-8 rounded-3xl bg-white/60 dark:bg-slate-800/50 backdrop-blur-md border border-gray-100 dark:border-slate-700 shadow-xl relative overflow-hidden"
                >
                    <Header />

                    <Filters selected={filter} onSelect={setFilter} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <motion.div layout className="space-y-4">
                                <Timeline items={filtered} />
                            </motion.div>
                        </div>

                        <aside className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="p-4 bg-white/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 shadow"
                            >
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Activity Insights</h3>
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Recent activity volume, quick filters, and shortcuts.</p>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 text-sm font-semibold">12 tasks</div>
                                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 text-sm font-semibold">4 comments</div>
                                    <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200 text-sm font-semibold">3 blockers</div>
                                    <div className="p-2 rounded-lg bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-200 text-sm font-semibold">2 reviews</div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 }}
                                className="p-4 bg-white/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 shadow"
                            >
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Quick actions</h3>
                                <div className="mt-3 flex flex-col gap-2">
                                    <button className="py-2 rounded-xl border border-gray-200 dark:border-slate-700">Create Task</button>
                                    <button className="py-2 rounded-xl border border-gray-200 dark:border-slate-700">Add Note</button>
                                    <button className="py-2 rounded-xl border border-gray-200 dark:border-slate-700">Invite Member</button>
                                </div>
                            </motion.div>
                        </aside>
                    </div>

                    {/* Floating FAB */}
                    <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.96 }}
                        className="fixed right-12 bottom-12 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-2xl flex items-center justify-center"
                        aria-label="New activity"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </motion.button>

                    <WaterEffect />
                </motion.div>
            </div>
        </div>
    )
}
