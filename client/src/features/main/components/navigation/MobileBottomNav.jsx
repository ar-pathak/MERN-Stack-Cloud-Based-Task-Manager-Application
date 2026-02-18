import { useEffect, useState } from "react";
import { Activity, Bell, Grid2x2, Newspaper, SquarePen, UserRound } from "lucide-react";
import { useNavigate } from "react-router";

import { getUnreadNotificationCount } from "../../../../service/notification.service";
import * as socketService from "../../../../service/Chat.socket.service";

const ITEMS = [
    { id: "overview", label: "Overview", icon: Grid2x2, path: "/main" },
    { id: "feed", label: "Feed", icon: Newspaper, path: "/main/feed" },
    { id: "activity", label: "Activity", icon: Activity, path: "/main/activity" },
    { id: "create", label: "Create", icon: SquarePen, path: "/main/create" },
    { id: "notifications", label: "Alerts", icon: Bell, path: "/main/notifications" }
];

const MobileBottomNav = ({ activeTab = "overview", profileId, hidden = false }) => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let mounted = true;

        const loadUnreadCount = async () => {
            try {
                const count = await getUnreadNotificationCount();
                if (mounted) setUnreadCount(Number(count || 0));
            } catch {
                if (mounted) setUnreadCount(0);
            }
        };

        loadUnreadCount();

        const offUnreadCount = socketService.onNotificationUnreadCount(({ count }) => {
            setUnreadCount(Number(count || 0));
        });

        return () => {
            mounted = false;
            offUnreadCount();
        };
    }, []);

    if (hidden) return null;

    const handleMeNavigation = () => {
        if (!profileId) return;
        navigate(`/profile/${profileId}`);
    };

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl"
            style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
        >
            <div className="mx-auto grid w-full max-w-3xl grid-cols-6 gap-1 px-2 pt-1.5 sm:px-3 md:px-4">
                {ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isNotifications = item.id === "notifications";

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium transition-colors sm:px-2 sm:text-[11px] md:py-2.5 ${
                                isActive
                                    ? "bg-sky-500/15 text-sky-300"
                                    : "text-slate-400 hover:bg-slate-800/70"
                            }`}
                        >
                            <span className="relative">
                                <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                                {isNotifications && unreadCount > 0 && (
                                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] font-semibold text-white">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </span>
                            {item.label}
                        </button>
                    );
                })}

                <button
                    type="button"
                    onClick={handleMeNavigation}
                    className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium transition-colors sm:px-2 sm:text-[11px] md:py-2.5 ${
                        activeTab === "me"
                            ? "bg-sky-500/15 text-sky-300"
                            : "text-slate-400 hover:bg-slate-800/70"
                    }`}
                >
                    <UserRound className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                    Me
                </button>
            </div>
        </div>
    );
};

export default MobileBottomNav;
