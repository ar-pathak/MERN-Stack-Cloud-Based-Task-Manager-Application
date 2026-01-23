import { useState, useMemo, useRef } from "react";
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
    fileInputRef,
    handleFileUpload,
    uploadingFile,
    showEmojiPicker,
    setShowEmojiPicker,
    overview
}) => {
    // Local State
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [messageFilter, setMessageFilter] = useState("all");
    const [replyingTo, setReplyingTo] = useState(null);
    const [reactions, setReactions] = useState({});

    // Derived State
    const pinnedMessages = useMemo(() => messages.filter(msg => msg.pinned), [messages]);
    const typingMembers = useMemo(() => item.members?.filter(m => m.typing), [item.members]);

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

    // Handlers
    const handleReaction = (messageId, emoji) => {
        setReactions(prev => ({
            ...prev,
            [messageId]: [...(prev[messageId] || []), emoji]
        }));
    };

    const handleSendWithContext = () => {
        if (replyingTo) {
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
                        onReact={handleReaction}
                        onReply={setReplyingTo}
                        reactions={reactions}
                        chatEndRef={chatEndRef}
                    />

                    <ChatInput
                        chatMessage={chatMessage}
                        setChatMessage={setChatMessage}
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

                <AnimatePresence>
                    {showChatInfo && (
                        <InfoSidebar item={item} overview={overview} onClose={() => setShowChatInfo(false)} />
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default ChatPanel;