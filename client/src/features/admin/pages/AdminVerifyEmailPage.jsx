import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminVerifyEmailPage = () => {
    const { token } = useParams();
    const { verifyEmail } = useAdminAuth();
    const [state, setState] = useState({
        loading: true,
        success: false,
        message: "Verifying admin email..."
    });

    useEffect(() => {
        let mounted = true;
        const run = async () => {
            try {
                await verifyEmail(token);
                if (!mounted) return;
                setState({
                    loading: false,
                    success: true,
                    message: "Admin email verified successfully."
                });
            } catch (error) {
                if (!mounted) return;
                setState({
                    loading: false,
                    success: false,
                    message: error?.message || "Invalid or expired verification link."
                });
            }
        };

        run();
        return () => {
            mounted = false;
        };
    }, [token, verifyEmail]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
            <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
                {state.loading ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-400" />
                ) : state.success ? (
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                ) : (
                    <CircleAlert className="mx-auto h-8 w-8 text-rose-400" />
                )}

                <h1 className="mt-4 text-xl font-semibold text-slate-100">
                    Admin Email Verification
                </h1>
                <p className="mt-2 text-sm text-slate-300">{state.message}</p>

                <Link
                    to="/admin/auth"
                    className="mt-5 inline-flex items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/20"
                >
                    Go to Admin Login
                </Link>
            </section>
        </main>
    );
};

export default AdminVerifyEmailPage;
