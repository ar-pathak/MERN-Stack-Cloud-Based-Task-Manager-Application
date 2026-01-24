import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Check, Link as LinkIcon, Star, Bell, BellOff, Archive, Zap
} from "lucide-react";
import { useWorkspace } from "../../hook/useWorkspace";

const QuickActions = ({ item }) => {
    // Destructure new getQuickStatus and toggleArchive
    const { toggleStar, toggleMute, getQuickStatus } = useWorkspace();

    // Initialize state from item props (fallback)
    const [starred, setStarred] = useState(item.isStarred || item.starred || false);
    const [muted, setMuted] = useState(item.isMuted || item.muted || false);
    const [loading, setLoading] = useState(null); // 'star', 'mute', 'archive', 'fetch', or null

    const itemId = item.id || item._id;

    // Fetch fresh status on mount
    useEffect(() => {
        let isMounted = true;

        const fetchStatus = async () => {
            if (!itemId) return;

            const { success, data } = await getQuickStatus(itemId);

            if (success && isMounted) {
                setStarred(data.isStarred);
                setMuted(data.isMuted);
            }
        };

        fetchStatus();

        return () => { isMounted = false; };
    }, [itemId, getQuickStatus]);


    const handleToggleStar = async () => {
        if (loading) return;
        setLoading('star');
        const { success } = await toggleStar(itemId);
        if (success) setStarred(!starred);
        setLoading(null);
    };

    const handleToggleMute = async () => {
        if (loading) return;
        setLoading('mute');
        const { success } = await toggleMute(itemId);
        if (success) setMuted(!muted);
        setLoading(null);
    };

    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Actions</h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {/* Star Action */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleToggleStar}
                    disabled={loading === 'star'}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-medium ${starred
                        ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-slate-900/40 border-slate-800/50 text-slate-400 hover:bg-slate-800/60'
                        } ${loading === 'star' ? 'opacity-50 cursor-wait' : ''}`}
                >
                    <Star className={`h-4 w-4 ${starred ? 'fill-amber-400' : ''}`} />
                    {starred ? 'Starred' : 'Star'}
                </motion.button>

                {/* Mute Action */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleToggleMute}
                    disabled={loading === 'mute'}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-medium ${muted
                        ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                        : 'bg-slate-900/40 border-slate-800/50 text-slate-400 hover:bg-slate-800/60'
                        } ${loading === 'mute' ? 'opacity-50 cursor-wait' : ''}`}
                >
                    {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    {muted ? 'Muted' : 'Mute'}
                </motion.button>
            </div>
        </section>
    );
};
export default QuickActions;