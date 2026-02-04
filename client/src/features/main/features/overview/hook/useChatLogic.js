import { useState, useEffect, useRef, useCallback } from "react";
import * as chatService from "../../../../../service/chat.service";
import * as socketService from "../../../../../service/Chat.socket.service";
import { useAuth } from "../../../../../context/AuthContext"; // Ensure path is correct

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

    // Refs
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Auth Context
    const { user } = useAuth();

    // -------------------------------------------------------------------------
    // 2. Initialize Socket Connection (COOKIE AUTH FIX)
    // -------------------------------------------------------------------------
    useEffect(() => {
        // We rely on 'user' from context. If user exists, we are logged in.
        // We do NOT check localStorage because the token is in a Cookie.
        if (user && !socketService.getSocket()) {
            console.log("[useChatLogic] User present, connecting socket via Cookies...");
            socketService.connectSocket();
        }
    }, [user]);

    // -------------------------------------------------------------------------
    // 3. Setup Socket Listeners (ID FIX)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!selectedChat) return;

        // Normalize chat ID to string immediately to avoid bugs later
        const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
        console.log("[useChatLogic] Setting up listeners for chat:", chatId);

        // Listener: Receive Message
        const unsubMsg = socketService.onReceiveMessage((payload) => {
            console.log("[useChatLogic] Received message:", payload);
            const { chatId: msgChatId, message } = payload;

            // FIX: String comparison ensures match even if one is ObjectId and other is String
            if (String(msgChatId) === chatId) {
                setMessages((prev) => {
                    const msgId = message._id || message.id;
                    // Prevent duplicates
                    if (prev.some(m => (m._id || m.id) === msgId)) {
                        return prev;
                    }
                    return [...prev, message];
                });

                // Scroll to bottom
                setTimeout(() => scrollToBottom(), 100);

                // Mark read immediately
                const lastMsgId = message._id || message.id;
                if (lastMsgId) {
                    socketService.emitMessageRead(chatId, lastMsgId);
                }
            }
        });

        // Listener: Message Read (Update ticks)
        const unsubRead = socketService.onMessageRead((payload) => {
            const { chatId: readChatId, lastReadMessageId } = payload;

            if (String(readChatId) === chatId) {
                setMessages(prev => prev.map(msg => {
                    const msgId = msg._id || msg.id;
                    if (msgId === lastReadMessageId) {
                        return { ...msg, isRead: true };
                    }
                    return msg;
                }));
            }
        });

        // Listener: Typing
        const unsubTyping = socketService.onTyping((payload) => {
            const { chatId: typingChatId } = payload;
            if (String(typingChatId) === chatId) {
                // You can add logic here to show "User is typing..." UI
                // e.g., setIsTyping(true);
            }
        });

        const unsubStopTyping = socketService.onStopTyping((payload) => {
            const { chatId: typingChatId } = payload;
            if (String(typingChatId) === chatId) {
                // e.g., setIsTyping(false);
            }
        });

        // Cleanup
        return () => {
            unsubMsg();
            unsubRead();
            unsubTyping();
            unsubStopTyping();
        };
    }, [selectedChat]);

    // -------------------------------------------------------------------------
    // 4. Fetch History
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!selectedChat) return;

        const loadMessages = async () => {
            setIsLoading(true);
            try {
                const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
                const result = await chatService.getMessages(chatId);

                // Handle various response structures
                let messageList = [];
                if (Array.isArray(result)) {
                    messageList = result;
                } else if (result.messages) {
                    messageList = result.messages;
                } else if (result.data) {
                    messageList = Array.isArray(result.data) ? result.data : result.data.messages || [];
                }

                // Sort chronologically
                setMessages(messageList.sort((a, b) =>
                    new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp)
                ));

                setTimeout(() => scrollToBottom(), 200);
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
    }, [selectedChat]);

    // -------------------------------------------------------------------------
    // 5. Handlers
    // -------------------------------------------------------------------------

    const scrollToBottom = useCallback(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, []);

    const handleSendMessage = async (options = {}) => {
        const content = chatMessage.trim();
        if (!content && !options.attachments) return;

        const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);

        // Optimistic UI Update
        const tempId = `temp-${Date.now()}`;
        const tempMessage = {
            id: tempId,
            _id: tempId,
            content,
            text: content,
            sender: {
                name: user?.name || 'You',
                avatar: user?.avatar,
                _id: user?._id || user?.id
            },
            senderId: user?._id || user?.id,
            createdAt: new Date().toISOString(),
            isOwn: true,
            status: 'sending'
        };

        setChatMessage("");
        setShowEmojiPicker(false);
        setMessages(prev => [...prev, tempMessage]);
        setTimeout(() => scrollToBottom(), 50);

        try {
            const sentMessage = await chatService.sendMessage(
                chatId,
                content,
                options.attachments || [],
                options.replyTo?._id || options.replyTo?.id
            );

            // Replace temp message with real one
            setMessages(prev => prev.map(msg =>
                msg.id === tempId ? { ...sentMessage, isOwn: true } : msg
            ));

            // Emit to socket (so others receive it)
            socketService.emitSendMessage(chatId, sentMessage);

        } catch (error) {
            console.error("Send failed", error);
            // Remove optimistic message on fail
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setChatMessage(content);
            alert("Failed to send message.");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        try {
            // Upload file logic
            const uploadedFile = await chatService.uploadFile(file, (progress) => {
                console.log("Upload progress:", progress);
            });
            // Send as attachment
            await handleSendMessage({ attachments: [uploadedFile] });
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload file.");
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
            await chatService.deleteMessage(messageId, chatId);
            setMessages(prev => prev.filter(m => (m.id || m._id) !== messageId));
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handlePinMessage = async (messageId) => {
        try {
            const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
            await chatService.togglePinMessage(messageId, chatId);
            setMessages(prev => prev.map(m =>
                (m.id || m._id) === messageId ? { ...m, pinned: !m.pinned } : m
            ));
        } catch (error) {
            console.error("Pin failed", error);
        }
    };

    const handleEditMessage = async (messageId, newContent) => {
        try {
            const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
            await chatService.editMessage(messageId, chatId, newContent);
            setMessages(prev => prev.map(m =>
                (m.id || m._id) === messageId
                    ? { ...m, content: newContent, text: newContent, edited: true }
                    : m
            ));
        } catch (error) {
            console.error("Edit failed", error);
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            const chatId = String(selectedChat.chatId || selectedChat.id || selectedChat._id);
            const currentUserId = user?._id || user?.id;

            // Check existing reaction
            const message = messages.find(m => (m.id || m._id) === messageId);
            const hasReacted = message?.reactions?.some(r =>
                r.emoji === emoji && String(r.userId) === String(currentUserId)
            );

            if (hasReacted) {
                await chatService.removeReaction(messageId, chatId, emoji);
                setMessages(prev => prev.map(m => {
                    if ((m.id || m._id) === messageId) {
                        return {
                            ...m,
                            reactions: m.reactions?.filter(r =>
                                !(r.emoji === emoji && String(r.userId) === String(currentUserId))
                            ) || []
                        };
                    }
                    return m;
                }));
            } else {
                await chatService.addReaction(messageId, chatId, emoji);
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
        handleSendMessage,
        handleFileUpload,
        handleDeleteMessage,
        handlePinMessage,
        handleEditMessage,
        handleReaction,
        handleTyping,
        refs: {
            chatEndRef,
            fileInputRef,
            messageInputRef
        }
    };
};