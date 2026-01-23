import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Reply, Loader2, Paperclip, Smile, Send } from "lucide-react";

const ChatInput = ({
    chatMessage, setChatMessage, handleSend,
    fileInputRef, handleFileUpload, uploadingFile,
    replyingTo, setReplyingTo,
    showEmojiPicker, setShowEmojiPicker
}) => {
    const textareaRef = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [chatMessage]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
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
                            <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-800 rounded text-slate-500">
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

                <ActionButton icon={Paperclip} onClick={() => fileInputRef.current?.click()} title="Attach file" />

                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                </div>

                <div className="relative">
                    <ActionButton icon={Smile} onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Emoji" />

                    <AnimatePresence>
                        {showEmojiPicker && (
                            <EmojiPicker onSelect={(emoji) => {
                                setChatMessage(prev => prev + emoji);
                                setShowEmojiPicker(false);
                            }} />
                        )}
                    </AnimatePresence>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!chatMessage.trim() || uploadingFile}
                    className={`p-3 rounded-xl transition-all flex-shrink-0 ${chatMessage.trim() && !uploadingFile
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-sky-500/25'
                        : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                        }`}
                >
                    <Send className="h-5 w-5" />
                </motion.button>
            </div>

            <p className="text-xs text-slate-600 mt-2.5 text-center">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 font-mono text-[10px]">Enter</kbd> to send,
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 font-mono mx-1 text-[10px]">Shift + Enter</kbd> for new line
            </p>
        </div>
    );
};

const ActionButton = ({ icon: Icon, onClick, title }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors flex-shrink-0 text-slate-400 hover:text-slate-300"
        title={title}
    >
        <Icon className="h-5 w-5" />
    </motion.button>
);

const EmojiPicker = ({ onSelect }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="absolute bottom-full right-0 mb-2 p-4 rounded-xl bg-slate-900/95 border border-slate-800/70 backdrop-blur-xl shadow-2xl z-50"
    >
        <div className="grid grid-cols-8 gap-2 w-max">
            {['😊', '👍', '❤️', '🎉', '🔥', '✅', '👏', '💯', '😂', '🚀', '💪', '🙌', '✨', '💡', '📌', '⚡'].map(emoji => (
                <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelect(emoji)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-800/60 transition-colors text-lg"
                >
                    {emoji}
                </motion.button>
            ))}
        </div>
    </motion.div>
);

export default ChatInput;