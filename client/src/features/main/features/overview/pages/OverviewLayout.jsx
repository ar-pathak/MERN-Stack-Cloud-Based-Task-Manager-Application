import { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Services & Store
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
  setIsSubtaskPopupOpen
} from "../../../../../store/slice/overviewSlice";

// Components
import WorkspaceItem from "../components/WorkspaceItem";
import TaskItem from "../components/TaskItem";
import ChatPanel from "../components/chat/ChatPanel";
import EmptyState from "../components/EmptyState";
import SidebarHeader from "../components/SidebarHeader";

// Popups
import WorkspacePopup from "../../../components/popup/WorkspacePopup";
import TaskPopup from "../../../components/popup/TaskPopup";
import SubtaskPopup from "../../../components/popup/SubtaskPopup";
import ProjectPopup from "../../../components/popup/ProjectPopup";

// Hooks
import { useChatLogic } from "../hook/useChatLogic";

// Skeleton Loader Component
const SkeletonLoader = () => {
  return (
    <div className="space-y-3 p-2 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="space-y-2">
          {/* Main item skeleton */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30">
            <div className="w-8 h-8 rounded-lg bg-slate-700/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700/50 rounded w-3/4" />
              <div className="h-3 bg-slate-700/30 rounded w-1/2" />
            </div>
            <div className="w-16 h-6 bg-slate-700/30 rounded" />
          </div>

          {/* Nested items skeleton (for some items) */}
          {i % 2 === 0 && (
            <div className="ml-8 space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/20">
                <div className="w-6 h-6 rounded bg-slate-700/40" />
                <div className="flex-1">
                  <div className="h-3 bg-slate-700/40 rounded w-2/3" />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Empty Timeline State Component
const EmptyTimeline = ({ onCreateTask, onCreateWorkspace }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full p-8 text-center"
    >
      <div className="relative mb-6">
        {/* Animated background circle */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 -m-8 rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20 blur-2xl"
        />

        {/* Icon */}
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-200 mb-2">
        There is no activity
      </h3>
      <p className="text-sm text-slate-400 mb-6 max-w-xs">
        Create your first workspace or task and organize your work
      </p>

      <div className="flex gap-3">
        <button
          onClick={onCreateWorkspace}
          className="group relative px-5 py-2.5 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white text-sm font-medium shadow-lg shadow-sky-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <span className="relative z-10 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Workspace
          </span>
        </button>

        <button
          onClick={onCreateTask}
          className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-medium border border-slate-700/50 hover:border-slate-600 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Create Task
          </span>
        </button>
      </div>
    </motion.div>
  );
};

const OverviewLayout = () => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [overview, setOverview] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [toast, setToast] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // NEW: Task creation context
  const [taskCreationContext, setTaskCreationContext] = useState({
    level: 'global',
    workspaceId: null,
    projectId: null
  });

  const dispatch = useDispatch();
  const timelineRaw = useSelector((state) => state.overview.overviewData?.timeline);
  const {
    workspacePopupOpen,
    taskPopupOpen,
    isSubtaskPopupOpen,
    isProjectPopupOpen
  } = useSelector((state) => state.overview);

  const timeline = useMemo(() => timelineRaw || [], [timelineRaw]);
  const chat = useChatLogic(selectedItem);

  // Normalize data helper
  const normalizeNode = useCallback((item) => {
    if (item.type === "workspace") {
      const projects = (item.projects || []).map(normalizeNode);
      const tasks = (item.tasks || []).map(normalizeNode);
      return {
        ...item,
        id: item.id || item._id,
        name: item.name,
        projects,
        tasks,
        hasChildren: projects.length > 0 || tasks.length > 0,
      };
    }

    if (item.type === "project") {
      const tasks = (item.tasks || []).map(normalizeNode);
      return {
        ...item,
        id: item.id || item._id,
        name: item.name,
        tasks,
        hasChildren: tasks.length > 0,
      };
    }

    const subtasks = (item.subtasks || []).map(sub => ({
      ...sub,
      type: 'subtask',
      id: sub.id || sub._id
    }));
    return {
      ...item,
      id: item.id || item._id,
      title: item.title,
      subtasks,
      hasChildren: subtasks.length > 0,
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingTimeline(true);
        const res = await getOverviewActivity();
        const payload = res?.data?.data || res?.data || res;

        if (!Array.isArray(payload)) {
          console.error("Overview API did not return array:", payload);
          dispatch(setOverviewData({ timeline: [] }));
          return;
        }

        const normalized = payload.map(normalizeNode);
        dispatch(setOverviewData({ timeline: normalized }));
      } catch (err) {
        console.error("Failed to load overview data:", err);
        dispatch(setOverviewData({ timeline: [] }));
      } finally {
        setLoadingTimeline(false);
      }
    };

    fetchData();
  }, [dispatch, normalizeNode]);

  // FIX: Sync selectedItem with timeline updates
  useEffect(() => {
    if (!selectedItem || !timeline) return;

    const findUpdatedItem = (items, targetId) => {
      for (const item of items) {
        if ((item.id || item._id) === targetId) return item;
        if (item.projects) {
          const found = findUpdatedItem(item.projects, targetId);
          if (found) return found;
        }
        if (item.tasks) {
          const found = findUpdatedItem(item.tasks, targetId);
          if (found) return found;
        }
        if (item.subtasks) {
          const found = findUpdatedItem(item.subtasks, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const targetId = selectedItem.id || selectedItem._id;
    const updatedItem = findUpdatedItem(timeline, targetId);

    // If we found the item and it is a different reference/version than the current selectedItem, update it.
    if (updatedItem && updatedItem !== selectedItem) {
      setSelectedItem(updatedItem);
    }
  }, [timeline, selectedItem]);

  const toggleExpand = (id) => {
    const next = new Set(expandedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedItems(next);
  };

  const filteredItems = useMemo(() => {
    return (timeline || []).filter((item) => {
      const label = item.name || item.title || "";
      if (searchQuery) {
        return label.toLowerCase().includes(searchQuery.toLowerCase());
      }
      if (filterType === "unread") return item.unreadCount > 0;
      if (filterType === "starred") return item.starred || item.isStarred;
      return true;
    });
  }, [timeline, searchQuery, filterType]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const refreshTimeline = useCallback(async () => {
    try {
      const res = await getOverviewActivity();
      const payload = res?.data?.data || res?.data || res;

      if (!Array.isArray(payload)) {
        console.error("Timeline refresh: expected array, got:", payload);
        return;
      }

      const normalized = payload.map(normalizeNode);
      dispatch(setOverviewData({ timeline: normalized }));
    } catch (err) {
      console.error("Failed to refresh timeline", err);
      showToast("Something went wrong while refreshing");
    }
  }, [dispatch, normalizeNode]);

  // NEW: Enhanced task creation handlers
  const handleCreateGlobalTask = () => {
    setTaskCreationContext({
      level: 'global',
      workspaceId: null,
      projectId: null
    });
    dispatch(setTaskPopupOpen(true));
  };

  const handleCreateWorkspaceTask = (workspace) => {
    setTaskCreationContext({
      level: 'workspace',
      workspaceId: workspace.id,
      projectId: null
    });
    dispatch(setTaskPopupOpen(true));
  };

  const handleCreateProjectTask = (workspace, project) => {
    setTaskCreationContext({
      level: 'project',
      workspaceId: workspace.id,
      projectId: project.id
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

  // Get workspaces and projects for dropdowns
  const workspaces = useMemo(() => {
    return timeline
      .filter(item => item.type === "workspace")
      .map(ws => ({ id: ws.id, name: ws.name, workspace: ws.id }));
  }, [timeline]);

  const projects = useMemo(() => {
    const allProjects = [];
    timeline
      .filter(item => item.type === "workspace")
      .forEach(ws => {
        (ws.projects || []).forEach(proj => {
          allProjects.push({
            id: proj.id,
            name: proj.name,
            workspace: ws.id
          });
        });
      });
    return allProjects;
  }, [timeline]);

  const teams = [];

  // Check if timeline is empty after loading
  const isTimelineEmpty = !loadingTimeline && timeline.length === 0;
  const hasFilteredResults = filteredItems.length > 0;

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* LEFT PANEL */}
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
          {/* Show skeleton while loading */}
          {loadingTimeline && <SkeletonLoader />}

          {/* Show empty state when no data */}
          {!loadingTimeline && isTimelineEmpty && (
            <EmptyTimeline
              onCreateTask={handleCreateGlobalTask}
              onCreateWorkspace={() => dispatch(setWorkspacePopupOpen(true))}
            />
          )}

          {/* Show "no results" when search/filter returns empty */}
          {!loadingTimeline && !isTimelineEmpty && !hasFilteredResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-slate-300 mb-1">
                Koi results nahi mile
              </h3>
              <p className="text-xs text-slate-500">
                {searchQuery ? 'Apni search query change karke try karo' : 'Filter change karke dekho'}
              </p>
            </motion.div>
          )}

          {/* Show actual content */}
          {!loadingTimeline && hasFilteredResults && (
            <div className="p-2">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => {
                  if (item.type === "task") {
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TaskItem
                          task={item}
                          selectedItem={selectedItem}
                          setSelectedItem={setSelectedItem}
                          expandedItems={expandedItems}
                          toggleExpand={toggleExpand}
                          onCreateSubtask={handleCreateSubtask}
                          variant="global"
                        />
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <WorkspaceItem
                        workspaceId={item.id}
                        workspace={item}
                        handleCreate={(workspace, type, context, project, task) => {
                          if (type === 'project') {
                            handleCreateProject(workspace);
                          }
                          else if (type === 'task') {
                            if (context === 'project' && project) {
                              handleCreateProjectTask(workspace, project);
                            } else {
                              handleCreateWorkspaceTask(workspace);
                            }
                          }
                          else if (type === 'subtask') {
                            setSelectedWorkspace(workspace);
                            setSelectedTask(task);
                            dispatch(setIsSubtaskPopupOpen(true));
                          }
                        }}
                        selectedItem={selectedItem}
                        setSelectedItem={setSelectedItem}
                        expandedItems={expandedItems}
                        toggleExpand={toggleExpand}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
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
                handleSendMessage={chat.handleSendMessage}
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

      {/* Popups */}
      <TaskPopup
        isOpen={taskPopupOpen}
        onClose={() => dispatch(setTaskPopupOpen(false))}
        onSubmit={async () => {
          await refreshTimeline();
          showToast("Task created successfully ✅");
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
          showToast("Workspace created successfully 🎉");
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
          showToast("Project created successfully 📁");
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
          showToast("Subtask created successfully ✅");
        }}
        taskId={selectedTask?.id || selectedTask?._id}
        taskTitle={selectedTask?.title}
      />

      {/* Toast Notification */}
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