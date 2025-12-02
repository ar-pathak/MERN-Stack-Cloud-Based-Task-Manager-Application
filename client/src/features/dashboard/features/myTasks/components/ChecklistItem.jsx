import { CheckCircle2 } from "lucide-react";

export default function ChecklistItem({ label, checked }) {
    return (
        <div className="flex items-start gap-2 text-[11px] text-slate-200">
            <span
                className={`mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border ${checked
                    ? "border-emerald-400 bg-emerald-500/20"
                    : "border-slate-500/80 bg-slate-900"
                    }`}
            >
                {checked && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                )}
            </span>
            <p
                className={`flex-1 ${checked ? "text-slate-400 line-through" : ""
                    }`}
            >
                {label}
            </p>
        </div>
    );
}
