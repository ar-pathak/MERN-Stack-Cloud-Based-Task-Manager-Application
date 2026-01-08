import { motion, AnimatePresence } from "framer-motion";
import ProjectItem from "./ProjectItem";
import { BellOff, ChevronRight, Pin, Star } from "lucide-react";

const WorkspaceItem = ({ workspace, expandedItems, selectedItem, onItemClick }) => {
    const hasProjects = workspace.projects && workspace.projects.length > 0;
    const isExpanded = expandedItems[workspace.id];
    const isSelected = selectedItem?.id === workspace.id;
    const typingMembers = workspace.members?.filter(m => m.typing);

    return (
        <div className="mb-1">
            <motion.button
                whileHover={{ x: 2 }}
                onClick={() => onItemClick(workspace, hasProjects)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${isSelected
                    ? "bg-slate-800/80 border-l-2 border-sky-500"
                    : "hover:bg-slate-800/40"
                    } ${workspace.pinned ? 'border border-slate-700/50' : ''}`}
            >
                <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center">
                        <workspace.icon className="h-5 w-5 text-sky-400" />
                    </div>
                    {workspace.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-sky-500 border-2 border-slate-950 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">{workspace.unreadCount}</span>
                        </div>
                    )}
                    {workspace.muted && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-700 border-2 border-slate-950 flex items-center justify-center">
                            <BellOff className="h-2.5 w-2.5 text-slate-400" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-semibold truncate ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                            {workspace.name}
                        </span>
                        {workspace.starred && <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                        {workspace.pinned && <Pin className="h-3 w-3 text-slate-500 flex-shrink-0" />}
                    </div>
                    <p className={`text-xs truncate ${typingMembers && typingMembers.length > 0 ? 'text-sky-400 italic' :
                        workspace.unreadCount > 0 ? 'text-slate-300 font-medium' : 'text-slate-500'
                        }`}>
                        {typingMembers && typingMembers.length > 0
                            ? `${typingMembers[0].name.split(' ')[0]} is typing...`
                            : workspace.lastMessage
                        }
                    </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-slate-500">{workspace.lastMessageTime}</span>
                    {hasProjects && (
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
                {isExpanded && hasProjects && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden ml-4 mt-1"
                    >
                        {workspace.projects.map((project) => (
                            <ProjectItem
                                key={project.id}
                                project={project}
                                workspaceId={workspace.id}
                                expandedItems={expandedItems}
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

export default WorkspaceItem