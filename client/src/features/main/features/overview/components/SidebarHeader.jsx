import { AnimatePresence, motion } from "framer-motion";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
    Search,
    Plus,
    Briefcase,
    CheckSquare,
    Loader2,
    User as UserIcon,
    X,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { searchUsers } from "../../../../../service/user.service";
import { setTaskPopupOpen, setWorkspacePopupOpen } from "../../../../../store/slice/overviewSlice";

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const HighlightMatch = ({ text = "", highlight = "" }) => {
    const normalizedHighlight = String(highlight || "").trim();

    if (!normalizedHighlight) {
        return <span>{text}</span>;
    }

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

const SidebarHeader = ({ searchQuery, setSearchQuery, isMobile = false }) => {
    const [open, setOpen] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userResults, setUserResults] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [showUserResults, setShowUserResults] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const menuRef = useRef(null);
    const searchRef = useRef(null);
    const deferredUserSearchQuery = useDeferredValue(userSearchQuery);

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }

            if (
                showUserResults &&
                searchRef.current &&
                !searchRef.current.contains(e.target)
            ) {
                setShowUserResults(false);
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showUserResults]);

    useEffect(() => {
        if (!isMobile) {
            setUserSearchQuery("");
            setUserResults([]);
            setIsSearchingUsers(false);
            setShowUserResults(false);
            return undefined;
        }

        const trimmedQuery = deferredUserSearchQuery.trim();

        if (trimmedQuery.length < 2) {
            setIsSearchingUsers(false);
            setUserResults([]);
            setShowUserResults(false);
            return undefined;
        }

        const controller = new AbortController();
        let active = true;

        const delayDebounceFn = setTimeout(async () => {
            setIsSearchingUsers(true);
            setShowUserResults(true);

            try {
                const data = await searchUsers(
                    trimmedQuery,
                    { limit: 5 },
                    { signal: controller.signal }
                );

                if (!active) {
                    return;
                }

                setUserResults(data?.users || []);
            } catch (error) {
                if (error?.code !== "ERR_CANCELED" && error?.name !== "CanceledError") {
                    console.error("Sidebar user search failed:", error);
                }
            } finally {
                if (active) {
                    setIsSearchingUsers(false);
                }
            }
        }, 350);

        return () => {
            active = false;
            controller.abort();
            clearTimeout(delayDebounceFn);
        };
    }, [deferredUserSearchQuery, isMobile]);

    const clearUserSearch = () => {
        setUserSearchQuery("");
        setUserResults([]);
        setShowUserResults(false);
        setIsSearchingUsers(false);
    };

    return (
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-slate-800/50">
            <div className="flex items-center gap-2 mb-3 relative" ref={menuRef}>
                <h2 className="text-base sm:text-lg font-bold text-slate-100">Conversations</h2>

                <button
                    type="button"
                    aria-label="Open quick create menu"
                    onClick={() => setOpen(v => !v)}
                    className="ml-auto p-2 rounded-lg hover:bg-slate-800/60 transition-colors group"
                >
                    <Plus className="h-4 w-4 text-slate-400 group-hover:text-slate-300" />
                </button>

                {open && (
                    <div className="absolute right-0 top-10 w-52 rounded-xl bg-slate-900 border border-slate-800 shadow-xl z-50 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                dispatch(setWorkspacePopupOpen(true))
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
                        >
                            <Briefcase className="h-4 w-4 text-sky-400" />
                            Create Workspace
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                dispatch(setTaskPopupOpen(true));
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
                        >
                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                            Create Task
                        </button>
                    </div>
                )}
            </div>

            {isMobile ? (
                <div className="relative" ref={searchRef}>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 transition-colors focus-within:border-sky-500/50 focus-within:ring-1 focus-within:ring-sky-500/20">
                        {isSearchingUsers ? (
                            <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                        ) : (
                            <Search className="h-4 w-4 text-slate-500" />
                        )}
                        <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            onFocus={() => {
                                if (userSearchQuery.trim().length >= 2) {
                                    setShowUserResults(true);
                                }
                            }}
                            placeholder="Search users..."
                            className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
                        />
                        {userSearchQuery ? (
                            <button
                                type="button"
                                aria-label="Clear user search"
                                onClick={clearUserSearch}
                                className="text-slate-500 transition-colors hover:text-slate-300"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        ) : null}
                    </div>

                    <AnimatePresence>
                        {showUserResults ? (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="absolute inset-x-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
                            >
                                {userResults.length === 0 && !isSearchingUsers ? (
                                    <div className="p-4 text-center text-xs text-slate-500">
                                        No users found for &quot;{userSearchQuery}&quot;
                                    </div>
                                ) : null}

                                {userResults.map((profile) => {
                                    const profileId = String(profile?._id || profile?.id || "");
                                    const displayName = profile?.name || profile?.username || "Unknown user";

                                    return (
                                        <button
                                            key={profileId}
                                            type="button"
                                            onClick={() => {
                                                navigate(`/main/profile/${profileId}`);
                                                setShowUserResults(false);
                                                setOpen(false);
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/60"
                                        >
                                            {profile?.avatar ? (
                                                <img
                                                    src={profile.avatar}
                                                    alt={displayName}
                                                    className="h-9 w-9 rounded-full border border-slate-700 object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                                                    <UserIcon className="h-4 w-4" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-200">
                                                    <HighlightMatch
                                                        text={displayName}
                                                        highlight={userSearchQuery}
                                                    />
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    @{profile?.username || "unknown"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-800/60 rounded-lg text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-slate-700/80 transition-colors"
                    />
                </div>
            )}
        </div>
    );
};

export default SidebarHeader;
