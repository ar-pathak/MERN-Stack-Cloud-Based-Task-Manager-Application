import { Menu } from "lucide-react";

export const MobileMenuButton = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="md:hidden fixed top-16 left-4 z-30 p-2.5 rounded-xl border border-slate-800/70 bg-slate-900/90 backdrop-blur-xl hover:bg-slate-800/80 transition-all shadow-lg hover:shadow-sky-500/20"
        >
            <Menu className="h-5 w-5 text-slate-200" />
        </button>
    );
};