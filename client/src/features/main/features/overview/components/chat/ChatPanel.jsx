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
    messages = [],
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
    handleEditMessage,
    handleReaction,
    handleTyping,
    isTyping,
    typingUsers,
    fileInputRef,
    handleFileUpload,
    uploadingFile,
    showEmojiPicker,
    setShowEmojiPicker,
    overview,
    onUpdate,
}) => {
    // Local State
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [messageFilter, setMessageFilter] = useState("all");
    const [replyingTo, setReplyingTo] = useState(null);

    // Derived State
    const pinnedMessages = useMemo(
        () => messages.filter((msg) => msg?.pinned),
        [messages]
    );

    const typingMembers = useMemo(() => {
        if (!typingUsers || typingUsers.length === 0) return [];
        return typingUsers.map((u) => ({
            name: u.userName || u.name || "Someone",
            typing: true,
        }));
    }, [typingUsers]);

    const filteredMessages = useMemo(() => {
        let filtered = messages;

        if (searchQuery) {
            filtered = filtered.filter((msg) => {
                const content = msg?.text || msg?.content || "";
                return content.toLowerCase().includes(searchQuery.toLowerCase());
            });
        }

        if (messageFilter === "files") {
            filtered = filtered.filter((msg) => msg?.attachments?.length > 0);
        } else if (messageFilter === "pinned") {
            filtered = filtered.filter((msg) => msg?.pinned);
        } else if (messageFilter === "media") {
            filtered = filtered.filter((msg) =>
                msg?.attachments?.some(
                    (att) =>
                        att?.type?.startsWith("image") ||
                        att?.type?.startsWith("video")
                )
            );
        }

        return filtered;
    }, [messages, searchQuery, messageFilter]);

    const handleMessageReaction = (messageId, emoji) => {
        handleReaction?.(messageId, emoji);
    };

    const handleSendWithContext = () => {
        if (chatMessage?.trim() || replyingTo) {
            handleSendMessage({ replyTo: replyingTo });
            setReplyingTo(null);
        }
    };

    const handleMessageChange = (value) => {
        setChatMessage(value);
        if (value?.trim() && handleTyping) {
            handleTyping();
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
                {showChatInfo && item?.type !== "dm" ? (
                    <motion.div
                        key="info"
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="w-full h-full min-h-0 overflow-y-auto"
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
                        transition={{ duration: 0.2 }}
                        className="flex-1 flex flex-col h-full min-h-0 overflow-hidden"
                    >
                        {/* HEADER */}
                        <div className="flex-shrink-0">
                            <ChatHeader
                                item={item}
                                typingMembers={typingMembers}
                                isTyping={isTyping}
                                showSearch={showSearch}
                                setShowSearch={setShowSearch}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                messageFilter={messageFilter}
                                setMessageFilter={setMessageFilter}
                                showChatInfo={showChatInfo}
                                setShowChatInfo={setShowChatInfo}
                            />

                            <PinnedBanner
                                pinnedMessages={pinnedMessages}
                                onViewPinned={() => setMessageFilter("pinned")}
                            />
                        </div>

                        {/* MESSAGES */}
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            <MessageList
                                messages={filteredMessages}
                                itemType={item?.type}
                                selectedMessage={selectedMessage}
                                setSelectedMessage={setSelectedMessage}
                                handleDeleteMessage={handleDeleteMessage}
                                handlePinMessage={handlePinMessage}
                                handleEditMessage={handleEditMessage}
                                onReact={handleMessageReaction}
                                onReply={setReplyingTo}
                                chatEndRef={chatEndRef}
                            />
                        </div>

                        {/* INPUT */}
                        <div className="flex-shrink-0">
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
                                isTyping={isTyping}
                                typingUsers={typingUsers}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatPanel;
