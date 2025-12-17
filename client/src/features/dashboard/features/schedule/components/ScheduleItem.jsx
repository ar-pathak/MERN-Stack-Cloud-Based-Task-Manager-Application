
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer';

function ScheduleItem({ item, index }) {
    const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 })

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className="relative flex gap-4 p-4 rounded-2xl bg-white/80 dark:bg-slate-800/60 backdrop-blur border border-gray-100 dark:border-slate-700 shadow"
        >
            <div className={`w-2 rounded-full bg-${item.color}-500`} />

            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.time}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                <div className="mt-3 flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs rounded-full bg-${item.color}-50 dark:bg-${item.color}-900/30 text-${item.color}-700 dark:text-${item.color}-200`}>
                        {item.type}
                    </span>
                    <button className="text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700">Edit</button>
                </div>
            </div>
        </motion.div>
    )
}

export default ScheduleItem;