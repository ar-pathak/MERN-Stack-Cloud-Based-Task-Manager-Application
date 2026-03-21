import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useDispatch, useSelector } from "react-redux";
import { getOverviewActivity } from "../../../../../service/overview.service";
import { getConversations } from "../../../../../service/chat.service";
import { createWorkspace } from "../../../../../service/workspace.service";
import { createProject } from "../../../../../service/project.service";
import { createSubtask } from "../../../../../service/subtask.service";
import {
  setOverviewData,
  setTaskPopupOpen,
  setWorkspacePopupOpen,
  setIsProjectPopupOpen,
  setIsSubtaskPopupOpen,
} from "../../../../../store/slice/overviewSlice";

import ChatPanel from "../components/chat/ChatPanel";
import EmptyState from "../components/EmptyState";
import SidebarHeader from "../components/SidebarHeader";
import EmptyTimelineState from "../components/sidebar/EmptyTimelineState";
import NoResultsState from "../components/sidebar/NoResultsState";
import TimelineItemsList from "../components/sidebar/TimelineItemsList";
import TimelineSkeleton from "../components/sidebar/TimelineSkeleton";

// Lazy-load popup components (loaded only when opened)
const WorkspacePopup = lazy(() => import("../../../components/popup/WorkspacePopup"));
const TaskPopup = lazy(() => import("../../../components/popup/TaskPopup"));
const SubtaskPopup = lazy(() => import("../../../components/popup/SubtaskPopup"));
const ProjectPopup = lazy(() => import("../../../components/popup/ProjectPopup"));
import MobileBottomNav from "../../../components/navigation/MobileBottomNav";

import { useChatLogic } from "../hook/useChatLogic";
import { useOverviewRealtime } from "../hook/useOverviewRealtime";
import { useAuth } from "../../../../../context/AuthContext";
import { onUserStatus } from "../../../../../service/Chat.socket.service";
import {
  applySidebarActivityUpdate,
  applyUnreadUpdate,
  enrichTimeline,
  filterTimelineItems,
  getItemChatId,
  getProjectOptions,
  getWorkspaceOptions,
  normalizeOverviewNode,
} from "../utils/overviewTimeline";

const MOBILE_BREAKPOINT = 1024;
const toIdString = (value) => String(value?._id || value?.id || value || "");

const mergePresenceIntoMembers = (members = [], presenceByUserId = {}) =>
  (members || []).map((member) => {
    const memberId = toIdString(member);
    const livePresence = presenceByUserId[memberId];
    const fallbackOnline = Boolean(member?.isOnline || member?.online);

    return {
      ...member,
      _id: memberId || member?._id,
      id: memberId || member?.id,
      isOnline: typeof livePresence?.isOnline === "boolean" ? livePresence.isOnline : fallbackOnline,
      online: typeof livePresence?.isOnline === "boolean" ? livePresence.isOnline : fallbackOnline,
      lastSeen: livePresence?.lastSeen || member?.lastSeen || null,
    };
  });

