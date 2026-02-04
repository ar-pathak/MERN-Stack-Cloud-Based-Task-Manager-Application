import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Reply, ThumbsUp, Pin, MoreHorizontal, Edit2, Trash2,
    FileText, Download, Image as ImageIcon, Check, CheckCheck,
    Copy, Forward, X, Smile
} from "lucide-react";
import { useAuth } from "../../../../../../context/AuthContext";

const ChatMessage = ({
    message,
    handleDeleteMessage,
    handlePinMessage,
    handleEditMessage,
    onReact,
    onReply,
}) => {
    const { user } = useAuth();
    const currentUserId = user?._id || user?.id;

    // --- DATA NORMALIZATION ---
    const messageId = message._id || message.id;
    const sender = message.senderId || message.sender || {};
    const senderIdString = typeof sender === 'object' ? (sender._id || sender.id) : sender;

    // CRITICAL FIX: Proper ownership detection
    const isOwnMessage = message.isOwn !== undefined
        ? message.isOwn
        : String(senderIdString) === String(currentUserId);

    const content = message.content || message.text || '';

    // State
    const [showActions, setShowActions] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);

    // Update edit content when message changes
    useEffect(() => {
        setEditContent(content);
    }, [content]);

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    // Reactions handling
    const messageReactions = message.reactions || [];

    // Group reactions by emoji
    const groupedReactions = Array.isArray(messageReactions)
        ? messageReactions.reduce((acc, reaction) => {
            const emoji = typeof reaction === 'string' ? reaction : reaction.emoji || reaction;
            const userId = reaction.userId?._id || reaction.userId;

            if (!acc[emoji]) {
                acc[emoji] = {
                    emoji,
                    count: 0,
                    users: [],
                    hasCurrentUser: false
                };
            }
            acc[emoji].count++;
            if (userId) {
                acc[emoji].users.push(userId);
                if (String(userId) === String(currentUserId)) {
                    acc[emoji].hasCurrentUser = true;
                }
            }
            return acc;
        }, {})
        : {};

    const handleSaveEdit = () => {
        if (editContent.trim() && editContent !== content) {
            handleEditMessage?.(messageId, editContent.trim());
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditContent(content);
        setIsEditing(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
    };

    // Read status
    const readByCount = message.readBy?.filter(r =>
        String(r.userId || r) !== String(senderIdString)
    ).length || 0;

    const isRead = message.isRead || readByCount > 0;

    // Format time
    const formatTime = (timestamp) => {
        const date = new Date(timestamp || Date.now());
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => !isEditing && setShowActions(true)}
            onMouseLeave={() => {
                setShowActions(false);
                setShowReactionPicker(false);
            }}
            className={`group relative flex flex-col mb-4 ${message.pinned ? 'bg-amber-500/5 -mx-4 px-4 py-2 border-l-2 border-amber-500/50 rounded-r-xl' : ''
                }`}
        >
            {/* Reply Context */}
            {message.replyTo && (
                <motion.div
                    initial={{ opacity: 0, x: isOwnMessage ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-2 mb-1.5 text-xs text-slate-400 ${isOwnMessage ? 'justify-end mr-14' : 'ml-14'
                        }`}
                >
                    <Reply className="h-3 w-3" />
                    <span className="opacity-70">
                        Replying to {message.replyTo.senderId?.name || message.replyTo.sender?.name || 'User'}
                    </span>
                    <span className="max-w-[200px] truncate opacity-50">
                        {(message.replyTo.content || message.replyTo.text || '').substring(0, 50)}
                    </span>
                </motion.div>
            )}

            <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar - Only show for received messages */}
                {!isOwnMessage && (
                    <div className="flex-shrink-0 mt-1">
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="relative"
                        >
                            {sender.avatar ? (
                                <img
                                    src={sender.avatar}
                                    alt={sender.name}
                                    className="h-9 w-9 rounded-full object-cover border-2 border-slate-700/50 shadow-lg"
                                />
                            ) : (
                                <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg bg-gradient-to-br from-violet-500 to-purple-600">
                                    {sender.name?.substring(0, 2).toUpperCase() || 'U'}
                                </div>
                            )}
                            {sender.online && (
                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
                            )}
                        </motion.div>
                    </div>
                )}

                {/* Message Content */}
                <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name & Time - Only for received messages */}
                    {!isOwnMessage && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="font-semibold text-slate-200 text-sm">
                                {sender.name || 'Unknown User'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                {formatTime(message.timestamp || message.createdAt)}
                            </span>
                        </div>
                    )}

                    {/* Message Bubble */}
                    <div className="relative">
                        {isEditing ? (
                            // Edit Mode
                            <motion.div
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                className={`flex flex-col gap-2 p-3 rounded-2xl border ${isOwnMessage
                                    ? 'bg-sky-500/20 border-sky-500/30'
                                    : 'bg-slate-800/60 border-slate-700/50'
                                    }`}
                            >
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="bg-transparent text-slate-200 text-sm resize-none focus:outline-none min-h-[60px]"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSaveEdit();
                                        } else if (e.key === 'Escape') {
                                            handleCancelEdit();
                                        }
                                    }}
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1 text-xs rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={!editContent.trim()}
                                        className="px-3 py-1 text-xs rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Save
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            // Normal Message Display
                            <>
                                <motion.div
                                    whileHover={{ scale: 1.01 }}
                                    className={`relative px-4 py-2.5 rounded-2xl shadow-lg transition-all ${isOwnMessage
                                        ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-br-md'
                                        : 'bg-slate-800/80 backdrop-blur-sm text-slate-100 border border-slate-700/50 rounded-bl-md'
                                        }`}
                                >
                                    {/* Pinned indicator */}
                                    {message.pinned && (
                                        <div className="absolute -top-2 -right-2">
                                            <div className="bg-amber-500 rounded-full p-1 shadow-lg">
                                                <Pin className="h-3 w-3 text-white" fill="white" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Message Text */}
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                        {content}
                                    </p>

                                    {/* Edited indicator */}
                                    {message.edited && (
                                        <span className={`text-[10px] ml-2 ${isOwnMessage ? 'text-sky-100' : 'text-slate-400'
                                            }`}>
                                            (edited)
                                        </span>
                                    )}

                                    {/* Attachments */}
                                    {message.attachments && message.attachments.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {message.attachments.map((file, idx) => {
                                                const isImage = file.type?.startsWith('image');

                                                return isImage ? (
                                                    <motion.img
                                                        key={idx}
                                                        whileHover={{ scale: 1.02 }}
                                                        src={file.url}
                                                        alt={file.name}
                                                        className="max-w-sm rounded-lg cursor-pointer shadow-lg"
                                                        onClick={() => window.open(file.url, '_blank')}
                                                    />
                                                ) : (
                                                    <motion.div
                                                        key={idx}
                                                        whileHover={{ scale: 1.02 }}
                                                        className="group/file flex items-center gap-3 p-2.5 bg-slate-900/60 border border-slate-700/50 rounded-lg"
                                                    >
                                                        <div className="p-2 rounded-lg bg-slate-800">
                                                            <FileText className="h-5 w-5 text-sky-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-slate-300 truncate font-medium">{file.name}</p>
                                                            <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                                                        </div>
                                                        <motion.a
                                                            href={file.url}
                                                            download={file.name}
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-300 transition-colors"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </motion.a>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>

                                {/* Time & Read Status - Only for own messages */}
                                {isOwnMessage && (
                                    <div className="flex items-center gap-1.5 mt-1 px-1 justify-end">
                                        <span className="text-[10px] text-slate-500">
                                            {formatTime(message.timestamp || message.createdAt)}
                                        </span>
                                        {message.status === 'sending' ? (
                                            <div className="h-3 w-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                                        ) : message.status === 'failed' ? (
                                            <X className="h-3 w-3 text-red-400" />
                                        ) : isRead ? (
                                            <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
                                        ) : (
                                            <Check className="h-3.5 w-3.5 text-slate-500" />
                                        )}
                                        {readByCount > 0 && (
                                            <span className="text-[9px] text-sky-400 font-medium">
                                                {readByCount}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Reactions Display - IMPROVED UI */}
                        {Object.keys(groupedReactions).length > 0 && !isEditing && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`flex flex-wrap gap-1.5 mt-2 ${isOwnMessage ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                {Object.values(groupedReactions).map((reaction, i) => (
                                    <motion.button
                                        key={i}
                                        whileHover={{ scale: 1.15, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onReact?.(messageId, reaction.emoji)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all shadow-lg ${reaction.hasCurrentUser
                                            ? 'bg-sky-500/30 border-2 border-sky-400/60 text-sky-200'
                                            : 'bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700/80 text-slate-300'
                                            }`}
                                    >
                                        <span className="text-base leading-none">{reaction.emoji}</span>
                                        <span className="text-xs font-semibold">
                                            {reaction.count}
                                        </span>
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Floating Actions */}
                <AnimatePresence>
                    {showActions && !isEditing && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute ${isOwnMessage ? 'left-0' : 'right-0'
                                } top-0 flex items-center gap-0.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/70 rounded-xl p-1 shadow-2xl z-10`}
                        >
                            {/* Reaction Picker */}
                            <div className="relative">
                                <ActionButton
                                    icon={Smile}
                                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                                    title="React"
                                    active={showReactionPicker}
                                />

                                <AnimatePresence>
                                    {showReactionPicker && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/70 rounded-xl shadow-2xl"
                                        >
                                            <div className="flex gap-1.5">
                                                {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'].map(emoji => (
                                                    <motion.button
                                                        key={emoji}
                                                        whileHover={{ scale: 1.25, y: -3 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => {
                                                            onReact?.(messageId, emoji);
                                                            setShowReactionPicker(false);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-800/60 rounded-lg text-xl transition-colors"
                                                    >
                                                        {emoji}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <ActionButton
                                icon={Reply}
                                onClick={() => onReply?.(message)}
                                title="Reply"
                            />
                            <ActionButton
                                icon={Pin}
                                onClick={() => handlePinMessage?.(messageId)}
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

                            <div className="w-px h-4 bg-slate-700/50 mx-0.5" />

                            <ActionButton
                                icon={Copy}
                                onClick={handleCopy}
                                title="Copy"
                            />

                            {isOwnMessage && (
                                <ActionButton
                                    icon={Trash2}
                                    onClick={() => handleDeleteMessage?.(messageId)}
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

// Action Button Component
const ActionButton = ({ icon: Icon, onClick, title, active, danger }) => (
    <div className="relative group/action">
        <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(30, 41, 59, 1)" }}
            whileTap={{ scale: 0.9 }}
            onClick={onClick}
            className={`p-1.5 rounded-lg transition-all ${active
                ? 'text-sky-400 bg-sky-400/10'
                : danger
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-400/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
            title={title}
        >
            <Icon className="h-4 w-4" />
        </motion.button>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-950 text-slate-300 text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/action:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-slate-800">
            {title}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="w-1.5 h-1.5 bg-slate-950 border-r border-b border-slate-800 rotate-45" />
            </div>
        </div>
    </div>
);

export default ChatMessage;