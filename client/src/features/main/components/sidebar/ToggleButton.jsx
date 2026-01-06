import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

export const ToggleButton = ({ isExpanded, onClick }) => {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.15, boxShadow: "0 0 20px rgba(56, 189, 248, 0.3)" }}
            whileTap={{ scale: 0.9 }}
            className="absolute right-3 bottom-20 z-10 h-8 w-8 rounded-xl border border-slate-700/70 bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg flex items-center justify-center group"
            title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
            <motion.div
                animate={{ rotate: isExpanded ? 0 : 180 }}
                transition={{ duration: 0.3 }}
            >
                <ChevronLeft className="h-4 w-4 text-slate-400 group-hover:text-sky-400 transition-colors" />
            </motion.div>
        </motion.button>
    );
};