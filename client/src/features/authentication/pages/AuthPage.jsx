import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BarChart3, MessageSquareMore, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import Badge from "../components/Badge";
import Avatar from "../components/Avatar";
import AuthTabs from "../components/AuthTabs";
import { views } from "../utils/view";
import LazyLoader from "../../../common/components/LazyLoader";
import { useAuth } from "../../../context/AuthContext";

const LoginForm = lazy(() => import("./LoginForm"));
const SignupForm = lazy(() => import("./SignupForm"));
const ResetPasswordForm = lazy(() => import("./ResetPasswordForm"));
const ForgotPasswordForm = lazy(() => import("./ForgotPasswordForm"));
const EmailVerificationNotice = lazy(() => import("./EmailVerificationNotice"));

const containerVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: "easeOut" }
    },
    exit: {
        opacity: 0,
        y: -16,
        transition: { duration: 0.2, ease: "easeIn" }
    }
};

const platformHighlights = [
    "Aurora Workspace",
    "Aurora Flow",
    "Aurora Connect",
    "Aurora Insights"
];

const authFeatureBlocks = [
    {
        icon: Workflow,
        title: "Flow-Ready Setup",
        detail: "Create your account and launch your first workspace structure in minutes."
    },
    {
        icon: MessageSquareMore,
        title: "Realtime Collaboration",
        detail: "Chat, calls, and mentions stay connected to your actual work timeline."
    },
    {
        icon: BarChart3,
        title: "Insights by Default",
        detail: "Track performance and decisions without leaving the Aurora platform."
    },
    {
        icon: ShieldCheck,
        title: "Access You Control",
        detail: "Role-aware actions and privacy controls are built into the product model."
    }
];

