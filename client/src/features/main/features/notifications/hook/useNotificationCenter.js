import { useCallback, useEffect, useMemo, useState } from "react";

import {
    deleteNotification,
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
    markNotificationUnread
} from "../../../../../service/notification.service";
import {
    approveFollowRequest,
    checkFollowStatus,
    followUser,
    rejectFollowRequest
} from "../../../../../service/follow.service";
import { respondWorkspaceInvite } from "../../../../../service/workspace.service";
import * as socketService from "../../../../../service/Chat.socket.service";

const useNotificationCenter = ({ enabled = true, limit = 25 } = {}) => {
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [actionLoadingKey, setActionLoadingKey] = useState("");

    const unreadInList = useMemo(
        () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
        [notifications]
    );

    const hydrateFollowBackState = useCallback(async (notification) => {
        const kind = String(notification?.metadata?.kind || "");
        if (kind !== "followed_you" || notification?.metadata?.followActionState) {
            return notification;
        }

        const actorId = notification?.metadata?.actorId || notification?.actor?._id;
        if (!actorId) return notification;

        try {
            const status = await checkFollowStatus(actorId);
            const nextState = status?.isFollowing
                ? "following"
                : status?.isPending
                  ? "requested"
                  : "";

            return {
                ...notification,
                metadata: {
                    ...(notification?.metadata || {}),
                    followActionState: nextState
                }
            };
        } catch {
            return {
                ...notification,
                metadata: {
                    ...(notification?.metadata || {}),
                    followActionState: ""
                }
            };
        }
    }, []);

    const hydrateFollowBackStates = useCallback(
        async (items = []) => {
            const list = Array.isArray(items) ? items : [];
            const result = await Promise.all(
                list.map((notification) => hydrateFollowBackState(notification))
            );
            return result;
        },
        [hydrateFollowBackState]
    );

    const loadUnreadCount = useCallback(async () => {
        try {
            const count = await getUnreadNotificationCount();
            setUnreadCount(count);
        } catch (error) {
            console.error("Failed to load unread notification count", error);
        }
    }, []);

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const payload = await getNotifications({ limit });
            const hydrated = await hydrateFollowBackStates(payload?.notifications || []);
            setNotifications(hydrated);
            setUnreadCount(Number(payload?.unreadCount || 0));
        } catch (error) {
            console.error("Failed to load notifications", error);
        } finally {
            setLoading(false);
        }
    }, [hydrateFollowBackStates, limit]);

    useEffect(() => {
        loadUnreadCount();
    }, [loadUnreadCount]);

    useEffect(() => {
        if (!enabled) return;
        loadNotifications();
    }, [enabled, loadNotifications]);

    useEffect(() => {
        const offNew = socketService.onNotificationNew(async ({ notification }) => {
            if (!notification) return;
            const hydrated = await hydrateFollowBackState(notification);
            setNotifications((previous) =>
                [hydrated, ...previous.filter((entry) => entry._id !== hydrated._id)].slice(
                    0,
                    limit
                )
            );
        });

        const offUpdated = socketService.onNotificationUpdated(({ notification }) => {
            if (!notification) return;
            setNotifications((previous) =>
                previous.map((entry) =>
                    entry._id === notification._id ? notification : entry
                )
            );
        });

        const offDeleted = socketService.onNotificationDeleted(({ notificationId }) => {
            if (!notificationId) return;
            setNotifications((previous) =>
                previous.filter((entry) => entry._id !== notificationId)
            );
        });

        const offBulk = socketService.onNotificationBulk(() => {
            if (enabled) loadNotifications();
        });

        const offAllRead = socketService.onNotificationAllRead(() => {
            setNotifications((previous) =>
                previous.map((entry) => ({
                    ...entry,
                    read: true,
                    readAt: new Date().toISOString()
                }))
            );
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
    }, [enabled, hydrateFollowBackState, limit, loadNotifications]);

    const toggleReadState = useCallback(
        async (notification) => {
            if (!notification?._id) return;
            try {
                if (notification.read) {
                    const updated = await markNotificationUnread(notification._id);
                    setNotifications((previous) =>
                        previous.map((entry) =>
                            entry._id === updated._id ? updated : entry
                        )
                    );
                } else {
                    const updated = await markNotificationRead(notification._id);
                    setNotifications((previous) =>
                        previous.map((entry) =>
                            entry._id === updated._id ? updated : entry
                        )
                    );
                }
                loadUnreadCount();
            } catch (error) {
                console.error("Failed to toggle read state", error);
            }
        },
        [loadUnreadCount]
    );

    const ensureRead = useCallback(
        async (notification) => {
            if (!notification?._id || notification?.read) return notification;
            try {
                const updated = await markNotificationRead(notification._id);
                setNotifications((previous) =>
                    previous.map((entry) =>
                        entry._id === updated._id ? updated : entry
                    )
                );
                loadUnreadCount();
                return updated;
            } catch (error) {
                console.error("Failed to mark notification as read", error);
                return notification;
            }
        },
        [loadUnreadCount]
    );

    const removeNotification = useCallback(
        async (notificationId) => {
            if (!notificationId) return;
            try {
                await deleteNotification(notificationId);
                setNotifications((previous) =>
                    previous.filter((entry) => entry._id !== notificationId)
                );
                loadUnreadCount();
            } catch (error) {
                console.error("Failed to delete notification", error);
            }
        },
        [loadUnreadCount]
    );

    const markAllRead = useCallback(async () => {
        try {
            await markAllNotificationsRead();
            setNotifications((previous) =>
                previous.map((entry) => ({
                    ...entry,
                    read: true,
                    readAt: new Date().toISOString()
                }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all notifications read", error);
        }
    }, []);

    const followBack = useCallback(
        async (notification) => {
            const notificationId = notification?._id;
            const actorId = notification?.metadata?.actorId || notification?.actor?._id;
            if (!notificationId || !actorId) return;

            const actionKey = `follow:${notificationId}`;
            setActionLoadingKey(actionKey);
            try {
                const result = await followUser(actorId);
                await markNotificationRead(notificationId);
                setNotifications((previous) =>
                    previous.map((entry) =>
                        entry._id === notificationId
                            ? {
                                  ...entry,
                                  read: true,
                                  readAt: new Date().toISOString(),
                                  metadata: {
                                      ...(entry.metadata || {}),
                                      followActionState: result?.isPending
                                          ? "requested"
                                          : "following"
                                  }
                              }
                            : entry
                    )
                );
                loadUnreadCount();
            } catch (error) {
                console.error("Failed to follow from notification", error);
            } finally {
                setActionLoadingKey("");
            }
        },
        [loadUnreadCount]
    );

    const followRequestAction = useCallback(
        async (notification, action) => {
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
                setNotifications((previous) =>
                    previous.map((entry) =>
                        entry._id === notificationId
                            ? {
                                  ...entry,
                                  read: true,
                                  readAt: new Date().toISOString(),
                                  metadata: {
                                      ...(entry.metadata || {}),
                                      requestState: updatedState
                                  }
                              }
                            : entry
                    )
                );
                loadUnreadCount();
            } catch (error) {
                const notFound =
                    Number(error?.status) === 404 ||
                    String(error?.message || "")
                        .toLowerCase()
                        .includes("not found");

                if (notFound) {
                    try {
                        await markNotificationRead(notificationId);
                    } catch {
                        // noop
                    }

                    setNotifications((previous) =>
                        previous.map((entry) =>
                            entry._id === notificationId
                                ? {
                                      ...entry,
                                      read: true,
                                      readAt: new Date().toISOString(),
                                      metadata: {
                                          ...(entry.metadata || {}),
                                          requestState: "expired"
                                      }
                                  }
                                : entry
                        )
                    );
                    loadUnreadCount();
                    return;
                }

                console.error("Failed follow request action", error);
            } finally {
                setActionLoadingKey("");
            }
        },
        [loadUnreadCount]
    );

    const workspaceInviteAction = useCallback(
        async (notification, action) => {
            const notificationId = notification?._id;
            const inviteId = notification?.metadata?.inviteId;
            if (!notificationId || !inviteId) return null;

            const actionKey = `workspace:${action}:${notificationId}`;
            setActionLoadingKey(actionKey);

            try {
                const result = await respondWorkspaceInvite({ inviteId, action });
                await markNotificationRead(notificationId);

                setNotifications((previous) =>
                    previous.map((entry) =>
                        entry._id === notificationId
                            ? {
                                  ...entry,
                                  read: true,
                                  readAt: new Date().toISOString(),
                                  metadata: {
                                      ...(entry.metadata || {}),
                                      requestState: action === "accept" ? "accepted" : "rejected"
                                  }
                              }
                            : entry
                    )
                );
                loadUnreadCount();
                return result;
            } catch (error) {
                const alreadyHandled =
                    Number(error?.status) === 404
                    || String(error?.message || "").toLowerCase().includes("processed")
                    || String(error?.message || "").toLowerCase().includes("not found");

                if (alreadyHandled) {
                    try {
                        await markNotificationRead(notificationId);
                    } catch {
                        // noop
                    }
                    setNotifications((previous) =>
                        previous.map((entry) =>
                            entry._id === notificationId
                                ? {
                                      ...entry,
                                      read: true,
                                      readAt: new Date().toISOString(),
                                      metadata: {
                                          ...(entry.metadata || {}),
                                          requestState: "expired"
                                      }
                                  }
                                : entry
                        )
                    );
                    loadUnreadCount();
                    return null;
                }

                console.error("Failed workspace invite action", error);
                return null;
            } finally {
                setActionLoadingKey("");
            }
        },
        [loadUnreadCount]
    );

    return {
        loading,
        notifications,
        unreadCount,
        unreadInList,
        actionLoadingKey,
        loadNotifications,
        loadUnreadCount,
        toggleReadState,
        ensureRead,
        removeNotification,
        markAllRead,
        followBack,
        followRequestAction,
        workspaceInviteAction
    };
};

export default useNotificationCenter;
