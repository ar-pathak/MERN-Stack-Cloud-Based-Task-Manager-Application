import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ShieldCheck, Mail, KeyRound, UserCog, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "../context/AdminAuthContext";

const MODE_CONFIG = {
    login: {
        title: "Admin Sign In",
        subtitle: "Sign in with password and verify login with email OTP."
    },
    register: {
        title: "Create Admin Account",
        subtitle: "Register a support admin profile and verify email."
    },
    forgot: {
        title: "Reset Admin Password",
        subtitle: "Send a secure reset link to admin email."
    }
};
const ALLOWED_ADMIN_EMAIL = "pathakarsan@gmail.com";
const NOT_ALLOWED_MESSAGE = "You do not have permission to access the admin panel.";
const isAllowedAdminEmail = (value) =>
    String(value || "").trim().toLowerCase() === ALLOWED_ADMIN_EMAIL;

const AdminAuthPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        login,
        verifyLoginOtp,
        register,
        forgotPassword,
        requestVerificationByEmail
    } = useAdminAuth();

    const [mode, setMode] = useState("login");
    const [authStep, setAuthStep] = useState("credentials");
    const [loading, setLoading] = useState(false);
    const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
    const [otpEmail, setOtpEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");

    const [loginForm, setLoginForm] = useState({
        email: "",
        password: ""
    });

    const [registerForm, setRegisterForm] = useState({
        name: "",
        email: "",
        password: "",
        inviteCode: ""
    });

    const [forgotEmail, setForgotEmail] = useState("");

    const resolvedConfig = useMemo(() => MODE_CONFIG[mode] || MODE_CONFIG.login, [mode]);
    const nextPath = location.state?.from || "/admin/panel";
    const handleModeChange = (nextMode) => {
        setMode(nextMode);
        if (nextMode !== "login") {
            setAuthStep("credentials");
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        if (loading) return;
        if (!isAllowedAdminEmail(loginForm.email)) {
            toast.error(NOT_ALLOWED_MESSAGE);
            return;
        }

        try {
            setLoading(true);
            const result = await login(loginForm);

            if (result?.otpRequired) {
                setAuthStep("otp");
                setOtpEmail(result.email || loginForm.email);
                setOtpCode("");
                toast.success("A verification code has been sent to your email.");
                return;
            }

            toast.success("Admin login successful.");
            navigate(nextPath, { replace: true });
        } catch (error) {
            toast.error(error?.message || "Admin login failed.");
            if (error?.code === "ADMIN_EMAIL_NOT_VERIFIED") {
                setPendingVerificationEmail(loginForm.email);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (event) => {
        event.preventDefault();
        if (loading) return;
        if (!otpEmail) {
            toast.error("Login session expired. Please sign in again.");
            setAuthStep("credentials");
            return;
        }

        try {
            setLoading(true);
            await verifyLoginOtp({
                email: otpEmail,
                otp: otpCode
            });
            toast.success("Admin login successful.");
            navigate(nextPath, { replace: true });
        } catch (error) {
            toast.error(error?.message || "OTP verification failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendLoginOtp = async () => {
        if (loading) return;
        if (!isAllowedAdminEmail(loginForm.email)) {
            toast.error(NOT_ALLOWED_MESSAGE);
            return;
        }
        if (!loginForm.password) {
            toast.error("Enter password to resend OTP.");
            setAuthStep("credentials");
            return;
        }

        try {
            setLoading(true);
            const result = await login(loginForm);
            if (result?.otpRequired) {
                setOtpEmail(result.email || loginForm.email);
                setOtpCode("");
            }
            toast.success("A new verification code has been sent.");
        } catch (error) {
            toast.error(error?.message || "Failed to resend OTP.");
            setAuthStep("credentials");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        if (loading) return;
        if (!isAllowedAdminEmail(registerForm.email)) {
            toast.error(NOT_ALLOWED_MESSAGE);
            return;
        }

        try {
            setLoading(true);
            await register(registerForm);
            toast.success("Admin registered. Verify email before login.");
            setPendingVerificationEmail(registerForm.email);
            setLoginForm((previous) => ({
                ...previous,
                email: registerForm.email
            }));
            setMode("login");
        } catch (error) {
            toast.error(error?.message || "Admin registration failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (event) => {
        event.preventDefault();
        if (loading) return;

        try {
            setLoading(true);
            await forgotPassword(forgotEmail);
            toast.success("If the email exists, reset link has been sent.");
        } catch (error) {
            toast.error(error?.message || "Failed to send reset email.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!pendingVerificationEmail || loading) return;
        try {
            setLoading(true);
            await requestVerificationByEmail(pendingVerificationEmail);
            toast.success("Verification email sent.");
        } catch (error) {
            toast.error(error?.message || "Failed to send verification email.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.28),_rgba(2,6,23,1)_60%),linear-gradient(120deg,_#020617,_#111827)] px-4 py-8 text-slate-100">
            <section className="mx-auto grid w-full max-w-5xl gap-6 rounded-3xl border border-slate-800/80 bg-slate-950/75 p-5 shadow-[0_30px_90px_rgba(2,6,23,0.55)] lg:grid-cols-[minmax(0,1fr)_28rem] lg:p-8">
                <aside className="rounded-2xl border border-slate-800/80 bg-slate-900/65 p-5">
                    <p className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Aurora Admin Console
                    </p>

                    <h1 className="mt-4 text-2xl font-semibold text-slate-100">
                        {resolvedConfig.title}
                    </h1>
                    <p className="mt-2 max-w-md text-sm text-slate-400">
                        {resolvedConfig.subtitle}
                    </p>

                    <div className="mt-6 space-y-3 text-sm text-slate-300">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                            Separate admin authentication from normal app users
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                            Email verification required before dashboard access
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                            Support tickets, contact requests, and feedback operations
                        </div>
                    </div>

                    {pendingVerificationEmail ? (
                        <div className="mt-6 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
                            <p className="text-xs uppercase tracking-[0.12em] text-amber-300">
                                Verification Required
                            </p>
                            <p className="mt-1 text-sm text-amber-100">
                                {pendingVerificationEmail}
                            </p>
                            <button
                                type="button"
                                onClick={handleResendVerification}
                                disabled={loading}
                                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Resend verification email
                            </button>
                        </div>
                    ) : null}
                </aside>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
                    <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-1">
                        {["login", "register", "forgot"].map((entry) => (
                            <button
                                key={entry}
                                type="button"
                                onClick={() => handleModeChange(entry)}
                                className={`rounded-lg px-2 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                                    mode === entry
                                        ? "bg-sky-500/20 text-sky-200"
                                        : "text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                {entry}
                            </button>
                        ))}
                    </div>

                    {mode === "login" && authStep === "credentials" && (
                        <form onSubmit={handleLogin} className="space-y-3">
                            <label className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                                Admin Email
                                <input
                                    type="email"
                                    value={loginForm.email}
                                    onChange={(event) =>
                                        setLoginForm((previous) => ({
                                            ...previous,
                                            email: event.target.value
                                        }))
                                    }
                                    required
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                                />
                            </label>

                            <label className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                                Password
                                <input
                                    type="password"
                                    value={loginForm.password}
                                    onChange={(event) =>
                                        setLoginForm((previous) => ({
                                            ...previous,
                                            password: event.target.value
                                        }))
                                    }
                                    required
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                Sign In
                            </button>
                        </form>
                    )}

                    {mode === "login" && authStep === "otp" && (
                        <form onSubmit={handleVerifyOtp} className="space-y-3">
                            <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
                                Enter the 6-digit code sent to your admin email.
                            </p>

                            <label className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                                Admin Email
                                <input
                                    type="email"
                                    value={otpEmail}
                                    readOnly
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-400 outline-none"
                                />
                            </label>

                            <label className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                                OTP Code
                                <input
                                    value={otpCode}
                                    onChange={(event) =>
                                        setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                                    }
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    required
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm tracking-[0.24em] text-slate-200 outline-none focus:border-sky-500/60"
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                Verify OTP
                            </button>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAuthStep("credentials")}
                                    disabled={loading}
                                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-300 hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResendLoginOtp}
                                    disabled={loading}
                                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-sky-100 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Resend OTP
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === "register" && (
                        <form onSubmit={handleRegister} className="space-y-3">
                            <label className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                                Full Name
                                <input
                                    value={registerForm.name}
                                    onChange={(event) =>
                                        setRegisterForm((previous) => ({
                                            ...previous,
                                            name: event.target.value
                                        }))
                                    }
                                    minLength={2}
                                    maxLength={120}
                                    required
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                                />
                            </label>

                            <label className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                                Admin Email
                                <input
                                    type="email"
                                    value={registerForm.email}
                                    onChange={(event) =>
                                        setRegisterForm((previous) => ({
                                            ...previous,
                                            email: event.target.value
                                        }))
                                    }
                                    required
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                                />
                            </label>

                            <label className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                                Password
                                <input
                                    type="password"
                                    value={registerForm.password}
                                    onChange={(event) =>
                                        setRegisterForm((previous) => ({
                                            ...previous,
                                            password: event.target.value
                                        }))
                                    }
                                    minLength={8}
                                    required
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                                />
                            </label>

                            <label className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                                Invite Code (optional)
                                <input
                                    value={registerForm.inviteCode}
                                    onChange={(event) =>
                                        setRegisterForm((previous) => ({
                                            ...previous,
                                            inviteCode: event.target.value
                                        }))
                                    }
                                    maxLength={120}
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
                                Register Admin
                            </button>
                        </form>
                    )}

                    {mode === "forgot" && (
                        <form onSubmit={handleForgot} className="space-y-3">
                            <label className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                                Admin Email
                                <input
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(event) => setForgotEmail(event.target.value)}
                                    required
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                Send Reset Link
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default AdminAuthPage;
