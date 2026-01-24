import { motion, AnimatePresence } from "framer-motion";
import {
    Briefcase, FolderOpen, CheckSquare, Star, BellOff,
    Loader2, Search, Phone, Video, Info,
    ListTodo
} from "lucide-react";

const ChatHeader = ({
    item, typingMembers, showSearch, setShowSearch,
    searchQuery, setSearchQuery, messageFilter, setMessageFilter,
    showChatInfo, setShowChatInfo
}) => {
    const getItemTitle = (item) => {
        return item.name || item.title || "Untitled";
    };

    const getItemIcon = (type) => {
        switch (type) {
            case "workspace": return <Briefcase className="h-5 w-5 text-sky-400" />;
            case "project": return <FolderOpen className="h-5 w-5 text-purple-400" />;
            case "task": return <CheckSquare className="h-5 w-5 text-emerald-400" />;
            case "subtask": return <ListTodo className="h-5 w-5 text-cyan-400" />;
            default: return <Briefcase className="h-5 w-5 text-sky-400" />;
        }
    };


    const getItemColorClass = (type) => {
        switch (type) {
            case "workspace": return 'bg-gradient-to-br from-sky-500/20 to-blue-600/20 border-sky-500/30 group-hover:border-sky-400/50';
            case "project": return 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 group-hover:border-purple-400/50';
            case "subtask": return 'bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border-cyan-500/30 group-hover:border-cyan-400/50'; // New Color
            default: return 'bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-emerald-500/30 group-hover:border-emerald-400/50';
        }
    };

    return (
        <div className="flex-shrink-0 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Title & Icon Section */}
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all border ${getItemColorClass(item.type)}`}>
                            {getItemIcon(item.type)}
                        </div>
                        {item.members?.some(m => m.online) && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-slate-950"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="h-full w-full rounded-full bg-emerald-400 opacity-75"
                                />
                            </motion.div>
                        )}
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            {getItemTitle(item)}
                            {item.starred && (
                                <motion.div whileHover={{ rotate: 72 }}>
                                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                </motion.div>
                            )}
                            {item.muted && <BellOff className="h-4 w-4 text-slate-500" />}
                        </h2>


                        <div className="flex items-center gap-2">
                            {typingMembers?.length > 0 ? (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-xs text-sky-400 italic flex items-center gap-1.5"
                                >
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                        <Loader2 className="h-3 w-3" />
                                    </motion.div>
                                    {typingMembers[0].name.split(' ')[0]} is typing...
                                </motion.span>
                            ) : (
                                <p className="text-xs text-slate-400">
                                    {item.members ? `${item.members.length} members` : 'Personal task'} •
                                    {item.members?.filter(m => m.online).length > 0 && (
                                        <span className="text-emerald-400 ml-1">
                                            {item.members.filter(m => m.online).length} online
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <HeaderButton icon={Search} active={showSearch} onClick={() => setShowSearch(!showSearch)} />
                    <HeaderButton icon={Phone} />
                    <HeaderButton icon={Video} />
                    <HeaderButton icon={Info} active={showChatInfo} onClick={() => setShowChatInfo(!showChatInfo)} />
                </div>
            </div>

            {/* Search Dropdown */}
            <AnimatePresence>
                {showSearch && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 overflow-hidden"
                    >
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search messages..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-slate-700"
                                />
                            </div>
                            <select
                                value={messageFilter}
                                onChange={(e) => setMessageFilter(e.target.value)}
                                className="px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-slate-700"
                            >
                                <option value="all">All</option>
                                <option value="files">Files</option>
                                <option value="pinned">Pinned</option>
                            </select>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const HeaderButton = ({ icon: Icon, onClick, active }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`p-2.5 rounded-xl transition-colors ${active ? 'bg-slate-800/80 text-sky-400' : 'hover:bg-slate-800/60 text-slate-400'}`}
    >
        <Icon className="h-5 w-5" />
    </motion.button>
);

export default ChatHeader;