import { GhostButton } from "./Buttons";

const normalizeBaseUrl = (value) => String(value || "http://localhost:3000").replace(/\/+$/, "");

const sanitizeRedirectPath = (value) => {
    const candidate = String(value || "").trim();
    if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
        return "/main";
    }
    return candidate;
};

function SocialAuthSection() {
    const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);

    const startOAuth = (provider) => {
        const redirect = sanitizeRedirectPath(
            new URLSearchParams(window.location.search).get("redirect")
        );
        const url = new URL(`${apiBaseUrl}/api/auth/oauth/${provider}`);
        url.searchParams.set("redirect", redirect);
        window.location.assign(url.toString());
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-slate-700/70" />
                <span className="text-[0.65rem] text-slate-500 uppercase tracking-[0.16em]">
                    Or continue with
                </span>
                <div className="h-[1px] flex-1 bg-slate-700/70" />
            </div>

            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                <GhostButton type="button" onClick={() => startOAuth("google")}>
                    Google
                </GhostButton>
                <GhostButton type="button" onClick={() => startOAuth("github")}>GitHub</GhostButton>
            </div>
        </div>
    );
}

export default SocialAuthSection;
