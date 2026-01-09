import { motion,AnimatePresence } from "framer-motion";
import InfoSidebar from "./InfoSidebar";
import { BellOff, Briefcase, CheckSquare, FolderOpen, Info, Loader2, MessageSquare, Paperclip, Phone, Send, Smile, Star, Video } from "lucide-react";
import ChatMessage from "./ChatMessage";

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
    setShowEmojiPicker
    , overview
}) => {
    const hasMessages = messages.length > 0;
    const pinnedMessages = messages.filter(msg => msg.pinned);
    const typingMembers = item.members?.filter(m => m.typing);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
        >
            {/* Chat Header - Fixed */}
            <div className="flex-shrink-0 border-b border-slate-800/50 bg-slate-950/60 backdrop-blur-xl">
                {/* Pinned Messages Banner */}
                {pinnedMessages.length > 0 && (
                    <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20">
                        <div className="flex items-center gap-2">
                            <Pin className="h-3 w-3 text-amber-400" />
                            <p className="text-xs text-amber-400 font-medium">
                                {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                )}

                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${item.type === 'workspace' ? 'bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30' :
                                    item.type === 'project' ? 'bg-purple-500/10 border border-purple-500/20' :
                                        'bg-green-500/10 border border-green-500/20'
                                    }`}>
                                    {item.type === "workspace" && <Briefcase className="h-5 w-5 text-sky-400" />}
                                    {item.type === "project" && <FolderOpen className="h-5 w-5 text-purple-400" />}
                                    {item.type === "task" && <CheckSquare className="h-5 w-5 text-green-400" />}
                                </div>
                                {item.members && item.members.some(m => m.online) && (
                                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                    {item.name}
                                    {item.starred && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                                    {item.muted && <BellOff className="h-3.5 w-3.5 text-slate-500" />}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {typingMembers && typingMembers.length > 0 ? (
                                        <span className="text-sky-400 italic flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            {typingMembers[0].name.split(' ')[0]} is typing...
                                        </span>
                                    ) : (
                                        <>
                                            {item.members ? `${item.members.length} members` : 'Personal task'} •
                                            {item.members?.filter(m => m.online).length > 0 &&
                                                ` ${item.members.filter(m => m.online).length} online`
                                            }
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors" title="Voice call">
                                <Phone className="h-5 w-5 text-slate-400" />
                            </button>
                            <button className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors" title="Video call">
                                <Video className="h-5 w-5 text-slate-400" />
                            </button>
                            <button
                                onClick={() => setShowChatInfo(!showChatInfo)}
                                className={`p-2.5 rounded-xl transition-colors ${showChatInfo ? 'bg-slate-800/80' : 'hover:bg-slate-800/60'}`}
                                title="Info"
                            >
                                <Info className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Chat Messages */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Messages Area - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {hasMessages ? (
                            <>
                                {/* Date Divider */}
                                <div className="flex items-center gap-3 my-6">
                                    <div className="flex-1 h-px bg-slate-800/50" />
                                    <span className="text-xs text-slate-500 font-medium">Today</span>
                                    <div className="flex-1 h-px bg-slate-800/50" />
                                </div>

                                {messages.map((msg) => (
                                    <ChatMessage
                                        key={msg.id}
                                        message={msg}
                                        selectedMessage={selectedMessage}
                                        setSelectedMessage={setSelectedMessage}
                                        handleDeleteMessage={handleDeleteMessage}
                                        handlePinMessage={handlePinMessage}
                                    />
                                ))}
                                <div ref={chatEndRef} />
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center max-w-sm">
                                    <div className="h-16 w-16 rounded-2xl bg-slate-900/40 border border-slate-800/50 flex items-center justify-center mx-auto mb-4">
                                        <MessageSquare className="h-8 w-8 text-slate-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-300 mb-2">Start the conversation</h3>
                                    <p className="text-sm text-slate-500">
                                        Send a message to collaborate with your team on this {item.type}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message Input - Fixed */}
                    <div className="flex-shrink-0 border-t border-slate-800/50 bg-slate-950/60 backdrop-blur-xl p-4">
                        {/* File Upload Progress */}
                        {uploadingFile && (
                            <div className="mb-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 text-sky-400 animate-spin" />
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-300">Uploading file...</p>
                                        <div className="w-full h-1 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 1.5 }}
                                                className="h-full bg-sky-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-end gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileUpload}
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors flex-shrink-0"
                                title="Attach file"
                            >
                                <Paperclip className="h-5 w-5 text-slate-400" />
                            </button>

                            <div className="flex-1 relative">
                                <textarea
                                    ref={messageInputRef}
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    rows={1}
                                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-slate-700/80 transition-colors resize-none"
                                    style={{ minHeight: '44px', maxHeight: '120px' }}
                                />
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors flex-shrink-0"
                                    title="Emoji"
                                >
                                    <Smile className="h-5 w-5 text-slate-400" />
                                </button>

                                {/* Simple Emoji Picker */}
                                <AnimatePresence>
                                    {showEmojiPicker && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            className="absolute bottom-full right-0 mb-2 p-3 rounded-xl bg-slate-900/95 border border-slate-800/70 backdrop-blur-xl shadow-2xl"
                                        >
                                            <div className="grid grid-cols-8 gap-2">
                                                {['😊', '👍', '❤️', '🎉', '🔥', '✅', '👏', '💯', '😂', '🚀', '💪', '🙌', '✨', '💡', '📌', '⚡'].map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => {
                                                            setChatMessage(prev => prev + emoji);
                                                            setShowEmojiPicker(false);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/60 transition-colors text-lg"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSendMessage}
                                disabled={!chatMessage.trim() || uploadingFile}
                                className={`p-3 rounded-xl transition-all flex-shrink-0 ${chatMessage.trim() && !uploadingFile
                                    ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                                    : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                                    }`}
                                title="Send message"
                            >
                                <Send className="h-5 w-5" />
                            </motion.button>
                        </div>

                        {/* Input Helper Text */}
                        <p className="text-xs text-slate-600 mt-2 text-center">
                            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 font-mono">Enter</kbd> to send,
                            <kbd className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 font-mono mx-1">Shift + Enter</kbd> for new line
                        </p>
                    </div>
                </div>

                {/* Info Sidebar */}
                <AnimatePresence>
                    {showChatInfo && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-l border-slate-800/50 bg-slate-950/40 flex-shrink-0 overflow-hidden"
                        >
                            <InfoSidebar item={item} overview={overview} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default ChatPanel