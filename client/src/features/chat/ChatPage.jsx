import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { Loader2, ArrowLeft, Phone, Video, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import MessageList from "../main/features/overview/components/chat/MessageList";
import ChatInput from "../main/features/overview/components/chat/ChatInput";
import { getMessages, sendMessage, initiateChat } from "../../service/chat.service";
import { getUserById } from "../../service/user.service";

const ChatPage = () => {
    const { userId: targetUserId } = useParams();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [targetUserProfile, setTargetUserProfile] = useState(location.state?.targetUser || null);
    const [isLoading, setIsLoading] = useState(true);
    const [chatMessage, setChatMessage] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);

    const chatEndRef = useRef(null);

    const scrollToBottom = useCallback((behavior = "smooth") => {
        chatEndRef.current?.scrollIntoView({ behavior });
    }, []);

    useEffect(() => {
        const initChat = async () => {
            try {
                if (!targetUserProfile) {
                    const res = await getUserById(targetUserId);
                    setTargetUserProfile(res.user || res);
                }
                const chatData = await initiateChat(targetUserId);
                setActiveChat(chatData);

                const msgs = await getMessages(chatData._id);
                setMessages(msgs.map(m => ({
                    id: m._id,
                    text: m.content,
                    sender: { id: m.sender._id || m.sender, name: m.sender.name, avatar: m.sender.avatar },
                    timestamp: m.createdAt,
                    status: 'sent'
                })));
                setTimeout(() => scrollToBottom("auto"), 100);
            } catch (err) {
                console.error("Chat init error", err);
            } finally {
                setIsLoading(false);
            }
        };
        initChat();
    }, [targetUserId, targetUserProfile, scrollToBottom]);

    const handleSendMessage = async () => {
        if (!chatMessage.trim() || !activeChat) return;

        const tempId = Date.now().toString();
        const pendingMsg = {
            id: tempId,
            text: chatMessage,
            sender: { id: currentUser._id, name: currentUser.name, avatar: currentUser.avatar },
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        // Optimistic UI update
        setMessages(prev => [...prev, pendingMsg]);
        setChatMessage("");
        scrollToBottom();

        try {
            const sentMsg = await sendMessage(activeChat._id, pendingMsg.text);
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: sentMsg._id, status: 'sent' } : m));
        } catch (error) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden">
            {/* Header */}
            <header className="h-16 flex-none border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-4 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${targetUserId}`)}>
                        <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-slate-800 overflow-hidden">
                                {targetUserProfile?.avatar ? <img src={targetUserProfile.avatar} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold bg-indigo-600">{targetUserProfile?.name?.charAt(0)}</div>}
                            </div>
                            {targetUserProfile?.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-100">{targetUserProfile?.name || "Loading..."}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{targetUserProfile?.isOnline ? "Online" : "Offline"}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button className="p-2.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-full transition-all"><Phone className="h-5 w-5" /></button>
                    <button className="p-2.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-full transition-all"><Video className="h-5 w-5" /></button>
                </div>
            </header>

            {/* Messages */}
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
                        />
                        {/* Status indicators for optimistic UI */}
                        {messages.some(m => m.status === 'error') && (
                            <div className="flex items-center gap-2 text-rose-500 text-xs justify-end px-2">
                                <AlertCircle className="h-3 w-3" /> Failed to send.
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Input */}
            <footer className="flex-none p-4 bg-slate-900/80 backdrop-blur-lg border-t border-slate-800">
                <ChatInput
                    chatMessage={chatMessage}
                    setChatMessage={setChatMessage}
                    handleSend={handleSendMessage}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                />
            </footer>
        </div>
    );
};

export default ChatPage;