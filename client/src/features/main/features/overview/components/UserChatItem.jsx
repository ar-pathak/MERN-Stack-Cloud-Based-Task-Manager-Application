import React from 'react';
import { MessageSquare, Users } from 'lucide-react';

const UserChatItem = ({ chat, selectedItem, setSelectedItem }) => {
    const isSelected = selectedItem?.id === chat.id;
    const isGroup = chat.chatType === 'group';

    // Helper to format time (e.g., 10:30 PM)
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            className={`group flex items-center gap-3 px-3 py-3 mb-2 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-all ${isSelected ? 'bg-slate-800/80 border-l-2 border-sky-500' : 'border-l-2 border-transparent'
                }`}
            onClick={() => setSelectedItem(chat)}
        >
            {/* Avatar Section */}
            <div className="relative flex-shrink-0 px-1.5 ml-4.5">
                <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center overflow-hidden">
                    {chat.avatar ? (
                        <img src={chat.avatar} alt={chat.title} className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-sm font-bold text-slate-400">
                            {chat.title?.charAt(0).toUpperCase() || '?'}
                        </span>
                    )}
                </div>
                {/* Type Badge (Group vs Private) */}
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                    {isGroup ? (
                        <Users className="h-2.5 w-2.5 text-indigo-400" />
                    ) : (
                        <MessageSquare className="h-2.5 w-2.5 text-sky-400" />
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm font-semibold truncate ${isSelected ? 'text-sky-400' : 'text-slate-200'}`}>
                        {chat.title}
                    </span>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">
                        {formatTime(chat.updatedAt)}
                    </span>
                </div>

                <div className="flex items-center">
                    <p className="text-xs text-slate-500 truncate group-hover:text-slate-400 transition-colors">
                        {/* Show sender name if it's a group chat */}
                        {isGroup && chat.lastMessage?.sender && (
                            <span className="text-slate-400 mr-1 font-medium">
                                {chat.lastMessage.sender.name?.split(' ')[0]}:
                            </span>
                        )}
                        {chat.description || "Start a conversation"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UserChatItem;