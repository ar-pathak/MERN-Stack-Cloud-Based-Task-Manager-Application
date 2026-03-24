import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Briefcase,
    FolderOpen,
    CheckSquare,
    Star,
    BellOff,
    Search,
    Phone,
    Video,
    ListTodo,
    MoreVertical,
    UserPlus,
    LogOut,
    Archive,
    Users,
    Hash
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

const SECTION_TYPES = new Set(["workspace", "project", "task", "subtask"]);
const toIdString = (value) => String(value?._id || value?.id || value || "");
const isMemberOnline = (member) => Boolean(member?.isOnline || member?.online);

const ChatHeader = ({
    item,
    typingMembers,
    showSearch,
    setShowSearch,
    searchQuery,
    setSearchQuery,
    messageFilter,
    setMessageFilter,
    onStartVideoCall,
    onStartAudioCall,
    onToggleMute,
    onToggleArchive,
    onAddMembers,
    onLeave,
    onRequestInfo,
    onBack,
}) => {
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);

    const chatType = String(item?.chatType || item?.type || "").toLowerCase();
    const isDirectMessage = chatType === "private" || item?.type === "dm";
    const isSectionType = SECTION_TYPES.has(item?.type);
    const members = Array.isArray(item?.members) ? item.members : [];
    const memberCount =
        typeof item?.memberCount === "number" ? item.memberCount : members.length;
    const onlineMembersCount =
        typeof item?.onlineMemberCount === "number"
            ? item.onlineMemberCount
            : members.filter(isMemberOnline).length;
    const profileUserId = toIdString(item?.userId);
    const canOpenIdentityAction = (isDirectMessage && profileUserId) || isSectionType;

    const handleIdentityClick = () => {
        if (isDirectMessage && profileUserId) {
            navigate(`/main/profile/${profileUserId}`);
            return;
        }

        if (isSectionType) {
            onRequestInfo?.();
        }
    };

    const getItemTitle = (targetItem) => targetItem?.name || targetItem?.title || "Untitled";

    const getItemIcon = (type) => {
        switch (type) {
            case "workspace":
                return <Briefcase className="h-5 w-5 text-sky-400 max-[300px]:h-4 max-[300px]:w-4" />;
            case "project":
                return <FolderOpen className="h-5 w-5 text-purple-400 max-[300px]:h-4 max-[300px]:w-4" />;
            case "task":
                return <CheckSquare className="h-5 w-5 text-emerald-400 max-[300px]:h-4 max-[300px]:w-4" />;
            case "subtask":
                return <ListTodo className="h-5 w-5 text-cyan-400 max-[300px]:h-4 max-[300px]:w-4" />;
            case "dm":
                return <Users className="h-5 w-5 text-indigo-400 max-[300px]:h-4 max-[300px]:w-4" />;
            default:
                return <Hash className="h-5 w-5 text-slate-400 max-[300px]:h-4 max-[300px]:w-4" />;
        }
    };

    const getItemColorClass = (type) => {
        switch (type) {
            case "workspace":
                return "bg-gradient-to-br from-sky-500/20 to-blue-600/20 border-sky-500/30";
            case "project":
                return "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30";
            case "subtask":
                return "bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border-cyan-500/30";
            case "dm":
                return "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30";
            default:
                return "bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-emerald-500/30";
        }
    };

    const onlineText = item?.isOnline ? "Online" : "Offline";

    return (
        <div className="flex-shrink-0 border-b border-slate-800/50 bg-gradient-to-b from-slate-950 to-slate-950/80 px-2.5 py-3 backdrop-blur-xl max-[300px]:px-1.5 max-[300px]:py-2 sm:px-4 md:px-6 md:py-4">
            <div className="flex items-center justify-between gap-2 max-[300px]:gap-1">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 max-[300px]:gap-1 sm:gap-3 md:gap-4">
                    {onBack && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={onBack}
                            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-800/70 bg-slate-900/70 text-slate-200 max-[300px]:h-8 max-[300px]:w-8 lg:hidden"
                            aria-label="Back to overview"
                        >
                            <ArrowLeft className="h-4 w-4 max-[300px]:h-3.5 max-[300px]:w-3.5" />
                        </motion.button>
                    )}

                    <button
                        type="button"
                        onClick={canOpenIdentityAction ? handleIdentityClick : undefined}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 text-left transition-colors max-[300px]:gap-1.5 max-[300px]:p-0.5 sm:gap-3 ${
                            canOpenIdentityAction ? "cursor-pointer hover:bg-slate-900/60" : "cursor-default"
                        }`}
                    >
                        <div className="relative flex-shrink-0">
                            {isDirectMessage ? (
                                <motion.div
                                    whileHover={{ scale: canOpenIdentityAction ? 1.04 : 1 }}
                                    className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-slate-800 shadow-lg max-[300px]:h-8 max-[300px]:w-8 sm:h-11 sm:w-11 md:h-12 md:w-12"
                                >
                                    {item?.avatar ? (
                                        <img loading="lazy" src={item.avatar} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-bold text-white max-[300px]:text-sm">
                                            {item?.name?.charAt(0)?.toUpperCase() || "U"}
                                        </div>
                                    )}
                                    {item?.isOnline && (
                                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-500 max-[300px]:h-3 max-[300px]:w-3" />
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    whileHover={{ scale: canOpenIdentityAction ? 1.04 : 1 }}
                                    className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg transition-all max-[300px]:h-8 max-[300px]:w-8 sm:h-11 sm:w-11 md:h-12 md:w-12 ${getItemColorClass(item?.type)}`}
                                >
                                    {getItemIcon(item?.type)}
                                </motion.div>
                            )}

                            {!isDirectMessage && onlineMembersCount > 0 && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400 shadow-md max-[300px]:h-3 max-[300px]:w-3" />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5 max-[300px]:gap-1 sm:gap-2">
                                <h2 className="truncate text-sm font-bold text-slate-100 max-[300px]:text-xs sm:text-base md:text-lg">
                                    {getItemTitle(item)}
                                </h2>
                                {!isDirectMessage && item?.starred && (
                                    <motion.div whileHover={{ rotate: 72, scale: 1.1 }} className="flex-shrink-0">
                                        <Star className="h-4 w-4 fill-amber-400 text-amber-400 max-[300px]:h-3.5 max-[300px]:w-3.5" />
                                    </motion.div>
                                )}
                                {item?.muted && <BellOff className="h-4 w-4 flex-shrink-0 text-slate-500 max-[300px]:h-3.5 max-[300px]:w-3.5" />}
                            </div>

                            <div className="flex items-center gap-2 max-[300px]:gap-1">
                                {typingMembers?.length > 0 ? (
                                    <div className="flex items-center gap-1.5 max-[300px]:gap-1">
                                        <div className="flex items-center gap-0.5">
                                            {[0, 1, 2].map((idx) => (
                                                <motion.div
                                                    key={idx}
                                                    animate={{ y: [0, -3, 0] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: idx * 0.15 }}
                                                    className="h-1.5 w-1.5 rounded-full bg-sky-400"
                                                />
                                            ))}
                                        </div>
                                        <span className="truncate text-xs font-medium text-sky-400 max-[300px]:text-[11px]">
                                            {typingMembers[0]?.name}
                                            {typingMembers.length > 1 && ` +${typingMembers.length - 1}`}
                                            {" is typing..."}
                                        </span>
                                    </div>
                                ) : isDirectMessage ? (
                                    <span className={`text-xs font-medium max-[300px]:text-[11px] ${item?.isOnline ? "text-emerald-400" : "text-slate-500"}`}>
                                        {onlineText}
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-500 max-[300px]:text-[11px]">
                                        {memberCount} members
                                        {onlineMembersCount > 0 && (
                                            <span className="ml-1 text-emerald-400 max-[300px]:hidden">| {onlineMembersCount} online</span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-0.5 max-[300px]:gap-0 sm:gap-1">
                    <HeaderButton
                        icon={Search}
                        tooltip="Search messages"
                        active={showSearch}
                        onClick={() => setShowSearch(!showSearch)}
                    />

                    <HeaderButton
                        icon={Phone}
                        tooltip="Voice call"
                        onClick={() => onStartAudioCall?.()}
                        className="max-[360px]:hidden"
                    />

                    <HeaderButton
                        icon={Video}
                        tooltip="Video call"
                        onClick={() => onStartVideoCall?.()}
                        className="max-[360px]:hidden"
                    />

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
                                        className="absolute right-0 top-full z-50 mt-2 w-48 max-w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
                                    >
                                        <DropdownItem
                                            icon={Phone}
                                            label="Start voice call"
                                            onClick={() => {
                                                onStartAudioCall?.();
                                                setShowDropdown(false);
                                            }}
                                        />
                                        <DropdownItem
                                            icon={Video}
                                            label="Start video call"
                                            onClick={() => {
                                                onStartVideoCall?.();
                                                setShowDropdown(false);
                                            }}
                                        />
                                        <div className="my-1 h-px bg-slate-800" />
                                        {!isDirectMessage && (
                                            <DropdownItem
                                                icon={UserPlus}
                                                label="Add members"
                                                onClick={() => {
                                                    onAddMembers?.();
                                                    setShowDropdown(false);
                                                }}
                                            />
                                        )}
                                        <DropdownItem
                                            icon={BellOff}
                                            label={item?.muted ? "Unmute" : "Mute"}
                                            onClick={() => {
                                                onToggleMute?.();
                                                setShowDropdown(false);
                                            }}
                                        />
                                        <DropdownItem
                                            icon={Archive}
                                            label={item?.archived ? "Unarchive" : "Archive"}
                                            onClick={() => {
                                                onToggleArchive?.();
                                                setShowDropdown(false);
                                            }}
                                        />
                                        {!isDirectMessage && (
                                            <>
                                                <div className="my-1 h-px bg-slate-800" />
                                                <DropdownItem
                                                    icon={LogOut}
                                                    label="Leave group"
                                                    onClick={() => {
                                                        onLeave?.();
                                                        setShowDropdown(false);
                                                    }}
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

            <AnimatePresence>
                {showSearch && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 overflow-hidden max-[300px]:mt-3"
                    >
                        <div className="flex flex-col gap-2 max-[300px]:gap-1.5 sm:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 max-[300px]:left-2.5 max-[300px]:h-3.5 max-[300px]:w-3.5" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search messages..."
                                    autoFocus
                                    className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-slate-300 placeholder:text-slate-500 transition-all focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 max-[300px]:py-2 max-[300px]:pl-9 max-[300px]:pr-3 max-[300px]:text-[13px]"
                                />
                            </div>
                            <select
                                value={messageFilter}
                                onChange={(event) => setMessageFilter(event.target.value)}
                                className="w-full cursor-pointer rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-300 transition-all focus:border-sky-500/50 focus:outline-none max-[300px]:px-3 max-[300px]:py-2 max-[300px]:text-[13px] sm:w-auto"
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

const HeaderButton = ({ icon: Icon, onClick, active, tooltip, className = "" }) => (
    <div className={`group relative ${className}`}>
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`rounded-xl p-2 transition-all max-[300px]:rounded-lg max-[300px]:p-1.5 sm:p-2.5 ${
                active
                    ? "bg-sky-500/20 text-sky-400 shadow-lg shadow-sky-500/20"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-300"
            }`}
        >
            <Icon className="h-4 w-4 max-[300px]:h-3.5 max-[300px]:w-3.5 sm:h-5 sm:w-5" />
        </motion.button>
        {tooltip && (
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 sm:block">
                {tooltip}
            </div>
        )}
    </div>
);

const DropdownItem = ({ icon: Icon, label, onClick, danger }) => (
    <motion.button
        whileHover={{ backgroundColor: "rgba(30, 41, 59, 0.8)" }}
        onClick={onClick}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
            danger ? "text-red-400 hover:text-red-300" : "text-slate-300 hover:text-slate-100"
        }`}
    >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
    </motion.button>
);

export default ChatHeader;
