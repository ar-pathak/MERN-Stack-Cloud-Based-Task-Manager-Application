import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

const sanitizeRedirectPath = (value) => {
    const candidate = String(value || "").trim();
    if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
        return "/main";
    }
    return candidate;
};

const providerLabel = (value) => {
    if (value === "google") return "Google";
    if (value === "github") return "GitHub";
    return "social";
};

function OAuthCallbackPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { refreshUser } = useAuth();
    const [status, setStatus] = useState("loading");
    const [message, setMessage] = useState("Completing sign-in...");

    const oauthStatus = String(searchParams.get("status") || "").toLowerCase();
    const oauthMessage = String(searchParams.get("message") || "").trim();
    const oauthProvider = String(searchParams.get("provider") || "").toLowerCase();
    const redirectPath = useMemo(
        () => sanitizeRedirectPath(searchParams.get("redirect")),
        [searchParams]
    );

    useEffect(() => {
        let active = true;

        const completeAuth = async () => {
            if (oauthStatus !== "success") {
                setStatus("error");
                setMessage(oauthMessage || `Unable to complete ${providerLabel(oauthProvider)} sign-in.`);
                return;
            }

            try {
                await refreshUser?.();
                if (!active) return;
                setStatus("success");
                setMessage(`Signed in with ${providerLabel(oauthProvider)}. Redirecting...`);
                setTimeout(() => {
                    navigate(redirectPath, { replace: true });
                }, 350);
            } catch (_error) {
                if (!active) return;
                setStatus("error");
                setMessage("Authentication succeeded, but the session could not be loaded. Please log in again.");
            }
        };

        completeAuth();
        return () => {
            active = false;
        };
    }, [oauthMessage, oauthProvider, oauthStatus, redirectPath, refreshUser, navigate]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-3 sm:px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-center sm:p-6">
                {status === "loading" ? (
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                        <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
                    </div>
                ) : null}

                {status === "success" ? (
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    </div>
                ) : null}

                {status === "error" ? (
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15">
                        <XCircle className="h-6 w-6 text-rose-400" />
                    </div>
                ) : null}

                <h1 className="text-base sm:text-lg font-semibold text-slate-100">OAuth Sign-in</h1>
                <p className="mt-2 text-sm text-slate-400 break-words">{message}</p>

                {status === "error" ? (
                    <button
                        type="button"
                        onClick={() => navigate("/home/auth", { replace: true })}
                        className="mt-5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                    >
                        Back to Login
                    </button>
                ) : null}
            </div>
        </div>
    );
}

export default OAuthCallbackPage;
