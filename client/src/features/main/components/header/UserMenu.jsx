import { motion } from "framer-motion";

export const UserMenu = () => {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            className="h-9 w-9 rounded-xl bg-gradient-to-br 
                 from-sky-500/30 to-cyan-500/20 
                 border border-sky-400/30 
                 flex items-center justify-center"
        >
            <span className="text-sm font-bold text-slate-100">A</span>
        </motion.button>
    );
};
