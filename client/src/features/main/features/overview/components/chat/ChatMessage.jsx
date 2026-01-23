import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Reply, ThumbsUp, Pin, MoreHorizontal,
    FileText, Download, Image as ImageIcon
} from "lucide-react";

const ChatMessage = ({
    message,
    selectedMessage,
    setSelectedMessage,
    handleDeleteMessage,
    handlePinMessage,
    onReact,
    onReply,
    reactions = []
}) => {
    const [showActions, setShowActions] = useState(false);


    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const isOwnMessage = message.sender?.id === 'current-user-id';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            className={`group relative flex flex-col ${message.pinned ? 'bg-amber-500/5 -mx-4 px-4 py-2 border-l-2 border-amber-500/50' : ''}`}
        >
            {/* Reply Context Header */}
            {message.replyTo && (
                <div className="flex items-center gap-2 mb-1 ml-12 opacity-60">
                    <div className="w-8 border-t-2 border-l-2 border-slate-700 rounded-tl-lg h-3 -mb-3" />
                    <Reply className="h-3 w-3 text-slate-500" />
                    <span className="text-xs text-slate-400">
                        Replying to <span className="font-medium text-slate-300">@{message.replyTo.sender?.name || 'User'}</span>
                    </span>
                </div>
            )}

            <div className={`flex gap-4 p-2 rounded-xl transition-all ${!message.pinned && 'group-hover:bg-slate-900/40'}`}>
                {/* Avatar */}
                <div className="flex-shrink-0 mt-1">
                    {message.sender?.avatar ? (
                        <img
                            src={message.sender.avatar}
                            alt={message.sender.name}
                            className="h-9 w-9 rounded-full object-cover border border-slate-700"
                        />
                    ) : (
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg
                            ${message.sender?.name ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-slate-700'}
                        `}>
                            {message.sender?.name?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Header: Name & Time */}
                    <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-semibold text-slate-200 text-sm hover:underline cursor-pointer">
                            {message.sender?.name || 'Unknown User'}
                        </span>
                        <span className="text-[10px] text-slate-500" title={new Date(message.timestamp).toLocaleString()}>
                            {new Date(message.timestamp || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                        {message.pinned && (
                            <Pin className="h-3 w-3 text-amber-500 rotate-45" />
                        )}
                    </div>

                    {/* Text Content */}
                    {message.text && (
                        <p className="text-[14px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                            {message.text}
                            {message.edited && <span className="text-xs text-slate-500 ml-1">(edited)</span>}
                        </p>
                    )}

                    {/* Attachments Section */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 max-w-md">
                            {message.attachments.map((file, idx) => (
                                <div key={idx} className="group/file flex items-center gap-3 p-2 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                                    <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
                                        {file.type?.startsWith('image') ? (
                                            <ImageIcon className="h-5 w-5 text-purple-400" />
                                        ) : (
                                            <FileText className="h-5 w-5 text-blue-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-300 truncate font-medium">{file.name}</p>
                                        <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                                    </div>
                                    <button className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-300 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                        <Download className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Reactions */}
                    {reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {reactions.map((emoji, i) => (
                                <motion.button
                                    key={i}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-1 px-2 py-0.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 rounded-full transition-colors cursor-pointer"
                                >
                                    <span className="text-xs">{emoji}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">1</span>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Quick Actions */}
                <AnimatePresence>
                    {showActions && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: -10 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            className="absolute -top-2 right-4 flex items-center gap-0.5 bg-slate-900 border border-slate-700/50 rounded-lg p-1 shadow-xl shadow-black/20 z-10"
                        >
                            <ActionButton
                                icon={ThumbsUp}
                                onClick={() => onReact(message.id, '👍')}
                                title="Like"
                            />
                            <ActionButton
                                icon={Reply}
                                onClick={() => onReply(message)}
                                title="Reply"
                            />
                            <ActionButton
                                icon={Pin}
                                onClick={() => handlePinMessage(message.id)}
                                active={message.pinned}
                                title={message.pinned ? "Unpin" : "Pin"}
                            />
                            <div className="w-px h-4 bg-slate-700/50 mx-1" />
                            <ActionButton
                                icon={MoreHorizontal}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMessage(message);
                                }}
                                title="More options"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// Sub-component for clean action buttons
const ActionButton = ({ icon: Icon, onClick, title, active }) => (
    <motion.button
        whileHover={{ scale: 1.1, backgroundColor: "rgba(30, 41, 59, 1)" }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        className={`p-1.5 rounded-md transition-colors ${active ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-slate-200'}`}
        title={title}
    >
        <Icon className="h-4 w-4" />
    </motion.button>
);

export default ChatMessage;