import { useRef, useState, useEffect } from "react";
import MainSidebar from "./components/sidebar/MainSidebar";
import MainHeader from "./components/header/MainHeader";
import AnimatedBackground from "./components/background/AnimatedBackground";
import { Outlet } from "react-router";
import { useScrollDirection } from "./hook/useScrollDirection";
import ScrollBar from "../../common/components/ScrollBar";
import { useToggle } from "../../context/ToggleContext";

const MainPage = () => {
    const scrollRef = useRef(null);
    const scrollDirection = useScrollDirection(scrollRef);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const hasSidebarToggleInteractedRef = useRef(false);
    const hasScrollHiddenHeaderRef = useRef(false);
    const hasAutoHideTimerRunRef = useRef(false);
    const [isMobileViewport, setIsMobileViewport] = useState(() =>
        typeof window !== "undefined"
            ? window.matchMedia("(max-width: 1023px)").matches
            : false
    );
    const { isToggle } = useToggle();

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const mediaQuery = window.matchMedia("(max-width: 1023px)");
        const handleChange = (event) => {
            setIsMobileViewport(event.matches);
        };

        setIsMobileViewport(mediaQuery.matches);
        mediaQuery.addEventListener("change", handleChange);

        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        if (isMobileViewport) return;

        if (hasScrollHiddenHeaderRef.current) return;
        if (scrollDirection === "down") {
            hasScrollHiddenHeaderRef.current = true;
            setIsHeaderVisible(false);
        }
    }, [scrollDirection, isMobileViewport]);

    useEffect(() => {
        if (isMobileViewport || hasAutoHideTimerRunRef.current) return;

        const timer = setTimeout(() => {
            hasAutoHideTimerRunRef.current = true;
            setIsHeaderVisible(false);
        }, 8000);

        return () => clearTimeout(timer);
    }, [isMobileViewport]);

    useEffect(() => {
        if (isMobileViewport) return;
        if (!hasSidebarToggleInteractedRef.current) {
            hasSidebarToggleInteractedRef.current = true;
            return;
        }

        setIsHeaderVisible((prev) => !prev);
    }, [isToggle, isMobileViewport]);

    useEffect(() => {
        if (!isMobileViewport) {
            setIsHeaderVisible(true);
        }
    }, [isMobileViewport]);

    return (

        <div className="flex h-screen min-h-0 overflow-hidden">
            <ScrollBar />
            <AnimatedBackground />
            <MainSidebar />

            {/* Right Column */}
            <div className="flex flex-col h-full min-h-0 flex-1 w-full relative">
                {!isMobileViewport && (
                    <div
                        className={`transition-all duration-300 ease-in-out ${
                            isHeaderVisible ? "h-[12vh] opacity-100 mb-6" : "h-0 opacity-0"
                        }`}
                    >
                        <MainHeader />
                    </div>
                )}
                <div
                    ref={scrollRef}
                    className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-0 lg:px-5 custom-scrollbar scroll-smooth"
                >
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default MainPage;
