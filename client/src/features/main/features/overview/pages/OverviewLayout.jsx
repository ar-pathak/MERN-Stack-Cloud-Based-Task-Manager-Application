import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useDispatch, useSelector } from "react-redux";
import { getOverviewActivity } from "../../../../../service/overview.service";
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

import WorkspacePopup from "../../../components/popup/WorkspacePopup";
import TaskPopup from "../../../components/popup/TaskPopup";
import SubtaskPopup from "../../../components/popup/SubtaskPopup";
import ProjectPopup from "../../../components/popup/ProjectPopup";

import { useChatLogic } from "../hook/useChatLogic";
import { useOverviewRealtime } from "../hook/useOverviewRealtime";
import { useAuth } from "../../../../../context/AuthContext";
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

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
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
    } catch (error) {
      console.error("Failed to refresh timeline", error);
      showToast("Something went wrong while refreshing");
    }
  }, [dispatch, showToast]);

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

  const toggleExpand = (id) => {
    const next = new Set(expandedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedItems(next);
  };

  const handleOpenMentionFromChatItem = useCallback((chatItem) => {
    const chatId = String(chatItem?.chatId || chatItem?.id || chatItem?._id || "");
    const messageId = String(chatItem?.nextMentionMessageId || "");

    setSelectedItem(chatItem);
    if (chatId && messageId) {
      setPendingMentionJump({ chatId, messageId });
    }
  }, []);

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

  const isTimelineEmpty = !loadingTimeline && timeline.length === 0;
  const hasFilteredResults = filteredItems.length > 0;
  const selectedChatId = getItemChatId(selectedItem);
  const jumpToMessageId =
    pendingMentionJump && String(pendingMentionJump.chatId) === selectedChatId
      ? pendingMentionJump.messageId
      : null;

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <div className="w-96 border-r border-slate-800/50 bg-slate-950/40 backdrop-blur-xl flex flex-col overflow-hidden">
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

        <div className="flex-1 overflow-y-auto">
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
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              onCreateSubtask={handleCreateSubtask}
              onOpenMention={handleOpenMentionFromChatItem}
              onWorkspaceAction={handleWorkspaceItemCreate}
            />
          )}
        </div>
      </div>

      <div className="flex-1 h-full min-h-0 flex flex-col bg-slate-950 overflow-hidden">
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
                item={selectedItem}
                overview={overview}
                messages={chat.messages}
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
                chatEndRef={chat.refs.chatEndRef}
                fileInputRef={chat.refs.fileInputRef}
                messageInputRef={chat.refs.messageInputRef}
                onUpdate={refreshTimeline}
                jumpToMessageId={jumpToMessageId}
                onMentionJumpHandled={handleMentionJumpHandled}
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

      <WorkspacePopup
        isOpen={workspacePopupOpen}
        onClose={() => dispatch(setWorkspacePopupOpen(false))}
        onSubmit={async (data) => {
          await createWorkspace(data);
          await refreshTimeline();
          showToast("Workspace created successfully");
        }}
      />

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

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-500/90 text-white text-sm shadow-lg backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OverviewLayout;
