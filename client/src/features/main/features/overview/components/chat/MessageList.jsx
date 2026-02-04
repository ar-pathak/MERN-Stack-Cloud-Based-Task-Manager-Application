import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import ChatMessage from "./ChatMessage";

const MessageList = ({
    messages,
    itemType,
    selectedMessage,
    setSelectedMessage,
    handleDeleteMessage,
    handlePinMessage,
    handleEditMessage, // NEW: Add this prop
    onReact,
    onReply,
    chatEndRef
}) => {

    if (messages.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                <div className="text-center max-w-sm">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-800/50 flex items-center justify-center mx-auto mb-4"
                    >
                        <MessageSquare className="h-10 w-10 text-slate-600" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">Start the conversation</h3>
                    <p className="text-sm text-slate-500">
                        Send a message to collaborate with your team on this {itemType}
                    </p>
                </div>
            </div>
        );
    }

    // Group messages by date
    const groupMessagesByDate = (messages) => {
        const groups = {};

        messages.forEach(msg => {
            const date = new Date(msg.createdAt || msg.timestamp);
            const dateKey = date.toDateString();

            if (!groups[dateKey]) {
                groups[dateKey] = {
                    date: dateKey,
                    messages: []
                };
            }

            groups[dateKey].messages.push(msg);
        });

        return Object.values(groups);
    };

    const messageGroups = groupMessagesByDate(messages);

    const getDateLabel = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messageGroups.map((group, groupIdx) => (
                <div key={group.date}>
                    {/* Date Separator */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-800/50 to-transparent" />
                        <span className="text-xs text-slate-500 font-medium px-3 py-1 bg-slate-900/60 rounded-full border border-slate-800/50">
                            {getDateLabel(group.date)}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-800/50 to-transparent" />
                    </div>

                    {/* Messages for this date */}
                    {group.messages.map((msg) => (
                        <ChatMessage
                            key={msg.id || msg._id}
                            message={msg}
                            selectedMessage={selectedMessage}
                            setSelectedMessage={setSelectedMessage}
                            handleDeleteMessage={handleDeleteMessage}
                            handlePinMessage={handlePinMessage}
                            handleEditMessage={handleEditMessage}
                            onReact={onReact}
                            onReply={onReply}
                            reactions={msg.reactions}
                        />
                    ))}
                </div>
            ))}

            <div ref={chatEndRef} />
        </div>
    );
};

export default MessageList;