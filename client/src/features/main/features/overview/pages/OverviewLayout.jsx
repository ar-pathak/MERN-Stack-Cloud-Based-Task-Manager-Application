import { useState, useEffect, useMemo } from "react";
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
import ChatPanel from "../components/ChatPanel";
import EmptyState from "../components/EmptyState";
import SidebarHeader from "../components/SidebarHeader";
import OverviewStats from "../components/OverviewStats";

// Popups
import WorkspacePopup from "../../../components/popup/WorkspacePopup";
import TaskPopup from "../../../components/popup/TaskPopup";
import SubtaskPopup from "../../../components/popup/SubtaskPopup";
import ProjectPopup from "../../../components/popup/ProjectPopup";

// Hooks
import { useChatLogic } from "../hook/useChatLogic";

const OverviewLayout = () => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
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

  useEffect(() => {
    const normalizeNode = (item) => {
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

      const subtasks = item.subtasks || [];
      return {
        ...item,
        id: item.id || item._id,
        title: item.title,
        subtasks,
        hasChildren: subtasks.length > 0,
      };
    };

    const fetchData = async () => {
      try {
        setLoadingTimeline(true);
        const res = await getOverviewActivity();
        const payload = res?.data?.data || res?.data || res;

        if (!Array.isArray(payload)) {
          console.error("Overview API did not return array:", payload);
          return;
        }

        const normalized = payload.map(normalizeNode);
        dispatch(setOverviewData({ timeline: normalized }));
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        setLoadingTimeline(false);
      }
    };

    fetchData();
  }, [dispatch]);

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
      if (filterType === "starred") return item.starred;
      return true;
    });
  }, [timeline, searchQuery, filterType]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const refreshTimeline = async () => {
    try {
      const res = await getOverviewActivity();
      const payload = res?.data?.data || res?.data || res;

      if (!Array.isArray(payload)) {
        console.error("Timeline refresh: expected array, got:", payload);
        return;
      }

      const normalizeNode = (item) => {
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

        const subtasks = item.subtasks || [];
        return {
          ...item,
          id: item.id || item._id,
          title: item.title,
          subtasks,
          hasChildren: subtasks.length > 0,
        };
      };

      const normalized = payload.map(normalizeNode);
      dispatch(setOverviewData({ timeline: normalized }));
    } catch (err) {
      console.error("Failed to refresh timeline", err);
      showToast("Something went wrong while refreshing");
    }
  };

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

  const teams = []; // Add teams logic when available

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

        <div className="flex-1 overflow-y-auto p-2">
          {filteredItems.map((item) => {
            if (item.type === "task") {
              return (
                <TaskItem
                  key={item.id}
                  task={item}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                  expandedItems={expandedItems}
                  toggleExpand={toggleExpand}
                  onCreateSubtask={handleCreateSubtask}
                  variant="global"
                />
              );
            }

            return (
              <WorkspaceItem
                key={item.id}
                workspaceId={item.id}
                workspace={item}
                handleCreate={(workspace, type, context, project) => {
                  if (type === 'project') {
                    handleCreateProject(workspace);
                  } else if (type === 'task') {
                    if (context === 'project' && project) {
                      handleCreateProjectTask(workspace, project);
                    } else {
                      handleCreateWorkspaceTask(workspace);
                    }
                  }
                }}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedItem ? (
            <div key={selectedItem.id} className="flex-1 flex flex-col">
              <OverviewStats overview={overview} loading={loadingOverview} />
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
                handleFileUpload={chat.handleFileUpload}
                uploadingFile={chat.uploadingFile}
                showEmojiPicker={chat.showEmojiPicker}
                setShowEmojiPicker={chat.setShowEmojiPicker}
                chatEndRef={chat.refs.chatEndRef}
                fileInputRef={chat.refs.fileInputRef}
                messageInputRef={chat.refs.messageInputRef}
              />
            </div>
          ) : (
            <EmptyState key="empty" />
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
        taskId={selectedTask?.id}
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