import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "sonner";

const UserMenu = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const { logout } = useAuth();

    // Get user initials for avatar
    const getInitials = (name) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    // Get greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Logged out successfully");
        } catch (error) {
            toast.error(error.message || "Logout failed");
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const userName = user?.name || "User";
    const userEmail = user?.email || "";

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-2.5 py-1.5 hover:bg-slate-800/70 transition-colors"
            >
                <div className="relative h-7 w-7 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-slate-900">
                        {getInitials(userName)}
                    </span>
                    <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0,_rgba(255,255,255,0.6),transparent_55%)]" />
                </div>
                <div className="hidden sm:block text-left">
                    <p className="text-xs font-medium">{userName}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {userEmail || "User"}
                    </p>
                </div>
                <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                    }`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-xl shadow-xl z-50 overflow-hidden"
                    >
                        <div className="p-2 border-b border-slate-800/70">
                            <p className="text-xs text-slate-400 px-2 py-1">
                                {getGreeting()}, {userName.split(" ")[0]} 👋
                            </p>
                        </div>

                        <div className="p-1">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    // TODO: Navigate to profile/settings
                                    toast.info("Profile settings coming soon");
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/70 transition-colors"
                            >
                                <User className="h-4 w-4" />
                                <span>Profile</span>
                            </button>

                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    // TODO: Navigate to settings
                                    toast.info("Settings coming soon");
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/70 transition-colors"
                            >
                                <Settings className="h-4 w-4" />
                                <span>Settings</span>
                            </button>

                            <div className="my-1 h-px bg-slate-800/70" />

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Log out</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserMenu;