export default function AuthPage() {
    const { token } = useParams();
    const [activeView, setActiveView] = useState(views.LOGIN);
    const { login, register, loading } = useAuth();
    const navigate = useNavigate();

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
                    toast.success("Login successful. Redirecting...");
                    setTimeout(() => navigate("/main"), 450);
                } else {
                    toast.error(result?.message || result?.error || "Login failed");
                }
            } else if (type === "signup") {
                result = await register(payload);

                if (result?.success) {
                    toast.success("Account created successfully. Redirecting...");
                    setTimeout(() => navigate("/main"), 450);
                } else {
                    toast.error(result?.message || result?.error || "Registration failed");
                }
            } else if (type === "forgot-password") {
                const { forgotPassword } = await import("../../../service/auth.service");
                result = await forgotPassword(payload);

                if (result?.success || result?.message) {
                    toast.success(result.message || "Password reset link sent to your email.");
                    setTimeout(() => setActiveView(views.LOGIN), 1800);
                } else {
                    toast.error(result?.error || "Failed to send reset email");
                }
            } else if (type === "reset-password") {
                const { resetPassword } = await import("../../../service/auth.service");
                result = await resetPassword(payload);

                if (result?.success || result?.message) {
                    toast.success(result.message || "Password reset successfully.");
                    setTimeout(() => setActiveView(views.LOGIN), 1600);
                } else {
                    toast.error(result?.error || "Failed to reset password");
                }
            }
        } catch (err) {
            console.error("Auth error:", err);
            const errorMessage =
                err?.message ||
                err?.response?.data?.message ||
                "An unexpected error occurred. Please try again.";
            toast.error(errorMessage);
        }
    };

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <motion.div
                    className="absolute -top-28 -left-24 h-64 w-64 rounded-full bg-sky-500/25 blur-3xl"
                    animate={{ x: [0, 26, -10, 0], y: [0, 20, 4, 0] }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"
                    animate={{ x: [0, -24, 10, 0], y: [0, -18, 12, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/95 to-sky-950/70" />
            </div>

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-3 py-4 sm:px-6 lg:px-8">
                <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6">
                    <Link to="/home" className="inline-flex min-w-0 items-center gap-2">
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-sky-400/40 bg-gradient-to-br from-sky-500/20 to-cyan-500/20">
                            <div className="absolute inset-0 rounded-2xl bg-sky-400/35 blur-sm" />
                            <Sparkles className="relative h-4 w-4 text-sky-200" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-100 sm:text-base">Aurora</p>
                            <p className="hidden text-[11px] uppercase tracking-[0.18em] text-slate-400 sm:block">
                                Workspace Platform
                            </p>
                        </div>
                    </Link>

                    <Link
                        to="/home"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/60 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-800/80 sm:px-3 sm:text-xs"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back
                    </Link>
                </div>

                <div className="grid items-stretch gap-4 lg:grid-cols-[1.05fr,1fr]">
                    <motion.section
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className="hidden rounded-3xl border border-slate-800/70 bg-slate-900/45 p-6 backdrop-blur lg:flex lg:flex-col"
                    >
                        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-sky-300/85">
                            <span className="h-[1px] w-8 bg-sky-400" />
                            Access Aurora
                        </p>

                        <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-50">
                            Sign in to your
                            <span className="block bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 bg-clip-text text-transparent">
                                Aurora Workspace
                            </span>
                        </h1>

                        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
                            Keep workspaces, flow, chat, calls, and insights connected in one secure platform.
                            Your existing product experience starts immediately after login.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2.5 text-[11px] text-slate-200">
                            {platformHighlights.map((item) => (
                                <Badge key={item}>{item}</Badge>
                            ))}
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {authFeatureBlocks.map(({ icon: Icon, title, detail }) => (
                                <div
                                    key={title}
                                    className="rounded-2xl border border-slate-800/70 bg-slate-950/55 p-3"
                                >
                                    <div className="mb-2 flex items-start gap-2">
                                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                                        <p className="text-sm font-semibold text-slate-100">{title}</p>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-400">{detail}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 inline-flex items-start gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-3">
                            <Avatar />
                            <div>
                                <p className="text-sm font-medium text-slate-100">Realtime collaboration, production ready</p>
                                <p className="mt-1 text-xs text-slate-400">
                                    Aurora is designed for role-based teamwork with persistent, live updates.
                                </p>
                            </div>
                        </div>
                    </motion.section>

                    <motion.section
                        className="rounded-3xl border border-slate-700/70 bg-slate-900/65 p-3 shadow-2xl shadow-slate-950/50 backdrop-blur sm:p-5 md:p-6"
                        initial={{ opacity: 0, x: 20, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <div className="mb-4 flex flex-col gap-3">
                            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/55 p-3 lg:hidden">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Aurora Access</p>
                                <p className="mt-1 text-sm font-semibold text-slate-100">
                                    Sign in to open your workspace flow.
                                </p>
                            </div>
                            <AuthTabs activeView={activeView} setActiveView={setActiveView} />
                        </div>

                        <AnimatePresence mode="wait">
                            {activeView === views.LOGIN ? (
                                <motion.div
                                    key="login"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <Suspense fallback={<LazyLoader />}>
                                        <LoginForm
                                            onSwitch={setActiveView}
                                            onSubmit={(payload) => handleSubmit(payload, "login")}
                                            loading={loading || false}
                                        />
                                    </Suspense>
                                </motion.div>
                            ) : null}

                            {activeView === views.SIGNUP ? (
                                <motion.div
                                    key="signup"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <Suspense fallback={<LazyLoader />}>
                                        <SignupForm
                                            onSwitch={setActiveView}
                                            onSubmit={(payload) => handleSubmit(payload, "signup")}
                                            loading={loading || false}
                                        />
                                    </Suspense>
                                </motion.div>
                            ) : null}

                            {activeView === views.FORGOT ? (
                                <motion.div
                                    key="forgot"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <Suspense fallback={<LazyLoader />}>
                                        <ForgotPasswordForm
                                            onSwitch={setActiveView}
                                            onSubmit={(payload) => handleSubmit(payload, "forgot-password")}
                                            loading={loading || false}
                                        />
                                    </Suspense>
                                </motion.div>
                            ) : null}

                            {activeView === views.RESET ? (
                                <motion.div
                                    key="reset"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <Suspense fallback={<LazyLoader />}>
                                        <ResetPasswordForm
                                            onSwitch={setActiveView}
                                            onSubmit={(payload) => handleSubmit(payload, "reset-password")}
                                            loading={loading || false}
                                        />
                                    </Suspense>
                                </motion.div>
                            ) : null}

                            {activeView === views.VERIFY ? (
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
                            ) : null}
                        </AnimatePresence>
                    </motion.section>
                </div>
            </div>
        </div>
    );
}
