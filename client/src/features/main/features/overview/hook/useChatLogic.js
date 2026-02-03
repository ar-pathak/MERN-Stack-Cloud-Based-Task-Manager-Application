import { useState, useEffect, useRef, useCallback } from "react";
import * as chatService from "../../../../../service/chat.service"; // Adjust path to your chat.service.js
import * as socketService from "../../../../../service/Chat.socket.service"; // Adjust path to your Chat.socket.service.js
import { useSelector } from "react-redux";

export const useChatLogic = (selectedChat) => {

    console.log("useChatLogic: selectedChat changed", selectedChat);

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

    // Redux (Get current user for socket auth/logic)
    const { user } = useSelector((state) => state.auth || {});

    // 2. Initialize Socket & Listeners
    useEffect(() => {
        const token = localStorage.getItem("token"); // Or however you store tokens
        if (token) {
            socketService.connectSocket(token);
        }

        // Listener: Receive Message
        const unsubMsg = socketService.onReceiveMessage(({ chatId, message }) => {
            if (selectedChat && (chatId === selectedChat.chatId || chatId === selectedChat.id || chatId === selectedChat._id)) {
                setMessages((prev) => {
                    // Prevent duplicates
                    if (prev.some(m => m._id === message._id || m.id === message._id)) return prev;
                    return [...prev, message];
                });
                scrollToBottom();

                // Mark read immediately if we are viewing this chat
                socketService.emitMessageRead(chatId, message._id || message.id);
            }
        });

        // Listener: Message Read (Optional: update UI ticks)
        const unsubRead = socketService.onMessageRead(({ chatId, lastReadMessageId }) => {
            if (selectedChat && (chatId === selectedChat.chatId || chatId === selectedChat.id || chatId === selectedChat._id)) {
                // Logic to update "read" status in messages array locally would go here
            }
        });

        return () => {
            unsubMsg();
            unsubRead();
            // Don't disconnect socket here if you want it persistent across chat switches,
            // but usually safe to leave connected.
        };
    }, [selectedChat]);

    // 3. Fetch History on Chat Selection
    useEffect(() => {
        if (!selectedChat) return;

        const loadMessages = async () => {
            setIsLoading(true);
            try {
                const chatId = selectedChat.chatId || selectedChat.id || selectedChat._id;
                const history = await chatService.getMessages(chatId);
                // Ensure backend sends newest-last or reverse here
                // Assuming backend sends { data: [newest, ..., oldest] } for pagination, we might need to reverse
                setMessages(Array.isArray(history) ? history.reverse() : []);
                scrollToBottom();
            } catch (error) {
                console.error("Failed to load messages", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages();
        setChatMessage(""); // Clear input on chat switch
        setShowChatInfo(false);
    }, [selectedChat]);

    // 4. Handlers

    const scrollToBottom = () => {
        setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSendMessage = async (options = {}) => {
        if (!chatMessage.trim() && !options.attachments) return;

        const content = chatMessage;
        const chatId = selectedChat.chatId || selectedChat.id || selectedChat._id;

        // Clear input immediately for better UX
        setChatMessage("");
        setShowEmojiPicker(false);

        try {
            // Optimistic UI update could go here (append temp message)

            const sentMessage = await chatService.sendMessage(
                chatId,
                content,
                options.attachments || [],
                options.replyTo?._id || options.replyTo?.id
            );

            // Append real message from server
            setMessages((prev) => [...prev, sentMessage]);
            scrollToBottom();

            // Emit to socket so others get it
            socketService.emitSendMessage(chatId, sentMessage);

        } catch (error) {
            console.error("Send failed", error);
            setChatMessage(content); // Restore text on fail
            // Show toast error here
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        try {
            const uploadedFile = await chatService.uploadFile(file); // Should return file object/url
            // Automatically send the file as a message attachment
            await handleSendMessage({ attachments: [uploadedFile] });
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            const chatId = selectedChat.chatId || selectedChat.id || selectedChat._id;
            await chatService.deleteMessage(messageId, chatId);
            setMessages(prev => prev.filter(m => (m.id || m._id) !== messageId));
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handlePinMessage = async (messageId) => {
        try {
            const chatId = selectedChat.chatId || selectedChat.id || selectedChat._id;
            const updatedMessage = await chatService.togglePinMessage(messageId, chatId);
            setMessages(prev => prev.map(m =>
                (m.id || m._id) === messageId ? updatedMessage : m
            ));
        } catch (error) {
            console.error("Pin failed", error);
        }
    };

    return {
        // Data
        messages,
        chatMessage,
        isLoading,
        uploadingFile,

        // UI State setters
        setChatMessage,
        showChatInfo,
        setShowChatInfo,
        selectedMessage,
        setSelectedMessage,
        showEmojiPicker,
        setShowEmojiPicker,

        // Actions
        handleSendMessage,
        handleFileUpload,
        handleDeleteMessage,
        handlePinMessage,

        // Refs
        refs: {
            chatEndRef,
            fileInputRef,
            messageInputRef
        }
    };
};