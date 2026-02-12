import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import InfoSidebar from "../infoSidebar/InfoSidebar";

import ChatHeader from "./ChatHeader";
import PinnedBanner from "./PinnedBanner";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import useWebRTC from "../../hook/useWebRTC";
// import VideoCallModal from "./VideoCallModal"; // <-- Removed (Replaced by CallInterface)
// import IncomingCallModal from "./IncomingCallModal"; // <-- Removed (Optional, keeping code clean)
import CallInterface from "./CallInterface"; // <-- Added
import { useAuth } from "../../../../../../context/AuthContext";

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
    uploadingFile,
    showEmojiPicker,
    setShowEmojiPicker,
    overview,
    onUpdate,
    jumpToMessageId,
    onMentionJumpHandled,
}) => {
    const { user } = useAuth();

    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [messageFilter, setMessageFilter] = useState("all");
    const [replyingTo, setReplyingTo] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    // ── WebRTC ────────────────────────────────────────────────────────────
    const chatId = item?.chatId || item?.id || item?._id;

    const {
        localStream,
        remoteStreams,
        currentCall,
        callStatus,
        participants,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        connectionQuality,
        activeSpeakerId,
        invitingUserIds,
        startCall,
        joinCall,
        leaveCall,
        endCall,
        inviteToCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
    } = useWebRTC(chatId);

    // Check if I am the host
    const isHost = useMemo(() => {
        if (!currentCall || !user) return false;
        return String(currentCall.callerId?._id || currentCall.callerId) === String(user._id || user.id);
    }, [currentCall, user]);

    // ── Call Handlers ─────────────────────────────────────────────────────
    const handleStartVideoCall = () => startCall('video');
    const handleStartAudioCall = () => startCall('audio');

    // ── Message filtering (Existing logic) ────────────────────────────────
    const pinnedMessages = useMemo(() => messages.filter(msg => msg?.pinned), [messages]);
    const typingMembers = useMemo(() => {
        if (!typingUsers?.length) return [];
        return typingUsers.map(u => ({ name: u.userName || u.name || "Someone", typing: true }));
    }, [typingUsers]);

    const filteredMessages = useMemo(() => {
        let f = messages;
        if (searchQuery) f = f.filter(m => (m?.text || m?.content || "").toLowerCase().includes(searchQuery.toLowerCase()));
        if (messageFilter === "files") f = f.filter(m => m?.attachments?.length > 0);
        if (messageFilter === "pinned") f = f.filter(m => m?.pinned);
        return f;
    }, [messages, searchQuery, messageFilter]);

    // ── Message Send (Existing logic) ─────────────────────────────────────
    const handleSendWithContext = (fileFromInput) => {
        const fileToSend = fileFromInput || selectedFile;
        if (chatMessage?.trim() || fileToSend || replyingTo) {
            handleSendMessage({ replyTo: replyingTo, file: fileToSend });
            setReplyingTo(null);
            setSelectedFile(null);
        }
    };

    const handleMessageChange = (value) => {
        setChatMessage(value);
        if (value?.trim() && handleTyping) handleTyping();
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
            <AnimatePresence mode="wait">
                {showChatInfo && item?.type !== "dm" ? (
                    <div className="w-full h-full min-h-0 overflow-y-auto">
                        <InfoSidebar
                            item={item}
                            overview={overview}
                            onClose={() => setShowChatInfo(false)}
                            onUpdate={onUpdate}
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
                        {/* 1. Header */}
                        <div className="flex-shrink-0 z-20">
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
                                onStartVideoCall={handleStartVideoCall}
                                onStartAudioCall={handleStartAudioCall}
                            />
                        </div>

                        {/* 2. CALL INTERFACE (The Telegram Style Bar) - ADDED HERE */}
                        <div className="flex-shrink-0 z-30">
                             <AnimatePresence>
                                {currentCall && (
                                    <CallInterface
                                        activeUserId={user?._id}
                                        currentCall={currentCall}
                                        callStatus={callStatus}
                                        isHost={isHost}
                                        localStream={localStream}
                                        remoteStreams={remoteStreams}
                                        participants={participants}
                                        isAudioEnabled={isAudioEnabled}
                                        isVideoEnabled={isVideoEnabled}
                                        isScreenSharing={isScreenSharing}
                                        connectionQuality={connectionQuality}
                                        activeSpeakerId={activeSpeakerId}
                                        onToggleAudio={toggleAudio}
                                        onToggleVideo={toggleVideo}
                                        onToggleScreenShare={toggleScreenShare}
                                        onLeaveCall={leaveCall}
                                        onEndCall={endCall}
                                        onJoinCall={joinCall}
                                        onInviteParticipant={inviteToCall}
                                        invitingUserIds={invitingUserIds}
                                    />
                                )}
                             </AnimatePresence>
                        </div>

                        {/* 3. Pinned Banner */}
                        <div className="flex-shrink-0 z-10">
                            <PinnedBanner
                                pinnedMessages={pinnedMessages}
                                onViewPinned={() => setMessageFilter("pinned")}
                            />
                        </div>

                        {/* 4. Messages Area */}
                        <div className="flex-1 min-h-0 overflow-y-auto relative z-0">
                            <MessageList
                                messages={filteredMessages}
                                itemType={item?.type}
                                selectedMessage={selectedMessage}
                                setSelectedMessage={setSelectedMessage}
                                handleDeleteMessage={handleDeleteMessage}
                                handlePinMessage={handlePinMessage}
                                handleEditMessage={handleEditMessage}
                                onReact={(messageId, emoji) => handleReaction?.(messageId, emoji)}
                                onReply={setReplyingTo}
                                chatEndRef={chatEndRef}
                                jumpToMessageId={jumpToMessageId}
                                onJumpHandled={onMentionJumpHandled}
                            />
                        </div>

                        {/* 5. Input Area */}
                        <div className="flex-shrink-0 z-20">
                            <ChatInput
                                chatMessage={chatMessage}
                                setChatMessage={handleMessageChange}
                                handleSend={handleSendWithContext}
                                fileInputRef={fileInputRef}
                                uploadingFile={uploadingFile}
                                replyingTo={replyingTo}
                                setReplyingTo={setReplyingTo}
                                showEmojiPicker={showEmojiPicker}
                                setShowEmojiPicker={setShowEmojiPicker}
                                chatId={chatId}
                                isTyping={isTyping}
                                typingUsers={typingUsers}
                                selectedFile={selectedFile}
                                setSelectedFile={setSelectedFile}
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatPanel;
