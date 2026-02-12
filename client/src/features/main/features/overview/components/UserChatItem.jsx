import React from "react";
import { MessageSquare, Users, Phone, AtSign, PhoneIncoming } from "lucide-react";
import { useAuth } from "../../../../../context/AuthContext";

const UserChatItem = ({ chat, selectedItem, setSelectedItem, onOpenMention }) => {
    const isSelected = selectedItem?.id === chat.id;
    const isGroup = chat.chatType === "group";
    const { user } = useAuth();
    const hasActiveCall = !!chat?.hasActiveCall;

    const unreadCount = chat.unreadCount || 0;
    const hasUnread = unreadCount > 0;

    const mentionUnreadCount = chat.mentionUnreadCount || 0;
    const hasUnreadMention = mentionUnreadCount > 0;

    const callInviteUnreadCount = chat.callInviteUnreadCount || 0;
    const hasUnreadCallInvite = callInviteUnreadCount > 0;

    const formatActivityTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    return (
        <div
            className={`group flex items-start gap-3 px-3 py-3 mb-1 rounded-xl cursor-pointer transition-all ${isSelected
                ? "bg-slate-800/80 border-l-2 border-sky-500"
                : hasActiveCall
                    ? "bg-emerald-900/15 hover:bg-emerald-900/25 border-l-2 border-emerald-500/60"
                    : hasUnreadCallInvite
                        ? "bg-amber-500/10 hover:bg-amber-500/15 border-l-2 border-amber-400/70"
                        : hasUnreadMention
                            ? "bg-fuchsia-500/10 hover:bg-fuchsia-500/15 border-l-2 border-fuchsia-400/70"
                            : hasUnread
                                ? "bg-slate-800/60 hover:bg-slate-800/80 border-l-2 border-sky-500/50"
                                : "hover:bg-slate-800/40 border-l-2 border-transparent"
                }`}
            onClick={() => setSelectedItem(chat)}
        >
            <div className="relative flex-shrink-0 h-10 w-10 ml-4.5">
                <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center overflow-hidden">
                    {chat.avatar ? (
                        <img src={chat.avatar} alt={chat.title} className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-sm font-bold text-slate-400">
                            {chat.title?.charAt(0).toUpperCase() || "?"}
                        </span>
                    )}
                </div>

                {hasUnread && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-sky-500 border-2 border-slate-900 flex items-center justify-center animate-pulse">
                        <span className="text-[10px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    </div>
                )}

                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                    {isGroup ? (
                        <Users className="h-2.5 w-2.5 text-indigo-400" />
                    ) : (
                        <MessageSquare className="h-2.5 w-2.5 text-sky-400" />
                    )}
                </div>

                {hasActiveCall && (
                    <div className="absolute -bottom-1 -left-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center animate-pulse">
                        <Phone className="h-2.5 w-2.5 text-white" />
                    </div>
                )}

                {hasUnreadCallInvite ? (
                    <div className="absolute -top-1 -left-1 min-h-5 min-w-5 px-1 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center shadow-md">
                        <span className="text-[9px] font-bold text-white flex items-center gap-0.5">
                            <AtSign className="h-2.5 w-2.5" />
                            <PhoneIncoming className="h-2.5 w-2.5" />
                            {callInviteUnreadCount > 9 ? "9+" : callInviteUnreadCount}
                        </span>
                    </div>
                ) : hasUnreadMention ? (
                    <div className="absolute -top-1 -left-1 min-h-5 min-w-5 px-1 rounded-full bg-fuchsia-500 border-2 border-slate-900 flex items-center justify-center shadow-md">
                        <span className="text-[9px] font-bold text-white flex items-center gap-0.5">
                            <AtSign className="h-2.5 w-2.5" />
                            {mentionUnreadCount > 9 ? "9+" : mentionUnreadCount}
                        </span>
                    </div>
                ) : null}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between mb-0.5">
                    <span
                        className={`text-sm font-semibold truncate ${isSelected
                            ? "text-sky-400"
                            : hasUnread || hasUnreadCallInvite
                                ? "text-slate-100"
                                : "text-slate-200"
                            }`}
                    >
                        {chat.title}
                    </span>
                    <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                        {formatActivityTime(chat.updatedAt)}
                    </span>
                </div>

                <div className="flex items-center">
                    <p
                        className={`text-xs truncate group-hover:text-slate-400 transition-colors ${hasActiveCall
                            ? "text-emerald-300 font-semibold"
                            : hasUnreadCallInvite
                                ? "text-amber-200 font-semibold"
                                : hasUnreadMention
                                    ? "text-fuchsia-200 font-medium"
                                    : hasUnread
                                        ? "text-slate-300 font-medium"
                                        : "text-slate-500"
                            }`}
                    >
                        {hasActiveCall && (
                            <span className="text-emerald-400 mr-1">Live call -</span>
                        )}
                        {hasUnreadCallInvite && !hasActiveCall && (
                            <span className="text-amber-400 mr-1">Call invite -</span>
                        )}
                        {chat.lastMessage?.sender && (
                            <span
                                className={`${isSelected
                                    ? "text-sky-500/80"
                                    : hasUnread || hasUnreadCallInvite
                                        ? "text-sky-400"
                                        : "text-slate-400"
                                    } mr-1 font-medium`}
                            >
                                {user?.username === chat.lastMessage?.sender?.username
                                    ? "You"
                                    : chat.lastMessage?.sender?.username?.split(" ")[0] || "User"}
                            </span>
                        )}
                        {chat.description || chat.lastMessage?.content || "Start a conversation"}
                    </p>
                </div>

                {hasUnreadCallInvite ? (
                    <div className="mt-1.5 flex items-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenMention?.({
                                    ...chat,
                                    nextMentionMessageId: chat.nextCallInviteMessageId || chat.nextMentionMessageId
                                });
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors"
                        >
                            <AtSign className="h-2.5 w-2.5" />
                            <PhoneIncoming className="h-2.5 w-2.5" />
                            {callInviteUnreadCount} call invite{callInviteUnreadCount > 1 ? "s" : ""}
                        </button>
                    </div>
                ) : hasUnreadMention ? (
                    <div className="mt-1.5 flex items-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenMention?.(chat);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-200 hover:bg-fuchsia-500/25 transition-colors"
                        >
                            <AtSign className="h-2.5 w-2.5" />
                            {mentionUnreadCount} unread mention{mentionUnreadCount > 1 ? "s" : ""}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default UserChatItem;
