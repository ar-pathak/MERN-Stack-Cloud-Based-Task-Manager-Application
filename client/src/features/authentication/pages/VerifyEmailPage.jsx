import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { verifyEmail } from "../../../service/auth.service";
import { useAuth } from "../../../context/AuthContext";

const VerifyEmailPage = () => {
    const navigate = useNavigate();
    const { token } = useParams();
    const { isAuthenticated, refreshUser } = useAuth();
    const [status, setStatus] = useState("verifying");
    const [message, setMessage] = useState("Verifying your email...");

    useEffect(() => {
        let active = true;

        const runVerification = async () => {
            if (!token) {
                if (!active) return;
                setStatus("error");
                setMessage("Invalid verification link.");
                return;
            }

            try {
                const result = await verifyEmail(token);
                if (!active) return;
                setStatus("success");
                setMessage(result?.message || "Email verified successfully.");
                await refreshUser?.();
            } catch (error) {
                if (!active) return;
                setStatus("error");
                setMessage(error?.message || "Verification link is invalid or expired.");
            }
        };

        runVerification();
        return () => {
            active = false;
        };
    }, [token, refreshUser]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
                {status === "verifying" && (
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                        <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
                    </div>
                )}

                {status === "success" && (
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    </div>
                )}

                {status === "error" && (
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15">
                        <XCircle className="h-6 w-6 text-rose-400" />
                    </div>
                )}

                <h1 className="text-lg font-semibold text-slate-100">Email Verification</h1>
                <p className="mt-2 text-sm text-slate-400">{message}</p>

                {status !== "verifying" && (
                    <button
                        type="button"
                        onClick={() => navigate(isAuthenticated ? "/main/settings" : "/home/auth")}
                        className="mt-5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                    >
                        {isAuthenticated ? "Go to Settings" : "Go to Login"}
                    </button>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailPage;
