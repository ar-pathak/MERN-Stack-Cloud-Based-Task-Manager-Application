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
    setShowChatInfo
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const isDM = item.type === 'chat';

    // Handlers for dropdown actions
    const handleArchive = () => {
        console.log("Archive chat:", item);
        // Implement archive logic
        setShowDropdown(false);
    };

    const handleMute = () => {
        console.log("Toggle mute:", item);
        // Implement mute logic
        setShowDropdown(false);
    };

    const handleLeave = () => {
        console.log("Leave group:", item);
        // Implement leave logic
        setShowDropdown(false);
    };

    const handleAddMembers = () => {
        console.log("Add members to:", item);
        // Implement add members logic
        setShowDropdown(false);
    };

    const handleSettings = () => {
        console.log("Open settings for:", item);
        // Implement settings logic
        setShowDropdown(false);
    };

    const getItemTitle = (item) => {
        return item.name || item.title || "Untitled";
    };

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
            case "workspace": return 'bg-gradient-to-br from-sky-500/20 to-blue-600/20 border-sky-500/30 group-hover:border-sky-400/50';
            case "project": return 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 group-hover:border-purple-400/50';
            case "subtask": return 'bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border-cyan-500/30 group-hover:border-cyan-400/50';
            case "dm": return 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30 group-hover:border-indigo-400/50';
            default: return 'bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-emerald-500/30 group-hover:border-emerald-400/50';
        }
    };

    // Get online members count
    const onlineMembersCount = item.members?.filter(m => m.online).length || 0;

    return (
        <div className="flex-shrink-0 border-b border-slate-800/50 bg-gradient-to-b from-slate-950 to-slate-950/80 backdrop-blur-xl px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Title & Icon Section */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative group flex-shrink-0">
                        {isDM ? (
                            // --- DM Avatar ---
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="h-12 w-12 rounded-full overflow-hidden border-2 border-slate-800 shadow-lg relative"
                            >
                                {item.avatar ? (
                                    <img src={item.avatar} alt={item.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                        {item.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                {item.isOnline && (
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
                            // --- Project/Workspace Icon ---
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all border shadow-lg ${getItemColorClass(item.type)}`}
                            >
                                {getItemIcon(item.type)}
                            </motion.div>
                        )}

                        {/* Online Indicator for Groups */}
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

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h2 className="text-lg font-bold text-slate-100 truncate">
                                {getItemTitle(item)}
                            </h2>
                            {!isDM && item.starred && (
                                <motion.div
                                    whileHover={{ rotate: 72, scale: 1.1 }}
                                    className="flex-shrink-0"
                                >
                                    <Star className="h-4 w-4 text-amber-400 fill-amber-400 drop-shadow-lg" />
                                </motion.div>
                            )}
                            {item.muted && (
                                <BellOff className="h-4 w-4 text-slate-500 flex-shrink-0" />
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {typingMembers?.length > 0 ? (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-xs text-sky-400 italic flex items-center gap-1.5"
                                >
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    >
                                        <Loader2 className="h-3 w-3" />
                                    </motion.div>
                                    {typingMembers[0].name.split(' ')[0]} is typing...
                                </motion.span>
                            ) : (
                                <p className="text-xs text-slate-400">
                                    {isDM ? (
                                        item.isOnline ? (
                                            <span className="text-emerald-400 flex items-center gap-1">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                Active now
                                            </span>
                                        ) : "Offline"
                                    ) : (
                                        <>
                                            {item.members ? `${item.members.length} members` : 'Personal task'}
                                            {onlineMembersCount > 0 && (
                                                <span className="text-emerald-400 ml-1.5">
                                                    • {onlineMembersCount} online
                                                </span>
                                            )}
                                        </>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <HeaderButton
                        icon={Search}
                        active={showSearch}
                        onClick={() => setShowSearch(!showSearch)}
                        tooltip="Search messages"
                    />
                    <HeaderButton
                        icon={Phone}
                        tooltip="Voice call"
                        onClick={() => console.log("Voice call")}
                    />
                    <HeaderButton
                        icon={Video}
                        tooltip="Video call"
                        onClick={() => console.log("Video call")}
                    />
                    {!isDM && (
                        <HeaderButton
                            icon={Info}
                            active={showChatInfo}
                            onClick={() => setShowChatInfo(!showChatInfo)}
                            tooltip="Chat info"
                        />
                    )}

                    {/* Dropdown Menu */}
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
                                    {/* Backdrop */}
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowDropdown(false)}
                                    />

                                    {/* Dropdown */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50"
                                    >
                                        {!isDM && (
                                            <DropdownItem
                                                icon={UserPlus}
                                                label="Add members"
                                                onClick={handleAddMembers}
                                            />
                                        )}
                                        <DropdownItem
                                            icon={BellOff}
                                            label={item.muted ? "Unmute" : "Mute"}
                                            onClick={handleMute}
                                        />
                                        <DropdownItem
                                            icon={Archive}
                                            label="Archive"
                                            onClick={handleArchive}
                                        />
                                        {!isDM && (
                                            <>
                                                <div className="h-px bg-slate-800 my-1" />
                                                <DropdownItem
                                                    icon={Settings}
                                                    label="Group settings"
                                                    onClick={handleSettings}
                                                />
                                                <DropdownItem
                                                    icon={LogOut}
                                                    label="Leave group"
                                                    onClick={handleLeave}
                                                    danger
                                                />
                                            </>
                                        )}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Search Dropdown */}
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
                                className="px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all cursor-pointer"
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

        {/* Tooltip */}
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