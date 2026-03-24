import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import InfoSidebar from "../infoSidebar/InfoSidebar";
import ChatHeader from "./ChatHeader";
import PinnedBanner from "./PinnedBanner";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import useWebRTC from "../../hook/useWebRTC";
import CallInterface from "./CallInterface";
import { useAuth } from "../../../../../../context/AuthContext";
import { leaveWorkspace } from "../../../../../../service/workspace.service";
import { leaveProject } from "../../../../../../service/project.service";
import { leaveTask } from "../../../../../../service/task.service";
import { leaveSubtask } from "../../../../../../service/subtask.service";
import {
    addMembersToGroup,
    leaveGroup,
    toggleChatArchive,
    toggleChatMute,
} from "../../../../../../service/chat.service";

const INFO_SIDEBAR_TYPES = new Set(["workspace", "project", "task", "subtask"]);
const toIdString = (value) => String(value?._id || value?.id || value || "");

const ChatPanel = ({
    item,
    messages = [],
    isLoadingMessages = false,
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
    messageInputRef,
    messagesContainerRef,
    uploadingFile,
    showEmojiPicker,
    setShowEmojiPicker,
    overview,
    onUpdate,
    onRefreshChatMeta,
    onLeaveSuccess,
    presenceByUserId = {},
    jumpToMessageId,
    onMentionJumpHandled,
    onMobileBack,
    chatAccessError = "",
    sendPermissionError = "",
    canSendMessages = true,
}) => {
    const { user } = useAuth();

    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [messageFilter, setMessageFilter] = useState("all");
    const [replyingTo, setReplyingTo] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [chatInfoTab, setChatInfoTab] = useState("overview");
    const [localJumpMessageId, setLocalJumpMessageId] = useState(null);

    const chatId = item?.chatId || item?.id || item?._id;
    const normalizedChatType = String(item?.chatType || "").toLowerCase();
    const isGroupChat = normalizedChatType === "group";
    const canShowInfoSidebar = INFO_SIDEBAR_TYPES.has(item?.type);
    const mentionEnabled = INFO_SIDEBAR_TYPES.has(item?.type);

    useEffect(() => {
        setChatInfoTab("overview");
        setLocalJumpMessageId(null);
    }, [item?.id, item?._id, item?.chatId]);

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
        callError,
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

    const isHost = useMemo(() => {
        if (!currentCall || !user) return false;
        return String(currentCall.callerId?._id || currentCall.callerId) === String(user._id || user.id);
    }, [currentCall, user]);

    const handleStartVideoCall = () => startCall("video");
    const handleStartAudioCall = () => startCall("audio");

    const pinnedMessages = useMemo(() => messages.filter((msg) => msg?.pinned), [messages]);
    const typingMembers = useMemo(() => {
        if (!typingUsers?.length) return [];
        return typingUsers.map((typingUser) => ({
            name: typingUser.userName || typingUser.name || "Someone",
            typing: true,
        }));
    }, [typingUsers]);

    const viewerRoleBlocked = String(item?.permissions?.role || "").toLowerCase() === "viewer";
    const sendBlockedReason =
        chatAccessError ||
        sendPermissionError ||
        (viewerRoleBlocked ? "You do not have permission to send messages." : "");
    const sendDisabled = Boolean(sendBlockedReason) || !canSendMessages;

    const restoreComposerFocus = useCallback((moveCaretToEnd = true) => {
        const input = messageInputRef?.current;
        if (!input) return;

        const focusInput = () => {
            try {
                input.focus({ preventScroll: true });
            } catch {
                input.focus();
            }

            if (!moveCaretToEnd) {
                return;
            }

            const nextPosition = String(input.value || "").length;
            try {
                input.setSelectionRange(nextPosition, nextPosition);
            } catch {
                // Mobile browsers can reject selection updates during layout.
            }
        };

        requestAnimationFrame(focusInput);
        setTimeout(focusInput, 80);
    }, [messageInputRef]);

    const filteredMessages = useMemo(() => {
        let filtered = messages;
        if (searchQuery) {
            filtered = filtered.filter((msg) =>
                (msg?.text || msg?.content || "").toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (messageFilter === "files") filtered = filtered.filter((msg) => msg?.attachments?.length > 0);
        if (messageFilter === "pinned") filtered = filtered.filter((msg) => msg?.pinned);
        return filtered;
    }, [messages, searchQuery, messageFilter]);

    const handleBannerJumpToMessage = (messageId) => {
        if (!messageId) return;
        setMessageFilter("all");
        setLocalJumpMessageId(String(messageId));
    };

    const handleJumpHandled = (handledMessageId) => {
        const normalizedHandledId = String(handledMessageId || "");
        if (!normalizedHandledId) return;

        if (String(localJumpMessageId || "") === normalizedHandledId) {
            setLocalJumpMessageId(null);
        }

        if (String(jumpToMessageId || "") === normalizedHandledId) {
            onMentionJumpHandled?.(normalizedHandledId);
        }
    };

    const handleSendWithContext = (fileFromInput) => {
        if (sendDisabled) return;
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

    const handleReplySelection = useCallback((message) => {
        setReplyingTo(message);
        setShowEmojiPicker?.(false);
        restoreComposerFocus(true);
    }, [restoreComposerFocus, setShowEmojiPicker]);

    const handleMobileBackPress = () => {
        if (messageInputRef?.current && typeof messageInputRef.current.blur === "function") {
            messageInputRef.current.blur();
        }

        setShowEmojiPicker?.(false);
        onMobileBack?.();
    };

    const handleToggleMute = async () => {
        if (!chatId) return;
        try {
            const result = await toggleChatMute(chatId);
            toast.success(result?.muted ? "Chat muted" : "Chat unmuted");
            await onRefreshChatMeta?.();
        } catch (error) {
            toast.error(error?.message || "Failed to update mute setting");
        }
    };

    const handleToggleArchive = async () => {
        if (!chatId) return;
        try {
            const result = await toggleChatArchive(chatId);
            toast.success(result?.archived ? "Chat archived" : "Chat unarchived");
            await onRefreshChatMeta?.();
            await onUpdate?.();
        } catch (error) {
            toast.error(error?.message || "Failed to update archive setting");
        }
    };

    const handleAddMembers = async () => {
        if (!chatId) return;

        if (canShowInfoSidebar) {
            setChatInfoTab("members");
            setShowChatInfo(true);
            return;
        }

        if (!isGroupChat) {
            toast.error("Members can only be added in group chats");
            return;
        }

        const input = window.prompt("Enter member user IDs (comma separated)");
        if (!input) return;

        const memberIds = input
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);

        if (!memberIds.length) {
            toast.error("Please provide at least one valid member ID");
            return;
        }

        try {
            await addMembersToGroup(chatId, memberIds);
            toast.success("Members added successfully");
            await onRefreshChatMeta?.();
        } catch (error) {
            toast.error(error?.message || "Failed to add members");
        }
    };

    const handleLeave = async () => {
        if (!item) return;
        if (!window.confirm("Are you sure you want to leave this conversation?")) return;

        try {
            if (item?.type === "workspace") {
                await leaveWorkspace(item?.id || item?._id);
            } else if (item?.type === "project") {
                const workspaceId = toIdString(item?.workspace?._id || item?.workspace);
                await leaveProject(workspaceId, item?.id || item?._id);
            } else if (item?.type === "task") {
                await leaveTask(item?.id || item?._id);
            } else if (item?.type === "subtask") {
                await leaveSubtask(item?.id || item?._id);
            } else if (isGroupChat) {
                await leaveGroup(chatId);
            } else {
                toast.error("Cannot leave this conversation");
                return;
            }

            toast.success("You left the conversation");
            await onRefreshChatMeta?.();
            if (onLeaveSuccess) {
                await onLeaveSuccess();
            } else {
                await onUpdate?.();
            }
        } catch (error) {
            toast.error(error?.message || "Failed to leave conversation");
        }
    };

    const handleRequestInfo = () => {
        if (!canShowInfoSidebar) return;
        setChatInfoTab("overview");
        setShowChatInfo(true);
    };

    return (
        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <AnimatePresence mode="wait">
                {showChatInfo && canShowInfoSidebar ? (
                    <div className="h-full min-h-0 w-full overflow-y-auto custom-scrollbar scroll-smooth">
                        <InfoSidebar
                            item={item}
                            overview={overview}
                            initialTab={chatInfoTab}
                            presenceByUserId={presenceByUserId}
                            onClose={() => setShowChatInfo(false)}
                            onUpdate={onUpdate}
                        />
                    </div>
                ) : (
                    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="z-20 flex-shrink-0">
                            <ChatHeader
                                item={item}
                                typingMembers={typingMembers}
                                showSearch={showSearch}
                                setShowSearch={setShowSearch}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                messageFilter={messageFilter}
                                setMessageFilter={setMessageFilter}
                                onStartVideoCall={handleStartVideoCall}
                                onStartAudioCall={handleStartAudioCall}
                                onToggleMute={handleToggleMute}
                                onToggleArchive={handleToggleArchive}
                                onAddMembers={handleAddMembers}
                                onLeave={handleLeave}
                                onRequestInfo={handleRequestInfo}
                                onBack={handleMobileBackPress}
                            />
                        </div>

                        <div className="z-30 flex-shrink-0">
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

                        {callError ? (
                            <div className="z-30 mx-3 mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 sm:mx-4 md:mx-6">
                                {callError}
                            </div>
                        ) : null}

                        <div className="z-10 flex-shrink-0">
                            <PinnedBanner
                                pinnedMessages={pinnedMessages}
                                onViewPinned={() => setMessageFilter("pinned")}
                                onJumpToMessage={handleBannerJumpToMessage}
                                onTogglePin={handlePinMessage}
                                maxPinnedMessages={5}
                            />
                        </div>

                        <div className="relative z-0 flex-1 min-h-0 overflow-hidden">
                            {isLoadingMessages ? (
                                <ChatMessagesSkeleton />
                            ) : (
                                <MessageList
                                    messages={filteredMessages}
                                    itemType={item?.type}
                                    selectedMessage={selectedMessage}
                                    setSelectedMessage={setSelectedMessage}
                                    handleDeleteMessage={handleDeleteMessage}
                                    handlePinMessage={handlePinMessage}
                                    handleEditMessage={handleEditMessage}
                                    onReact={(messageId, emoji) => handleReaction?.(messageId, emoji)}
                                    onReply={handleReplySelection}
                                    chatEndRef={chatEndRef}
                                    messagesContainerRef={messagesContainerRef}
                                    jumpToMessageId={localJumpMessageId || jumpToMessageId}
                                    onJumpHandled={handleJumpHandled}
                                />
                            )}
                        </div>

                        <div className="z-20 flex-shrink-0">
                            {sendBlockedReason ? (
                                <div className="mx-3 mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 sm:mx-4 md:mx-6">
                                    {sendBlockedReason}
                                </div>
                            ) : null}
                            <ChatInput
                                chatMessage={chatMessage}
                                setChatMessage={handleMessageChange}
                                handleSend={handleSendWithContext}
                                messageInputRef={messageInputRef}
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
                                sendDisabled={sendDisabled}
                                sendDisabledReason={sendBlockedReason}
                                isMobile={Boolean(onMobileBack)}
                                mentionEnabled={mentionEnabled}
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ChatMessagesSkeleton = () => (
    <div className="h-full bg-slate-950 px-3 py-4 sm:px-4 md:px-8">
        <div className="space-y-4">
            {Array.from({ length: 7 }).map((_, idx) => (
                <div
                    key={`chat-skeleton-${idx}`}
                    className={`flex ${idx % 3 === 0 ? "justify-end" : "justify-start"}`}
                >
                    <div className={`max-w-[82%] space-y-2 ${idx % 3 === 0 ? "items-end" : "items-start"}`}>
                        <div
                            className={`h-3 rounded bg-slate-800/80 ${
                                idx % 3 === 0 ? "ml-auto w-20" : "w-24"
                            } animate-pulse`}
                        />
                        <div
                            className={`h-10 rounded-2xl bg-slate-800/60 animate-pulse ${
                                idx % 3 === 0 ? "w-44 sm:w-56" : "w-52 sm:w-64"
                            }`}
                        />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default ChatPanel;
