import { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { useDispatch, useSelector } from 'react-redux';

// Services & Store
import { getAllWorkspaces } from "../../../../../service/workspace.service";
import { getOverview } from "../../../../../service/overview.service";
import { setOverviewData } from '../../../../../store/slice/overviewSlice';

// Components
import WorkspaceItem from "../components/WorkspaceItem";
import ChatPanel from "../components/ChatPanel";
import EmptyState from "../components/EmptyState";
import SidebarHeader from "../components/SidebarHeader"; // New Component
import OverviewStats from "../components/OverviewStats"; // New Component

// Hooks
import { useChatLogic } from "../hook/useChatLogic"; // New Hook

const OverviewLayout = () => {
  // --- Navigation & Data State ---
  const [expandedItems, setExpandedItems] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  // --- Overview Data State ---
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // --- Redux ---
  const dispatch = useDispatch();
  const workspacesRaw = useSelector((state) => state.overview.overviewData?.workspaces);
  const workspaces = useMemo(() => workspacesRaw || [], [workspacesRaw]);

  // --- Custom Hooks ---
  const chat = useChatLogic(selectedItem);

  // --- Effects: Initial Data Load ---
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const workspacesData = await getAllWorkspaces();
        if (mounted) {
          dispatch(setOverviewData({ workspaces: workspacesData }));
        }
      } catch (err) {
        console.error("Failed to load overview data:", err);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [dispatch]);

  // --- Handlers ---
  const handleItemClick = (item, hasChildren) => {
    if (hasChildren) {
      setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }));
    }

    setSelectedItem(item);
    chat.setShowChatInfo(false);

    // Fetch Overview Data
    if (item?.id) {
      setLoadingOverview(true);
      getOverview(item.id)
        .then(setOverview)
        .catch(() => setOverview(null))
        .finally(() => setLoadingOverview(false));
    }
  };

  const filteredWorkspaces = useMemo(() => {
    return (workspaces || []).filter(ws => {
      if (searchQuery) return ws.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (filterType === "unread") return ws.unreadCount > 0;
      if (filterType === "starred") return ws.starred;
      return true;
    });
  }, [workspaces, searchQuery, filterType]);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* LEFT PANEL - Navigator */}
      <div className="w-96 border-r border-slate-800/50 bg-slate-950/40 backdrop-blur-xl flex flex-col overflow-hidden">

        <SidebarHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterType={filterType}
          setFilterType={setFilterType}
        />

        {/* Navigation Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredWorkspaces.length > 0 ? (
            filteredWorkspaces.map((workspace, idx) => (
              <WorkspaceItem
                key={workspace.id ?? workspace._id ?? `ws-${idx}`}
                workspace={workspace}
                expandedItems={expandedItems}
                selectedItem={selectedItem}
                onItemClick={handleItemClick}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <Search className="h-12 w-12 text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Chat/Detail View */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedItem ? (
            <div key={selectedItem.id} className="flex-1 flex flex-col">

              <OverviewStats overview={overview} loading={loadingOverview} />

              <ChatPanel
                item={selectedItem}
                overview={overview}

                // Spread hook values directly to ChatPanel props
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