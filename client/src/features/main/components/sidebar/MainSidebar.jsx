import { useState } from "react";
import { motion } from "framer-motion";
import { NAV_ITEMS } from "../../constants/sidebarConfig";
import { SidebarContent } from "./SidebarContent";
import { ToggleButton } from "./ToggleButton";
import { MobileOverlay } from "./MobileOverlay";
import { MobileMenuButton } from "./MobileMenuButton";

const MainSidebar = () => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <>
            <MobileMenuButton onClick={() => setIsMobileOpen(true)} />

            <MobileOverlay
                isOpen={isMobileOpen}
                onClose={() => setIsMobileOpen(false)}
            >
                <SidebarContent
                    isMobile
                    isExpanded={isExpanded}
                    navItems={NAV_ITEMS}
                    onNavigate={() => setIsMobileOpen(false)}
                />
            </MobileOverlay>

            <motion.aside
                animate={{ width: isExpanded ? 256 : 80 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="hidden md:flex flex-col border-r border-slate-800/70 bg-slate-950/40 backdrop-blur-xl relative overflow-hidden"
            >
                <SidebarContent
                    isExpanded={isExpanded}
                    navItems={NAV_ITEMS}
                />

                <ToggleButton
                    isExpanded={isExpanded}
                    onClick={() => setIsExpanded((v) => !v)}
                />
            </motion.aside>
        </>
    );
};

export default MainSidebar;
