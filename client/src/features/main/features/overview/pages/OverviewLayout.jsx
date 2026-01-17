import { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";

// Services & Store
import { getOverviewActivity } from "../../../../../service/overview.service";
import { setOverviewData } from "../../../../../store/slice/overviewSlice";

// Components
import WorkspaceItem from "../components/WorkspaceItem";
import TaskItem from "../components/TaskItem";
import ChatPanel from "../components/ChatPanel";
import EmptyState from "../components/EmptyState";
import SidebarHeader from "../components/SidebarHeader";
import OverviewStats from "../components/OverviewStats";

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


  const dispatch = useDispatch();
  const timelineRaw = useSelector(
    (state) => state.overview.overviewData?.timeline
  );

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

      // task
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

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-96 border-r border-slate-800/50 bg-slate-950/40 backdrop-blur-xl flex flex-col overflow-hidden">
        <SidebarHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterType={filterType}
          setFilterType={setFilterType}
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
                  onCreateSubtask={(task) => console.log("create subtask", task)}
                  variant="global"
                />
              );
            }

            return (
              <WorkspaceItem
                key={item.id}
                workspaceId={item.id}
                workspace={item}
                handleCreate={(x) => console.log("create", x)}
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
    </div>
  );
};

export default OverviewLayout;
