import { Palette } from "lucide-react";

const COLORS = [
    { value: "#4f46e5", label: "Indigo" },
    { value: "#10b981", label: "Emerald" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#ef4444", label: "Red" },
    { value: "#8b5cf6", label: "Violet" },
    { value: "#06b6d4", label: "Cyan" },
    { value: "#ec4899", label: "Pink" },
    { value: "#6366f1", label: "Blue" },
];

const ProjectColorPicker = ({ selectedColor, onSelect, disabled }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Project Color
        </label>
        <div className="grid grid-cols-4 gap-2">
            {COLORS.map(color => (
                <button
                    key={color.value}
                    type="button"
                    onClick={() => onSelect(color.value)}
                    disabled={disabled}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${selectedColor === color.value
                            ? 'border-violet-500/50 bg-violet-500/10'
                            : 'border-slate-800/50 bg-slate-900/40 hover:bg-slate-800/40'
                        }`}
                >
                    <div className="h-6 w-6 rounded-lg shadow-sm" style={{ backgroundColor: color.value }} />
                    <span className="text-xs text-slate-300">{color.label}</span>
                </button>
            ))}
        </div>
    </div>
);

export default ProjectColorPicker;