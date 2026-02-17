import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { acceptWorkspaceInvite } from "../../service/workspace.service";

const WorkspaceInviteAcceptPage = () => {
    const navigate = useNavigate();
    const { token } = useParams();
    const { isAuthenticated, loading: authLoading, refreshUser } = useAuth();
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("Preparing invite...");
    const [workspaceId, setWorkspaceId] = useState("");

    const redirectPath = useMemo(
        () => `/invites/accept/${token || ""}`,
        [token]
    );

    useEffect(() => {
        if (authLoading) return;

        if (!token || token.length !== 64) {
            setStatus("error");
            setMessage("Invalid invite link.");
            return;
        }

        if (!isAuthenticated) {
            navigate(`/home/auth?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
            return;
        }

        let isMounted = true;
        const execute = async () => {
            setStatus("loading");
            setMessage("Accepting workspace invite...");
            try {
                const result = await acceptWorkspaceInvite(token);
                if (!isMounted) return;

                const acceptedWorkspaceId = String(result?.workspaceId || result?.workspace?._id || "");
                setWorkspaceId(acceptedWorkspaceId);
                setStatus("success");
                setMessage("Invite accepted. You are now a workspace member.");
                await refreshUser?.();
            } catch (error) {
                if (!isMounted) return;
                setStatus("error");
                setMessage(error?.message || "Failed to accept invite.");
            }
        };

        execute();

        return () => {
            isMounted = false;
        };
    }, [authLoading, isAuthenticated, navigate, redirectPath, refreshUser, token]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
                {status === "loading" || status === "idle" ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-400" />
                ) : null}

                {status === "success" ? (
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                ) : null}

                {status === "error" ? (
                    <XCircle className="mx-auto h-8 w-8 text-rose-400" />
                ) : null}

                <h1 className="mt-3 text-lg font-semibold text-slate-100">Workspace Invite</h1>
                <p className="mt-2 text-sm text-slate-400">{message}</p>

                <div className="mt-5 flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => navigate("/main")}
                        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                    >
                        Open Workspace
                    </button>

                    {status === "success" && workspaceId ? (
                        <button
                            type="button"
                            onClick={() => navigate("/main/notifications")}
                            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                        >
                            View Notifications
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default WorkspaceInviteAcceptPage;
