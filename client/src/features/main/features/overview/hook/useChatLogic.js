import { useState, useEffect, useRef, useCallback } from "react";
import * as chatService from "../../../../../service/chat.service";
import * as socketService from "../../../../../service/Chat.socket.service";
import { useAuth } from "../../../../../context/AuthContext";
import { uploadService } from "../../../../../service/upload.service";

export const useChatLogic = (selectedChat) => {
    // 1. Local State
    const [messages, setMessages] = useState([]);
    const [chatMessage, setChatMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    // UI State
    const [showChatInfo, setShowChatInfo] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // NEW: Typing state
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);

    // Refs
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Auth Context
    const { user } = useAuth();

    // -------------------------------------------------------------------------
    // 2. Initialize Socket Connection (COOKIE AUTH FIX)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (user && !socketService.getSocket()) {
            console.log("[useChatLogic] User present, connecting socket via Cookies...");
            socketService.connectSocket();
        }
    }, [user]);

    // -------------------------------------------------------------------------
    // 3. Setup Socket Listeners (ENHANCED)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!selectedChat) return;

        const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
        console.log("[useChatLogic] Setting up listeners for chat:", chatId);

        // Listener: Receive Message
        const unsubMsg = socketService.onReceiveMessage((payload) => {
            console.log("[useChatLogic] Received message:", payload);
            const { chatId: msgChatId, message } = payload;

            if (String(msgChatId) === chatId) {
                setMessages((prev) => {
                    const msgId = message._id || message.id;

                    // Prevent duplicates
                    if (prev.some(m => (m._id || m.id) === msgId)) {
                        return prev;
                    }

                    // Add message with proper ownership detection
                    const enhancedMessage = {
                        ...message,
                        isOwn: String(message.senderId?._id || message.senderId) === String(user?._id || user?.id)
                    };

                    return [...prev, enhancedMessage];
                });

                // Auto-scroll to bottom with delay for DOM update
                setTimeout(() => scrollToBottom(), 100);

                // Mark read immediately if it's not our message
                const lastMsgId = message._id || message.id;
                const isSentByCurrentUser = String(message.senderId?._id || message.senderId) === String(user?._id || user?.id);

                if (lastMsgId && !isSentByCurrentUser) {
                    socketService.emitMessageRead(chatId, lastMsgId);
                }
            }
        });

        // Listener: Message Read (Update read status)
        const unsubRead = socketService.onMessageRead((payload) => {
            const { chatId: readChatId, lastReadMessageId, userId } = payload;

            if (String(readChatId) === chatId) {
                setMessages(prev => prev.map(msg => {
                    const msgId = msg._id || msg.id;

                    // Mark message as read and add to readBy array
                    if (msgId === lastReadMessageId ||
                        (msg.createdAt && new Date(msg.createdAt) <= new Date())) {
                        const readBy = msg.readBy || [];
                        const alreadyRead = readBy.some(r => String(r.userId || r) === String(userId));

                        if (!alreadyRead) {
                            return {
                                ...msg,
                                isRead: true,
                                readBy: [...readBy, { userId, readAt: new Date() }]
                            };
                        }
                    }
                    return msg;
                }));
            }
        });

        // Listener: Typing Indicator
        const unsubTyping = socketService.onTyping((payload) => {
            const { chatId: typingChatId, userId, userName } = payload;

            if (String(typingChatId) === chatId && String(userId) !== String(user?._id || user?.id)) {
                setTypingUsers(prev => {
                    const users = prev || []; // Safety check
                    if (users.some(u => String(u.userId) === String(userId))) {
                        return users;
                    }
                    return [...users, { userId, userName }];
                });
                setIsTyping(true);
            }
        });

        // Listener: Stop Typing 
        const unsubStopTyping = socketService.onStopTyping((payload) => {
            const { chatId: typingChatId, userId } = payload;

            if (String(typingChatId) === chatId) {
                setTypingUsers(prev => {
                    // 1. Calculate the new list using the array state
                    const remaining = (prev || []).filter(u => String(u.userId) !== String(userId));

                    // 2. Update the boolean state based on the NEW list length
                    setIsTyping(remaining.length > 0);

                    // 3. Return the new list to update typingUsers state
                    return remaining;
                });
            }
        });
        // Listener: Message Deleted
        const unsubDelete = socketService.onMessageDeleted?.((payload) => {
            const { chatId: delChatId, messageId } = payload;

            if (String(delChatId) === chatId) {
                setMessages(prev => prev.filter(m => String(m._id || m.id) !== String(messageId)));
            }
        });

        // Listener: Message Edited
        const unsubEdit = socketService.onMessageEdited?.((payload) => {
            const { chatId: editChatId, messageId, content } = payload;

            if (String(editChatId) === chatId) {
                setMessages(prev => prev.map(m =>
                    String(m._id || m.id) === String(messageId)
                        ? { ...m, content, text: content, edited: true }
                        : m
                ));
            }
        });

        // Listener: Reaction Added/Removed
        const unsubReaction = socketService.onReactionUpdated?.((payload) => {
            const { chatId: reactionChatId, messageId, reactions } = payload;

            if (String(reactionChatId) === chatId) {
                setMessages(prev => prev.map(m =>
                    String(m._id || m.id) === String(messageId)
                        ? { ...m, reactions }
                        : m
                ));
            }
        });

        // Cleanup
        return () => {
            unsubMsg();
            unsubRead();
            unsubTyping();
            unsubStopTyping();
            if (unsubDelete) unsubDelete();
            if (unsubEdit) unsubEdit();
            if (unsubReaction) unsubReaction();
        };
    }, [selectedChat, user]);

    // -------------------------------------------------------------------------
    // 4. Fetch History (ENHANCED)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!selectedChat) return;

        const loadMessages = async () => {
            setIsLoading(true);
            try {
                const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
                const result = await chatService.getMessages(chatId, { page: 1, limit: 50 });

                let messageList = [];
                if (Array.isArray(result)) {
                    messageList = result;
                } else if (result.messages) {
                    messageList = result.messages;
                } else if (result.data) {
                    messageList = Array.isArray(result.data) ? result.data : result.data.messages || [];
                }

                // Enhance messages with ownership detection
                const enhancedMessages = messageList.map(msg => ({
                    ...msg,
                    isOwn: String(msg.senderId?._id || msg.senderId) === String(user?._id || user?.id)
                }));

                // Sort chronologically
                const sortedMessages = enhancedMessages.sort((a, b) =>
                    new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp)
                );

                setMessages(sortedMessages);

                // Scroll to bottom after messages load
                setTimeout(() => scrollToBottom(), 300);

                // Mark last message as read if it exists and isn't ours
                if (sortedMessages.length > 0) {
                    const lastMessage = sortedMessages[sortedMessages.length - 1];
                    const isOurs = String(lastMessage.senderId?._id || lastMessage.senderId) === String(user?._id || user?.id);

                    if (!isOurs) {
                        const lastMsgId = lastMessage._id || lastMessage.id;
                        if (lastMsgId) {
                            socketService.emitMessageRead(chatId, lastMsgId);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load messages", error);
                setMessages([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages();
        setChatMessage("");
        setShowChatInfo(false);
        setSelectedMessage(null);
        setTypingUsers([]);
        setIsTyping(false);
    }, [selectedChat, user]);

    // -------------------------------------------------------------------------
    // 5. Handlers (ENHANCED)
    // -------------------------------------------------------------------------

    const scrollToBottom = useCallback((behavior = "smooth") => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior, block: "end" });
        }
    }, []);

    const handleSendMessage = async (options = {}) => {
        // 1. Capture values immediately
        const content = chatMessage.trim();
        const fileToSend = options.file; // <--- Raw File from ChatPanel

        // Validation: Text OR File OR Attachments must exist
        if (!content && !fileToSend && (!options.attachments || options.attachments.length === 0)) return;

        const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
        const tempId = `temp-${Date.now()}`;

        // 2. Prepare Optimistic Attachments (Preview)
        let optimisticAttachments = options.attachments || [];
        if (fileToSend) {
            // Create a local preview URL so image shows immediately
            optimisticAttachments = [...optimisticAttachments, {
                url: URL.createObjectURL(fileToSend),
                type: fileToSend.type,
                name: fileToSend.name,
                size: fileToSend.size
            }];
        }

        // 3. Create Temp Message for UI
        const tempMessage = {
            id: tempId,
            _id: tempId,
            content: content,
            text: content,
            sender: {
                name: user?.name || 'You',
                avatar: user?.avatar,
                _id: user?._id || user?.id
            },
            senderId: {
                name: user?.name || 'You',
                avatar: user?.avatar,
                _id: user?._id || user?.id
            },
            createdAt: new Date().toISOString(),
            isOwn: true,
            status: 'sending',
            replyTo: options.replyTo,
            attachments: optimisticAttachments // Show preview
        };

        // 4. Update UI immediately
        setChatMessage(""); // Clear input
        setShowEmojiPicker(false);
        setMessages(prev => [...prev, tempMessage]);

        setTimeout(() => scrollToBottom("auto"), 50);
        socketService.emitStopTyping(chatId);

        try {
            let finalAttachments = options.attachments || [];

            // 5. Upload File (The Missing Logic)
            if (fileToSend) {
                setUploadingFile(true);
                // Upload file to backend
                const uploadedData = await uploadService.uploadFile(fileToSend);
                finalAttachments.push(uploadedData);
            }

            // 6. Send Message to API
            const sentMessage = await chatService.sendMessage(
                chatId,
                content,
                finalAttachments,
                options.replyTo?._id || options.replyTo?.id
            );

            // 7. Success: Replace Temp Message with Real Message
            setMessages(prev => prev.map(msg =>
                msg.id === tempId ? {
                    ...sentMessage,
                    isOwn: true,
                    senderId: sentMessage.senderId || tempMessage.senderId
                } : msg
            ));

            // Emit socket event
            socketService.emitSendMessage(chatId, sentMessage);

        } catch (error) {
            console.error("Send failed", error);
            // Mark as failed in UI
            setMessages(prev => prev.map(msg =>
                msg.id === tempId ? { ...msg, status: 'failed' } : msg
            ));
            alert("Failed to send message: " + (error.message || "Unknown error"));
        } finally {
            setUploadingFile(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        try {
            const uploadedFile = await uploadService.uploadFile(file);

            await handleSendMessage({ attachments: [uploadedFile] });
        } catch (error) {
            alert("File upload failed: " + error.message);
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
        }
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
            await chatService.deleteMessage(messageId, chatId);

            // Optimistic update
            setMessages(prev => prev.filter(m => (m.id || m._id) !== messageId));

            // Emit socket event
            socketService.emitMessageDeleted?.(chatId, messageId);
        } catch (error) {
            console.error("Delete failed", error);
            // Reload messages on error
            alert("Failed to delete message.");
        }
    };

    const handlePinMessage = async (messageId) => {
        try {
            const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
            await chatService.togglePinMessage(messageId, chatId);

            // Optimistic update
            setMessages(prev => prev.map(m =>
                (m.id || m._id) === messageId ? { ...m, pinned: !m.pinned } : m
            ));
        } catch (error) {
            console.error("Pin failed", error);
            alert("Failed to pin message.");
        }
    };

    const handleEditMessage = async (messageId, newContent) => {
        try {
            const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
            await chatService.editMessage(messageId, chatId, newContent);

            // Optimistic update
            setMessages(prev => prev.map(m =>
                (m.id || m._id) === messageId
                    ? { ...m, content: newContent, text: newContent, edited: true }
                    : m
            ));

            // Emit socket event
            socketService.emitMessageEdited?.(chatId, messageId, newContent);
        } catch (error) {
            console.error("Edit failed", error);
            alert("Failed to edit message.");
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
            const currentUserId = user?._id || user?.id;

            // Check existing reaction
            const message = messages.find(m => (m.id || m._id) === messageId);
            const hasReacted = message?.reactions?.some(r =>
                r.emoji === emoji && String(r.userId?._id || r.userId) === String(currentUserId)
            );

            if (hasReacted) {
                await chatService.removeReaction(messageId, chatId, emoji);

                // Optimistic update
                setMessages(prev => prev.map(m => {
                    if ((m.id || m._id) === messageId) {
                        return {
                            ...m,
                            reactions: m.reactions?.filter(r =>
                                !(r.emoji === emoji && String(r.userId?._id || r.userId) === String(currentUserId))
                            ) || []
                        };
                    }
                    return m;
                }));
            } else {
                await chatService.addReaction(messageId, chatId, emoji);

                // Optimistic update
                setMessages(prev => prev.map(m => {
                    if ((m.id || m._id) === messageId) {
                        return {
                            ...m,
                            reactions: [...(m.reactions || []), { emoji, userId: currentUserId }]
                        };
                    }
                    return m;
                }));
            }
        } catch (error) {
            console.error("Reaction failed", error);
            alert("Failed to add reaction.");
        }
    };

    const handleTyping = useCallback(() => {
        const chatId = selectedChat?.chatId || selectedChat?.id || selectedChat?._id;
        if (!chatId) return;

        socketService.emitTyping(chatId);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socketService.emitStopTyping(chatId);
        }, 2000);
    }, [selectedChat]);

    // Cleanup typing timeout
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, []);

    return {
        messages,
        chatMessage,
        isLoading,
        uploadingFile,
        setChatMessage,
        showChatInfo,
        setShowChatInfo,
        selectedMessage,
        setSelectedMessage,
        showEmojiPicker,
        setShowEmojiPicker,
        isTyping,
        typingUsers,
        handleSendMessage,
        handleFileUpload,
        handleDeleteMessage,
        handlePinMessage,
        handleEditMessage,
        handleReaction,
        handleTyping,
        scrollToBottom,
        refs: {
            chatEndRef,
            fileInputRef,
            messageInputRef,
            messagesContainerRef
        }
    };
};
