import { motion } from "framer-motion";
import { Pin } from "lucide-react";

const PinnedBanner = ({ pinnedMessages }) => {
    if (!pinnedMessages || pinnedMessages.length === 0) return null;

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Pin className="h-3.5 w-3.5 text-amber-400" />
                    <p className="text-xs text-amber-400 font-medium">
                        {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? 's' : ''}
                    </p>
                </div>
                <button className="text-xs text-amber-400/60 hover:text-amber-400">
                    View all
                </button>
            </div>
        </motion.div>
    );
};

export default PinnedBanner;