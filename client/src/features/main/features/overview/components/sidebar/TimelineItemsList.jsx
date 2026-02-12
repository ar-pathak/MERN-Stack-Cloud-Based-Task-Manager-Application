import { AnimatePresence, motion } from "framer-motion";
import TaskItem from "../TaskItem";
import UserChatItem from "../UserChatItem";
import WorkspaceItem from "../WorkspaceItem";

const AnimatedItem = ({ delay, children, itemId }) => {
  return (
    <motion.div
      key={itemId}
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay }}
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
              <AnimatedItem key={itemId} itemId={itemId} delay={delay}>
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
              <AnimatedItem key={itemId} itemId={itemId} delay={delay}>
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
            <AnimatedItem key={itemId} itemId={itemId} delay={delay}>
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
