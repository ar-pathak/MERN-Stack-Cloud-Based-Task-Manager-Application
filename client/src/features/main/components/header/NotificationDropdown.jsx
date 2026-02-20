import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

import useNotificationCenter from "../../features/notifications/hook/useNotificationCenter";
import {
    formatRelativeTime,
    resolveNotificationPath
} from "../../features/notifications/utils/notification.helpers";

const NotificationDropdown = () => {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const [open, setOpen] = useState(false);

    const {
        loading,
        notifications,
        unreadCount,
        unreadInList,
        actionLoadingKey,
        toggleReadState,
        removeNotification,
        markAllRead,
        followBack,
        followRequestAction,
        workspaceInviteAction,
        projectStatusRequestAction,
        taskAssigneeRequestAction,
        ensureRead
    } = useNotificationCenter({ enabled: open, limit: 25 });

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

    const handleNotificationClick = async (notification) => {
        try {
            await ensureRead(notification);
        } finally {
            setOpen(false);
            navigate(resolveNotificationPath(notification), {
                state: { fromNotification: true, notificationId: notification?._id }
            });
        }
    };

    const badgeCount = unreadCount || unreadInList;

    return (
        <div ref={containerRef} className="relative z-50">
            <button
                onClick={() => setOpen((value) => !value)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800/70 bg-slate-900/70 transition-colors hover:bg-slate-800/70"
                aria-label="Notifications"
            >
                <Bell className="h-4 w-4 text-slate-300" />
                {badgeCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[90vw] overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-slate-800/70 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-100">Notifications</p>
                            <p className="text-xs text-slate-500">{badgeCount} unread</p>
                        </div>
                        <button
                            onClick={markAllRead}
                            disabled={badgeCount === 0}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Mark all
                        </button>
                    </div>

                    <div className="custom-scrollbar max-h-[420px] overflow-y-auto">
                        {loading && (
                            <div className="px-4 py-4 text-sm text-slate-400">
                                Loading notifications...
                            </div>
                        )}

                        {!loading && notifications.length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-slate-500">
                                No notifications yet.
                            </div>
                        )}

                        {!loading &&
                            notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    className={`border-b border-slate-800/40 px-4 py-3 ${
                                        notification.read ? "bg-transparent" : "bg-sky-500/5"
                                    }`}
                                >
                                    <button
                                        onClick={() => handleNotificationClick(notification)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-start gap-2">
                                            <div
                                                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                                    notification.read
                                                        ? "bg-slate-700"
                                                        : "bg-sky-400"
                                                }`}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-slate-100">
                                                    {notification.title}
                                                </p>
                                                <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                                                    {notification.message}
                                                </p>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    {formatRelativeTime(notification.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </button>

                                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-4">
                                        <button
                                            onClick={() => toggleReadState(notification)}
                                            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                                        >
                                            {notification.read ? "Mark unread" : "Mark read"}
                                        </button>

                                        <button
                                            onClick={() => removeNotification(notification._id)}
                                            className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/10"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            Delete
                                        </button>

                                        {String(notification?.metadata?.kind || "") ===
                                            "follow_request" &&
                                            !notification?.read &&
                                            !notification?.metadata?.requestState &&
                                            Boolean(notification?.metadata?.requestId) && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            followRequestAction(
                                                                notification,
                                                                "approve"
                                                            )
                                                        }
                                                        disabled={
                                                            actionLoadingKey ===
                                                            `approve:${notification._id}`
                                                        }
                                                        className="rounded-md border border-emerald-500/35 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-60"
                                                    >
                                                        {actionLoadingKey ===
                                                        `approve:${notification._id}`
                                                            ? "..."
                                                            : "Approve"}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            followRequestAction(
                                                                notification,
                                                                "reject"
                                                            )
                                                        }
                                                        disabled={
                                                            actionLoadingKey ===
                                                            `reject:${notification._id}`
                                                        }
                                                        className="rounded-md border border-rose-500/35 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/15 disabled:opacity-60"
                                                    >
                                                        {actionLoadingKey ===
                                                        `reject:${notification._id}`
                                                            ? "..."
                                                            : "Reject"}
                                                    </button>
                                                </>
                                            )}

                                        {String(notification?.metadata?.kind || "") ===
                                            "followed_you" &&
                                            !notification?.metadata?.followActionState && (
                                                <button
                                                    onClick={() => followBack(notification)}
                                                    disabled={
                                                        actionLoadingKey ===
                                                        `follow:${notification._id}`
                                                    }
                                                    className="rounded-md border border-sky-500/35 px-2 py-1 text-[11px] text-sky-300 hover:bg-sky-500/15 disabled:opacity-60"
                                                >
                                                    {actionLoadingKey ===
                                                    `follow:${notification._id}`
                                                        ? "..."
                                                        : "Follow back"}
                                                </button>
                                            )}

                                        {String(notification?.metadata?.kind || "") ===
                                            "workspace_invite_request" &&
                                            !notification?.metadata?.requestState &&
                                            Boolean(notification?.metadata?.inviteId) && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            workspaceInviteAction(
                                                                notification,
                                                                "accept"
                                                            )
                                                        }
                                                        disabled={
                                                            actionLoadingKey ===
                                                            `workspace:accept:${notification._id}`
                                                        }
                                                        className="rounded-md border border-emerald-500/35 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-60"
                                                    >
                                                        {actionLoadingKey ===
                                                        `workspace:accept:${notification._id}`
                                                            ? "..."
                                                            : "Join"}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            workspaceInviteAction(
                                                                notification,
                                                                "reject"
                                                            )
                                                        }
                                                        disabled={
                                                            actionLoadingKey ===
                                                            `workspace:reject:${notification._id}`
                                                        }
                                                        className="rounded-md border border-rose-500/35 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/15 disabled:opacity-60"
                                                    >
                                                        {actionLoadingKey ===
                                                        `workspace:reject:${notification._id}`
                                                            ? "..."
                                                            : "Reject"}
                                                    </button>
                                                </>
                                            )}

                                        {String(notification?.metadata?.kind || "") ===
                                            "project_status_change_request" &&
                                            !notification?.metadata?.requestState &&
                                            Boolean(notification?.metadata?.requestId) && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            projectStatusRequestAction(
                                                                notification,
                                                                "approve"
                                                            )
                                                        }
                                                        disabled={
                                                            actionLoadingKey ===
                                                            `project-status:approve:${notification._id}`
                                                        }
                                                        className="rounded-md border border-emerald-500/35 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-60"
                                                    >
                                                        {actionLoadingKey ===
                                                        `project-status:approve:${notification._id}`
                                                            ? "..."
                                                            : "Approve"}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            projectStatusRequestAction(
                                                                notification,
                                                                "reject"
                                                            )
                                                        }
                                                        disabled={
                                                            actionLoadingKey ===
                                                            `project-status:reject:${notification._id}`
                                                        }
                                                        className="rounded-md border border-rose-500/35 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/15 disabled:opacity-60"
                                                    >
                                                        {actionLoadingKey ===
                                                        `project-status:reject:${notification._id}`
                                                            ? "..."
                                                            : "Reject"}
                                                    </button>
                                                </>
                                            )}

                                        {String(notification?.metadata?.kind || "") ===
                                            "global_task_assignee_request" &&
                                            !notification?.metadata?.requestState &&
                                            Boolean(notification?.metadata?.requestId) && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            taskAssigneeRequestAction(
                                                                notification,
                                                                "approve"
                                                            )
                                                        }
                                                        disabled={
                                                            actionLoadingKey ===
                                                            `task-assignee:approve:${notification._id}`
                                                        }
                                                        className="rounded-md border border-emerald-500/35 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-60"
                                                    >
                                                        {actionLoadingKey ===
                                                        `task-assignee:approve:${notification._id}`
                                                            ? "..."
                                                            : "Approve"}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            taskAssigneeRequestAction(
                                                                notification,
                                                                "reject"
                                                            )
                                                        }
                                                        disabled={
                                                            actionLoadingKey ===
                                                            `task-assignee:reject:${notification._id}`
                                                        }
                                                        className="rounded-md border border-rose-500/35 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/15 disabled:opacity-60"
                                                    >
                                                        {actionLoadingKey ===
                                                        `task-assignee:reject:${notification._id}`
                                                            ? "..."
                                                            : "Reject"}
                                                    </button>
                                                </>
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
