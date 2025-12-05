
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

export default function ActivityItem({ activity, index }) {
    const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.12 })
    return (
        <motion.li
            ref={ref}
            initial={{ opacity: 0, y: 18, scale: 0.995 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ delay: index * 0.08, duration: 0.45, ease: 'easeOut' }}
            className="relative bg-white/80 dark:bg-slate-800/60 backdrop-blur-md border border-gray-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex gap-4 items-start"
        >
            <div className="flex-shrink-0">
                <img src={activity.avatar} alt="avatar" className="w-12 h-12 rounded-lg object-cover shadow" />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-indigo-600 font-semibold">{activity.type}</div>
                        <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">{activity.title}</div>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-300">{activity.time}</div>
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{activity.description}</p>
                <div className="mt-3 flex items-center gap-2">
                    <button className="text-sm px-3 py-1 rounded-full bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-700">View</button>
                    <button className="text-sm px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200">Resolve</button>
                </div>
            </div>
        </motion.li>
    )
}
