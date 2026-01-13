// hooks/useChatLogic.js
import { useState, useRef, useEffect, useMemo } from "react";

export const useChatLogic = (selectedItem) => {
    const [messages, setMessages] = useState({});
    const [chatMessage, setChatMessage] = useState("");
    const [uploadingFile, setUploadingFile] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showChatInfo, setShowChatInfo] = useState(false);

    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageInputRef = useRef(null);

    // Memoized current messages array for the selected item
    const currentMessages = useMemo(() => {
        return selectedItem ? (messages[selectedItem.id] || []) : [];
    }, [messages, selectedItem]);

    // Scroll to bottom when item changes or sending message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedItem?.id, currentMessages.length]);

    // Focus input
    useEffect(() => {
        if (selectedItem) {
            messageInputRef.current?.focus();
        }
    }, [selectedItem]);

    const handleSendMessage = () => {
        if (chatMessage.trim() && selectedItem) {
            const newMessage = {
                id: Date.now(),
                sender: "You",
                avatar: "ME",
                message: chatMessage.trim(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isOwn: true,
                read: false,
                pinned: false,
                type: "text"
            };

            setMessages(prev => ({
                ...prev,
                [selectedItem.id]: [...(prev[selectedItem.id] || []), newMessage]
            }));

            setChatMessage("");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file && selectedItem) {
            setUploadingFile(true);
            // Simulate upload
            setTimeout(() => {
                const newMessage = {
                    id: Date.now(),
                    sender: "You",
                    avatar: "ME",
                    message: `Shared a file: ${file.name}`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isOwn: true,
                    read: false,
                    pinned: false,
                    type: "file",
                    attachment: {
                        name: file.name,
                        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                        type: file.type.includes('image') ? 'image' : 'file'
                    }
                };

                setMessages(prev => ({
                    ...prev,
                    [selectedItem.id]: [...(prev[selectedItem.id] || []), newMessage]
                }));
                setUploadingFile(false);
            }, 1500);
        }
    };

    const handleDeleteMessage = (messageId) => {
        if (selectedItem) {
            setMessages(prev => ({
                ...prev,
                [selectedItem.id]: prev[selectedItem.id].filter(msg => msg.id !== messageId)
            }));
            setSelectedMessage(null);
        }
    };

    const handlePinMessage = (messageId) => {
        if (selectedItem) {
            setMessages(prev => ({
                ...prev,
                [selectedItem.id]: prev[selectedItem.id].map(msg =>
                    msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg
                )
            }));
            setSelectedMessage(null);
        }
    };

    return {
        messages: currentMessages,
        chatMessage,
        setChatMessage,
        handleSendMessage,
        uploadingFile,
        handleFileUpload,
        handleDeleteMessage,
        handlePinMessage,
        selectedMessage,
        setSelectedMessage,
        showEmojiPicker,
        setShowEmojiPicker,
        showChatInfo,
        setShowChatInfo,
        refs: { chatEndRef, fileInputRef, messageInputRef }
    };
};