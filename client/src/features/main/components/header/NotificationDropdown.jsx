import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

import {
    deleteNotification,
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
    markNotificationUnread
} from "../../../../service/notification.service";
import {
    approveFollowRequest,
    checkFollowStatus,
    followUser,
    rejectFollowRequest
} from "../../../../service/follow.service";
import * as socketService from "../../../../service/Chat.socket.service";

const formatRelativeTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString();
};

const NotificationDropdown = () => {
    const navigate = useNavigate();
    const containerRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [actionLoadingKey, setActionLoadingKey] = useState("");

    const unreadInList = useMemo(
        () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
        [notifications]
    );

    const loadUnreadCount = useCallback(async () => {
        try {
            const count = await getUnreadNotificationCount();
            setUnreadCount(count);
        } catch (error) {
            console.error("Failed to load unread notification count", error);
        }
    }, []);

    const hydrateFollowBackStates = useCallback(async (items = []) => {
        const list = Array.isArray(items) ? items : [];
        const targets = list.filter(
            (notification) =>
                String(notification?.metadata?.kind || "") === "followed_you" &&
                !notification?.metadata?.followActionState
        );

        if (!targets.length) return list;

        const stateMap = new Map();
        await Promise.all(
            targets.map(async (notification) => {
                const actorId = notification?.metadata?.actorId || notification?.actor?._id;
                if (!actorId) return;
                try {
                    const status = await checkFollowStatus(actorId);
                    const nextState = status?.isFollowing
                        ? "following"
                        : status?.isPending
                            ? "requested"
                            : "";
                    stateMap.set(notification._id, nextState);
                } catch {
                    stateMap.set(notification._id, "");
                }
            })
        );

        return list.map((notification) => {
            if (!stateMap.has(notification._id)) return notification;
            return {
                ...notification,
                metadata: {
                    ...(notification.metadata || {}),
                    followActionState: stateMap.get(notification._id)
                }
            };
        });
    }, []);

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const payload = await getNotifications({ limit: 25 });
            const hydrated = await hydrateFollowBackStates(payload.notifications || []);
            setNotifications(hydrated);
            setUnreadCount(Number(payload.unreadCount || 0));
        } catch (error) {
            console.error("Failed to load notifications", error);
        } finally {
            setLoading(false);
        }
    }, [hydrateFollowBackStates]);

    useEffect(() => {
        loadUnreadCount();
    }, [loadUnreadCount]);

    useEffect(() => {
        if (!open) return;
        loadNotifications();
    }, [open, loadNotifications]);

    useEffect(() => {
        const onOutsideClick = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", onOutsideClick);
        }
        return () => document.removeEventListener("mousedown", onOutsideClick);
    }, [open]);

    useEffect(() => {
        const offNew = socketService.onNotificationNew(({ notification }) => {
            if (!notification) return;
            setNotifications((prev) => [notification, ...prev.filter((item) => item._id !== notification._id)].slice(0, 25));
        });

        const offUpdated = socketService.onNotificationUpdated(({ notification }) => {
            if (!notification) return;
            setNotifications((prev) =>
                prev.map((item) => (item._id === notification._id ? notification : item))
            );
        });

        const offDeleted = socketService.onNotificationDeleted(({ notificationId }) => {
            if (!notificationId) return;
            setNotifications((prev) => prev.filter((item) => item._id !== notificationId));
        });

        const offBulk = socketService.onNotificationBulk(() => {
            if (open) loadNotifications();
        });

        const offAllRead = socketService.onNotificationAllRead(() => {
            setNotifications((prev) => prev.map((item) => ({ ...item, read: true, readAt: new Date().toISOString() })));
        });

        const offUnreadCount = socketService.onNotificationUnreadCount(({ count }) => {
            setUnreadCount(Number(count || 0));
        });

        return () => {
            offNew();
            offUpdated();
            offDeleted();
            offBulk();
            offAllRead();
            offUnreadCount();
        };
    }, [loadNotifications, open]);

    const handleMarkRead = async (notification) => {
        try {
            if (notification.read) {
                const updated = await markNotificationUnread(notification._id);
                setNotifications((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
            } else {
                const updated = await markNotificationRead(notification._id);
                setNotifications((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
            }
            loadUnreadCount();
        } catch (error) {
            console.error("Failed to toggle read state", error);
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await deleteNotification(notificationId);
            setNotifications((prev) => prev.filter((item) => item._id !== notificationId));
            loadUnreadCount();
        } catch (error) {
            console.error("Failed to delete notification", error);
        }
    };

    const handleMarkAll = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications((prev) => prev.map((item) => ({ ...item, read: true, readAt: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all notifications read", error);
        }
    };

    const handleFollowBackAction = async (notification) => {
        const notificationId = notification?._id;
        const actorId = notification?.metadata?.actorId || notification?.actor?._id;
        if (!notificationId || !actorId) return;

        const actionKey = `follow:${notificationId}`;
        setActionLoadingKey(actionKey);
        try {
            const result = await followUser(actorId);
            await markNotificationRead(notificationId);
            setNotifications((prev) =>
                prev.map((item) =>
                    item._id === notificationId
                        ? {
                            ...item,
                            read: true,
                            readAt: new Date().toISOString(),
                              metadata: {
                                  ...(item.metadata || {}),
                                  followActionState: result?.isPending ? "requested" : "following"
                              }
                          }
                        : item
                )
            );
            loadUnreadCount();
        } catch (error) {
            console.error("Failed to follow from notification", error);
        } finally {
            setActionLoadingKey("");
        }
    };

    const handleFollowRequestAction = async (notification, action) => {
        const notificationId = notification?._id;
        const requestId = notification?.metadata?.requestId;
        if (!notificationId || !requestId) return;

        const actionKey = `${action}:${notificationId}`;
        setActionLoadingKey(actionKey);

        try {
            if (action === "approve") {
                await approveFollowRequest(requestId);
            } else {
                await rejectFollowRequest(requestId);
            }
            await markNotificationRead(notificationId);

            const updatedState = action === "approve" ? "approved" : "rejected";
            setNotifications((prev) =>
                prev.map((item) =>
                    item._id === notificationId
                        ? {
                              ...item,
                              read: true,
                              readAt: new Date().toISOString(),
                              metadata: {
                                  ...(item.metadata || {}),
                                  requestState: updatedState
                              }
                          }
                        : item
                )
            );
            loadUnreadCount();
        } catch (error) {
            console.error("Failed follow request action", error);
        } finally {
            setActionLoadingKey("");
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification.read) {
                const updated = await markNotificationRead(notification._id);
                setNotifications((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
                loadUnreadCount();
            }
        } catch (error) {
            console.error("Failed to update notification state", error);
        } finally {
            setOpen(false);
            navigate(notification.link || "/main");
        }
    };

    const badgeCount = unreadCount || unreadInList;

    return (
        <div ref={containerRef} className="relative z-50">
            <button
                onClick={() => setOpen((value) => !value)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800/70 bg-slate-900/70 hover:bg-slate-800/70 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-4 w-4 text-slate-300" />
                {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-sky-500 text-[10px] font-bold text-white flex items-center justify-center">
                        {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 max-w-[90vw] rounded-2xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/70">
                        <div>
                            <p className="text-sm font-semibold text-slate-100">Notifications</p>
                            <p className="text-xs text-slate-500">{badgeCount} unread</p>
                        </div>
                        <button
                            onClick={handleMarkAll}
                            disabled={badgeCount === 0}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 border border-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Mark all
                        </button>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                        {loading && (
                            <div className="px-4 py-4 text-sm text-slate-400">Loading notifications...</div>
                        )}

                        {!loading && notifications.length === 0 && (
                            <div className="px-4 py-6 text-sm text-slate-500 text-center">No notifications yet.</div>
                        )}

                        {!loading &&
                            notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    className={`px-4 py-3 border-b border-slate-800/40 ${notification.read ? "bg-transparent" : "bg-sky-500/5"}`}
                                >
                                    <button
                                        onClick={() => handleNotificationClick(notification)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.read ? "bg-slate-700" : "bg-sky-400"}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-100 truncate">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[11px] text-slate-500 mt-1">
                                                    {formatRelativeTime(notification.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </button>

                                    <div className="mt-2 flex items-center gap-2 pl-4">
                                        <button
                                            onClick={() => handleMarkRead(notification)}
                                            className="text-[11px] px-2 py-1 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800"
                                        >
                                            {notification.read ? "Mark unread" : "Mark read"}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(notification._id)}
                                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            Delete
                                        </button>
                                        {String(notification?.metadata?.kind || "") === "follow_request" &&
                                            !notification?.metadata?.requestState && (
                                                <>
                                                    <button
                                                        onClick={() => handleFollowRequestAction(notification, "approve")}
                                                        disabled={actionLoadingKey === `approve:${notification._id}`}
                                                        className="text-[11px] px-2 py-1 rounded-md border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-60"
                                                    >
                                                        {actionLoadingKey === `approve:${notification._id}` ? "..." : "Approve"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleFollowRequestAction(notification, "reject")}
                                                        disabled={actionLoadingKey === `reject:${notification._id}`}
                                                        className="text-[11px] px-2 py-1 rounded-md border border-rose-500/35 text-rose-300 hover:bg-rose-500/15 disabled:opacity-60"
                                                    >
                                                        {actionLoadingKey === `reject:${notification._id}` ? "..." : "Reject"}
                                                    </button>
                                                </>
                                            )}
                                        {String(notification?.metadata?.kind || "") === "followed_you" &&
                                            !notification?.metadata?.followActionState && (
                                                <button
                                                    onClick={() => handleFollowBackAction(notification)}
                                                    disabled={actionLoadingKey === `follow:${notification._id}`}
                                                    className="text-[11px] px-2 py-1 rounded-md border border-sky-500/35 text-sky-300 hover:bg-sky-500/15 disabled:opacity-60"
                                                >
                                                    {actionLoadingKey === `follow:${notification._id}` ? "..." : "Follow back"}
                                                </button>
                                            )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
