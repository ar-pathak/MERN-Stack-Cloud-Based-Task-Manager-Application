import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Badge from "../components/Badge";
import Avatar from "../components/Avatar";
import AuthTabs from "../components/AuthTabs";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import ResetPasswordForm from "./ResetPasswordForm";
import EmailVerificationNotice from "./EmailVerificationNotice";
import { views } from "../utils/view";



const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: { duration: 0.25, ease: "easeIn" },
    },
};

export default function AuthPage() {
    const [activeView, setActiveView] = useState(views.LOGIN);
    const [loading, setLoading] = useState(false);

    // Fake submit handler (yaha tum API call integrate karoge)
    const handleSubmit = async (payload, type) => {
        try {
            setLoading(true);
            console.log("Submitting =>", type, payload);
            // Example:
            // const res = await api.post(`/auth/${type}`, payload);
            // handle tokens, redirect, etc.
            await new Promise((r) => setTimeout(r, 800));
            alert(`Fake ${type} success (console check karo)`);

            if (type === "signup") setActiveView(views.VERIFY);
        } catch (err) {
            console.error(err);
            alert("Error: check console");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
            {/* Background Image + Overlay */}
            <div className="absolute inset-0 -z-10">
                <img
                    src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80"
                    alt="Auth background"
                    className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-indigo-900/70" />
            </div>

            {/* Floating blobs for subtle animation */}
            <motion.div
                className="absolute w-72 h-72 bg-indigo-500/30 rounded-full blur-3xl -top-10 -left-10"
                animate={{ y: [0, 25, 0], x: [0, 10, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute w-80 h-80 bg-cyan-400/25 rounded-full blur-3xl bottom-[-4rem] right-[-4rem]"
                animate={{ y: [0, -20, 0], x: [0, -15, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Main Card */}
            <div className="relative z-10 max-w-6xl w-full px-4 md:px-8">
                <div className="grid md:grid-cols-[1.1fr,1fr] gap-6 items-center">
                    {/* Left side - Branding / Illustration */}
                    <motion.div
                        initial={{ x: -40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="hidden md:flex flex-col gap-6 text-slate-100"
                    >
                        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-indigo-300/80">
                            <span className="w-8 h-[1px] bg-indigo-400" />
                            Organize • Sync • Manage
                        </p>

                        <h1 className="text-4xl lg:text-5xl font-semibold leading-tight">
                            Welcome to{" "}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300">
                                Aurora Task Manager
                            </span>
                        </h1>

                        <p className="text-sm text-slate-300/90 max-w-md leading-relaxed">
                            Your productivity companion — plan tasks, collaborate with teams,
                            monitor progress and access everything from anywhere.
                            All powered by real-time cloud sync.
                        </p>

                        <div className="flex flex-wrap gap-3 text-xs text-slate-200/80">
                            <Badge>Real-Time Sync</Badge>
                            <Badge>Multi-User Workspace</Badge>
                            <Badge>Secure Cloud Storage</Badge>
                            <Badge>Task Automation</Badge>
                        </div>

                        <motion.div
                            className="mt-4 flex items-center gap-4 text-xs text-slate-300/80"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.45 }}
                        >
                            <Avatar />
                            <div>
                                <p className="font-medium">Built for Productivity</p>
                                <p className="text-slate-400 text-[0.7rem]">
                                    Manage tasks, sync devices, and stay organized with a system
                                    that adapts to your workflow in real time.
                                </p>
                            </div>

                        </motion.div>
                    </motion.div>

                    {/* Right side - Auth Card */}
                    <motion.div
                        className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/60 shadow-2xl shadow-slate-950/60 rounded-3xl p-5 sm:p-6 md:p-7"
                        initial={{ x: 40, opacity: 0, scale: 0.96 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                    >
                        {/* Top tabs */}
                        <div className="flex justify-between items-center mb-4">
                            <AuthTabs
                                activeView={activeView}
                                setActiveView={setActiveView}
                            />
                        </div>

                        {/* Animated form content */}
                        <AnimatePresence mode="wait">
                            {activeView === views.LOGIN && (
                                <motion.div
                                    key="login"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <LoginForm
                                        onSwitch={(view) => setActiveView(view)}
                                        onSubmit={(payload) => handleSubmit(payload, "login")}
                                        loading={loading}
                                    />
                                </motion.div>
                            )}

                            {activeView === views.SIGNUP && (
                                <motion.div
                                    key="signup"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <SignupForm
                                        onSwitch={(view) => setActiveView(view)}
                                        onSubmit={(payload) => handleSubmit(payload, "signup")}
                                        loading={loading}
                                    />
                                </motion.div>
                            )}

                            {activeView === views.FORGOT && (
                                <motion.div
                                    key="forgot"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <ForgotPasswordForm
                                        onSwitch={(view) => setActiveView(view)}
                                        onSubmit={(payload) =>
                                            handleSubmit(payload, "forgot-password")
                                        }
                                        loading={loading}
                                    />
                                </motion.div>
                            )}

                            {activeView === views.RESET && (
                                <motion.div
                                    key="reset"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <ResetPasswordForm
                                        onSwitch={(view) => setActiveView(view)}
                                        onSubmit={(payload) =>
                                            handleSubmit(payload, "reset-password")
                                        }
                                        loading={loading}
                                    />
                                </motion.div>
                            )}

                            {activeView === views.VERIFY && (
                                <motion.div
                                    key="verify"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <EmailVerificationNotice
                                        onBackToLogin={() => setActiveView(views.LOGIN)}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}