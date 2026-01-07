import { motion, AnimatePresence } from "framer-motion";
import { Bell, Menu, Search, Plus, FileText, FolderPlus, Users, Calendar, CheckSquare, Zap } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import UserMenu from "./UserMenu";
import { useAuth } from "../../../../context/AuthContext";

const MainHeader = () => {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const userName = user?.name?.split(" ")[0] || "User";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCreateOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createOptions = [
    {
      icon: FileText,
      label: "New Document",
      description: "Create a blank document",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      action: () => console.log("Create document")
    },
    {
      icon: FolderPlus,
      label: "New Project",
      description: "Start a new project",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      action: () => console.log("Create project")
    },
    {
      icon: CheckSquare,
      label: "New Task",
      description: "Add a quick task",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      action: () => console.log("Create task")
    },
    {
      icon: Users,
      label: "New Team",
      description: "Create a team workspace",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      action: () => console.log("Create team")
    },
    {
      icon: Calendar,
      label: "New Event",
      description: "Schedule an event",
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      action: () => console.log("Create event")
    },
    {
      icon: Zap,
      label: "New Workflow",
      description: "Automate your process",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      action: () => console.log("Create workflow")
    }
  ];

  const handleCreateOption = (option) => {
    option.action();
    setIsCreateOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/60 p-2 hover:bg-slate-800/80 transition-colors">
            <Menu className="h-4 w-4 text-slate-200" />
          </button>
          <div>
            <h1 className="text-base md:text-lg font-semibold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              {getGreeting()}, {userName} 👋
            </h1>
            <p className="text-xs md:text-[13px] text-slate-400">
              Your cloud workspace is fully synced. Let&apos;s ship something.
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700/80 transition-colors">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              placeholder="Search tasks, projects…"
              className="w-40 bg-transparent text-[11px] outline-none placeholder:text-slate-500"
            />
          </div>

          {/* Quick Create Button */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-500/20 to-blue-600/20 px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-sky-100 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:border-sky-400/40 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">Create</span>
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
              {isCreateOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
                >
                  <div className="p-2">
                    <div className="px-3 py-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-200">Quick Create</h3>
                      <p className="text-xs text-slate-500">Choose what you want to create</p>
                    </div>
                    <div className="space-y-1">
                      {createOptions.map((option, index) => (
                        <motion.button
                          key={option.label}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleCreateOption(option)}
                          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-800/60 transition-colors group"
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${option.bgColor} group-hover:scale-110 transition-transform`}>
                            <option.icon className={`h-5 w-5 ${option.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                              {option.label}
                            </div>
                            <div className="text-xs text-slate-500">
                              {option.description}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notification */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800/70 bg-slate-900/70 hover:bg-slate-800/70 transition-colors"
            onClick={() => {
              // TODO: Implement notifications
            }}
          >
            <Bell className="h-4 w-4 text-slate-300" />
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/60 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
            </span>
          </motion.button>

          {/* User Menu */}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
};

export default MainHeader;