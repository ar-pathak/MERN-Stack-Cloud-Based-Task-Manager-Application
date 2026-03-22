import { AnimatePresence, motion } from "framer-motion";
import TaskItem from "../TaskItem";
import UserChatItem from "../UserChatItem";
import WorkspaceItem from "../WorkspaceItem";

// Reduced animation variant - no layout="position" to avoid thrashing
const AnimatedItem = ({ delay, children, itemId, index }) => {
  // Only animate first 3 items to reduce render blocking
  const shouldAnimate = index < 3;
  
  if (!shouldAnimate) {
    return <div key={itemId}>{children}</div>;
  }
  
  return (
    <motion.div
      key={itemId}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay, duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

const TimelineItemsList = ({
  items,
  selectedItem,
  setSelectedItem,
  isMobile = false,
  onOpenChat,
  expandedItems,
  toggleExpand,
  onCreateSubtask,
  onOpenMention,
  onWorkspaceAction,
}) => {
  return (
    <div className="p-2">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const itemId = item.id || item._id;
          const delay = index * 0.03;

          if (item.type === "task") {
            return (
              <AnimatedItem key={itemId} itemId={itemId} delay={delay} index={index}>
                <TaskItem
                  task={item}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                  isMobile={isMobile}
                  onOpenChat={onOpenChat}
                  expandedItems={expandedItems}
                  toggleExpand={toggleExpand}
                  onCreateSubtask={onCreateSubtask}
                  variant="global"
                />
              </AnimatedItem>
            );
          }

          if (item.type === "chat") {
            return (
              <AnimatedItem key={itemId} itemId={itemId} delay={delay} index={index}>
                <UserChatItem
                  chat={item}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                  onOpenChat={onOpenChat}
                  onOpenMention={onOpenMention}
                />
              </AnimatedItem>
            );
          }

          return (
            <AnimatedItem key={itemId} itemId={itemId} delay={delay} index={index}>
              <WorkspaceItem
                workspaceId={item.id}
                workspace={item}
                handleCreate={onWorkspaceAction}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                isMobile={isMobile}
                onOpenChat={onOpenChat}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            </AnimatedItem>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default TimelineItemsList;
