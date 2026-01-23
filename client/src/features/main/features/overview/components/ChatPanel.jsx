import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Loader2, Briefcase, FolderOpen, CheckSquare, Link as LinkIcon, Star, BellOff,
    Phone, Video, Info, Paperclip, Send, Smile, MessageSquare,
    Search, Image as ImageIcon,
    Reply, Pin
} from "lucide-react";
import ChatMessage from "./ChatMessage";
import InfoSidebar from "./infoSidebar/InfoSidebar";


const ChatPanel = ({
    item,
    messages,
    chatMessage,
    setChatMessage,
    handleSendMessage,
    showChatInfo,
    setShowChatInfo,
    chatEndRef,
    selectedMessage,
    setSelectedMessage,
    handleDeleteMessage,
    handlePinMessage,
    fileInputRef,
    handleFileUpload,
    uploadingFile,
    messageInputRef,
    showEmojiPicker,
    setShowEmojiPicker,
    overview
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [messageFilter, setMessageFilter] = useState("all");
    const [isRecording, setIsRecording] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [reactions, setReactions] = useState({});
    const textareaRef = useRef(null);

    const pinnedMessages = messages.filter(msg => msg.pinned);
    const typingMembers = item.members?.filter(m => m.typing);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [chatMessage]);

    // Filter messages
    const filteredMessages = useMemo(() => {
        let filtered = messages;

        if (searchQuery) {
            filtered = filtered.filter(msg =>
                msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (messageFilter === "files") {
            filtered = filtered.filter(msg => msg.attachments?.length > 0);
        } else if (messageFilter === "pinned") {
            filtered = filtered.filter(msg => msg.pinned);
        }

        return filtered;
    }, [messages, searchQuery, messageFilter]);

    const handleReaction = (messageId, emoji) => {
        setReactions(prev => ({
            ...prev,
            [messageId]: [...(prev[messageId] || []), emoji]
        }));
    };

    const handleSendWithContext = () => {
        if (replyingTo) {
            // Include reply context in message
            handleSendMessage({ replyTo: replyingTo });
            setReplyingTo(null);
        } else {
            handleSendMessage();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
        >
            {/* Enhanced Header */}
            <div className="flex-shrink-0 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
                {/* Pinned Messages Banner */}
                {pinnedMessages.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="px-6 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Pin className="h-3.5 w-3.5 text-amber-400" />
                                <p className="text-xs text-amber-400 font-medium">
                                    {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? 's' : ''}
                                </p>
                            </div>
                            <button className="text-xs text-amber-400/60 hover:text-amber-400">
                                View all
                            </button>
                        </div>
                    </motion.div>
                )}

                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${item.type === 'workspace'
                                    ? 'bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 group-hover:border-sky-400/50'
                                    : item.type === 'project'
                                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 group-hover:border-purple-400/50'
                                        : 'bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30 group-hover:border-emerald-400/50'
                                    }`}>
                                    {item.type === "workspace" && <Briefcase className="h-5 w-5 text-sky-400" />}
                                    {item.type === "project" && <FolderOpen className="h-5 w-5 text-purple-400" />}
                                    {item.type === "task" && <CheckSquare className="h-5 w-5 text-emerald-400" />}
                                </div>
                                {item.members && item.members.some(m => m.online) && (
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
                                    {item.name}
                                    {item.starred && (
                                        <motion.div whileHover={{ rotate: 72 }}>
                                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                        </motion.div>
                                    )}
                                    {item.muted && <BellOff className="h-4 w-4 text-slate-500" />}
                                </h2>

                                <div className="flex items-center gap-2">
                                    {typingMembers && typingMembers.length > 0 ? (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
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

                        <div className="flex items-center gap-1">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowSearch(!showSearch)}
                                className={`p-2.5 rounded-xl transition-colors ${showSearch ? 'bg-slate-800/80 text-sky-400' : 'hover:bg-slate-800/60 text-slate-400'
                                    }`}
                                title="Search messages"
                            >
                                <Search className="h-5 w-5" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors text-slate-400"
                                title="Voice call"
                            >
                                <Phone className="h-5 w-5" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors text-slate-400"
                                title="Video call"
                            >
                                <Video className="h-5 w-5" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowChatInfo(!showChatInfo)}
                                className={`p-2.5 rounded-xl transition-colors ${showChatInfo ? 'bg-slate-800/80 text-sky-400' : 'hover:bg-slate-800/60 text-slate-400'
                                    }`}
                                title="Info"
                            >
                                <Info className="h-5 w-5" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Search Bar */}
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
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {filteredMessages.length > 0 ? (
                            <>
                                <div className="flex items-center gap-3 my-6">
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-800/50 to-transparent" />
                                    <span className="text-xs text-slate-500 font-medium px-3 py-1 bg-slate-900/60 rounded-full border border-slate-800/50">
                                        Today
                                    </span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-800/50 to-transparent" />
                                </div>

                                {filteredMessages.map((msg) => (
                                    <ChatMessage
                                        key={msg.id}
                                        message={msg}
                                        selectedMessage={selectedMessage}
                                        setSelectedMessage={setSelectedMessage}
                                        handleDeleteMessage={handleDeleteMessage}
                                        handlePinMessage={handlePinMessage}
                                        onReact={handleReaction}
                                        onReply={setReplyingTo}
                                        reactions={reactions[msg.id]}
                                    />
                                ))}
                                <div ref={chatEndRef} />
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center max-w-sm">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", duration: 0.6 }}
                                        className="h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-800/50 flex items-center justify-center mx-auto mb-4"
                                    >
                                        <MessageSquare className="h-10 w-10 text-slate-600" />
                                    </motion.div>
                                    <h3 className="text-lg font-semibold text-slate-300 mb-2">
                                        Start the conversation
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Send a message to collaborate with your team on this {item.type}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message Input */}
                    <div className="flex-shrink-0 border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-xl p-4">
                        {/* Reply Context */}
                        <AnimatePresence>
                            {replyingTo && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mb-3 overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl">
                                        <Reply className="h-4 w-4 text-slate-500" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-500">Replying to</p>
                                            <p className="text-sm text-slate-300 truncate">{replyingTo.text}</p>
                                        </div>
                                        <button
                                            onClick={() => setReplyingTo(null)}
                                            className="p-1 hover:bg-slate-800 rounded text-slate-500"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* File Upload Progress */}
                        {uploadingFile && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-3 p-3 rounded-xl bg-gradient-to-r from-slate-800/40 to-slate-900/40 border border-slate-700/50"
                            >
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 text-sky-400 animate-spin" />
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-300 mb-2">Uploading file...</p>
                                        <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 1.5 }}
                                                className="h-full bg-gradient-to-r from-sky-500 to-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div className="flex items-end gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileUpload}
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            />

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors flex-shrink-0 text-slate-400 hover:text-slate-300"
                                title="Attach file"
                            >
                                <Paperclip className="h-5 w-5" />
                            </motion.button>

                            <div className="flex-1 relative">
                                <textarea
                                    ref={textareaRef}
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendWithContext();
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    rows={1}
                                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
                                    style={{ minHeight: '44px', maxHeight: '120px' }}
                                />
                            </div>

                            <div className="relative">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors flex-shrink-0 text-slate-400 hover:text-slate-300"
                                    title="Emoji"
                                >
                                    <Smile className="h-5 w-5" />
                                </motion.button>

                                <AnimatePresence>
                                    {showEmojiPicker && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            className="absolute bottom-full right-0 mb-2 p-4 rounded-xl bg-slate-900/95 border border-slate-800/70 backdrop-blur-xl shadow-2xl"
                                        >
                                            <div className="grid grid-cols-8 gap-2">
                                                {['😊', '👍', '❤️', '🎉', '🔥', '✅', '👏', '💯', '😂', '🚀', '💪', '🙌', '✨', '💡', '📌', '⚡'].map(emoji => (
                                                    <motion.button
                                                        key={emoji}
                                                        whileHover={{ scale: 1.2 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => {
                                                            setChatMessage(prev => prev + emoji);
                                                            setShowEmojiPicker(false);
                                                        }}
                                                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-800/60 transition-colors text-lg"
                                                    >
                                                        {emoji}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSendWithContext}
                                disabled={!chatMessage.trim() || uploadingFile}
                                className={`p-3 rounded-xl transition-all flex-shrink-0 ${chatMessage.trim() && !uploadingFile
                                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-sky-500/25'
                                    : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                                    }`}
                                title="Send message"
                            >
                                <Send className="h-5 w-5" />
                            </motion.button>
                        </div>

                        <p className="text-xs text-slate-600 mt-2.5 text-center">
                            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 font-mono text-[10px]">Enter</kbd> to send,
                            <kbd className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 font-mono mx-1 text-[10px]">Shift + Enter</kbd> for new line
                        </p>
                    </div>
                </div>

                {/* Info Sidebar */}
                <AnimatePresence>
                    {showChatInfo && (
                        <InfoSidebar item={item} overview={overview} onClose={() => setShowChatInfo(false)} />
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default ChatPanel