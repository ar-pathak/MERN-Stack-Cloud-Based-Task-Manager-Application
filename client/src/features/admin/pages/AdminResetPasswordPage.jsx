import { useState } from "react";
import { Link, useParams } from "react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminResetPasswordPage = () => {
    const { token } = useParams();
    const { resetPassword } = useAdminAuth();

    const [form, setForm] = useState({
        password: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;

        if (form.password !== form.confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);
            await resetPassword({
                token,
                password: form.password
            });
            setDone(true);
            toast.success("Admin password reset successfully.");
        } catch (error) {
            toast.error(error?.message || "Failed to reset admin password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
            <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h1 className="text-xl font-semibold text-slate-100">Reset Admin Password</h1>
                <p className="mt-1 text-sm text-slate-400">
                    Create a new password for admin console access.
                </p>

                {done ? (
                    <div className="mt-5 space-y-3">
                        <p className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                            Password updated. You can now log in.
                        </p>
                        <Link
                            to="/admin/auth"
                            className="inline-flex items-center rounded-lg border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/20"
                        >
                            Go to Admin Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                        <label className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                            New Password
                            <input
                                type="password"
                                value={form.password}
                                onChange={(event) =>
                                    setForm((previous) => ({
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
                            Confirm Password
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        confirmPassword: event.target.value
                                    }))
                                }
                                minLength={8}
                                required
                                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                            Update Password
                        </button>
                    </form>
                )}
            </section>
        </main>
    );
};

export default AdminResetPasswordPage;
