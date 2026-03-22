import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { Loader2, ArrowLeft, Phone, Video, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import MessageList from "../main/features/overview/components/chat/MessageList";
import ChatInput from "../main/features/overview/components/chat/ChatInput";
import {
    getMessages,
    sendMessage,
    initiateChat,
    checkPrivateChatExists
} from "../../service/chat.service";
import { getUserById } from "../../service/user.service";

// Socket Service imports
import {
    connectSocket,
    onReceiveMessage,
    onTyping,
    onStopTyping,
    emitTyping,
    emitStopTyping
} from "../../service/Chat.socket.service";

const ChatPage = () => {
    const { user: currentUser, token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { id: targetUserId } = useParams();

    const [activeChatId, setActiveChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [targetUserProfile, setTargetUserProfile] = useState(location.state?.targetUser || null);

    const [isLoading, setIsLoading] = useState(true);
    const [chatMessage, setChatMessage] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);

    // Typing states
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);

    const chatEndRef = useRef(null);

    const scrollToBottom = useCallback((behavior = "smooth") => {
        chatEndRef.current?.scrollIntoView({ behavior });
    }, []);

    // 1. Socket Connection & Listeners
    useEffect(() => {
        if (!token) return;
        
        connectSocket(token);

        const unsubscribeMsg = onReceiveMessage(({ chatId, message }) => {
            if (chatId === activeChatId) {
                const newMsg = {
                    id: message._id,
                    text: message.content,
                    sender: {
                        id: message.sender._id || message.sender,
                        name: message.sender.name || "User",
                        avatar: message.sender.avatar
                    },
                    timestamp: message.createdAt,
                    status: 'sent',
                    replyTo: message.replyTo
                };
                setMessages(prev => [...prev, newMsg]);
                scrollToBottom();
            }
        });

        const unsubscribeTyping = onTyping(({ chatId, userId }) => {
            if (chatId === activeChatId && userId !== currentUser._id) {
                setIsTyping(true);
                scrollToBottom();
            }
        });

        const unsubscribeStopTyping = onStopTyping(({ chatId, userId }) => {
            if (chatId === activeChatId && userId !== currentUser._id) {
                setIsTyping(false);
            }
        });

        return () => {
            unsubscribeMsg();
            unsubscribeTyping();
            unsubscribeStopTyping();
        };
    }, [token, activeChatId, currentUser._id]);


    // 2. Initialization
    useEffect(() => {
        let isMounted = true;

        const initChat = async () => {
            try {
                let userProfile = targetUserProfile;
                if (!userProfile) {
                    if (!targetUserId) {
                        throw new Error("Missing chat target user id");
                    }
                    const res = await getUserById(targetUserId);
                    userProfile = res?.user || res;
                    if (isMounted) setTargetUserProfile(userProfile);
                }

                const resolvedUserId = userProfile?._id || targetUserId;
                if (!resolvedUserId) {
                    throw new Error("Missing chat target user id");
                }
                const { exists, chatId } = await checkPrivateChatExists(resolvedUserId);

                if (exists && chatId) {
                    if (isMounted) setActiveChatId(chatId);

                    const msgs = await getMessages(chatId);

                    const rawMessages = msgs.messages || (Array.isArray(msgs) ? msgs : []);

                    const reversedMessages = [...rawMessages].reverse();

                    if (isMounted) {
                        setMessages(reversedMessages);
                    }
                }

            } catch (err) {
                console.error("Chat init error:", err);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                    setTimeout(() => scrollToBottom("auto"), 100);
                }
            }
        };

        initChat();
        return () => { isMounted = false; };
    }, [targetUserProfile, targetUserId, scrollToBottom]);

    // 3. Typing Indicator Emitter
    const handleInputChange = (e) => {
        setChatMessage(e.target.value);

        if (activeChatId) {
            emitTyping(activeChatId);
            if (typingTimeout) clearTimeout(typingTimeout);
            const timeout = setTimeout(() => {
                emitStopTyping(activeChatId);
            }, 2000);
            setTypingTimeout(timeout);
        }
    };

    // 4. Send Message Logic
    const handleSendMessage = async () => {
        if (!chatMessage.trim()) return;

        if (activeChatId) emitStopTyping(activeChatId);

        const content = chatMessage.trim();
        const tempId = Date.now().toString();

        const optimisticMsg = {
            id: tempId,
            text: content,
            sender: {
                id: currentUser._id,
                name: currentUser.name,
                avatar: currentUser.avatar
            },
            timestamp: new Date().toISOString(),
            status: 'pending',
            replyTo: replyingTo
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setChatMessage("");
        setReplyingTo(null);
        scrollToBottom();

        try {
            let currentChatId = activeChatId;

            if (!currentChatId) {
                const newChat = await initiateChat(targetUserProfile._id);
                currentChatId = newChat._id;
                setActiveChatId(currentChatId);
            }

            const sentMsg = await sendMessage(
                currentChatId,
                content,
                [],
                optimisticMsg.replyTo?._id
            );

            setMessages(prev => prev.map(m =>
                m.id === tempId ? {
                    ...m,
                    id: sentMsg._id,
                    status: 'sent',
                    timestamp: sentMsg.createdAt
                } : m
            ));

        } catch (error) {
            console.error("Send error:", error);
            setMessages(prev => prev.map(m =>
                m.id === tempId ? { ...m, status: 'error' } : m
            ));
        }
    };

    if (isLoading && !targetUserProfile) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="animate-spin text-sky-500 h-8 w-8" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden">
            {/* Header */}
            <header className="h-16 flex-none border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-4 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    {targetUserProfile && (
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${targetUserProfile._id}`)}>
                            <div className="relative">
                                <div className="h-10 w-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-slate-200">
                                    {targetUserProfile.avatar ? (
                                        <img loading="lazy" src={targetUserProfile.avatar} alt={targetUserProfile.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-lg">{targetUserProfile.name?.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                {targetUserProfile.isOnline && (
                                    <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-100">{targetUserProfile.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                    {isTyping ? <span className="text-sky-400 animate-pulse">Typing...</span> : (targetUserProfile.isOnline ? "Online" : "Offline")}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-1">
                    <button className="p-2.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-full transition-all"><Phone className="h-5 w-5" /></button>
                    <button className="p-2.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-full transition-all"><Video className="h-5 w-5" /></button>
                </div>
            </header>

            {/* Messages Area */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-sky-500" /></div>
                ) : (
                    <>
                        <MessageList
                            messages={messages}
                            itemType="dm"
                            chatEndRef={chatEndRef}
                            onReply={setReplyingTo}
                            currentUser={currentUser}
                        />
                        {messages.some(m => m.status === 'error') && (
                            <div className="flex items-center justify-center mt-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-500 text-xs">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Failed to send. Retry?</span>
                                </div>
                            </div>
                        )}
                        {/* Typing Indicator Bubble */}
                        {isTyping && (
                            <div className="flex items-center gap-2 pl-4 mt-1 mb-2">
                                <div className="px-3 py-2 rounded-2xl bg-slate-800 rounded-tl-none border border-slate-700/50">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Input Area */}
            <footer className="flex-none p-4 bg-slate-900/80 backdrop-blur-lg border-t border-slate-800">
                <ChatInput
                    chatMessage={chatMessage}
                    // Updated to handle typing events
                    setChatMessage={(val) => {
                        if (typeof val === 'string') {
                            setChatMessage(val);
                            handleInputChange({ target: { value: val } });
                        }
                    }}
                    handleSend={handleSendMessage}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    disabled={isLoading && !targetUserProfile}
                />
            </footer>
        </div>
    );
};

export default ChatPage;
