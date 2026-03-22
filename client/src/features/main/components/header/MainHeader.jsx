import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Search,
  Plus,
  CheckSquare,
  Zap,
  Send,
  User as UserIcon,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import {
  lazy,
  Suspense,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import { useAuth } from "../../../../context/AuthContext";
import { createWorkspace } from "../../../../service/workspace.service";
import { searchUsers } from "../../../../service/user.service";
import { searchPosts } from "../../../../service/post.service";

// store & services
import { setOverviewData } from "../../../../store/slice/overviewSlice";
import { getOverviewActivity } from "../../../../service/overview.service";

const UserMenu = lazy(() => import("./UserMenu"));
const TaskPopup = lazy(() => import("../popup/TaskPopup"));
const WorkspacePopup = lazy(() => import("../popup/WorkspacePopup"));
const NotificationDropdown = lazy(() => import("./NotificationDropdown"));

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

const HighlightMatch = ({ text = "", highlight = "" }) => {
  const normalizedHighlight = String(highlight || "").trim();
  if (!normalizedHighlight) return <span>{text}</span>;

  const pattern = new RegExp(`(${escapeRegExp(normalizedHighlight)})`, "gi");
  const parts = String(text || "").split(pattern);

  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === normalizedHighlight.toLowerCase() ? (
          <span key={`${part}-${index}`} className="bg-sky-500/30 text-sky-100">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};

const HeaderActionSkeleton = ({ className }) => (
  <div className={`h-9 animate-pulse rounded-xl bg-slate-800/70 ${className}`} />
);

const MainHeader = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const userName = user?.name?.split(" ")[0] || "User";

  // Handle click outside for both dropdowns
  useEffect(() => {
    if (!isCreateOpen && !showSearchResults) return undefined;

    const handleClickOutside = (event) => {
      if (
        isCreateOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsCreateOpen(false);
      }

      if (
        showSearchResults &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCreateOpen, showSearchResults]);

  // Debounced Search Effect
  useEffect(() => {
    const trimmedQuery = deferredSearchQuery.trim();

    if (trimmedQuery.length < 2) {
      setIsSearching(false);
      setSearchResults({ users: [], posts: [] });
      setShowSearchResults(false);
      return undefined;
    }

    const controller = new AbortController();
    let active = true;

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchResults(true);

      try {
        const [usersData, postsData] = await Promise.allSettled([
          searchUsers(trimmedQuery, { limit: 5 }, { signal: controller.signal }),
          searchPosts(trimmedQuery, { limit: 5 }, { signal: controller.signal }),
        ]);

        if (!active) return;

        setSearchResults({
          users: usersData.status === "fulfilled" ? usersData.value?.users || [] : [],
          posts: postsData.status === "fulfilled" ? postsData.value?.posts || [] : [],
        });
      } catch (error) {
        if (error?.code !== "ERR_CANCELED" && error?.name !== "CanceledError") {
          console.error("Search failed:", error);
        }
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(delayDebounceFn);
    };
  }, [deferredSearchQuery]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const refreshTimeline = async () => {
    try {
      const res = await getOverviewActivity();
      const payload = res?.data?.data || res?.data || res;

      if (!Array.isArray(payload)) {
        console.error("Timeline refresh: expected array, got:", payload);
        return;
      }

      const normalizeNode = (item) => {
        if (item.type === "workspace") {
          const projects = (item.projects || []).map(normalizeNode);
          const tasks = (item.tasks || []).map(normalizeNode);
          return {
            ...item,
            id: item.id || item._id,
            name: item.name,
            projects,
            tasks,
            hasChildren: projects.length > 0 || tasks.length > 0,
          };
        }

        if (item.type === "project") {
          const tasks = (item.tasks || []).map(normalizeNode);
          return {
            ...item,
            id: item.id || item._id,
            name: item.name,
            tasks,
            hasChildren: tasks.length > 0,
          };
        }

        const subtasks = item.subtasks || [];
        return {
          ...item,
          id: item.id || item._id,
          title: item.title,
          subtasks,
          hasChildren: subtasks.length > 0,
        };
      };

      const normalized = payload.map(normalizeNode);
      dispatch(setOverviewData({ timeline: normalized }));
    } catch (err) {
      console.error("Failed to refresh timeline", err);
      showToast("Something went wrong while refreshing");
    }
  };

  const createOptions = useMemo(
    () => [
      {
        icon: Zap,
        label: "New Workflow",
        description: "Design an automated flow",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        action: () => setIsWorkspaceOpen(true),
      },
      {
        icon: CheckSquare,
        label: "New Task",
        description: "Add a quick task",
        color: "text-green-400",
        bgColor: "bg-green-500/10",
        action: () => setIsTaskOpen(true),
      },
      {
        icon: Send,
        label: "New Post",
        description: "Share an update or idea",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        action: () => navigate("/main/create"),
      },
    ],
    [navigate]
  );

  const handleCreateOption = (option) => {
    option.action();
    setIsCreateOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-slate-950/40 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/60 p-2 hover:bg-slate-800/80 transition-colors">
              <Menu className="h-4 w-4 text-slate-200" />
            </button>
            <div>
              <h1 className="text-base md:text-lg font-semibold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                {getGreeting()}, {userName}
              </h1>
              <p className="text-xs md:text-[13px] text-slate-400">
                Your cloud workspace is fully synced. Let&apos;s ship something.
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* --- Enhanced Search Bar --- */}
            <div ref={searchContainerRef} className="relative hidden md:block">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700/80 transition-colors focus-within:border-sky-500/50 focus-within:ring-1 focus-within:ring-sky-500/20">
                {isSearching ? (
                  <Loader2 className="h-3.5 w-3.5 text-sky-400 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5 text-slate-500" />
                )}
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowSearchResults(true)}
                  placeholder="Search users, posts..."
                  className="w-48 bg-transparent text-[12px] outline-none placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setShowSearchResults(false);
                      setIsSearching(false);
                    }}
                  >
                    <X className="h-3 w-3 text-slate-500 hover:text-slate-300" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showSearchResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden max-h-[80vh] overflow-y-auto custom-scrollbar scroll-smooth"
                  >
                    {/* Empty State */}
                    {searchResults.users.length === 0 &&
                      searchResults.posts.length === 0 &&
                      !isSearching && (
                        <div className="p-4 text-center text-slate-500 text-xs">
                          No results found for "{searchQuery}"
                        </div>
                      )}

                    {/* Users Section */}
                    {searchResults.users.length > 0 && (
                      <div className="py-2">
                        <h4 className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          People
                        </h4>
                        {searchResults.users.map((profile) => (
                          <button
                            key={profile._id}
                            onClick={() => {
                              navigate(`/profile/${profile._id}`);
                              setShowSearchResults(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-800/60 transition-colors text-left"
                          >
                            {profile.avatar ? (
                              <img
                                src={profile.avatar}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover border border-slate-700"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                                <UserIcon className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-200 truncate">
                                <HighlightMatch
                                  text={profile.name}
                                  highlight={searchQuery}
                                />
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                @{profile.username}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.users.length > 0 && searchResults.posts.length > 0 && (
                      <div className="h-px bg-slate-800/50 mx-4 my-1" />
                    )}

                    {/* Posts Section */}
                    {searchResults.posts.length > 0 && (
                      <div className="py-2">
                        <h4 className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Posts
                        </h4>
                        {searchResults.posts.map((post) => (
                          <button
                            key={post._id}
                            onClick={() => {
                              navigate(`/post/${post._id}`);
                              setShowSearchResults(false);
                            }}
                            className="w-full flex items-start gap-3 px-4 py-2 hover:bg-slate-800/60 transition-colors text-left"
                          >
                            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                                <HighlightMatch
                                  text={post.content}
                                  highlight={searchQuery}
                                />
                              </p>
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                                <span>by {post.author?.name}</span>
                                <span>-</span>
                                <span>
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Create Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCreateOpen((value) => !value)}
                className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-500/20 to-blue-600/20 px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-sky-100 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:border-sky-400/40 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden md:inline">Create</span>
              </motion.button>

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
                        <h3 className="text-sm font-semibold text-slate-200">
                          Quick Create
                        </h3>
                        <p className="text-xs text-slate-500">
                          Choose what you want to create
                        </p>
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
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-lg ${option.bgColor} group-hover:scale-110 transition-transform`}
                            >
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

            <Suspense fallback={<HeaderActionSkeleton className="w-9" />}>
              <NotificationDropdown />
            </Suspense>

            <Suspense fallback={<HeaderActionSkeleton className="w-24" />}>
              <UserMenu user={user} />
            </Suspense>
          </div>
        </div>
      </header>

      {isTaskOpen ? (
        <Suspense fallback={null}>
          <TaskPopup
            isOpen={isTaskOpen}
            onClose={() => setIsTaskOpen(false)}
            onSubmit={async () => {
              await refreshTimeline();
              showToast("Task created successfully");
            }}
          />
        </Suspense>
      ) : null}

      {isWorkspaceOpen ? (
        <Suspense fallback={null}>
          <WorkspacePopup
            isOpen={isWorkspaceOpen}
            onClose={() => setIsWorkspaceOpen(false)}
            onSubmit={async (data) => {
              await createWorkspace(data);
              await refreshTimeline();
              showToast("Workspace created successfully");
            }}
          />
        </Suspense>
      ) : null}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-500/90 text-white text-sm shadow-lg backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MainHeader;
