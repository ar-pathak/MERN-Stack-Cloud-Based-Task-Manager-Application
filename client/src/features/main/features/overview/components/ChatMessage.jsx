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

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            className="group relative"
        >
            <div className={`flex gap-3 p-4 rounded-xl transition-all ${message.pinned
                ? 'bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20'
                : 'hover:bg-slate-900/40'
                }`}>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {message.sender?.name?.substring(0, 2).toUpperCase() || 'U'}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-slate-200 text-sm">
                            {message.sender?.name || 'User'}
                        </span>
                        <span className="text-xs text-slate-500">
                            {new Date(message.timestamp || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                        {message.edited && (
                            <span className="text-xs text-slate-600">(edited)</span>
                        )}
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {message.text}
                    </p>

                    {reactions.length > 0 && (
                        <div className="flex gap-1 mt-2">
                            {reactions.map((emoji, i) => (
                                <span key={i} className="text-sm px-2 py-0.5 bg-slate-800/60 rounded-full">
                                    {emoji}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <AnimatePresence>
                    {showActions && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute top-2 right-2 flex gap-1 bg-slate-900/95 border border-slate-800 rounded-lg p-1 shadow-lg backdrop-blur-sm"
                        >
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onReact(message.id, '👍')}
                                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-300"
                                title="React"
                            >
                                <ThumbsUp className="h-3.5 w-3.5" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onReply(message)}
                                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-300"
                                title="Reply"
                            >
                                <Reply className="h-3.5 w-3.5" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handlePinMessage(message.id)}
                                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-300"
                                title="Pin"
                            >
                                <Pin className="h-3.5 w-3.5" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setSelectedMessage(message)}
                                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-300"
                                title="More"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default ChatMessage;