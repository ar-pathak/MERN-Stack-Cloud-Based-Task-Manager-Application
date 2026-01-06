import { X } from "lucide-react";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarNav } from "./SidebarNav";
import { SidebarLogo } from "./SidebarLogo";

export const SidebarContent = ({
    isMobile,
    isExpanded,
    navItems,
    onNavigate,
    onClose
}) => {
    return (
        <div className="h-full flex flex-col">
            <div
                className={`flex items-center gap-2 border-b border-slate-800/60 transition-all duration-300 ${isExpanded || isMobile
                        ? "px-5 py-4"
                        : "px-3 py-4 justify-center"
                    }`}
            >
                <SidebarLogo isExpanded={isExpanded} isMobile={isMobile} />

                {isMobile && (
                    <button
                        onClick={onClose}
                        className="ml-auto p-1.5 rounded-lg hover:bg-slate-800/50"
                    >
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                )}
            </div>

            <SidebarNav
                navItems={navItems}
                isExpanded={isExpanded}
                isMobile={isMobile}
                onNavigate={onNavigate}
            />

            <SidebarFooter isExpanded={isExpanded} isMobile={isMobile} />
        </div>
    );
};
