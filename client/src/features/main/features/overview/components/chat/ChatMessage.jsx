import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Reply, Pin, Edit2, Trash2, FileText, Download,
    Check, CheckCheck, Copy, X, Smile, ArrowUpRight, Image as ImageIcon, PlayCircle
} from "lucide-react";
import { useAuth } from "../../../../../../context/AuthContext";
import { useNavigate } from "react-router";

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
    const navigate = useNavigate();
    const currentUserId = user?._id || user?.id;

    // --- DATA NORMALIZATION (Memoized) ---
    const normalizedMessage = useMemo(() => {
        const messageId = message._id || message.id;
        const sender = message.senderId || message.sender || {};
        const senderIdString = typeof sender === 'object' ? (sender._id || sender.id) : sender;

        const isOwnMessage = message.isOwn !== undefined
            ? message.isOwn
            : String(senderIdString) === String(currentUserId);

        const content = message.content || message.text || '';
        const sharedPostId =
            (typeof message.sharedPost === "object" && (message.sharedPost?._id || message.sharedPost?.id)) ||
            (typeof message.sharedPost === "string" ? message.sharedPost : "");
        const sharedPost = typeof message.sharedPost === "object" ? message.sharedPost : null;
        const isPostShare = Boolean(message.type === "post" || sharedPostId);
        const isSystemMessage = Boolean(
            message.isSystem ||
            message.type === "system" ||
            message.meta?.isActivity
        );

        return {
            messageId,
            sender,
            senderIdString,
            isOwnMessage,
            content,
            sharedPostId,
            sharedPost,
            isPostShare,
            isSystemMessage
        };
    }, [message, currentUserId]);

    const {
        messageId,
        sender,
        senderIdString,
        isOwnMessage,
        content,
        sharedPostId,
        sharedPost,
        isPostShare,
        isSystemMessage
    } = normalizedMessage;

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
        const text = String(content || "").trim();
        if (text) {
            navigator.clipboard.writeText(text);
            return;
        }

        if (sharedPostId && typeof window !== "undefined") {
            navigator.clipboard.writeText(`${window.location.origin}/post/${sharedPostId}`);
        }
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

    const getPostAuthorLabel = (post) =>
        post?.author?.name || post?.author?.username || "Unknown user";

    const renderSharedPostCard = () => {
        if (!isPostShare) return null;

        const postMedia = Array.isArray(sharedPost?.media) ? sharedPost.media : [];
        const firstMedia = postMedia[0] || null;

        if (!sharedPost) {
            return (
                <div className="mt-2 rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                    Shared post unavailable
                </div>
            );
        }

        return (
            <button
                type="button"
                onClick={() => sharedPostId && navigate(`/post/${sharedPostId}`)}
                className={`mt-2 block w-full max-w-[320px] rounded-xl border text-left transition hover:opacity-95 ${
                    isOwnMessage
                        ? "border-white/20 bg-black/25"
                        : "border-slate-600/70 bg-slate-900/80"
                }`}
            >
                <div className="flex items-center gap-2 px-3 pt-2.5">
                    <div className="h-7 w-7 overflow-hidden rounded-full border border-white/20 bg-slate-800">
                        {sharedPost?.author?.avatar ? (
                            <img
                                src={sharedPost.author.avatar}
                                alt={getPostAuthorLabel(sharedPost)}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-300">
                                {String(getPostAuthorLabel(sharedPost)).charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-100">
                            {getPostAuthorLabel(sharedPost)}
                        </p>
                        <p className="text-[10px] text-slate-400">Shared post</p>
                    </div>
                </div>

                {sharedPost?.content ? (
                    <p className="line-clamp-3 px-3 pb-2 pt-2 text-xs leading-5 text-slate-200">
                        {sharedPost.content}
                    </p>
                ) : null}

                {firstMedia && (
                    <div className="mx-3 mb-2 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                        {firstMedia?.type === "image" ? (
                            <img
                                src={firstMedia.url}
                                alt="Shared post media"
                                className="max-h-44 w-full object-cover"
                            />
                        ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-slate-300">
                                {firstMedia?.type === "video" ? (
                                    <PlayCircle className="h-3.5 w-3.5" />
                                ) : (
                                    <ImageIcon className="h-3.5 w-3.5" />
                                )}
                                {firstMedia?.type === "video" ? "Video attachment" : "Media attachment"}
                            </div>
                        )}
                    </div>
                )}
            </button>
        );
    };

    const mentionByUsername = new Map(
        (message.mentions || [])
            .filter((item) => item && typeof item === "object" && item.username)
            .map((item) => [String(item.username).toLowerCase(), item])
    );

    const renderContentWithMentions = (text) => {
        const source = String(text || "");
        if (!source.includes("@")) return source;

        const parts = [];
        const regex = /@([a-z0-9_]{3,20})/gi;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(source)) !== null) {
            const tokenStart = match.index;
            const tokenEnd = regex.lastIndex;
            const username = String(match[1] || "").toLowerCase();

            if (tokenStart > lastIndex) {
                parts.push(source.slice(lastIndex, tokenStart));
            }

            const userMatch = mentionByUsername.get(username);
            const mentionText = source.slice(tokenStart, tokenEnd);

            if (userMatch?._id) {
                parts.push(
                    <button
                        key={`mention-${messageId}-${tokenStart}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/profile/${userMatch._id}`);
                        }}
                        className="inline rounded px-0.5 text-sky-300 hover:text-sky-200 hover:underline"
                    >
                        {mentionText}
                    </button>
                );
            } else {
                parts.push(
                    <span
                        key={`mention-${messageId}-${tokenStart}`}
                        className="text-sky-300"
                    >
                        {mentionText}
                    </span>
                );
            }

            lastIndex = tokenEnd;
        }

        if (lastIndex < source.length) {
            parts.push(source.slice(lastIndex));
        }

        return parts;
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

    if (isSystemMessage) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-3 flex justify-center px-3 max-[300px]:px-2"
            >
                <div className="max-w-[92%] rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-1.5 text-center text-[11px] text-slate-300 max-[300px]:px-3 max-[300px]:py-1 max-[300px]:text-[10px]">
                    {renderContentWithMentions(content)}
                </div>
            </motion.div>
        );
    }

    // --- DYNAMIC STYLES ---
    const containerMargin = isConsecutive ? 'mb-0.5' : 'mb-6';

    const bubbleRadius = isOwnMessage
        ? isConsecutive ? 'rounded-3xl rounded-tr-md rounded-br-md' : 'rounded-3xl rounded-tr-sm'
        : isConsecutive ? 'rounded-3xl rounded-tl-md rounded-bl-md' : 'rounded-3xl rounded-tl-sm';
    const pinnedByLabel = message?.pinnedBy?.name || message?.pinnedBy?.username || "";
    const pinnedAtLabel = message?.pinnedAt ? formatTime(message.pinnedAt) : "";
    const pinnedMetaLabel = [pinnedByLabel ? `Pinned by ${pinnedByLabel}` : "Pinned", pinnedAtLabel]
        .filter(Boolean)
        .join(" - ");

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            // Removed onMouseEnter/Leave from here to stop row-hover trigger
            className={`group relative flex flex-col ${containerMargin} ${message.pinned ? "rounded-2xl border border-amber-500/30 bg-amber-500/5 px-2 py-1 sm:px-3" : ""}`}
        >
            {/* Reply Context */}
            {message.replyTo && !isConsecutive && (
                <div
                    onClick={() => onJumpToMessage && onJumpToMessage(message.replyTo._id || message.replyTo.id)}
                    className={`mb-1 flex cursor-pointer flex-col group/reply ${isOwnMessage ? 'items-end mr-12 max-[300px]:mr-8' : 'items-start ml-12 max-[300px]:ml-8'}`}
                >
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/40 border-l-2 transition-colors hover:bg-slate-800/60 max-[300px]:gap-1.5 max-[300px]:px-2 max-[300px]:py-0.5 ${isOwnMessage ? 'border-indigo-500' : 'border-slate-500'}`}>
                        <Reply className="h-3 w-3 text-slate-400 max-[300px]:h-2.5 max-[300px]:w-2.5" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                {message.replyTo.senderId?.name || message.replyTo.sender?.name || 'User'}
                                <ArrowUpRight className="h-2.5 w-2.5 opacity-0 group-hover/reply:opacity-100 transition-opacity" />
                            </span>
                            <span className="text-[10px] text-slate-500 max-w-[200px] truncate max-[300px]:max-w-[145px]">
                                {(
                                    message.replyTo.content ||
                                    message.replyTo.text ||
                                    (message.replyTo.type === "post" || message.replyTo.sharedPost ? "Shared a post" : "Attachment")
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className={`flex gap-3 max-[300px]:gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
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
                <div className={`flex flex-col max-w-[75%] max-[300px]:max-w-[82%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>

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
                            className="z-20 flex w-[min(300px,calc(100vw-2rem))] flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-800 p-3 shadow-2xl max-[300px]:w-[min(300px,calc(100vw-1.25rem))] max-[300px]:gap-1.5 max-[300px]:p-2 sm:w-[400px]"
                        >
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-[80px] w-full resize-none rounded-lg bg-slate-900/50 p-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 max-[300px]:min-h-[70px] max-[300px]:p-1.5 max-[300px]:text-[13px]"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSaveEdit();
                                        } else if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                />
                                <div className="flex justify-end gap-2 max-[300px]:gap-1.5">
                                    <button onClick={handleCancelEdit} className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-700 max-[300px]:px-2 max-[300px]:py-1">Cancel</button>
                                    <button onClick={handleSaveEdit} disabled={!editContent.trim()} className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600 max-[300px]:px-2 max-[300px]:py-1">Save</button>
                                </div>
                            </motion.div>
                        ) : (
                            <>
                                <motion.div
                                    layout
                                    className={`relative px-4 py-2 shadow-md max-[300px]:px-3 max-[300px]:py-1.5 ${bubbleRadius} ${isOwnMessage
                                        ? 'bg-gradient-to-tr from-blue-600 to-violet-600 text-white'
                                        : 'bg-slate-800 text-slate-200 border border-slate-700/50'
                                        } ${message.pinned ? "ring-1 ring-amber-400/50" : ""}`}
                                >
                                    {message.pinned && (
                                        <div className="mb-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100 max-[300px]:gap-1 max-[300px]:px-1.5">
                                            <Pin className="h-3 w-3 max-[300px]:h-2.5 max-[300px]:w-2.5" fill="currentColor" />
                                            <span className="truncate">{pinnedMetaLabel}</span>
                                        </div>
                                    )}

                                    {/* Text Content */}
                                    {content ? (
                                        <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words max-[300px]:text-[13px] ${isOwnMessage ? 'text-white/95' : 'text-slate-100'}`}>
                                            {renderContentWithMentions(content)}
                                        </p>
                                    ) : null}

                                    {renderSharedPostCard()}

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
                                                        className="max-w-[250px] rounded-lg cursor-pointer border border-white/10 max-[300px]:max-w-[190px]"
                                                        onClick={() => window.open(file.url, '_blank')}
                                                    />
                                                ) : (
                                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-white/10 max-[300px]:gap-2 max-[300px]:p-1.5">
                                                        <FileText className="h-5 w-5 max-[300px]:h-4 max-[300px]:w-4" />
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <p className="text-sm truncate max-[300px]:text-xs">{file.name}</p>
                                                            <p className="text-xs opacity-60 max-[300px]:text-[10px]">{formatSize(file.size)}</p>
                                                        </div>
                                                        <a href={file.url} download className="p-1 hover:bg-white/10 rounded">
                                                            <Download className="h-4 w-4 max-[300px]:h-3.5 max-[300px]:w-3.5" />
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
                                    className={`absolute top-0 ${isOwnMessage ? 'right-0 max-[300px]:origin-top-right' : 'left-0 max-[300px]:origin-top-left'} z-50 max-[300px]:scale-90`}
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
                                                            className="absolute bottom-full left-0 mb-2 p-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl flex gap-1 z-50 min-w-max max-[300px]:left-auto max-[300px]:right-0"
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
        className={`p-2 rounded-lg transition-colors relative group/btn max-[300px]:p-1.5 ${active ? 'text-sky-400 bg-sky-500/10' :
            danger ? 'text-red-400 hover:text-red-300 hover:bg-red-400/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
        title={title}
    >
        <Icon className="h-4 w-4 max-[300px]:h-3.5 max-[300px]:w-3.5" />
    </button>
);

export default ChatMessage;




