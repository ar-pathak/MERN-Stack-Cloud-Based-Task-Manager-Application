import { GhostButton } from "./Buttons";

function SocialAuthSection() {
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
                <GhostButton type="button">
                    Google
                </GhostButton>
                <GhostButton type="button">GitHub</GhostButton>
            </div>
        </div>
    );
}

export default SocialAuthSection;
