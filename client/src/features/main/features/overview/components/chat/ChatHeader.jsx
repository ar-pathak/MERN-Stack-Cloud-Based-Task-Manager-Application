import { motion, AnimatePresence } from "framer-motion";
import {
    Briefcase, FolderOpen, CheckSquare, Star, BellOff,
    Loader2, Search, Phone, Video, Info, ListTodo,
    MoreVertical, UserPlus, Settings, LogOut, Archive,
    Users, Hash
} from "lucide-react";
import { useState } from "react";

const ChatHeader = ({
    item,
    typingMembers,
    showSearch,
    setShowSearch,
    searchQuery,
    setSearchQuery,
    messageFilter,
    setMessageFilter,
    showChatInfo,
    setShowChatInfo,
    // ── Call handlers (wired from ChatPanel) ──────────────────────────────
    onStartVideoCall,
    onStartAudioCall,
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const isDM = item?.type === 'chat' || item?.type === 'dm';

    const handleArchive = () => { console.log("Archive chat:", item); setShowDropdown(false); };
    const handleMute = () => { console.log("Toggle mute:", item); setShowDropdown(false); };
    const handleLeave = () => { console.log("Leave group:", item); setShowDropdown(false); };
    const handleAddMembers = () => { console.log("Add members:", item); setShowDropdown(false); };
    const handleSettings = () => { console.log("Settings for:", item); setShowDropdown(false); };

    const getItemTitle = (item) => item?.name || item?.title || "Untitled";

    const getItemIcon = (type) => {
        switch (type) {
            case "workspace": return <Briefcase className="h-5 w-5 text-sky-400" />;
            case "project": return <FolderOpen className="h-5 w-5 text-purple-400" />;
            case "task": return <CheckSquare className="h-5 w-5 text-emerald-400" />;
            case "subtask": return <ListTodo className="h-5 w-5 text-cyan-400" />;
            case "dm": return <Users className="h-5 w-5 text-indigo-400" />;
            default: return <Hash className="h-5 w-5 text-slate-400" />;
        }
    };

    const getItemColorClass = (type) => {
        switch (type) {
            case "workspace": return 'bg-gradient-to-br from-sky-500/20 to-blue-600/20 border-sky-500/30';
            case "project": return 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30';
            case "subtask": return 'bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border-cyan-500/30';
            case "dm": return 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30';
            default: return 'bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-emerald-500/30';
        }
    };

    const onlineMembersCount = item?.members?.filter(m => m.online).length || 0;

    return (
        <div className="flex-shrink-0 border-b border-slate-800/50 bg-gradient-to-b from-slate-950 to-slate-950/80 backdrop-blur-xl px-6 py-4">
            <div className="flex items-center justify-between">

                {/* ── Avatar / icon ──────────────────────────────────────── */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative group flex-shrink-0">
                        {isDM ? (
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="h-12 w-12 rounded-full overflow-hidden border-2 border-slate-800 shadow-lg relative"
                            >
                                {item?.avatar ? (
                                    <img src={item.avatar} alt={item.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                        {item?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                {item?.isOnline && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-lg"
                                    >
                                        <motion.span
                                            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                            className="absolute inset-0 rounded-full bg-emerald-400"
                                        />
                                    </motion.span>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all border shadow-lg ${getItemColorClass(item?.type)}`}
                            >
                                {getItemIcon(item?.type)}
                            </motion.div>
                        )}

                        {!isDM && onlineMembersCount > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="h-full w-full rounded-full bg-emerald-400 opacity-75"
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* ── Name + status ───────────────────────────────────── */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h2 className="text-lg font-bold text-slate-100 truncate">
                                {getItemTitle(item)}
                            </h2>
                            {!isDM && item?.starred && (
                                <motion.div whileHover={{ rotate: 72, scale: 1.1 }} className="flex-shrink-0">
                                    <Star className="h-4 w-4 text-amber-400 fill-amber-400 drop-shadow-lg" />
                                </motion.div>
                            )}
                            {item?.muted && <BellOff className="h-4 w-4 text-slate-500 flex-shrink-0" />}
                        </div>

                        {/* Typing / online indicator */}
                        <div className="flex items-center gap-2">
                            {typingMembers?.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-0.5">
                                        {[0, 1, 2].map(i => (
                                            <motion.div
                                                key={i}
                                                animate={{ y: [0, -3, 0] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                                className="h-1.5 w-1.5 rounded-full bg-sky-400"
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-sky-400 font-medium">
                                        {typingMembers[0]?.name}
                                        {typingMembers.length > 1 && ` +${typingMembers.length - 1}`}
                                        {' is typing...'}
                                    </span>
                                </div>
                            ) : isDM ? (
                                <span className={`text-xs font-medium ${item?.isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {item?.isOnline ? 'Online' : 'Offline'}
                                </span>
                            ) : (
                                <span className="text-xs text-slate-500">
                                    {item?.members?.length || 0} members
                                    {onlineMembersCount > 0 && (
                                        <span className="text-emerald-400 ml-1">· {onlineMembersCount} online</span>
                                    )}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Action buttons ─────────────────────────────────────── */}
                <div className="flex items-center gap-1">
                    <HeaderButton
                        icon={Search}
                        tooltip="Search messages"
                        active={showSearch}
                        onClick={() => setShowSearch(!showSearch)}
                    />

                    {/* ── Audio call button ───────────────────────────────── */}
                    <HeaderButton
                        icon={Phone}
                        tooltip="Voice call"
                        onClick={() => onStartAudioCall?.()}
                    />

                    {/* ── Video call button ───────────────────────────────── */}
                    <HeaderButton
                        icon={Video}
                        tooltip="Video call"
                        onClick={() => onStartVideoCall?.()}
                    />

                    {!isDM && (
                        <HeaderButton
                            icon={Info}
                            active={showChatInfo}
                            onClick={() => setShowChatInfo(!showChatInfo)}
                            tooltip="Chat info"
                        />
                    )}

                    {/* ── Dropdown ────────────────────────────────────────── */}
                    <div className="relative">
                        <HeaderButton
                            icon={MoreVertical}
                            active={showDropdown}
                            onClick={() => setShowDropdown(!showDropdown)}
                            tooltip="More options"
                        />

                        <AnimatePresence>
                            {showDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50"
                                    >
                                        {!isDM && (
                                            <DropdownItem icon={UserPlus} label="Add members" onClick={handleAddMembers} />
                                        )}
                                        <DropdownItem icon={BellOff} label={item?.muted ? "Unmute" : "Mute"} onClick={handleMute} />
                                        <DropdownItem icon={Archive} label="Archive" onClick={handleArchive} />
                                        {!isDM && (
                                            <>
                                                <div className="h-px bg-slate-800 my-1" />
                                                <DropdownItem icon={Settings} label="Group settings" onClick={handleSettings} />
                                                <DropdownItem icon={LogOut} label="Leave group" onClick={handleLeave} danger />
                                            </>
                                        )}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ── Search bar ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {showSearch && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 overflow-hidden"
                    >
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search messages..."
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all"
                                />
                            </div>
                            <select
                                value={messageFilter}
                                onChange={(e) => setMessageFilter(e.target.value)}
                                className="px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-sky-500/50 transition-all cursor-pointer"
                            >
                                <option value="all">All messages</option>
                                <option value="files">Files only</option>
                                <option value="pinned">Pinned only</option>
                                <option value="media">Media only</option>
                            </select>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const HeaderButton = ({ icon: Icon, onClick, active, tooltip }) => (
    <div className="relative group">
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`p-2.5 rounded-xl transition-all ${active
                    ? 'bg-sky-500/20 text-sky-400 shadow-lg shadow-sky-500/20'
                    : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-300'
                }`}
        >
            <Icon className="h-5 w-5" />
        </motion.button>
        {tooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-slate-300 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {tooltip}
            </div>
        )}
    </div>
);

const DropdownItem = ({ icon: Icon, label, onClick, danger }) => (
    <motion.button
        whileHover={{ backgroundColor: "rgba(30, 41, 59, 0.8)" }}
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${danger ? 'text-red-400 hover:text-red-300' : 'text-slate-300 hover:text-slate-100'
            }`}
    >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
    </motion.button>
);

export default ChatHeader;