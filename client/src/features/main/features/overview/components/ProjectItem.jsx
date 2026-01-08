import {motion, AnimatePresence } from "framer-motion";
import TaskItem from "./TaskItem";
import { ChevronRight } from "lucide-react";

const ProjectItem = ({ project, workspaceId, expandedItems, selectedItem, onItemClick }) => {
  const hasTasks = project.tasks && project.tasks.length > 0;
  const isExpanded = expandedItems[project.id];
  const isSelected = selectedItem?.id === project.id;

  return (
    <div className="mb-1">
      <motion.button
        whileHover={{ x: 2 }}
        onClick={() => onItemClick(project, hasTasks)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${isSelected
            ? "bg-slate-800/80 border-l-2 border-purple-500"
            : "hover:bg-slate-800/40"
          }`}
      >
        <div className="relative">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <project.icon className="h-4 w-4 text-purple-400" />
          </div>
          {project.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-purple-500 border-2 border-slate-950 flex items-center justify-center">
              <span className="text-[9px] font-bold text-white">{project.unreadCount}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium truncate block mb-0.5 ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
            {project.name}
          </span>
          <p className={`text-xs truncate ${project.unreadCount > 0 ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
            {project.lastMessage}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-slate-500">{project.lastMessageTime}</span>
          {hasTasks && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-3 w-3 text-slate-500" />
            </motion.div>
          )}
        </div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && hasTasks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden ml-4 mt-1"
          >
            {project.tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                selectedItem={selectedItem}
                onItemClick={onItemClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectItem