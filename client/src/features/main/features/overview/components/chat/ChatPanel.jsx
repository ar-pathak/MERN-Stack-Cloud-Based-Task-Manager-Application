import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InfoSidebar from "../infoSidebar/InfoSidebar";

// Sub-components
import ChatHeader from "./ChatHeader";
import PinnedBanner from "./PinnedBanner";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

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
    handleEditMessage, // NEW: Add this prop
    handleReaction,     // NEW: Add this prop
    handleTyping,       // NEW: Add this prop
    fileInputRef,
    handleFileUpload,
    uploadingFile,
    showEmojiPicker,
    setShowEmojiPicker,
    overview,
    onUpdate
}) => {
    // Local State
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [messageFilter, setMessageFilter] = useState("all");
    const [replyingTo, setReplyingTo] = useState(null);

    // Derived State
    const pinnedMessages = useMemo(() =>
        messages.filter(msg => msg.pinned),
        [messages]
    );

    // SAFE GUARD: DMs might not have members
    const typingMembers = useMemo(() => {
        if (!item.members) return [];
        return item.members.filter(m => m.typing);
    }, [item.members]);

    const filteredMessages = useMemo(() => {
        let filtered = messages;

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(msg => {
                const content = msg.text || msg.content || '';
                return content.toLowerCase().includes(searchQuery.toLowerCase());
            });
        }

        // Apply type filter
        if (messageFilter === "files") {
            filtered = filtered.filter(msg => msg.attachments?.length > 0);
        } else if (messageFilter === "pinned") {
            filtered = filtered.filter(msg => msg.pinned);
        } else if (messageFilter === "media") {
            filtered = filtered.filter(msg =>
                msg.attachments?.some(att =>
                    att.type?.startsWith('image') ||
                    att.type?.startsWith('video')
                )
            );
        }

        return filtered;
    }, [messages, searchQuery, messageFilter]);

    // Handler for reactions - uses the new handleReaction from hook
    const handleMessageReaction = (messageId, emoji) => {
        handleReaction?.(messageId, emoji);
    };

    // Handler for sending with reply context
    const handleSendWithContext = () => {
        if (chatMessage.trim() || replyingTo) {
            handleSendMessage({
                replyTo: replyingTo
            });
            setReplyingTo(null);
        }
    };

    // Handler for message input change with typing indicator
    const handleMessageChange = (value) => {
        setChatMessage(value);

        // Trigger typing indicator
        if (value.trim() && handleTyping) {
            handleTyping();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
        >
            <AnimatePresence mode="wait">
                {showChatInfo && item.type !== 'dm' ? (
                    <motion.div
                        key="info"
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        className="w-full h-full flex overflow-hidden min-h-0"
                    >
                        <InfoSidebar
                            item={item}
                            overview={overview}
                            onClose={() => setShowChatInfo(false)}
                            onUpdate={onUpdate}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="chat"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col h-full overflow-hidden"
                    >
                        <ChatHeader
                            item={item}
                            typingMembers={typingMembers}
                            showSearch={showSearch}
                            setShowSearch={setShowSearch}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            messageFilter={messageFilter}
                            setMessageFilter={setMessageFilter}
                            showChatInfo={showChatInfo}
                            setShowChatInfo={setShowChatInfo}
                        />

                        <PinnedBanner pinnedMessages={pinnedMessages} />

                        <div className="flex-1 flex overflow-hidden min-h-0">
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <MessageList
                                    messages={filteredMessages}
                                    itemType={item.type}
                                    selectedMessage={selectedMessage}
                                    setSelectedMessage={setSelectedMessage}
                                    handleDeleteMessage={handleDeleteMessage}
                                    handlePinMessage={handlePinMessage}
                                    handleEditMessage={handleEditMessage}
                                    onReact={handleMessageReaction}
                                    onReply={setReplyingTo}
                                    chatEndRef={chatEndRef}
                                />

                                <ChatInput
                                    chatMessage={chatMessage}
                                    setChatMessage={handleMessageChange}
                                    handleSend={handleSendWithContext}
                                    fileInputRef={fileInputRef}
                                    handleFileUpload={handleFileUpload}
                                    uploadingFile={uploadingFile}
                                    replyingTo={replyingTo}
                                    setReplyingTo={setReplyingTo}
                                    showEmojiPicker={showEmojiPicker}
                                    setShowEmojiPicker={setShowEmojiPicker}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ChatPanel;