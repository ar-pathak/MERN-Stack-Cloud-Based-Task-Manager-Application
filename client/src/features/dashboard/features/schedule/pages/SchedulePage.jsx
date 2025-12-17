
import DaySelector from "../components/DaySelector";
import Header from "../components/Header";
import ScheduleItem from "../components/ScheduleItem";
import { scheduleMock } from "../utils/data";
import { motion } from 'framer-motion';

export default function SchedulePage() {
    return (
        <div className="min-h-screen py-12 px-6 md:px-12 lg:px-20 bg-sky-50 dark:bg-slate-900 transition-colors">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-900" />

            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="p-8 rounded-3xl bg-white/60 dark:bg-slate-800/50 backdrop-blur border border-gray-100 dark:border-slate-700 shadow-xl"
                >
                    <Header />
                    <DaySelector />

                    <div className="space-y-4">
                        {scheduleMock.map((item, index) => (
                            <ScheduleItem key={item.id} item={item} index={index} />
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}