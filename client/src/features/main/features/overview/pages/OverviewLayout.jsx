import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Image as ImageIcon,
  Filter,
} from "lucide-react";
import { getAllWorkspaces, getOverview } from "../../../../../service/workspace.service";
import WorkspaceItem from "../components/WorkspaceItem";
import ChatPanel from "../components/ChatPanel";
import EmptyState from "../components/EmptyState";

// Mock data structure with enhanced features


const OverviewLayout = () => {
  const [expandedItems, setExpandedItems] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [messages, setMessages] = useState({});
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, unread, starred
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  // Toggle expand/collapse
  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Handle item click
  const handleItemClick = (item, hasChildren) => {
    if (hasChildren) {
      toggleExpand(item.id);
      setSelectedItem(item);
      setShowChatInfo(false);
    } else {
      setSelectedItem(item);
      setShowChatInfo(false);
    }
    // load overview data for this workspace (non-blocking)
    if (item?.id) {
      setLoadingOverview(true);
      getOverview(item.id)
        .then((data) => setOverview(data))
        .catch(() => setOverview(null))
        .finally(() => setLoadingOverview(false));
    }
  };

  // Send message
  const handleSendMessage = () => {
    if (chatMessage.trim() && selectedItem) {
      const newMessage = {
        id: Date.now(),
        sender: "You",
        avatar: "ME",
        message: chatMessage.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
        read: false,
        pinned: false,
        type: "text"
      };

      setMessages(prev => ({
        ...prev,
        [selectedItem.id]: [...(prev[selectedItem.id] || []), newMessage]
      }));

      setChatMessage("");
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && selectedItem) {
      setUploadingFile(true);

      // Simulate upload
      setTimeout(() => {
        const newMessage = {
          id: Date.now(),
          sender: "You",
          avatar: "ME",
          message: `Shared a file: ${file.name}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOwn: true,
          read: false,
          pinned: false,
          type: "file",
          attachment: {
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            type: file.type.includes('image') ? 'image' : 'file'
          }
        };

        setMessages(prev => ({
          ...prev,
          [selectedItem.id]: [...(prev[selectedItem.id] || []), newMessage]
        }));

        setUploadingFile(false);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }, 1500);
    }
  };

  // Delete message
  const handleDeleteMessage = (messageId) => {
    if (selectedItem) {
      setMessages(prev => ({
        ...prev,
        [selectedItem.id]: prev[selectedItem.id].filter(msg => msg.id !== messageId)
      }));
      setSelectedMessage(null);
    }
  };

  // Toggle pin message
  const handlePinMessage = (messageId) => {
    if (selectedItem) {
      setMessages(prev => ({
        ...prev,
        [selectedItem.id]: prev[selectedItem.id].map(msg =>
          msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg
        )
      }));
      setSelectedMessage(null);
    }
  };

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedItem]);

  // Focus input when item selected
  useEffect(() => {
    if (selectedItem) {
      messageInputRef.current?.focus();
    }
  }, [selectedItem]);

  // Filter conversations
  const filteredWorkspaces = (workspaces || []).filter(ws => {
    if (searchQuery) {
      return ws.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (filterType === "unread") return ws.unreadCount > 0;
    if (filterType === "starred") return ws.starred;
    return true;
  });

  // Load real workspaces on mount
  useEffect(() => {
    let mounted = true;
    getAllWorkspaces()
      .then((data) => {
        if (!mounted) return;
        // backend may return array or wrapped data
        setWorkspaces(Array.isArray(data) ? data : (data?.data || data || []));
      })
      .catch(() => {
        // keep mock data on error
      });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* LEFT PANEL - Navigator */}
      <div className="w-96 border-r border-slate-800/50 bg-slate-950/40 backdrop-blur-xl flex flex-col overflow-hidden">
        {/* Search Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-slate-800/50">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-slate-100">Conversations</h2>
            <button className="ml-auto p-2 rounded-lg hover:bg-slate-800/60 transition-colors group">
              <Plus className="h-4 w-4 text-slate-400 group-hover:text-slate-300" />
            </button>
            <button className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors group">
              <Filter className="h-4 w-4 text-slate-400 group-hover:text-slate-300" />
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-800/60 rounded-lg text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-slate-700/80 transition-colors"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "starred", label: "Starred" }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setFilterType(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === filter.id
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  : "bg-slate-800/40 text-slate-400 hover:bg-slate-800/60"
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredWorkspaces.length > 0 ? (
            filteredWorkspaces.map((workspace) => (
              <WorkspaceItem
                key={workspace.id}
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
              <div className="px-6 pt-4 pb-2 border-b border-slate-800/50 bg-slate-950/60">
                {overview && overview.stats ? (
                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-400">Projects</div>
                      <div className="font-semibold text-slate-100">{overview.stats.projectsCount}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-400">Tasks</div>
                      <div className="font-semibold text-slate-100">{overview.stats.totalTasks}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-400">Completed</div>
                      <div className="font-semibold text-slate-100">{overview.stats.completedTasks}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-400">High Priority</div>
                      <div className="font-semibold text-amber-400">{overview.stats.highPriorityTasks}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <div className="text-xs text-slate-400">Members</div>
                      <div className="font-semibold text-slate-100">{overview.stats.membersCount}</div>
                    </div>
                  </div>
                ) : loadingOverview ? (
                  <div className="text-sm text-slate-400">Loading overview...</div>
                ) : null}
              </div>
              <ChatPanel
              item={selectedItem}
              messages={messages[selectedItem.id] || []}
              chatMessage={chatMessage}
              setChatMessage={setChatMessage}
              handleSendMessage={handleSendMessage}
              showChatInfo={showChatInfo}
              setShowChatInfo={setShowChatInfo}
              chatEndRef={chatEndRef}
              selectedMessage={selectedMessage}
              setSelectedMessage={setSelectedMessage}
              handleDeleteMessage={handleDeleteMessage}
              handlePinMessage={handlePinMessage}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              uploadingFile={uploadingFile}
              messageInputRef={messageInputRef}
              showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
              overview={overview}
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