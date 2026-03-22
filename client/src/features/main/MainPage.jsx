import { useRef, useState, useEffect, lazy, Suspense } from "react";
import AnimatedBackground from "./components/background/AnimatedBackground";
import { Outlet, useLocation } from "react-router"; // 🔥 Added useLocation
import { useScrollDirection } from "./hook/useScrollDirection";
import ScrollBar from "../../common/components/ScrollBar";
import { useToggle } from "../../context/ToggleContext";

// 🔥 Assuming you have useAuth for the profileId (adjust import path if needed)
import { useAuth } from "../../context/AuthContext";
// 🔥 Import your MobileBottomNav (adjust path according to your folder structure)
import MobileBottomNav from "./components/navigation/MobileBottomNav";
import { useSelector } from "react-redux";

// Lazy load desktop components to prevent mobile JS loading
const MainSidebar = lazy(() => import("./components/sidebar/MainSidebar"));
const MainHeader = lazy(() => import("./components/header/MainHeader"));

const MainPage = () => {
    const scrollRef = useRef(null);
    const scrollDirection = useScrollDirection(scrollRef);
    const location = useLocation(); // 🔥 Get current URL
    const { user } = useAuth(); // 🔥 Get user for profile ID
    const isBottomNavVisible = useSelector((state) => state.overview.isBottomNavVisible);
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

    // 🔥 Dynamically figure out the active tab based on the current URL
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes("/main/feed")) return "feed";
        if (path.includes("/main/create")) return "create";
        if (path.includes("/main/notifications")) return "notifications";
        if (path.includes("/profile")) return "me";
        return "overview"; // default fallback for "/main"
    };

    const activeTab = getActiveTab();

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
        <div className="flex h-screen min-h-0 overflow-hidden relative">
            <ScrollBar />
            <AnimatedBackground />
            {!isMobileViewport && (
                <Suspense fallback={null}>
                    <MainSidebar />
                </Suspense>
            )}

            {/* Right Column */}
            <div className="flex flex-col h-full min-h-0 flex-1 w-full relative">
                {!isMobileViewport && (
                    <div
                        className={`transition-all duration-300 ease-in-out ${isHeaderVisible ? "h-[12vh] opacity-100 mb-6" : "h-0 opacity-0"
                            }`}
                    >
                        <Suspense fallback={null}>
                            <MainHeader />
                        </Suspense>
                    </div>
                )}
                <div
                    ref={scrollRef}
                    className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-0 lg:px-5 custom-scrollbar scroll-smooth"
                >
                    <Outlet />
                </div>
            </div>

            {isMobileViewport && (
                <MobileBottomNav
                    activeTab={activeTab}
                    profileId={user?._id || user?.id}
                    hidden={!isBottomNavVisible} // 🔥 Redux state se connect kar diya
                />
            )}
        </div>
    );
};

export default MainPage;