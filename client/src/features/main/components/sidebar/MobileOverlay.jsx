import { motion, AnimatePresence } from "framer-motion";

export const MobileOverlay = ({ isOpen, onClose, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40"
                    />
                    <motion.aside
                        initial={{ x: -280 }}
                        animate={{ x: 0 }}
                        exit={{ x: -280 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="md:hidden fixed left-0 top-0 h-full w-64 z-50 flex flex-col border-r border-slate-800/70 bg-slate-950/95 backdrop-blur-xl shadow-2xl"
                    >
                        {children}
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};