import { useCallback, useEffect, useState } from "react";
import {
  onReceiveMessage,
  onMessageRead,
  onOverviewUpdate,
  onOverviewUnread,
  onCallIncoming,
  onCallInitiated,
  onCallEnded,
} from "../../../../../service/Chat.socket.service";
import api from "../../../../../config/axios";
import { getUnreadMentionSummary } from "../../../../../service/chat.service";

export const useOverviewRealtime = ({
  onReceiveMessageEvent,
  onMessageReadEvent,
  onOverviewUpdateEvent,
  onOverviewUnreadEvent,
}) => {
  const [activeCallsByChatId, setActiveCallsByChatId] = useState({});
  const [mentionByChatId, setMentionByChatId] = useState({});

  const upsertActiveCall = useCallback((payload) => {
    const call = payload?.call || payload;
    const callId = String(payload?.callId || call?._id || call?.callId || "");
    const chatId = String(payload?.chatId || call?.chatId?._id || call?.chatId || "");

    if (!callId || !chatId) {
      return;
    }

    setActiveCallsByChatId((prev) => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || {}),
        ...call,
        callId,
        _id: callId,
        chatId,
      },
    }));
  }, []);

  const removeActiveCall = useCallback((payload) => {
    const callId = String(payload?.callId || payload?._id || "");
    const chatId = String(payload?.chatId || payload?.call?.chatId?._id || payload?.call?.chatId || "");

    setActiveCallsByChatId((prev) => {
      if (chatId && prev[chatId]) {
        const next = { ...prev };
        delete next[chatId];
        return next;
      }

      if (!callId) {
        return prev;
      }

      const next = { ...prev };
      for (const [key, value] of Object.entries(next)) {
        const existingCallId = String(value?.callId || value?._id || "");
        if (existingCallId === callId) {
          delete next[key];
        }
      }
      return next;
    });
  }, []);

  const refreshActiveCalls = useCallback(async () => {
    try {
      const response = await api.get("/api/calls/active/list");
      const activeCalls = response?.data?.data?.activeCalls || response?.data?.activeCalls || [];
      const byChat = {};

      for (const call of activeCalls) {
        const chatId = String(call?.chatId?._id || call?.chatId || "");
        const callId = String(call?._id || call?.callId || "");

        if (!chatId || !callId) {
          continue;
        }

        byChat[chatId] = {
          ...call,
          callId,
          _id: callId,
          chatId,
        };
      }

      setActiveCallsByChatId(byChat);
    } catch (_error) {
      // Ignore transient failures and recover on next poll/socket event.
    }
  }, []);

  const refreshUnreadMentions = useCallback(async () => {
    try {
      const payload = await getUnreadMentionSummary({ limit: 300 });
      setMentionByChatId(payload?.byChat || {});
    } catch (_error) {
      // Ignore transient failures and recover on next poll/socket event.
    }
  }, []);

  useEffect(() => {
    refreshActiveCalls();
    const interval = setInterval(refreshActiveCalls, 15000);
    return () => clearInterval(interval);
  }, [refreshActiveCalls]);

  useEffect(() => {
    refreshUnreadMentions();
    const interval = setInterval(refreshUnreadMentions, 20000);
    return () => clearInterval(interval);
  }, [refreshUnreadMentions]);

  useEffect(() => {
    const handleReceiveMessage = (payload) => {
      onReceiveMessageEvent?.(payload);
      refreshUnreadMentions();
    };

    const handleMessageRead = (payload) => {
      onMessageReadEvent?.(payload);
      refreshUnreadMentions();
    };

    const handleOverviewUpdate = (payload) => {
      onOverviewUpdateEvent?.(payload);
      refreshUnreadMentions();
    };

    const handleOverviewUnread = (payload) => {
      onOverviewUnreadEvent?.(payload);
    };

    const handleCallIncoming = (payload) => {
      upsertActiveCall(payload);
    };

    const handleCallInitiated = (payload) => {
      upsertActiveCall(payload);
    };

    const handleCallEnded = (payload) => {
      removeActiveCall(payload);
    };

    const unsubReceive = onReceiveMessage(handleReceiveMessage);
    const unsubRead = onMessageRead(handleMessageRead);
    const unsubOverview = onOverviewUpdate(handleOverviewUpdate);
    const unsubUnread = onOverviewUnread(handleOverviewUnread);
    const unsubCallIncoming = onCallIncoming(handleCallIncoming);
    const unsubCallInitiated = onCallInitiated(handleCallInitiated);
    const unsubCallEnded = onCallEnded(handleCallEnded);

    return () => {
      unsubReceive();
      unsubRead();
      unsubOverview();
      unsubUnread();
      unsubCallIncoming();
      unsubCallInitiated();
      unsubCallEnded();
    };
  }, [
    onReceiveMessageEvent,
    onMessageReadEvent,
    onOverviewUpdateEvent,
    onOverviewUnreadEvent,
    refreshUnreadMentions,
    upsertActiveCall,
    removeActiveCall,
  ]);

  return {
    activeCallsByChatId,
    mentionByChatId,
    refreshActiveCalls,
    refreshUnreadMentions,
    upsertActiveCall,
    removeActiveCall,
  };
};
