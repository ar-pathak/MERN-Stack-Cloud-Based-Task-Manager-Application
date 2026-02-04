import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Reply, Pin, Edit2, Trash2, FileText, Download,
    Check, CheckCheck, Copy, X, Smile, ArrowUpRight
} from "lucide-react";
import { useAuth } from "../../../../../../context/AuthContext";

const ChatMessage = ({
    message,
    handleDeleteMessage,
    handlePinMessage,
    handleEditMessage,
    onReact,
    onReply,
    onJumpToMessage,
    isConsecutive = false,
}) => {
    const { user } = useAuth();
    const currentUserId = user?._id || user?.id;

    // --- DATA NORMALIZATION ---
    const messageId = message._id || message.id;
    const sender = message.senderId || message.sender || {};
    const senderIdString = typeof sender === 'object' ? (sender._id || sender.id) : sender;

    const isOwnMessage = message.isOwn !== undefined
        ? message.isOwn
        : String(senderIdString) === String(currentUserId);

    const content = message.content || message.text || '';

    // State
    const [showActions, setShowActions] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);

    // Refs
    const actionsRef = useRef(null);
    const hoverTimer = useRef(null); // NEW: Timer for hover delay

    useEffect(() => {
        setEditContent(content);
    }, [content]);

    // Handle Click Outside to close picker
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (actionsRef.current && !actionsRef.current.contains(event.target)) {
                setShowReactionPicker(false);
                setShowActions(false);
            }
        };

        if (showReactionPicker) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showReactionPicker]);

    // --- HANDLERS ---

    // NEW: Hover Logic with Delay
    const handleMouseEnter = () => {
        if (!isEditing && !showActions) {
            // Wait 500ms before showing actions
            hoverTimer.current = setTimeout(() => {
                setShowActions(true);
            }, 500);
        }
    };

    const handleMouseLeave = () => {
        // Clear timer immediately if mouse leaves
        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
        }

        // Hide actions if picker is not open
        if (!showReactionPicker) {
            setShowActions(false);
        }
    };

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

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp || Date.now());
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // --- REACTIONS LOGIC ---
    const messageReactions = message.reactions || [];
    const groupedReactions = Array.isArray(messageReactions)
        ? messageReactions.reduce((acc, reaction) => {
            const emoji = typeof reaction === 'string' ? reaction : reaction.emoji || reaction;
            const userId = reaction.userId?._id || reaction.userId;

            if (!acc[emoji]) {
                acc[emoji] = { emoji, count: 0, users: [], hasCurrentUser: false };
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

    // --- DYNAMIC STYLES ---
    const containerMargin = isConsecutive ? 'mb-0.5' : 'mb-6';

    const bubbleRadius = isOwnMessage
        ? isConsecutive ? 'rounded-3xl rounded-tr-md rounded-br-md' : 'rounded-3xl rounded-tr-sm'
        : isConsecutive ? 'rounded-3xl rounded-tl-md rounded-bl-md' : 'rounded-3xl rounded-tl-sm';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            // Removed onMouseEnter/Leave from here to stop row-hover trigger
            className={`group relative flex flex-col ${containerMargin} ${message.pinned ? 'bg-amber-500/5 -mx-4 px-4 py-2 border-l-2 border-amber-500/50' : ''}`}
        >
            {/* Reply Context */}
            {message.replyTo && !isConsecutive && (
                <div
                    onClick={() => onJumpToMessage && onJumpToMessage(message.replyTo._id || message.replyTo.id)}
                    className={`flex flex-col mb-1 cursor-pointer group/reply ${isOwnMessage ? 'items-end mr-12' : 'items-start ml-12'}`}
                >
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/40 border-l-2 transition-colors hover:bg-slate-800/60 ${isOwnMessage ? 'border-indigo-500' : 'border-slate-500'}`}>
                        <Reply className="h-3 w-3 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                {message.replyTo.senderId?.name || message.replyTo.sender?.name || 'User'}
                                <ArrowUpRight className="h-2.5 w-2.5 opacity-0 group-hover/reply:opacity-100 transition-opacity" />
                            </span>
                            <span className="text-[10px] text-slate-500 max-w-[200px] truncate">
                                {(message.replyTo.content || message.replyTo.text || 'Attachment')}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {!isOwnMessage && (
                    <div className="flex-shrink-0 w-8 flex flex-col justify-end">
                        {!isConsecutive ? (
                            <motion.div whileHover={{ scale: 1.1 }} className="relative">
                                {sender.avatar ? (
                                    <img
                                        src={sender.avatar}
                                        alt={sender.name}
                                        className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-800 shadow-lg"
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 ring-2 ring-slate-800">
                                        {sender.name?.substring(0, 2).toUpperCase() || 'U'}
                                    </div>
                                )}
                                {sender.online && (
                                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                                )}
                            </motion.div>
                        ) : (
                            <div className="w-8" />
                        )}
                    </div>
                )}

                {/* Message Container */}
                <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>

                    {/* Sender Name */}
                    {!isOwnMessage && !isConsecutive && (
                        <div className="flex items-center gap-2 mb-1 px-1 ml-1">
                            <span className="font-medium text-slate-300 text-xs">
                                {sender.name || 'Unknown'}
                            </span>
                        </div>
                    )}

                    {/* Main Bubble - Events moved here + Ref attached */}
                    <div
                        className="relative group/bubble"
                        ref={actionsRef}
                        onMouseEnter={handleMouseEnter} // Trigger delay
                        onMouseLeave={handleMouseLeave} // Clear delay/hide
                    >
                        {isEditing ? (
                            <motion.div
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                className="w-[300px] sm:w-[400px] flex flex-col gap-2 p-3 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl z-20"
                            >
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full bg-slate-900/50 text-slate-200 text-sm p-2 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[80px]"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSaveEdit();
                                        } else if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs font-medium rounded-md text-slate-400 hover:bg-slate-700">Cancel</button>
                                    <button onClick={handleSaveEdit} disabled={!editContent.trim()} className="px-3 py-1.5 text-xs font-medium rounded-md bg-sky-500 text-white hover:bg-sky-600">Save</button>
                                </div>
                            </motion.div>
                        ) : (
                            <>
                                <motion.div
                                    layout
                                    className={`relative px-4 py-2 shadow-md ${bubbleRadius} ${isOwnMessage
                                        ? 'bg-gradient-to-tr from-blue-600 to-violet-600 text-white'
                                        : 'bg-slate-800 text-slate-200 border border-slate-700/50'
                                        }`}
                                >
                                    {/* Pinned Icon */}
                                    {message.pinned && (
                                        <div className="absolute -top-2 -right-2 bg-amber-500 p-1 rounded-full shadow-sm z-10 border-2 border-slate-900">
                                            <Pin className="h-2.5 w-2.5 text-white" fill="currentColor" />
                                        </div>
                                    )}

                                    {/* Text Content */}
                                    <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${isOwnMessage ? 'text-white/95' : 'text-slate-100'}`}>
                                        {content}
                                    </p>

                                    {/* Attachments */}
                                    {message.attachments?.length > 0 && (
                                        <div className={`mt-2 space-y-2 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                            {message.attachments.map((file, idx) => {
                                                const isImage = file.type?.startsWith('image');
                                                return isImage ? (
                                                    <img
                                                        key={idx}
                                                        src={file.url}
                                                        alt={file.name}
                                                        className="max-w-[250px] rounded-lg cursor-pointer border border-white/10"
                                                        onClick={() => window.open(file.url, '_blank')}
                                                    />
                                                ) : (
                                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-white/10">
                                                        <FileText className="h-5 w-5" />
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <p className="text-sm truncate">{file.name}</p>
                                                            <p className="text-xs opacity-60">{formatSize(file.size)}</p>
                                                        </div>
                                                        <a href={file.url} download className="p-1 hover:bg-white/10 rounded">
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Time & Status */}
                                    <div className={`flex items-center gap-1.5 mt-0.5 select-none ${isOwnMessage ? 'justify-end text-blue-100/70' : 'justify-end text-slate-400'}`}>
                                        {message.edited && <span className="text-[9px] italic opacity-70">edited</span>}
                                        <span className="text-[9px] font-medium opacity-70">
                                            {formatTime(message.timestamp || message.createdAt)}
                                        </span>
                                        {isOwnMessage && (
                                            <div className="ml-0.5">
                                                {message.status === 'sending' ? (
                                                    <div className="h-2.5 w-2.5 rounded-full border border-white/30 border-t-white animate-spin" />
                                                ) : message.status === 'failed' ? (
                                                    <X className="h-3 w-3 text-red-300" />
                                                ) : (message.isRead || (message.readBy?.length > 0)) ? (
                                                    <CheckCheck className="h-3 w-3 text-blue-200" />
                                                ) : (
                                                    <Check className="h-3 w-3 opacity-60" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Reactions */}
                                {Object.keys(groupedReactions).length > 0 && (
                                    <div className={`flex flex-wrap gap-1 mt-1 relative z-10 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                        {Object.values(groupedReactions).map((reaction, i) => (
                                            <button
                                                key={i}
                                                onClick={() => onReact?.(messageId, reaction.emoji)}
                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm ${reaction.hasCurrentUser
                                                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                                    }`}
                                            >
                                                <span>{reaction.emoji}</span>
                                                <span className={reaction.hasCurrentUser ? 'text-indigo-200' : ''}>{reaction.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Floating Action Bar */}
                        <AnimatePresence>
                            {showActions && !isEditing && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                    animate={{ opacity: 1, scale: 1, y: -45 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                    transition={{ duration: 0.15 }}
                                    className={`absolute top-0 ${isOwnMessage ? 'right-0' : 'left-0'} z-50`}
                                >
                                    {/* Invisible bridge to prevent mouseleave when moving to menu */}
                                    <div className="absolute w-full h-10 top-full" />

                                    <div className="flex items-center gap-0.5 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-2xl">
                                        <div className="relative">
                                            <ActionButton
                                                icon={Smile}
                                                onClick={() => setShowReactionPicker(!showReactionPicker)}
                                                active={showReactionPicker}
                                                title="React"
                                            />
                                            {/* Reaction Picker Popup */}
                                            <AnimatePresence>
                                                {showReactionPicker && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: -50 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="absolute bottom-full left-0 mb-2 p-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl flex gap-1 z-50 min-w-max"
                                                    >
                                                        {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'].map(emoji => (
                                                            <button
                                                                key={emoji}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onReact?.(messageId, emoji);
                                                                    setShowReactionPicker(false);
                                                                    setShowActions(false);
                                                                }}
                                                                className="p-1.5 hover:bg-slate-700 rounded-lg text-lg transition-transform hover:scale-125"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <ActionButton icon={Reply} onClick={() => onReply?.(message)} title="Reply" />

                                        {isOwnMessage && (
                                            <ActionButton icon={Edit2} onClick={() => setIsEditing(true)} title="Edit" />
                                        )}

                                        <ActionButton
                                            icon={Pin}
                                            onClick={() => handlePinMessage?.(messageId)}
                                            active={message.pinned}
                                            title={message.pinned ? "Unpin" : "Pin"}
                                        />

                                        <ActionButton icon={Copy} onClick={handleCopy} title="Copy" />

                                        {isOwnMessage && (
                                            <>
                                                <div className="w-px h-4 bg-slate-700 mx-1" />
                                                <ActionButton
                                                    icon={Trash2}
                                                    onClick={() => handleDeleteMessage?.(messageId)}
                                                    title="Delete"
                                                    danger
                                                />
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const ActionButton = ({ icon: Icon, onClick, title, active, danger }) => (
    <button
        onClick={onClick}
        className={`p-2 rounded-lg transition-colors relative group/btn ${active ? 'text-sky-400 bg-sky-500/10' :
            danger ? 'text-red-400 hover:text-red-300 hover:bg-red-400/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
        title={title}
    >
        <Icon className="h-4 w-4" />
    </button>
);

export default ChatMessage;