const OverviewLayout = () => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [overview] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [pendingMentionJump, setPendingMentionJump] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  const [mobilePane, setMobilePane] = useState("overview");
  const [chatMetaById, setChatMetaById] = useState({});
  const [presenceByUserId, setPresenceByUserId] = useState({});

  const { user } = useAuth();

  const [taskCreationContext, setTaskCreationContext] = useState({
    level: "global",
    workspaceId: null,
    projectId: null,
  });

  const dispatch = useDispatch();
  const timelineRaw = useSelector((state) => state.overview.overviewData?.timeline);
  const { workspacePopupOpen, taskPopupOpen, isSubtaskPopupOpen, isProjectPopupOpen } = useSelector(
    (state) => state.overview
  );

  const timeline = useMemo(() => timelineRaw || [], [timelineRaw]);
  const chat = useChatLogic(selectedItem);
  const timelineRef = useRef(timeline);

  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setMobilePane("overview");
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport && mobilePane === "chat" && !selectedItem) {
      setMobilePane("overview");
    }
  }, [isMobileViewport, mobilePane, selectedItem]);

  useEffect(() => {
    const unsubscribe = onUserStatus((payload) => {
      const userId = toIdString(payload?._id || payload?.id);
      if (!userId) return;

      setPresenceByUserId((prev) => ({
        ...prev,
        [userId]: {
          isOnline: Boolean(payload?.isOnline),
          lastSeen: payload?.lastSeen || prev[userId]?.lastSeen || null,
        },
      }));
    });

    return () => unsubscribe?.();
  }, []);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const refreshChatMetadata = useCallback(async () => {
    try {
      const conversations = await getConversations();
      const nextMeta = {};

      (conversations || []).forEach((chatItem) => {
        const chatId = toIdString(chatItem?._id || chatItem?.id);
        if (!chatId) return;

        const members = (chatItem?.members || []).map((member) => ({
          ...member,
          _id: toIdString(member),
          id: toIdString(member),
          isOnline: Boolean(member?.isOnline),
        }));

        nextMeta[chatId] = {
          chatId,
          chatType: chatItem?.type || null,
          muted: Boolean(chatItem?.muted),
          archived: Boolean(chatItem?.archived),
          members,
          memberCount: members.length,
          onlineMemberCount: members.filter((member) => member?.isOnline).length,
          adminId: toIdString(chatItem?.admin),
          name: chatItem?.name || "",
          avatar: chatItem?.avatar || "",
        };
      });

      setChatMetaById((prev) => ({ ...prev, ...nextMeta }));
    } catch (error) {
      console.error("Failed to refresh chat metadata", error);
    }
  }, []);

  const refreshTimeline = useCallback(async () => {
    try {
      const res = await getOverviewActivity();
      const payload = res?.data?.data || res?.data || res;

      if (!Array.isArray(payload)) {
        console.error("Timeline refresh: expected array, got:", payload);
        return;
      }

      const normalized = payload.map(normalizeOverviewNode);
      dispatch(setOverviewData({ timeline: normalized }));
      await refreshChatMetadata();
    } catch (error) {
      console.error("Failed to refresh timeline", error);
      showToast("Something went wrong while refreshing");
    }
  }, [dispatch, refreshChatMetadata, showToast]);

  const handleSidebarActivity = useCallback(
    (chatId, messageData) => {
      const currentTimeline = timelineRef.current;
      const nextTimeline = applySidebarActivityUpdate(currentTimeline, chatId, messageData);

      if (nextTimeline !== currentTimeline) {
        dispatch(setOverviewData({ timeline: nextTimeline }));
      }
    },
    [dispatch]
  );

  const handleUnreadUpdate = useCallback(
    (data) => {
      const currentTimeline = timelineRef.current;
      const nextTimeline = applyUnreadUpdate(currentTimeline, data);
      dispatch(setOverviewData({ timeline: nextTimeline }));
    },
    [dispatch]
  );

  const handleReceiveMessageEvent = useCallback(
    ({ chatId, message }) => {
      handleSidebarActivity(chatId, message);
    },
    [handleSidebarActivity]
  );

  const handleMessageReadEvent = useCallback(
    ({ chatId }) => {
      handleUnreadUpdate({ chatId, reset: true });
    },
    [handleUnreadUpdate]
  );

  const handleOverviewUpdateEvent = useCallback(
    (payload) => {
      if (Array.isArray(payload)) {
        const normalized = payload.map(normalizeOverviewNode);
        dispatch(setOverviewData({ timeline: normalized }));
        return;
      }

      refreshTimeline();
    },
    [dispatch, refreshTimeline]
  );

  const handleOverviewUnreadEvent = useCallback(
    (payload) => {
      handleUnreadUpdate(payload);
    },
    [handleUnreadUpdate]
  );

  const {
    activeCallsByChatId,
    mentionByChatId,
    callInviteByChatId,
    refreshUnreadMentions,
    refreshUnreadCallInvites,
  } = useOverviewRealtime({
    onReceiveMessageEvent: handleReceiveMessageEvent,
    onMessageReadEvent: handleMessageReadEvent,
    onOverviewUpdateEvent: handleOverviewUpdateEvent,
    onOverviewUnreadEvent: handleOverviewUnreadEvent,
  });

  useEffect(() => {
    if (selectedItem) {
      const chatId = selectedItem.id || selectedItem._id;
      handleUnreadUpdate({ chatId, reset: true });

      const timer = setTimeout(() => {
        refreshUnreadMentions();
        refreshUnreadCallInvites();
      }, 400);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [selectedItem, handleUnreadUpdate, refreshUnreadMentions, refreshUnreadCallInvites]);

  const handleSendMessageWrapper = async (options) => {
    const contentToSend = chat.chatMessage;
    const currentChatId = selectedItem?.id || selectedItem?._id;

    await chat.handleSendMessage(options);

    if (currentChatId && (contentToSend.trim() || options?.attachments)) {
      const optimisticMessage = {
        _id: `temp-${Date.now()}`,
        content: options?.attachments ? "Sent an attachment" : contentToSend,
        sender: user,
        createdAt: new Date().toISOString(),
      };

      handleSidebarActivity(currentChatId, optimisticMessage);
    }
  };

  useEffect(() => {
    setLoadingTimeline(true);
    refreshTimeline().finally(() => setLoadingTimeline(false));
  }, [refreshTimeline]);

  useEffect(() => {
    refreshChatMetadata();
  }, [refreshChatMetadata]);

  const toggleExpand = (id) => {
    const next = new Set(expandedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedItems(next);
  };

  const handleMobileOpenChat = useCallback(
    (timelineItem) => {
      if (!timelineItem) return;
      setSelectedItem(timelineItem);
      if (isMobileViewport) {
        setMobilePane("chat");
      }
    },
    [isMobileViewport]
  );

  const handleOpenMentionFromChatItem = useCallback((chatItem) => {
    const chatId = String(chatItem?.chatId || chatItem?.id || chatItem?._id || "");
    const messageId = String(chatItem?.nextMentionMessageId || "");

    setSelectedItem(chatItem);
    if (isMobileViewport) {
      setMobilePane("chat");
    }
    if (chatId && messageId) {
      setPendingMentionJump({ chatId, messageId });
    }
  }, [isMobileViewport]);

  const handleMentionJumpHandled = useCallback(
    (handledMessageId) => {
      setPendingMentionJump((prev) => {
        if (!prev) return null;
        if (handledMessageId && String(prev.messageId) !== String(handledMessageId)) {
          return prev;
        }
        return null;
      });

      refreshUnreadMentions();
      refreshUnreadCallInvites();
    },
    [refreshUnreadMentions, refreshUnreadCallInvites]
  );

  const enrichedTimeline = useMemo(
    () => enrichTimeline(timeline, activeCallsByChatId, mentionByChatId, callInviteByChatId),
    [timeline, activeCallsByChatId, mentionByChatId, callInviteByChatId]
  );

  const filteredItems = useMemo(
    () => filterTimelineItems(enrichedTimeline, searchQuery, filterType),
    [enrichedTimeline, searchQuery, filterType]
  );

  const handleCreateGlobalTask = () => {
    setTaskCreationContext({
      level: "global",
      workspaceId: null,
      projectId: null,
    });
    dispatch(setTaskPopupOpen(true));
  };

  const handleCreateWorkspaceTask = (workspace) => {
    setTaskCreationContext({
      level: "workspace",
      workspaceId: workspace.id,
      projectId: null,
    });
    dispatch(setTaskPopupOpen(true));
  };

  const handleCreateProjectTask = (workspace, project) => {
    setTaskCreationContext({
      level: "project",
      workspaceId: workspace.id,
      projectId: project.id,
    });
    dispatch(setTaskPopupOpen(true));
  };

  const handleCreateSubtask = (task) => {
    setSelectedTask(task);
    dispatch(setIsSubtaskPopupOpen(true));
  };

  const handleCreateProject = (workspace) => {
    setSelectedWorkspace(workspace);
    dispatch(setIsProjectPopupOpen(true));
  };

  const handleWorkspaceItemCreate = (workspace, type, context, project, task) => {
    if (type === "project") {
      handleCreateProject(workspace);
      return;
    }

    if (type === "task") {
      if (context === "project" && project) {
        handleCreateProjectTask(workspace, project);
      } else {
        handleCreateWorkspaceTask(workspace);
      }
      return;
    }

    if (type === "subtask") {
      setSelectedWorkspace(workspace);
      setSelectedTask(task);
      dispatch(setIsSubtaskPopupOpen(true));
    }
  };

  const workspaces = useMemo(() => getWorkspaceOptions(timeline), [timeline]);
  const projects = useMemo(() => getProjectOptions(timeline), [timeline]);
  const teams = [];
  const selectedChatItem = useMemo(() => {
    if (!selectedItem) return null;

    const chatId = toIdString(selectedItem?.chatId || selectedItem?.id || selectedItem?._id);
    const chatMeta = chatMetaById[chatId];
    const mergedMembers = mergePresenceIntoMembers(
      chatMeta?.members?.length ? chatMeta.members : selectedItem?.members || [],
      presenceByUserId
    );

    const merged = {
      ...selectedItem,
      chatId: selectedItem?.chatId || chatId,
      chatType: selectedItem?.chatType || chatMeta?.chatType || selectedItem?.type,
      muted: typeof chatMeta?.muted === "boolean" ? chatMeta.muted : Boolean(selectedItem?.muted),
      archived: typeof chatMeta?.archived === "boolean" ? chatMeta.archived : Boolean(selectedItem?.archived),
      members: mergedMembers,
      memberCount:
        selectedItem?.memberCount ??
        chatMeta?.memberCount ??
        mergedMembers.length,
      onlineMemberCount:
        selectedItem?.onlineMemberCount ??
        chatMeta?.onlineMemberCount ??
        mergedMembers.filter((member) => member?.isOnline).length,
      chatAdminId: selectedItem?.chatAdminId || chatMeta?.adminId || null,
    };

    const normalizedChatType = String(merged?.chatType || "").toLowerCase();
    if (normalizedChatType === "private") {
      const currentUserId = toIdString(user?._id || user?.id);
      const otherMember =
        mergedMembers.find((member) => toIdString(member) !== currentUserId) ||
        mergedMembers[0];

      if (otherMember) {
        merged.userId = toIdString(otherMember);
        merged.avatar = merged.avatar || otherMember?.avatar || "";
        merged.name = merged.name || merged.title || otherMember?.name || "Unknown User";
        merged.title = merged.title || merged.name;
        merged.isOnline = Boolean(otherMember?.isOnline);
        merged.lastSeen = otherMember?.lastSeen || merged.lastSeen || null;
      }
    }

    return merged;
  }, [selectedItem, chatMetaById, presenceByUserId, user]);

  const isTimelineEmpty = !loadingTimeline && timeline.length === 0;
  const hasFilteredResults = filteredItems.length > 0;
  const selectedChatId = getItemChatId(selectedChatItem || selectedItem);
  const jumpToMessageId =
    pendingMentionJump && String(pendingMentionJump.chatId) === selectedChatId
      ? pendingMentionJump.messageId
      : null;
  const showOverviewPane = !isMobileViewport || mobilePane === "overview";
  const showChatPane = !isMobileViewport || mobilePane === "chat";
  const profileId = user?._id || user?.id;
  const shouldShowBottomMenu = isMobileViewport && mobilePane !== "chat";
  const handleLeaveChatSuccess = useCallback(async () => {
    setSelectedItem(null);
    setPendingMentionJump(null);
    if (isMobileViewport) {
      setMobilePane("overview");
    }
    await refreshTimeline();
  }, [isMobileViewport, refreshTimeline]);

  return (
    <div className={`flex h-full min-h-0 bg-slate-950 overflow-hidden ${shouldShowBottomMenu ? "pb-[5.25rem]" : ""}`}>
      <div
        className={`${showOverviewPane ? "flex" : "hidden"} ${
          isMobileViewport ? "w-full" : "w-[22rem]"
        } border-r border-slate-800/50 bg-slate-950/40 backdrop-blur-xl flex-col overflow-hidden`}
      >
        <SidebarHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterType={filterType}
          setFilterType={setFilterType}
          onCreateGlobalTask={handleCreateGlobalTask}
        />

        {loadingTimeline && (
          <div className="h-0.5 w-full overflow-hidden bg-slate-800">
            <div className="h-full w-1/3 bg-sky-500 animate-[loading_1.2s_ease-in-out_infinite]" />
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loadingTimeline && <TimelineSkeleton />}

          {!loadingTimeline && isTimelineEmpty && (
            <EmptyTimelineState
              onCreateTask={handleCreateGlobalTask}
              onCreateWorkspace={() => dispatch(setWorkspacePopupOpen(true))}
            />
          )}

          {!loadingTimeline && !isTimelineEmpty && !hasFilteredResults && (
            <NoResultsState searchQuery={searchQuery} />
          )}

          {!loadingTimeline && hasFilteredResults && (
            <TimelineItemsList
              items={filteredItems}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
              onOpenChat={handleMobileOpenChat}
              isMobile={isMobileViewport}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              onCreateSubtask={handleCreateSubtask}
              onOpenMention={handleOpenMentionFromChatItem}
              onWorkspaceAction={handleWorkspaceItemCreate}
            />
          )}
        </div>
      </div>

      <div className={`${showChatPane ? "flex" : "hidden"} flex-1 h-full min-h-0 min-w-0 flex-col bg-slate-950 overflow-hidden`}>
        <AnimatePresence mode="wait">
          {selectedItem ? (
            <motion.div
              key={selectedItem.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 h-full min-h-0 flex flex-col overflow-hidden"
            >
              <ChatPanel
                item={selectedChatItem || selectedItem}
                overview={overview}
                messages={chat.messages}
                isLoadingMessages={chat.isLoading}
                chatMessage={chat.chatMessage}
                setChatMessage={chat.setChatMessage}
                handleSendMessage={handleSendMessageWrapper}
                showChatInfo={chat.showChatInfo}
                setShowChatInfo={chat.setShowChatInfo}
                selectedMessage={chat.selectedMessage}
                setSelectedMessage={chat.setSelectedMessage}
                handleDeleteMessage={chat.handleDeleteMessage}
                handlePinMessage={chat.handlePinMessage}
                handleEditMessage={chat.handleEditMessage}
                handleReaction={chat.handleReaction}
                handleTyping={chat.handleTyping}
                isTyping={chat.isTyping}
                typingUsers={chat.typingUsers}
                handleFileUpload={chat.handleFileUpload}
                uploadingFile={chat.uploadingFile}
                showEmojiPicker={chat.showEmojiPicker}
                setShowEmojiPicker={chat.setShowEmojiPicker}
                chatAccessError={chat.chatAccessError}
                sendPermissionError={chat.sendPermissionError}
                canSendMessages={chat.canSendMessages}
                chatEndRef={chat.refs.chatEndRef}
                fileInputRef={chat.refs.fileInputRef}
                messageInputRef={chat.refs.messageInputRef}
                onUpdate={refreshTimeline}
                onRefreshChatMeta={refreshChatMetadata}
                presenceByUserId={presenceByUserId}
                onLeaveSuccess={handleLeaveChatSuccess}
                jumpToMessageId={jumpToMessageId}
                onMentionJumpHandled={handleMentionJumpHandled}
                onMobileBack={isMobileViewport ? () => setMobilePane("overview") : null}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 h-full min-h-0 overflow-hidden"
            >
              <EmptyState />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isMobileViewport && (
        <MobileBottomNav
          activeTab="overview"
          profileId={profileId}
          hidden={mobilePane === "chat"}
        />
      )}

      <TaskPopup
        isOpen={taskPopupOpen}
        onClose={() => dispatch(setTaskPopupOpen(false))}
        onSubmit={async () => {
          await refreshTimeline();
          showToast("Task created successfully");
        }}
        level={taskCreationContext.level}
        workspaceId={taskCreationContext.workspaceId}
        projectId={taskCreationContext.projectId}
        workspaces={workspaces}
        projects={projects}
        teams={teams}
      />

      {/* Lazy-loaded popups with Suspense - loaded only when opened */}
      {workspacePopupOpen && (
        <Suspense fallback={null}>
          <WorkspacePopup
            isOpen={workspacePopupOpen}
            onClose={() => dispatch(setWorkspacePopupOpen(false))}
            onSubmit={async (data) => {
              await createWorkspace(data);
              await refreshTimeline();
              showToast("Workspace created successfully");
            }}
          />
        </Suspense>
      )}

      {isProjectPopupOpen && (
        <Suspense fallback={null}>
          <ProjectPopup
            isOpen={isProjectPopupOpen}
            onClose={() => dispatch(setIsProjectPopupOpen(false))}
            onSubmit={async (projectData) => {
              if (!selectedWorkspace?.id) {
                showToast("Please select a workspace first");
                return;
              }

              await createProject(selectedWorkspace.id, projectData);
              await refreshTimeline();
              showToast("Project created successfully");
            }}
            workspaceId={selectedWorkspace?.id}
            workspaceName={selectedWorkspace?.name}
            teams={teams}
          />
        </Suspense>
      )}

      {isSubtaskPopupOpen && (
        <Suspense fallback={null}>
          <SubtaskPopup
            isOpen={isSubtaskPopupOpen}
            onClose={() => dispatch(setIsSubtaskPopupOpen(false))}
            onSubmit={async (data) => {
              await createSubtask(data);
              await refreshTimeline();
              showToast("Subtask created successfully");
            }}
            taskId={selectedTask?.id || selectedTask?._id}
            taskTitle={selectedTask?.title}
          />
        </Suspense>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`fixed right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-500/90 text-white text-sm shadow-lg backdrop-blur-sm ${
              shouldShowBottomMenu ? "bottom-24 left-6" : "bottom-6"
            }`}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OverviewLayout;
