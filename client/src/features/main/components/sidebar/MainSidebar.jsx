import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NAV_ITEMS } from "../../constants/sidebarConfig";
import { SidebarContent } from "./SidebarContent";
import { ToggleButton } from "./ToggleButton";

const MainSidebar = () => {
    const [isExpanded, setIsExpanded] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExpanded(false)
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <motion.aside
                animate={{ width: isExpanded ? 256 : 80 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="hidden md:flex flex-col border-r border-slate-800/70 bg-slate-950/40 backdrop-blur-xl relative overflow-hidden"
            >
                <SidebarContent
                    isExpanded={isExpanded}
                    navItems={NAV_ITEMS}
                    onToggleSidebar={() => setIsExpanded((v) => !v)}
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
