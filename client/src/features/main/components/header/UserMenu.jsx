import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, Settings, ChevronDown, Crown, Activity, Moon, Sun, Bell, HelpCircle, Palette } from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import { toast } from "sonner";

const UserMenu = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [theme, setTheme] = useState("dark");
    const menuRef = useRef(null);
    const buttonRef = useRef(null);
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

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    const userName = user?.name || "User";
    const userEmail = user?.email || "";
    const userRole = user?.role || "Member";

    const menuSections = [
        {
            items: [
                {
                    icon: User,
                    label: "My Profile",
                    description: "View and edit profile",
                    color: "text-blue-400",
                    bgColor: "bg-blue-500/10",
                    action: () => {
                        setIsOpen(false);
                        toast.info("Profile settings coming soon");
                    }
                },
                {
                    icon: Activity,
                    label: "Activity",
                    description: "View your recent activity",
                    color: "text-green-400",
                    bgColor: "bg-green-500/10",
                    action: () => {
                        setIsOpen(false);
                        toast.info("Activity view coming soon");
                    }
                },
                {
                    icon: Bell,
                    label: "Notifications",
                    description: "Manage notifications",
                    color: "text-yellow-400",
                    bgColor: "bg-yellow-500/10",
                    action: () => {
                        setIsOpen(false);
                        toast.info("Notifications coming soon");
                    }
                }
            ]
        },
        {
            items: [
                {
                    icon: Settings,
                    label: "Settings",
                    description: "Preferences and more",
                    color: "text-slate-400",
                    bgColor: "bg-slate-500/10",
                    action: () => {
                        setIsOpen(false);
                        toast.info("Settings coming soon");
                    }
                },
                {
                    icon: Palette,
                    label: "Appearance",
                    description: "Customize your theme",
                    color: "text-purple-400",
                    bgColor: "bg-purple-500/10",
                    action: () => {
                        setIsOpen(false);
                        toast.info("Theme customization coming soon");
                    }
                },
                {
                    icon: HelpCircle,
                    label: "Help & Support",
                    description: "Get help when you need it",
                    color: "text-cyan-400",
                    bgColor: "bg-cyan-500/10",
                    action: () => {
                        setIsOpen(false);
                        toast.info("Help center coming soon");
                    }
                }
            ]
        }
    ];

    return (
        <div className="relative" ref={menuRef}>
            <motion.button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-900/40 px-3 py-2 hover:border-slate-700/80 hover:bg-slate-800/60 transition-all shadow-lg"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <div className="relative h-8 w-8 overflow-hidden rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <span className="text-xs font-bold text-white relative z-10">
                        {getInitials(userName)}
                    </span>
                    <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(255,255,255,0.4),transparent_60%)]" />
                    <motion.span
                        className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    />
                </div>
                <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-slate-200">{userName}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[120px]">
                        {userEmail || "user@example.com"}
                    </p>
                </div>
                <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, type: "spring", damping: 25 }}
                        className="absolute right-0 top-full mt-3 w-80 rounded-2xl border border-slate-800/70 bg-slate-900/95 backdrop-blur-2xl shadow-2xl shadow-black/20 z-50 overflow-hidden"
                    >
                        {/* User Info Header */}
                        <div className="relative p-4 border-b border-slate-800/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40">
                            <div className="flex items-start gap-3">
                                <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
                                    <span className="text-base font-bold text-white relative z-10">
                                        {getInitials(userName)}
                                    </span>
                                    <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(255,255,255,0.4),transparent_60%)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-100 truncate">
                                            {userName}
                                        </h3>
                                        {userRole === "Admin" && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                                <Crown className="h-3 w-3 text-amber-400" />
                                                <span className="text-[10px] font-semibold text-amber-400">Admin</span>
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 truncate mt-0.5">
                                        {userEmail}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        {getGreeting()} 👋
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="p-2">
                            {menuSections.map((section, sectionIndex) => (
                                <div key={sectionIndex}>
                                    <div className="space-y-1">
                                        {section.items.map((item, index) => (
                                            <motion.button
                                                key={item.label}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: (sectionIndex * 3 + index) * 0.03 }}
                                                onClick={item.action}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-800/60 transition-all group"
                                            >
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.bgColor} group-hover:scale-110 transition-transform`}>
                                                    <item.icon className={`h-4 w-4 ${item.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                                                        {item.label}
                                                    </p>
                                                    <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors truncate">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                    {sectionIndex < menuSections.length - 1 && (
                                        <div className="my-2 h-px bg-slate-800/50" />
                                    )}
                                </div>
                            ))}

                            {/* Logout Button */}
                            <div className="mt-2 pt-2 border-t border-slate-800/50">
                                <motion.button
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-rose-500/10 transition-all group border border-transparent hover:border-rose-500/20"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 group-hover:scale-110 transition-all">
                                        <LogOut className="h-4 w-4 text-rose-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-rose-400 group-hover:text-rose-300 transition-colors">
                                            Log out
                                        </p>
                                        <p className="text-xs text-rose-400/60 group-hover:text-rose-400/80 transition-colors">
                                            Sign out of your account
                                        </p>
                                    </div>
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserMenu;