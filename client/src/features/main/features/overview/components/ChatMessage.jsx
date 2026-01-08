import { motion, AnimatePresence } from "framer-motion";
import { CheckCheck, Copy, Download, Forward, Image as ImageIcon, MoreVertical, Pin, Reply, Trash2, File } from "lucide-react";

const ChatMessage = ({ message, selectedMessage, setSelectedMessage, handleDeleteMessage, handlePinMessage }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 group ${message.isOwn ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {!message.isOwn && (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {message.avatar}
                </div>
            )}

            <div className={`flex flex-col gap-1 max-w-md ${message.isOwn ? 'items-end' : 'items-start'}`}>
                {!message.isOwn && (
                    <span className="text-xs font-medium text-slate-400 px-1">{message.sender}</span>
                )}

                <div className="relative">
                    {message.pinned && (
                        <div className="absolute -top-6 left-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Pin className="h-3 w-3 text-amber-400" />
                            <span className="text-xs text-amber-400">Pinned</span>
                        </div>
                    )}

                    <div className={`relative px-4 py-2.5 rounded-2xl ${message.isOwn
                        ? 'bg-sky-500 text-white rounded-tr-sm'
                        : 'bg-slate-800/60 text-slate-200 rounded-tl-sm'
                        }`}>
                        <p className="text-sm leading-relaxed">{message.message}</p>

                        {message.attachment && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                                <div className="flex items-center gap-2">
                                    {message.attachment.type === 'image' ? (
                                        <ImageIcon className="h-4 w-4" />
                                    ) : (
                                        <File className="h-4 w-4" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{message.attachment.name}</p>
                                        <p className="text-xs opacity-70">{message.attachment.size}</p>
                                    </div>
                                    <Download className="h-4 w-4 cursor-pointer hover:scale-110 transition-transform" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message Actions Menu */}
                    <div className={`absolute top-0 ${message.isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <div className="flex gap-1 px-2">
                            <button
                                onClick={() => handlePinMessage(message.id)}
                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors"
                                title={message.pinned ? "Unpin" : "Pin message"}
                            >
                                <Pin className={`h-3.5 w-3.5 ${message.pinned ? 'text-amber-400' : 'text-slate-400'}`} />
                            </button>
                            <button
                                onClick={() => setSelectedMessage(message.id === selectedMessage ? null : message.id)}
                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors"
                                title="More actions"
                            >
                                <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Extended Actions Menu */}
                    <AnimatePresence>
                        {selectedMessage === message.id && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`absolute top-full ${message.isOwn ? 'right-0' : 'left-0'} mt-2 py-1 rounded-xl bg-slate-900/95 border border-slate-800/70 backdrop-blur-xl shadow-2xl z-10 min-w-[160px]`}
                            >
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(message.message);
                                        setSelectedMessage(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-800/60 transition-colors text-sm text-slate-300"
                                >
                                    <Copy className="h-4 w-4" />
                                    <span>Copy</span>
                                </button>
                                <button
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-800/60 transition-colors text-sm text-slate-300"
                                    onClick={() => setSelectedMessage(null)}
                                >
                                    <Reply className="h-4 w-4" />
                                    <span>Reply</span>
                                </button>
                                <button
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-800/60 transition-colors text-sm text-slate-300"
                                    onClick={() => setSelectedMessage(null)}
                                >
                                    <Forward className="h-4 w-4" />
                                    <span>Forward</span>
                                </button>
                                {message.isOwn && (
                                    <>
                                        <div className="h-px bg-slate-800/50 my-1" />
                                        <button
                                            onClick={() => handleDeleteMessage(message.id)}
                                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-500/10 transition-colors text-sm text-rose-400"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span>Delete</span>
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-1 px-1">
                    <span className="text-xs text-slate-500">{message.time}</span>
                    {message.isOwn && (
                        message.read ?
                            <CheckCheck className="h-3 w-3 text-sky-400" /> :
                            <Check className="h-3 w-3 text-slate-500" />
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default ChatMessage