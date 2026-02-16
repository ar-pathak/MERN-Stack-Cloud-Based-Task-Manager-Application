import { Check } from "lucide-react";

function Avatar() {
  return (
    <div className="relative">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-blue-300 text-xs font-semibold text-slate-900 shadow-lg shadow-cyan-500/30">
        AU
      </div>
      <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-emerald-400 text-slate-900">
        <Check className="h-3 w-3" />
      </span>
    </div>
  );
}

export default Avatar;
