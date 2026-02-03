// ChatMessage.jsx (ENHANCED VERSION)
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Reply, ThumbsUp, Pin, MoreHorizontal, Edit2, Trash2,
    FileText, Download, Image as ImageIcon, Check, CheckCheck,
    Copy, Forward
} from "lucide-react";

const ChatMessage = ({
    message,
    currentUserId,
    selectedMessage,
    setSelectedMessage,
    handleDeleteMessage,
    handleEditMessage,
    handlePinMessage,
    onReact,
    onReply,
    reactions = {}
}) => {
    console.log("Rendering message:", message);
    const [showActions, setShowActions] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.text || message.content || '');

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const isOwnMessage = message.sender?.id === currentUserId || message.senderId === currentUserId;

    // Get reactions array
    const messageReactions = reactions[message.id] || message.reactions || [];

    // Group reactions by emoji
    const groupedReactions = messageReactions.reduce((acc, reaction) => {
        const emoji = reaction.emoji || reaction;
        if (!acc[emoji]) {
            acc[emoji] = { emoji, count: 0, users: [] };
        }
        acc[emoji].count++;
        if (reaction.userId) acc[emoji].users.push(reaction.userId);
        return acc;
    }, {});

    const handleSaveEdit = () => {
        if (editContent.trim() && editContent !== message.text) {
            handleEditMessage?.(message.id, editContent.trim());
        }
        setIsEditing(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(message.text || message.content);
        // Show toast notification
    };

    // Check if message is read
    const isRead = message.readBy?.some(r => r.userId !== message.senderId);
    const readCount = message.readBy?.filter(r => r.userId !== message.senderId).length || 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => {
                setShowActions(false);
                setShowReactionPicker(false);
            }}
            className={`group relative flex flex-col ${message.pinned
                ? 'bg-amber-500/5 -mx-4 px-4 py-2 border-l-2 border-amber-500/50'
                : ''
                }`}
        >
            {/* Reply Context Header */}
            {message.replyTo && (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mb-1 ml-12 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                >
                    <div className="w-8 border-t-2 border-l-2 border-slate-700/50 rounded-tl-lg h-3 -mb-3" />
                    <Reply className="h-3 w-3 text-slate-500" />
                    <span className="text-xs text-slate-400">
                        Replying to <span className="font-medium text-slate-300">
                            @{message.replyTo.sender?.name || 'User'}
                        </span>: {message.replyTo.content?.substring(0, 50)}...
                    </span>
                </motion.div>
            )}

            <div className={`flex gap-4 p-2 rounded-xl transition-all ${!message.pinned && 'group-hover:bg-slate-900/40'
                }`}>
                {/* Avatar */}
                <div className="flex-shrink-0 mt-1">
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="relative"
                    >
                        {message.sender?.avatar ? (
                            <img
                                src={message.sender.avatar}
                                alt={message.sender.name}
                                className="h-9 w-9 rounded-full object-cover border-2 border-slate-700 shadow-md"
                            />
                        ) : (
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg
                                ${message.sender?.name
                                    ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                    : 'bg-slate-700'
                                }
                            `}>
                                {message.sender?.name?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                        )}

                        {/* Online indicator */}
                        {message.sender?.online && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
                        )}
                    </motion.div>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Header: Name, Time & Read Status */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-200 text-sm hover:underline cursor-pointer">
                            {message.sender?.name || 'Unknown User'}
                        </span>
                        <span className="text-[10px] text-slate-500" title={new Date(message.timestamp || message.createdAt).toLocaleString()}>
                            {new Date(message.timestamp || message.createdAt || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                        {message.edited && (
                            <span className="text-[10px] text-slate-500 italic">(edited)</span>
                        )}
                        {message.pinned && (
                            <Pin className="h-3 w-3 text-amber-500 rotate-45" />
                        )}

                        {/* Read status (for own messages) */}
                        {isOwnMessage && (
                            <div className="flex items-center gap-1 text-slate-500">
                                {isRead ? (
                                    <CheckCheck className="h-3 w-3 text-sky-400" title={`Read by ${readCount}`} />
                                ) : (
                                    <Check className="h-3 w-3" title="Delivered" />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Text Content - Editable */}
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-sky-500/50 resize-none"
                                rows={3}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs rounded-lg transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditContent(message.text);
                                    }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {(message.text || message.content) && (
                                <p className="text-[14px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                    {message.text || message.content}
                                </p>
                            )}

                            {/* Attachments Section */}
                            {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 max-w-md">
                                    {message.attachments.map((file, idx) => (
                                        <motion.div
                                            key={idx}
                                            whileHover={{ scale: 1.02 }}
                                            className="group/file flex items-center gap-3 p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 hover:bg-slate-900/80 transition-all cursor-pointer"
                                        >
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
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-300 opacity-0 group-hover/file:opacity-100 transition-opacity"
                                            >
                                                <Download className="h-4 w-4" />
                                            </motion.button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Reactions */}
                    {Object.keys(groupedReactions).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {Object.values(groupedReactions).map((reaction, i) => (
                                <motion.button
                                    key={i}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onReact?.(message.id, reaction.emoji)}
                                    className="flex items-center gap-1 px-2 py-0.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-full transition-all cursor-pointer"
                                >
                                    <span className="text-sm">{reaction.emoji}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {reaction.count}
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Quick Actions */}
                <AnimatePresence>
                    {showActions && !isEditing && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: -10 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            className="absolute -top-2 right-4 flex items-center gap-0.5 bg-slate-900 border border-slate-700/50 rounded-xl p-1 shadow-xl shadow-black/20 z-10"
                        >
                            {/* Reaction Picker Button */}
                            <div className="relative">
                                <ActionButton
                                    icon={ThumbsUp}
                                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                                    title="React"
                                    active={showReactionPicker}
                                />

                                {showReactionPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        className="absolute bottom-full right-0 mb-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl"
                                    >
                                        <div className="flex gap-1">
                                            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                                <motion.button
                                                    key={emoji}
                                                    whileHover={{ scale: 1.2 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => {
                                                        onReact?.(message.id, emoji);
                                                        setShowReactionPicker(false);
                                                    }}
                                                    className="p-1.5 hover:bg-slate-800 rounded-lg text-lg"
                                                >
                                                    {emoji}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <ActionButton
                                icon={Reply}
                                onClick={() => onReply?.(message)}
                                title="Reply"
                            />
                            <ActionButton
                                icon={Pin}
                                onClick={() => handlePinMessage?.(message.id)}
                                active={message.pinned}
                                title={message.pinned ? "Unpin" : "Pin"}
                            />

                            {isOwnMessage && (
                                <ActionButton
                                    icon={Edit2}
                                    onClick={() => setIsEditing(true)}
                                    title="Edit"
                                />
                            )}

                            <div className="w-px h-4 bg-slate-700/50 mx-1" />

                            <ActionButton
                                icon={Copy}
                                onClick={handleCopy}
                                title="Copy"
                            />
                            <ActionButton
                                icon={Forward}
                                onClick={() => {/* Handle forward */ }}
                                title="Forward"
                            />

                            {isOwnMessage && (
                                <ActionButton
                                    icon={Trash2}
                                    onClick={() => handleDeleteMessage?.(message.id)}
                                    title="Delete"
                                    danger
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// Sub-component for clean action buttons
const ActionButton = ({ icon: Icon, onClick, title, active, danger }) => (
    <div className="relative group/action">
        <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(30, 41, 59, 1)" }}
            whileTap={{ scale: 0.9 }}
            onClick={onClick}
            className={`p-1.5 rounded-md transition-colors ${active
                ? 'text-amber-400 bg-amber-400/10'
                : danger
                    ? 'text-red-400 hover:text-red-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
            title={title}
        >
            <Icon className="h-4 w-4" />
        </motion.button>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-slate-950 text-slate-300 text-[10px] rounded whitespace-nowrap opacity-0 group-hover/action:opacity-100 pointer-events-none transition-opacity">
            {title}
        </div>
    </div>
);

export default ChatMessage;