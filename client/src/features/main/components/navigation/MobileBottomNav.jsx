import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Grid2x2, Newspaper, SquarePen, UserRound } from "lucide-react";
import { useNavigate } from "react-router";

import { getUnreadNotificationCount } from "../../../../service/notification.service";
import * as socketService from "../../../../service/Chat.socket.service";

const ITEMS = [
    { id: "overview", label: "Overview", icon: Grid2x2, path: "/main" },
    { id: "feed", label: "Feed", icon: Newspaper, path: "/main/feed" },
    { id: "create", label: "Create", icon: SquarePen, path: "/main/create" },
    { id: "notifications", label: "Alerts", icon: Bell, path: "/main/notifications" }
];

// "Intent to Navigate" Preloading Map
const preloadPage = (path) => {
    if (path.includes("/feed")) import("../../features/feed/pages/FeedPage.jsx");
    else if (path.includes("/create")) import("../../features/create/pages/CreatePostPage.jsx");
    else if (path.includes("/notifications")) import("../../features/notifications/pages/NotificationsPage.jsx");
    else if (path.includes("/profile")) import("../../features/profile/UserProfile.jsx");
    else if (path === "/main") import("../../features/overview/pages/OverviewLayout.jsx");
};

const MobileBottomNav = ({ activeTab = "overview", profileId, hidden = false }) => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    // 🔥 OPTIMISTIC UI STATE: Turant active dikhane ke liye
    const [optimisticTab, setOptimisticTab] = useState(null);

    // Jaise hi actual page load ho jayega, prop wala activeTab change hoga,
    // tab hum apne temporary state ko reset kar denge.
    useEffect(() => {
        setOptimisticTab(null);
    }, [activeTab]);

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

    const handleNavigation = (path, id) => {
        setOptimisticTab(id); // 🔥 Click karte hi turant highlight karo (No Wait)
        navigate(path);
    };

    const handleMeNavigation = () => {
        if (!profileId) return;
        setOptimisticTab("me"); // 🔥 Click karte hi turant highlight karo (No Wait)
        navigate(`/main/profile/${profileId}`);
    };

    // 🔥 Konsa tab active manana hai uska decision (Priority optimistic state ko milegi)
    const displayTab = optimisticTab || activeTab;

    const navContent = (
        <div
            className="fixed inset-x-0 bottom-0 z-[100] border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl"
            style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
        >
            <div className="mx-auto grid w-full max-w-3xl grid-cols-5 gap-1 px-2 pt-1.5 sm:px-3 md:px-4">
                {ITEMS.map((item) => {
                    const Icon = item.icon;
                    // 🔥 Use displayTab insted of activeTab
                    const isActive = displayTab === item.id;
                    const isNotifications = item.id === "notifications";

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNavigation(item.path, item.id)} // 🔥 Pass ID here
                            onMouseEnter={() => preloadPage(item.path)}
                            onTouchStart={() => preloadPage(item.path)}
                            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium transition-colors sm:px-2 sm:text-[11px] md:py-2.5 ${isActive
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
                    onMouseEnter={() => profileId && preloadPage(`/profile/${profileId}`)}
                    onTouchStart={() => profileId && preloadPage(`/profile/${profileId}`)}
                    className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium transition-colors sm:px-2 sm:text-[11px] md:py-2.5 ${displayTab === "me" // 🔥 Use displayTab here
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

    if (typeof document !== "undefined") {
        return createPortal(navContent, document.body);
    }
    return navContent;
};

export default MobileBottomNav;