import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ChevronDown } from "lucide-react";
import ChatMessage from "./ChatMessage";

const SCROLL_THRESHOLD = 120;

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
  chatEndRef
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
    if (chatEndRef?.current) {
      chatEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  }, [chatEndRef]);

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

    // If new messages arrived
    if (nextCount > prevCount) {
      if (isNearBottom() || prevCount === 0) {
        scrollToBottom("smooth");
      } else {
        setShowScrollBottom(true);
      }
    }
  }, [messages.length, isNearBottom, scrollToBottom]);

  // ---- Group messages by date + sequence ----
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
      const isSequence =
        prevMsg &&
        (prevMsg.senderId?._id || prevMsg.senderId) ===
          (msg.senderId?._id || msg.senderId) &&
        prevMsg.type !== "system";

      currentGroup.messages.push({ ...msg, isSequence });
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
      <div className="h-full flex items-center justify-center p-6 bg-slate-950/50">
        <div className="text-center max-w-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="h-24 w-24 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-sky-900/10"
          >
            <MessageSquare className="h-10 w-10 text-sky-500/80" />
          </motion.div>
          <h3 className="text-xl font-semibold text-slate-200 mb-2">
            No messages yet
          </h3>
          <p className="text-slate-500">
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
        onScroll={handleScroll}
        className="h-full overflow-y-auto overflow-x-hidden px-4 md:px-8 py-4 custom-scrollbar"
      >
        <div className="min-h-full flex flex-col justify-end pb-4">
          {messageGroups.map((group) => (
            <div key={group.date}>
              {/* Date Divider */}
              <div className="sticky top-2 z-10 flex justify-center my-6 pointer-events-none">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 shadow-sm">
                  {getDateLabel(group.date)}
                </span>
              </div>

              <div className="space-y-0.5">
                {group.messages.map((msg) => (
                  <ChatMessage
                    key={msg.id || msg._id}
                    message={msg}
                    isSequence={msg.isSequence}
                    selectedMessage={selectedMessage}
                    setSelectedMessage={setSelectedMessage}
                    handleDeleteMessage={handleDeleteMessage}
                    handlePinMessage={handlePinMessage}
                    handleEditMessage={handleEditMessage}
                    onReact={onReact}
                    onReply={onReply}
                  />
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
            className="absolute bottom-6 right-6 z-30 p-3 rounded-full bg-slate-800 text-sky-400 shadow-xl border border-slate-700 hover:bg-slate-700 transition-all"
            aria-label="Scroll to latest message"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageList;
