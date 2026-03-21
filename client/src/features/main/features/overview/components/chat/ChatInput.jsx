import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Reply, Loader2, Paperclip, Smile, Send, FileText, Image as ImageIcon, AtSign } from "lucide-react";
import { searchMentionCandidates } from "../../../../../../service/user.service";

const MAX_MENTION_QUERY = 20;

const detectMentionContext = (text, caretPosition) => {
    const value = String(text || "");
    const caret = Number.isInteger(caretPosition) ? caretPosition : value.length;
    const prefix = value.slice(0, caret);

    const atIndex = prefix.lastIndexOf("@");
    if (atIndex < 0) return null;

    const beforeAt = atIndex === 0 ? "" : prefix[atIndex - 1];
    if (beforeAt && !/[\s([{"'`.,!?;:-]/.test(beforeAt)) {
        return null;
    }

    const query = prefix.slice(atIndex + 1);
    if (/\s/.test(query)) return null;
    if (query.length > MAX_MENTION_QUERY) return null;
    if (!/^[a-z0-9_]*$/i.test(query)) return null;

    return {
        start: atIndex,
        end: caret,
        query: query.toLowerCase()
    };
};

const ChatInput = ({
    chatMessage,
    setChatMessage,
    handleSend,
    fileInputRef,
    uploadingFile,
    replyingTo,
    setReplyingTo,
    showEmojiPicker,
    setShowEmojiPicker,
    selectedFile,
    setSelectedFile,
    chatId,
    sendDisabled = false,
    sendDisabledReason = "",
    mentionEnabled = true
}) => {
    const textareaRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [mentionContext, setMentionContext] = useState(null);
    const [mentionCandidates, setMentionCandidates] = useState([]);
    const [mentionLoading, setMentionLoading] = useState(false);
    const [activeMentionIndex, setActiveMentionIndex] = useState(0);

    const handleEmojiSelect = useCallback((emoji) => {
        const nextValue = `${chatMessage}${emoji}`;
        setChatMessage(nextValue);
        setShowEmojiPicker(false);
        textareaRef.current?.focus();
    }, [chatMessage, setChatMessage]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [chatMessage]);

    // Mention candidate search (debounced)
    useEffect(() => {
        let cancelled = false;
        const token = mentionContext?.query;

        if (!mentionEnabled || mentionContext === null) {
            setMentionCandidates([]);
            setMentionLoading(false);
            setActiveMentionIndex(0);
            return undefined;
        }

        const timer = setTimeout(async () => {
            try {
                setMentionLoading(true);
                const users = await searchMentionCandidates(token || "", {
                    chatId,
                    limit: 8
                });

                if (cancelled) return;
                setMentionCandidates(Array.isArray(users) ? users : []);
                setActiveMentionIndex(0);
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to search mention candidates", error);
                setMentionCandidates([]);
            } finally {
                if (!cancelled) {
                    setMentionLoading(false);
                }
            }
        }, 180);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [mentionContext, chatId, mentionEnabled]);

    // Generate Preview when file is selected
    useEffect(() => {
        if (selectedFile) {
            if (selectedFile.type.startsWith("image/")) {
                const url = URL.createObjectURL(selectedFile);
                setPreviewUrl(url);
                return () => URL.revokeObjectURL(url);
            }
            setPreviewUrl(null);
        } else {
            setPreviewUrl(null);
        }
    }, [selectedFile]);

    const updateMentionFromValue = (value, caretPos) => {
        if (!mentionEnabled) {
            setMentionContext(null);
            setMentionCandidates([]);
            setMentionLoading(false);
            return;
        }
        const next = detectMentionContext(value, caretPos);
        setMentionContext(next);
    };

    const onInputChange = (e) => {
        const value = e.target.value;
        const caretPos = e.target.selectionStart;
        setChatMessage(value);
        updateMentionFromValue(value, caretPos);
    };

    const onFileSelect = (e) => {
        if (sendDisabled) {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return;
        }
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const applyMention = (candidate) => {
        if (!candidate || !mentionContext) return;

        const before = chatMessage.slice(0, mentionContext.start);
        const after = chatMessage.slice(mentionContext.end);
        const inserted = `@${candidate.username} `;
        const nextValue = `${before}${inserted}${after}`;

        setChatMessage(nextValue);
        setMentionContext(null);
        setMentionCandidates([]);

        requestAnimationFrame(() => {
            if (!textareaRef.current) return;
            const nextCaret = before.length + inserted.length;
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(nextCaret, nextCaret);
        });
    };

    const handleKeyDown = (e) => {
        const mentionOpen = mentionEnabled && mentionContext && (mentionLoading || mentionCandidates.length > 0);

        if (mentionOpen) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveMentionIndex((prev) =>
                    mentionCandidates.length ? (prev + 1) % mentionCandidates.length : 0
                );
                return;
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveMentionIndex((prev) =>
                    mentionCandidates.length ? (prev - 1 + mentionCandidates.length) % mentionCandidates.length : 0
                );
                return;
            }

            if (e.key === "Enter" || e.key === "Tab") {
                if (mentionCandidates.length > 0) {
                    e.preventDefault();
                    applyMention(mentionCandidates[activeMentionIndex]);
                    return;
                }
            }

            if (e.key === "Escape") {
                e.preventDefault();
                setMentionContext(null);
                setMentionCandidates([]);
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (chatMessage.trim() || selectedFile) {
                onSendClick();
            }
        }
    };

    const onSendClick = () => {
        if ((!chatMessage.trim() && !selectedFile) || uploadingFile || sendDisabled) return;
        handleSend(selectedFile);

        setMentionContext(null);
        setMentionCandidates([]);

        if (textareaRef.current) textareaRef.current.style.height = "auto";
    };

    return (
        <div className="flex-shrink-0 border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-xl p-2.5 max-[340px]:p-1.5 max-[300px]:p-1 sm:p-3 md:p-4">
            <AnimatePresence>
                {replyingTo && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-2 overflow-hidden"
                    >
                        <div className="flex items-center gap-2 p-2 bg-slate-900/40 border border-slate-800/50 rounded-lg border-l-4 border-l-sky-500 max-[300px]:gap-1.5 max-[300px]:p-1.5">
                            <Reply className="h-4 w-4 text-sky-400 max-[300px]:h-3.5 max-[300px]:w-3.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-sky-400 font-bold max-[300px]:text-[11px]">
                                    Replying to {replyingTo.senderId?.name || "User"}
                                </p>
                                <p className="text-xs text-slate-300 truncate max-[300px]:text-[11px]">
                                    {replyingTo.content || "Attachment"}
                                </p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400 max-[300px]:p-0.5">
                                <X className="h-4 w-4 max-[300px]:h-3.5 max-[300px]:w-3.5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedFile && !uploadingFile && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mb-3 relative inline-block max-w-full group"
                    >
                        <div className="p-2 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center gap-3 w-fit max-w-full max-[300px]:gap-2 max-[300px]:p-1.5">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-700 max-[300px]:h-12 max-[300px]:w-12" />
                            ) : (
                                <div className="h-16 w-16 rounded-lg bg-slate-700/60 flex items-center justify-center border border-slate-700 max-[300px]:h-12 max-[300px]:w-12">
                                    {selectedFile.type.startsWith("image/") ? (
                                        <ImageIcon className="h-8 w-8 text-slate-400 max-[300px]:h-6 max-[300px]:w-6" />
                                    ) : (
                                        <FileText className="h-8 w-8 text-slate-400 max-[300px]:h-6 max-[300px]:w-6" />
                                    )}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm text-slate-200 truncate max-w-[120px] max-[340px]:max-w-[84px] max-[300px]:max-w-[62px] max-[300px]:text-xs sm:max-w-[200px]">{selectedFile.name}</p>
                                <p className="text-xs text-slate-500 max-[300px]:text-[11px]">{Math.round(selectedFile.size / 1024)} KB</p>
                            </div>
                        </div>
                        <button
                            onClick={removeFile}
                            className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg max-[300px]:opacity-100 max-[300px]:p-1"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {uploadingFile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mb-3 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center gap-2 text-sky-300 max-[300px]:px-2 max-[300px]:py-1.5 max-[300px]:gap-1.5"
                    >
                        <Loader2 className="h-4 w-4 animate-spin max-[300px]:h-3.5 max-[300px]:w-3.5" />
                        <span className="text-xs max-[300px]:text-[11px]">Uploading...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-end gap-1.5 max-[340px]:gap-1 max-[300px]:gap-0.5 sm:gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileSelect}
                    className="hidden"
                />

                <ActionButton
                    icon={Paperclip}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile || sendDisabled}
                    title="Attach file"
                />

                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={chatMessage}
                        onChange={onInputChange}
                        onClick={(e) => updateMentionFromValue(e.target.value, e.target.selectionStart)}
                        onKeyUp={(e) => updateMentionFromValue(e.target.value, e.target.selectionStart)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            sendDisabled
                                ? (sendDisabledReason || "You cannot send messages in this chat.")
                                : selectedFile
                                    ? "Add a caption..."
                                    : mentionEnabled
                                        ? "Type a message... Use @ to mention"
                                        : "Type a message..."
                        }
                        rows={1}
                        disabled={uploadingFile || sendDisabled}
                        className="w-full rounded-xl border border-slate-800/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-500 transition-all resize-none focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 max-[340px]:px-2.5 max-[340px]:py-2 max-[300px]:rounded-lg max-[300px]:px-2 max-[300px]:py-1.5 max-[300px]:text-[13px]"
                        style={{ minHeight: "42px", maxHeight: "120px" }}
                    />

                    <AnimatePresence>
                        {mentionEnabled && mentionContext && (mentionLoading || mentionCandidates.length > 0) && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                className="absolute left-0 right-0 bottom-full mb-2 rounded-xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50 max-[300px]:rounded-lg"
                            >
                                <div className="px-3 py-2 border-b border-slate-800/70 flex items-center gap-2 max-[300px]:px-2 max-[300px]:py-1.5 max-[300px]:gap-1.5">
                                    <AtSign className="h-3.5 w-3.5 text-sky-400 max-[300px]:h-3 max-[300px]:w-3" />
                                    <p className="text-[11px] uppercase tracking-wide text-slate-400 max-[300px]:text-[10px]">
                                        Mention someone
                                    </p>
                                </div>

                                <div className="max-h-56 overflow-y-auto custom-scrollbar max-[300px]:max-h-44">
                                    {mentionLoading && (
                                        <div className="px-3 py-3 text-xs text-slate-400 max-[300px]:px-2 max-[300px]:py-2 max-[300px]:text-[11px]">Searching users...</div>
                                    )}

                                    {!mentionLoading && mentionCandidates.length === 0 && (
                                        <div className="px-3 py-3 text-xs text-slate-500 max-[300px]:px-2 max-[300px]:py-2 max-[300px]:text-[11px]">No users found</div>
                                    )}

                                    {!mentionLoading && mentionCandidates.map((candidate, index) => (
                                        <button
                                            key={candidate._id || candidate.username}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                applyMention(candidate);
                                            }}
                                            className={`w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors max-[300px]:px-2 max-[300px]:py-2 max-[300px]:gap-1.5 ${
                                                index === activeMentionIndex ? "bg-sky-500/15" : "hover:bg-slate-800/70"
                                            }`}
                                        >
                                            <img
                                                src={candidate.avatar || "https://ui-avatars.com/api/?background=1f2937&color=e5e7eb&name=" + encodeURIComponent(candidate.name || candidate.username || "U")}
                                                alt={candidate.name || candidate.username}
                                                className="h-7 w-7 rounded-full object-cover border border-slate-700 max-[300px]:h-6 max-[300px]:w-6"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-slate-100 truncate max-[300px]:text-[11px]">{candidate.name || candidate.username}</p>
                                                <p className="text-[11px] text-sky-300 truncate max-[300px]:text-[10px]">@{candidate.username}</p>
                                            </div>
                                            {candidate.isOnline && (
                                                <span className="ml-auto h-2.5 w-2.5 rounded-full bg-emerald-400 max-[300px]:h-2 max-[300px]:w-2" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="relative">
                    <ActionButton
                        icon={Smile}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        active={showEmojiPicker}
                        disabled={uploadingFile || sendDisabled}
                        title="Emoji"
                    />

                    <AnimatePresence>
                        {showEmojiPicker && (
                            <EmojiPicker
                                onSelect={handleEmojiSelect}
                            />
                        )}
                    </AnimatePresence>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onSendClick}
                    disabled={(!chatMessage.trim() && !selectedFile) || uploadingFile || sendDisabled}
                    className={`rounded-xl p-2 max-[340px]:p-1.5 max-[300px]:rounded-lg max-[300px]:p-1 sm:p-3 transition-all flex-shrink-0 ${(chatMessage.trim() || selectedFile) && !uploadingFile
                        ? "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-sky-500/25"
                        : "bg-slate-800/40 text-slate-600 cursor-not-allowed"
                        }`}
                >
                    {uploadingFile ? <Loader2 className="h-4 w-4 max-[340px]:h-3.5 max-[340px]:w-3.5 max-[300px]:h-3 max-[300px]:w-3 sm:h-5 sm:w-5 animate-spin" /> : <Send className="h-4 w-4 max-[340px]:h-3.5 max-[340px]:w-3.5 max-[300px]:h-3 max-[300px]:w-3 sm:h-5 sm:w-5" />}
                </motion.button>
            </div>
        </div>
    );
};

const ActionButton = ({ icon: Icon, onClick, title, active, disabled }) => (
    <motion.button
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        onClick={onClick}
        disabled={disabled}
        className={`rounded-xl p-2 max-[340px]:p-1.5 max-[300px]:rounded-lg max-[300px]:p-1 sm:p-2.5 transition-colors flex-shrink-0 ${active
            ? "bg-sky-500/20 text-sky-400"
            : disabled
                ? "text-slate-600 cursor-not-allowed"
                : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-300"
            }`}
        title={title}
    >
        <Icon className="h-4 w-4 max-[340px]:h-3.5 max-[340px]:w-3.5 max-[300px]:h-3 max-[300px]:w-3 sm:h-5 sm:w-5" />
    </motion.button>
);

const EmojiPicker = ({ onSelect }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full right-0 mb-2 p-3 sm:p-4 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-800/70 shadow-2xl z-50 max-w-[calc(100vw-1rem)]"
    >
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2 w-max">
            {[
                "??", "??", "??", "??", "??", "?", "??", "??",
                "??", "??", "??", "??", "?", "??", "??", "?",
                "??", "??", "??", "??", "??", "??", "??", "??",
                "??", "??", "??", "??", "??", "?", "??", "??"
            ].map((emoji) => (
                <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelect(emoji)}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg hover:bg-slate-800/60 transition-colors text-base sm:text-lg"
                >
                    {emoji}
                </motion.button>
            ))}
        </div>
    </motion.div>
);

export default ChatInput;
