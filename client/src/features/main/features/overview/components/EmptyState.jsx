import { motion } from "framer-motion"
import { MessageSquare } from "lucide-react";

const EmptyState = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
        >
            <div className="text-center">
                <div className="h-24 w-24 rounded-2xl bg-slate-900/40 border border-slate-800/50 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-10 w-10 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-300 mb-2">Select a conversation</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                    Choose a workspace, project, or task from the left panel to start chatting with your team
                </p>
                <div className="flex items-center justify-center gap-2">
                    <div className="flex -space-x-2">
                        {['SC', 'MR', 'EW'].map((avatar, i) => (
                            <div key={i} className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white border-2 border-slate-950">
                                {avatar}
                            </div>
                        ))}
                    </div>
                    <span className="text-xs text-slate-500">3 team members online</span>
                </div>
            </div>
        </motion.div>
    );
};

export default EmptyState