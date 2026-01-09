import { useRef, useState, useEffect } from "react";
import MainSidebar from "./components/sidebar/MainSidebar";
import MainHeader from "./components/header/MainHeader";
import AnimatedBackground from "./components/background/AnimatedBackground";
import { Outlet } from "react-router";
import { useScrollDirection } from "./hook/useScrollDirection";
import ScrollBar from "../../common/components/ScrollBar";

const MainPage = () => {
    const scrollRef = useRef(null);
    const scrollDirection = useScrollDirection(scrollRef);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    useEffect(() => {
        if (scrollDirection === "down" && isHeaderVisible) {
            setIsHeaderVisible(false);
        }
    }, [scrollDirection, isHeaderVisible]);

    return (

        <div className="flex h-screen overflow-hidden">
            <ScrollBar />
            <AnimatedBackground />
            <MainSidebar />

            {/* Right Column */}
            <div className="flex flex-col h-full flex-1 w-full relative">
                <div
                    className={`transition-all duration-300 ease-in-out ${isHeaderVisible ? "h-[12vh] opacity-100 mb-6" : "h-0 opacity-0"
                        }`}
                >
                    <MainHeader />
                </div>
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden px-5 custom-scrollbar scroll-smooth"
                >
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default MainPage;