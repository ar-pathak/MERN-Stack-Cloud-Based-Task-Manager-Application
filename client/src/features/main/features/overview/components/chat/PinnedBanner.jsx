import { motion, AnimatePresence } from "framer-motion";
import { Pin, X } from "lucide-react";

const PinnedBanner = ({ pinnedMessages, onViewPinned }) => {
    if (!pinnedMessages || pinnedMessages.length === 0) return null;

    // Get the most recent pinned message
    const latestPinned = pinnedMessages[pinnedMessages.length - 1];
    const content = latestPinned?.text || latestPinned?.content || '';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b border-amber-500/20"
            >
                <div className="px-6 py-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <motion.div
                                animate={{ rotate: [0, -10, 10, -10, 0] }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="flex-shrink-0"
                            >
                                <Pin className="h-4 w-4 text-amber-400" fill="currentColor" />
                            </motion.div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-xs text-amber-400 font-semibold">
                                        {pinnedMessages.length === 1
                                            ? 'Pinned Message'
                                            : `${pinnedMessages.length} Pinned Messages`
                                        }
                                    </p>
                                </div>
                                <p className="text-sm text-slate-300 truncate">
                                    {content.substring(0, 100)}
                                    {content.length > 100 && '...'}
                                </p>
                            </div>
                        </div>

                        {pinnedMessages.length > 1 && onViewPinned && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onViewPinned}
                                className="text-xs text-amber-400/80 hover:text-amber-400 font-medium px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-all flex-shrink-0"
                            >
                                View All
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PinnedBanner;