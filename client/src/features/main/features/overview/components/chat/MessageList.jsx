import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ChevronDown } from "lucide-react";
import ChatMessage from "./ChatMessage";
import { addPassiveScrollListener, createDebouncedScrollHandler } from "../../../../../../utils/scrollOptimization";

const SCROLL_THRESHOLD = 120;
const isSystemMessage = (msg) => Boolean(
  msg?.isSystem ||
  msg?.type === "system" ||
  msg?.meta?.isActivity
);

const MessageList = ({
  messages = [],
  itemType,
  selectedMessage,
  setSelectedMessage,
  handleDeleteMessage,
  handlePinMessage,
  handleEditMessage,
  onReact,
  onReply,
  chatEndRef,
  messagesContainerRef,
  jumpToMessageId,
  onJumpHandled
}) => {
  const containerRef = useRef(null);
  const lastMsgCountRef = useRef(messages.length);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // ---- Scroll helpers ----
  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const container = containerRef.current;
    if (container && typeof container.scrollTo === "function") {
      container.scrollTo({
        top: container.scrollHeight,
        behavior
      });
      setShowScrollBottom(false);
      return;
    }

    if (chatEndRef?.current) {
      chatEndRef.current.scrollIntoView({ behavior, block: "end" });
      setShowScrollBottom(false);
    }
  }, [chatEndRef]);

  // ---- NEW: Jump to specific message (for reply clicks) ----
  const handleJumpToMessage = useCallback((messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      
      // Optional: Add a flash highlight effect
      const bubble = element.querySelector('.group\\/bubble'); // Targets the bubble inside
      if (bubble) {
        bubble.animate([
            { filter: 'brightness(1)' },
            { filter: 'brightness(1.5)' },
            { filter: 'brightness(1)' }
        ], { duration: 600 });
      }
    } else {
        console.warn(`Message ${messageId} not found in DOM`);
    }
  }, []);

  const handleScroll = useCallback(() => {
    setShowScrollBottom(!isNearBottom());
  }, [isNearBottom]);

  // ---- Initial scroll ----
  useEffect(() => {
    scrollToBottom("auto");
  }, []); // eslint-disable-line

  // ---- Auto-scroll on new messages ----
  useEffect(() => {
    const prevCount = lastMsgCountRef.current;
    const nextCount = messages.length;
    lastMsgCountRef.current = nextCount;

    if (nextCount === 0) return;

    if (nextCount > prevCount) {
      const latestMessage = messages[nextCount - 1] || null;
      const latestIsOwnMessage = Boolean(
        latestMessage?.isOwn ||
        latestMessage?.status === "sending" ||
        latestMessage?.status === "pending"
      );

      if (latestIsOwnMessage || isNearBottom() || prevCount === 0) {
        scrollToBottom(latestIsOwnMessage ? "auto" : "smooth");
      } else {
        setShowScrollBottom(true);
      }
    }
  }, [messages, isNearBottom, scrollToBottom]);

  // ---- Mention jump: open chat and jump to first unread mention message ----
  useEffect(() => {
    if (!jumpToMessageId || !messages.length) return;

    const targetId = String(jumpToMessageId);
    const exists = messages.some((msg) => String(msg.id || msg._id) === targetId);
    if (!exists) return;

    const timer = setTimeout(() => {
      handleJumpToMessage(targetId);
      onJumpHandled?.(targetId);
    }, 120);

    return () => clearTimeout(timer);
  }, [jumpToMessageId, messages, handleJumpToMessage, onJumpHandled]);

  // ---- Setup passive scroll listener for better performance ----
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create debounced scroll handler
    const debouncedScroll = createDebouncedScrollHandler(handleScroll, 100);

    // Add passive scroll listener (doesn't block scrolling)
    const cleanup = addPassiveScrollListener(container, debouncedScroll);

    return cleanup;
  }, [handleScroll]);

  useEffect(() => {
    if (!messagesContainerRef) {
      return undefined;
    }

    if (typeof messagesContainerRef === "function") {
      messagesContainerRef(containerRef.current);
      return () => messagesContainerRef(null);
    }

    messagesContainerRef.current = containerRef.current;
    return () => {
      messagesContainerRef.current = null;
    };
  }, [messagesContainerRef]);

  // ---- Group messages by date + Improved Sequence Logic ----
  const messageGroups = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((msg, index) => {
      const date = new Date(msg.createdAt || msg.timestamp || Date.now());
      const dateKey = date.toDateString();

      if (!currentGroup || currentGroup.date !== dateKey) {
        currentGroup = { date: dateKey, messages: [] };
        groups.push(currentGroup);
      }

      const prevMsg = messages[index - 1];
      const currentIsSystem = isSystemMessage(msg);
      const previousIsSystem = isSystemMessage(prevMsg);
      
      // LOGIC IMPROVEMENT: 
      // Check if sender is same AND time difference is less than 60 seconds
      const isSameSender = prevMsg && (prevMsg.senderId?._id || prevMsg.senderId) === (msg.senderId?._id || msg.senderId);
      const isWithinTimeWindow = prevMsg && (new Date(msg.createdAt) - new Date(prevMsg.createdAt) < 60000); // 1 minute
      const isConsecutive = !currentIsSystem && !previousIsSystem && isSameSender && isWithinTimeWindow;

      currentGroup.messages.push({ ...msg, isConsecutive, isSystem: currentIsSystem });
    });

    return groups;
  }, [messages]);

  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  };

  // ---- Empty state ----
  if (!messages.length) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-slate-950/50 max-[300px]:p-3">
        <div className="text-center max-w-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="h-24 w-24 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-sky-900/10 max-[300px]:h-16 max-[300px]:w-16 max-[300px]:mb-4"
          >
            <MessageSquare className="h-10 w-10 text-sky-500/80 max-[300px]:h-7 max-[300px]:w-7" />
          </motion.div>
          <h3 className="text-xl font-semibold text-slate-200 mb-2 max-[300px]:text-base">
            No messages yet
          </h3>
          <p className="text-slate-500 max-[300px]:text-xs">
            Start the conversation in this {itemType}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-slate-950">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overflow-x-hidden px-2.5 py-4 max-[300px]:px-1.5 sm:px-4 md:px-8 custom-scrollbar scroll-smooth"
      >
        <div className="flex flex-col justify-end">
          {messageGroups.map((group) => (
            <div key={group.date}>
              {/* Date Divider */}
              <div className="sticky top-2 z-10 flex justify-center my-6 pointer-events-none">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 shadow-sm max-[300px]:px-2 max-[300px]:text-[9px]">
                  {getDateLabel(group.date)}
                </span>
              </div>

              {/* Messages Container - Optimized without excessive reflows */}
              <div>
                {group.messages.map((msg) => (
                  <div key={msg.id || msg._id} id={`message-${msg.id || msg._id}`}>
                    <ChatMessage
                      message={msg}
                      isConsecutive={msg.isConsecutive}
                      selectedMessage={selectedMessage}
                      setSelectedMessage={setSelectedMessage}
                      handleDeleteMessage={handleDeleteMessage}
                      handlePinMessage={handlePinMessage}
                      handleEditMessage={handleEditMessage}
                      onReact={onReact}
                      onReply={onReply}
                      onJumpToMessage={handleJumpToMessage}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div ref={chatEndRef} className="h-px w-full" />
        </div>
      </div>

      {/* Scroll to Bottom FAB */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-20 right-4 z-30 p-3 rounded-full bg-slate-800 text-sky-400 shadow-xl border border-slate-700 hover:bg-slate-700 transition-all max-[300px]:bottom-16 max-[300px]:right-2 max-[300px]:p-2 sm:bottom-6 sm:right-6"
            aria-label="Scroll to latest message"
          >
            <ChevronDown className="h-5 w-5 max-[300px]:h-4 max-[300px]:w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageList;
