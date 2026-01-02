import React, { lazy, Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import Badge from "../components/Badge";
import Avatar from "../components/Avatar";
import AuthTabs from "../components/AuthTabs";
import { views } from "../utils/view";
import LazyLoader from "../../../common/components/LazyLoader";
import { useAuth } from "../../../context/AuthContext";

const LoginForm = lazy(() => import("./LoginForm"))
const SignupForm = lazy(() => import("./SignupForm"))
const ResetPasswordForm = lazy(() => import("./ResetPasswordForm"))
const ForgotPasswordForm = lazy(() => import("./ForgotPasswordForm"))
const EmailVerificationNotice = lazy(() => import("./EmailVerificationNotice"))

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
    const { token } = useParams();
    const [activeView, setActiveView] = useState(views.LOGIN);
    const { login, register, loading } = useAuth();
    const navigate = useNavigate();

    // Check if we're on reset password route
    useEffect(() => {
        if (token) {
            setActiveView(views.RESET);
        }
    }, [token]);

    const handleSubmit = async (payload, type) => {
        try {
            let result;

            if (type === "login") {
                result = await login(payload);
                
                if (result?.success) {
                    toast.success("Login successful! Redirecting...");
                    setTimeout(() => {
                        navigate("/dashboard");
                    }, 500);
                } else {
                    toast.error(result?.message || result?.error || "Login failed");
                }
            } else if (type === "signup") {
                result = await register(payload);
                
                if (result?.success) {
                    toast.success("Account created successfully!");
                    // Optionally show verification notice or redirect to dashboard
                    setActiveView(views.VERIFY);
                    // Or redirect to dashboard after a delay
                    setTimeout(() => {
                        navigate("/dashboard");
                    }, 2000);
                } else {
                    toast.error(result?.message || result?.error || "Registration failed");
                }
            } else if (type === "forgot-password") {
                const { forgotPassword } = await import("../../../service/auth.service");
                result = await forgotPassword(payload);
                
                if (result?.success || result?.message) {
                    toast.success(result.message || "Password reset link sent to your email!");
                    // Optionally switch back to login after a delay
                    setTimeout(() => {
                        setActiveView(views.LOGIN);
                    }, 2000);
                } else {
                    toast.error(result?.error || "Failed to send reset email");
                }
            } else if (type === "reset-password") {
                const { resetPassword } = await import("../../../service/auth.service");
                result = await resetPassword(payload);

                if (result?.success || result?.message) {
                    toast.success(result.message || "Password reset successfully!");
                    setTimeout(() => {
                        setActiveView(views.LOGIN);
                    }, 2000);
                } else {
                    toast.error(result?.error || "Failed to reset password");
                }
            }
        } catch (err) {
            console.error("Auth error:", err);
            const errorMessage = err?.message || err?.response?.data?.message || "An unexpected error occurred. Please try again.";
            toast.error(errorMessage);
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
                                    <Suspense fallback={<LazyLoader />}>

                                        <LoginForm
                                            onSwitch={(view) => setActiveView(view)}
                                            onSubmit={(payload) => handleSubmit(payload, "login")}
                                            loading={loading || false}
                                        />
                                    </Suspense>
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
                                    <Suspense fallback={<LazyLoader />}>

                                        <SignupForm
                                            onSwitch={(view) => setActiveView(view)}
                                            onSubmit={(payload) => handleSubmit(payload, "signup")}
                                            loading={loading || false}
                                        />
                                    </Suspense>
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
                                    <Suspense fallback={<LazyLoader />}>

                                        <ForgotPasswordForm
                                            onSwitch={(view) => setActiveView(view)}
                                            onSubmit={(payload) =>
                                                handleSubmit(payload, "forgot-password")
                                            }
                                            loading={loading}
                                        />
                                    </Suspense>
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
                                    <Suspense fallback={<LazyLoader />}>

                                        <ResetPasswordForm
                                            onSwitch={(view) => setActiveView(view)}
                                            onSubmit={(payload) =>
                                                handleSubmit(payload, "reset-password")
                                            }
                                            loading={loading}
                                        />
                                    </Suspense>
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
                                    <Suspense fallback={<LazyLoader />}>
                                        <EmailVerificationNotice
                                            onBackToLogin={() => setActiveView(views.LOGIN)}
                                        />
                                    </Suspense>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}