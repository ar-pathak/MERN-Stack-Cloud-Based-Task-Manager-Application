import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Reply, Loader2, Paperclip, Smile, Send, FileText, Image as ImageIcon } from "lucide-react";

const ChatInput = ({
    chatMessage,
    setChatMessage,
    handleSend,     // Yeh ab (message, file) accept karega
    fileInputRef,
    // handleFileUpload, // Iski ab zaroorat nahi hai direct change pe
    uploadingFile,
    replyingTo,
    setReplyingTo,
    showEmojiPicker,
    setShowEmojiPicker,
    // New Props needed from Parent
    selectedFile,   // State from parent
    setSelectedFile // Setter from parent
}) => {
    const textareaRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [chatMessage]);

    // Generate Preview when file is selected
    useEffect(() => {
        if (selectedFile) {
            // Create object URL for images
            if (selectedFile.type.startsWith('image/')) {
                const url = URL.createObjectURL(selectedFile);
                setPreviewUrl(url);
                return () => URL.revokeObjectURL(url); // Cleanup
            } else {
                setPreviewUrl(null);
            }
        } else {
            setPreviewUrl(null);
        }
    }, [selectedFile]);

    // Handle File Selection (Stop immediate upload)
    const onFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    // Clear selected file
    const removeFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Allow send if text exists OR file exists
            if (chatMessage.trim() || selectedFile) {
                onSendClick();
            }
        }
    };

    const onSendClick = () => {
        if ((!chatMessage.trim() && !selectedFile) || uploadingFile) return;

        // Pass both text and file to the parent handler
        handleSend(selectedFile);

        // Clear local state happens in parent usually, but we can reset height here
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    return (
        <div className="flex-shrink-0 border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-xl p-4">

            {/* 1. Reply Context */}
            <AnimatePresence>
                {replyingTo && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-2 overflow-hidden"
                    >
                        <div className="flex items-center gap-2 p-2 bg-slate-900/40 border border-slate-800/50 rounded-lg border-l-4 border-l-sky-500">
                            <Reply className="h-4 w-4 text-sky-400" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-sky-400 font-bold">
                                    Replying to {replyingTo.senderId?.name || 'User'}
                                </p>
                                <p className="text-xs text-slate-300 truncate">
                                    {replyingTo.content || "Attachment"}
                                </p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. File Preview Area (NEW) */}
            <AnimatePresence>
                {selectedFile && !uploadingFile && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mb-3 relative inline-block group"
                    >
                        <div className="p-2 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center gap-3 w-fit max-w-full">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-600" />
                            ) : (
                                <div className="h-16 w-16 bg-slate-700 rounded-lg flex items-center justify-center">
                                    <FileText className="h-8 w-8 text-slate-400" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 pr-4">
                                <p className="text-sm text-slate-200 font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                                <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button
                                onClick={removeFile}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. Upload Progress (Existing) */}
            <AnimatePresence>
                {uploadingFile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mb-3 flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-sky-500/30"
                    >
                        <Loader2 className="h-5 w-5 text-sky-400 animate-spin" />
                        <span className="text-sm text-sky-400">Sending file...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Controls */}
            <div className="flex items-end gap-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={onFileSelect} // CHANGED: Calls local function, not upload directly
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" // Removed video/audio for now based on your schema
                />

                <ActionButton
                    icon={Paperclip}
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                    disabled={uploadingFile || selectedFile} // Disable if file already selected
                    active={!!selectedFile}
                />

                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                        rows={1}
                        disabled={uploadingFile}
                        className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800/60 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                </div>

                <div className="relative">
                    <ActionButton
                        icon={Smile}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        active={showEmojiPicker}
                        disabled={uploadingFile}
                    />
                    {/* Emoji Picker Logic (Same as before) */}
                    <AnimatePresence>
                        {showEmojiPicker && (
                            <EmojiPicker
                                onSelect={(emoji) => {
                                    setChatMessage(prev => prev + emoji);
                                    setShowEmojiPicker(false);
                                    textareaRef.current?.focus();
                                }}
                            />
                        )}
                    </AnimatePresence>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onSendClick}
                    // Enable button if there is text OR a file
                    disabled={(!chatMessage.trim() && !selectedFile) || uploadingFile}
                    className={`p-3 rounded-xl transition-all flex-shrink-0 ${(chatMessage.trim() || selectedFile) && !uploadingFile
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-sky-500/25'
                        : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                        }`}
                >
                    {uploadingFile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </motion.button>
            </div>

            {/* ...Footer text... */}
        </div>
    );
};

// ... keep ActionButton and EmojiPicker components as they were ...
const ActionButton = ({ icon: Icon, onClick, title, active, disabled }) => (
    <motion.button
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        onClick={onClick}
        disabled={disabled}
        className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${active
            ? 'bg-sky-500/20 text-sky-400'
            : disabled
                ? 'text-slate-600 cursor-not-allowed'
                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-300'
            }`}
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
        transition={{ duration: 0.15 }}
        className="absolute bottom-full right-0 mb-2 p-4 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-800/70 shadow-2xl z-50"
    >
        <div className="grid grid-cols-8 gap-2 w-max">
            {[
                '😊', '👍', '❤️', '🎉', '🔥', '✅', '👏', '💯',
                '😂', '🚀', '💪', '🙌', '✨', '💡', '📌', '⚡',
                '😍', '🤔', '😎', '🥳', '😢', '😭', '😡', '🤗',
                '👀', '🙏', '💖', '🎈', '🌟', '⭐', '🎯', '🏆'
            ].map(emoji => (
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