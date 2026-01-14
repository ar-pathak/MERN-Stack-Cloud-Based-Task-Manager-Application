import { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

// Services & Store
import { getOverview, getOverviewActivity } from "../../../../../service/overview.service";
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
  const [expandedItems, setExpandedItems] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  const dispatch = useDispatch();
  const timelineRaw = useSelector(
    (state) => state.overview.overviewData?.timeline
  );

  const timeline = useMemo(() => timelineRaw || [], [timelineRaw]);

  const chat = useChatLogic(selectedItem);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const timelineData = await getOverviewActivity();

        const normalized = timelineData.map(item => ({
          ...item,
          id: item.id || item._id,
          name: item.name || item.title,
          hasChildren: item.type !== "task" // workspace & project can expand
        }));

        if (mounted) {
          dispatch(setOverviewData({ timeline: normalized }));
        }
      } catch (err) {
        console.error("Failed to load overview data:", err);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [dispatch]);

  const handleItemClick = (item) => {
    if (item.hasChildren) {
      setExpandedItems(prev => ({
        ...prev,
        [item.id]: !prev[item.id]
      }));
    }

    setSelectedItem(item);
    chat.setShowChatInfo(false);

    if (item?.id) {
      setLoadingOverview(true);
      getOverview(item.id)
        .then(setOverview)
        .catch(() => setOverview(null))
        .finally(() => setLoadingOverview(false));
    }
  };

  const filteredItems = useMemo(() => {
    return (timeline || []).filter(item => {
      if (searchQuery) {
        return (item.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
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

        <div className="flex-1 overflow-y-auto p-2">
          {filteredItems.map((item, idx) => {
            if (item.type === "task") {
              return (
                <TaskItem
                  key={item.id ?? `task-${idx}`}
                  task={item}
                  selectedItem={selectedItem}
                  onItemClick={handleItemClick}
                  variant="global"
                />
              );
            }

            return (
              <WorkspaceItem
                key={item.id ?? `item-${idx}`}
                workspace={item}
                expandedItems={expandedItems}
                selectedItem={selectedItem}
                onItemClick={handleItemClick}
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
