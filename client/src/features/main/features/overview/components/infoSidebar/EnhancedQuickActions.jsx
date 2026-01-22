import { useState } from "react";
import { motion } from "framer-motion";
import {
    Check, Link as LinkIcon, Star, Bell, BellOff, Image as ImageIcon, Archive, Zap
} from "lucide-react";

const EnhancedQuickActions = ({ item }) => {
    const [starred, setStarred] = useState(item.starred || false);
    const [muted, setMuted] = useState(item.muted || false);
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        const link = `${window.location.origin}/${item.type}/${item.id || item._id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Actions</h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStarred(!starred)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-medium ${starred
                        ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-slate-900/40 border-slate-800/50 text-slate-400 hover:bg-slate-800/60'
                        }`}
                >
                    <Star className={`h-4 w-4 ${starred ? 'fill-amber-400' : ''}`} />
                    {starred ? 'Starred' : 'Star'}
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setMuted(!muted)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-medium ${muted
                        ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                        : 'bg-slate-900/40 border-slate-800/50 text-slate-400 hover:bg-slate-800/60'
                        }`}
                >
                    {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    {muted ? 'Muted' : 'Mute'}
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-3 rounded-xl border bg-slate-900/40 border-slate-800/50 text-slate-400 hover:bg-slate-800/60 transition-all flex items-center justify-center gap-2 text-xs font-medium"
                >
                    <Archive className="h-4 w-4" />
                    Archive
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyLink}
                    className="p-3 rounded-xl border bg-slate-900/40 border-slate-800/50 text-slate-400 hover:bg-slate-800/60 transition-all flex items-center justify-center gap-2 text-xs font-medium"
                >
                    {copied ? (
                        <>
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <LinkIcon className="h-4 w-4" />
                            Copy Link
                        </>
                    )}
                </motion.button>
            </div>
        </section>
    );
};
export default EnhancedQuickActions